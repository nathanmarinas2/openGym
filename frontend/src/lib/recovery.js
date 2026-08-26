// Recovery is an orientation layer, not a medical decision. It only combines logged signals
// and makes missing evidence explicit so a quiet data set is never presented as "ready".

import { MUSCLES, musclesOf } from './muscles.js'
import { EXIDX } from './exercises.js'
import { isWorkingSet } from './history.js'

export const RECOVERY_STATUS = ['prepared', 'recovering', 'fatigued', 'detraining', 'insufficient']

const n = value => Number.isFinite(Number(value)) ? Number(value) : null
const iso = value => String(value || '').slice(0, 10)
const dayMs = 86400000
const dateAtNoon = value => new Date(`${iso(value)}T12:00:00`).getTime()
const clamp = (value, low, high) => Math.max(low, Math.min(high, value))

export function normalizeRecoveryCheckin(input = {}, date = iso(new Date().toISOString())) {
  const soreness = Array.isArray(input.soreness) ? input.soreness.map(item => ({
    muscle: String(item?.muscle || '').slice(0, 40), level: clamp(Math.round(n(item?.level) || 1), 1, 5)
  })).filter(item => item.muscle).slice(0, 20) : []
  const painfulMuscles = Array.isArray(input.painfulMuscles) ? input.painfulMuscles.map(item => ({
    muscle: String(item?.muscle || '').slice(0, 40), until: iso(item?.until)
  })).filter(item => item.muscle && item.until).slice(0, 20) : []
  return {
    id: String(input.id || `rc-${Date.now().toString(36)}`), date: iso(input.date || date),
    energy: input.energy == null ? undefined : clamp(Math.round(n(input.energy) || 1), 1, 5),
    sleepHours: input.sleepHours == null ? undefined : clamp(Math.round((n(input.sleepHours) || 0) * 10) / 10, 0, 24),
    soreness, painfulMuscles, notes: String(input.notes || '').slice(0, 500)
  }
}

const muscleMapForEntry = (S, entry) => {
  const ex = EXIDX[entry.id] || (S.customEx || []).find(item => item.id === entry.id)
  return musclesOf(ex)
}

function loadForWorkouts(S, workouts) {
  const load = Object.fromEntries(MUSCLES.map(muscle => [muscle, 0]))
  for (const workout of workouts) for (const entry of workout.entries || []) {
    const mapping = muscleMapForEntry(S, entry)
    const sets = (entry.sets || []).filter(set => set.done && isWorkingSet(set))
    for (const [muscle, weight] of Object.entries(mapping)) {
      // Weighted volume is the strongest signal; unweighted work still counts as one unit per
      // completed set so push-ups, holds and cardio don't disappear from recovery entirely.
      const amount = sets.reduce((sum, set) => sum + (Number(set.w) > 0 && Number(set.r) > 0 ? Number(set.w) * Number(set.r) : 1), 0)
      load[muscle] += amount * weight
    }
  }
  return load
}

function effortForWorkouts(workouts) {
  const values = []
  for (const workout of workouts) for (const entry of workout.entries || []) for (const set of entry.sets || []) {
    if (!set.done || !isWorkingSet(set)) continue
    const raw = set.rir != null ? n(set.rir) : set.rpe != null ? n(set.rpe) : null
    const value = raw == null ? null : set.rir != null ? raw : 10 - raw
    if (value != null && value >= 0 && value <= 10) values.push(value)
  }
  return { rated: values.length, averageRir: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null }
}

function latestCheckin(S, date) {
  return (S.recoveryCheckins || []).filter(item => iso(item.date) <= date).sort((a, b) => iso(a.date).localeCompare(iso(b.date))).at(-1) || null
}

function statusFor({ history, recent, average, effort, checkin, latestMetric, date }) {
  if (!history.length && !checkin && !latestMetric) return { status: 'insufficient', reasons: ['No training or recovery data is available yet.'] }
  const reasons = []
  const pain = (checkin?.painfulMuscles || []).filter(item => item.until >= date)
  const soreness = Math.max(0, ...(checkin?.soreness || []).map(item => n(item.level) || 0))
  const sleep = n(checkin?.sleepHours ?? latestMetric?.sleepHours)
  const energy = n(checkin?.energy)
  const resting = n(latestMetric?.restingHeartRate)
  const baseline = n(latestMetric?.baselineRestingHeartRate)
  const hrHigh = resting != null && baseline != null && resting - baseline >= 8
  if (pain.length) { reasons.push('Pain was marked manually; consider an alternative or rest.') ; return { status: 'fatigued', reasons } }
  if (energy != null && energy <= 2) reasons.push('Low energy check-in.')
  if (sleep != null && sleep < 6) reasons.push('Short sleep in the latest check-in.')
  if (soreness >= 4) reasons.push('High soreness in the latest check-in.')
  if (hrHigh) reasons.push('Resting heart rate is above the recorded baseline.')
  const volumeHigh = average > 0 && recent > average * 1.35
  if (volumeHigh) reasons.push('Recent volume is above the four-week average.')
  if (effort?.rated >= 3 && effort.averageRir <= 1.5) reasons.push('Recent rated sets were close to failure.')
  const lastDate = history.at(-1)?.date
  const daysSince = lastDate ? Math.max(0, Math.round((dateAtNoon(date) - dateAtNoon(lastDate)) / dayMs)) : Infinity
  if (daysSince >= 21 && history.length) return { status: 'detraining', reasons: ['No completed session recorded for at least three weeks.', ...reasons] }
  if (reasons.length) return { status: 'fatigued', reasons }
  if (daysSince <= 2 && recent > 0) return { status: 'recovering', reasons: ['The last exposure was recent; allow recovery before repeating it hard.'] }
  return { status: 'prepared', reasons: ['No elevated fatigue signal was found in the available data.'] }
}

export function calculateRecovery(S = {}, date = iso(new Date().toISOString())) {
  const workouts = (S.workouts || []).filter(workout => iso(workout.d) <= date).sort((a, b) => iso(a.d).localeCompare(iso(b.d)))
  const recentCutoff = dateAtNoon(date) - 7 * dayMs
  const fourWeekCutoff = dateAtNoon(date) - 28 * dayMs
  const recentWorkouts = workouts.filter(workout => dateAtNoon(workout.d) >= recentCutoff)
  const fourWeekWorkouts = workouts.filter(workout => dateAtNoon(workout.d) >= fourWeekCutoff)
  const checkin = latestCheckin(S, date)
  const latestMetric = (S.healthMetrics || []).filter(item => iso(item.d) <= date).sort((a, b) => iso(a.d).localeCompare(iso(b.d))).at(-1) || null
  const recentLoad = loadForWorkouts(S, recentWorkouts)
  const fourWeekLoad = loadForWorkouts(S, fourWeekWorkouts)
  const recentEffort = effortForWorkouts(recentWorkouts)
  const fourWeekEffort = effortForWorkouts(fourWeekWorkouts)
  const recentTotal = Object.values(recentLoad).reduce((a, b) => a + b, 0)
  const averageTotal = Object.values(fourWeekLoad).reduce((a, b) => a + b, 0) / 4
  const allHistory = workouts.length ? [{ date: iso(workouts.at(-1).d), volume: recentTotal }] : []
  const statuses = statusFor({ history: allHistory, recent: recentTotal, average: averageTotal, effort: recentEffort, checkin, latestMetric, date })
  const muscles = Object.fromEntries(MUSCLES.map(muscle => {
    const last = workouts.filter(workout => loadForWorkouts(S, [workout])[muscle] > 0).at(-1)
    const recent = recentLoad[muscle] || 0
    const average = (fourWeekLoad[muscle] || 0) / 4
    const local = statusFor({ history: last ? [{ date: workoutDate(last, workouts) }] : [], recent, average, effort: recentEffort, checkin, latestMetric, date })
    return [muscle, { status: local.status, recentVolume: Math.round(recent * 10) / 10, fourWeekAverage: Math.round(average * 10) / 10, lastTrained: last ? workoutDate(last, workouts) : null, reasons: local.reasons }]
  }))
  // A recent, sore/painful individual group should remain visible even if whole-body data is
  // otherwise adequate.
  const muscleStatuses = Object.values(muscles).map(item => item.status)
  const overall = muscleStatuses.includes('fatigued') ? 'fatigued' : statuses.status
  return {
    date, status: overall, reasons: statuses.reasons, checkin, recentVolume: Math.round(recentTotal * 10) / 10,
    fourWeekAverage: Math.round(averageTotal * 10) / 10, workoutsLast7: recentWorkouts.length,
    metrics: { sleepHours: n(checkin?.sleepHours ?? latestMetric?.sleepHours), energy: n(checkin?.energy), restingHeartRate: n(latestMetric?.restingHeartRate), steps: n(latestMetric?.steps), recentRir: recentEffort.averageRir, recentRatedSets: recentEffort.rated, fourWeekRir: fourWeekEffort.averageRir },
    muscles
  }
}

function workoutDate(workout, workouts) {
  return iso(workout?.d || workouts.find(item => item === workout)?.d)
}

export const getRecovery = calculateRecovery
export const recoveryStatus = calculateRecovery
