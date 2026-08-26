import { effectiveRoutine } from './history.js'
import { dailyTotals, waterTotal } from './nutrition.js'

const n = value => {
  const parsed = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(',', '.'))
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}
const known = value => {
  const parsed = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(',', '.'))
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null
}
const signed = value => Number.isFinite(+value) ? Math.round(+value * 10) / 10 : 0

function weightSnapshot(S, date) {
  const points = (S.bodyweight || []).filter(item => item?.d && item.d <= date && n(item.w) > 0).sort((a, b) => a.d.localeCompare(b.d))
  const current = points.at(-1) || null
  const recent = points.slice(-7)
  const first = recent[0]
  const trend = first && current ? signed(current.w - first.w) : null
  return { current: current?.w ?? null, currentDate: current?.d || null, trend, entries: points.length, target: S.targetW || null, unit: S.unit || 'kg' }
}

function workoutSnapshot(S, date) {
  const routine = effectiveRoutine(S, date)
  const workout = [...(S.workouts || [])].reverse().find(item => item?.d === date) || null
  const entries = workout?.entries || []
  const sets = entries.flatMap(entry => (entry.sets || []).filter(set => set.done !== false))
  const rated = sets.filter(set => set.rir != null || set.rpe != null)
  const rests = (workout?.restLog || []).filter(rest => n(rest.actualSec) >= 0)
  const rir = rated.filter(set => set.rir != null)
  const rpe = rated.filter(set => set.rpe != null)
  const volume = entries.reduce((sum, entry) => sum + (entry.sets || []).reduce((inner, set) => inner + n(set.w) * n(set.r), 0), 0)
  const start = known(workout?.start)
  const end = known(workout?.end)
  const durationMinutes = start != null && end != null && end > start ? signed((end - start) / 60000) : null
  return {
    planned: !!routine,
    plannedName: routine?.name || null,
    completed: !!workout,
    name: workout?.name || routine?.name || null,
    exercises: entries.length,
    sets: sets.length,
    volume: signed(volume),
    averageRir: rir.length ? signed(rir.reduce((sum, set) => sum + n(set.rir), 0) / rir.length) : null,
    averageRpe: rpe.length ? signed(rpe.reduce((sum, set) => sum + n(set.rpe), 0) / rpe.length) : null,
    ratedSets: rated.length,
    durationMinutes,
    activeCalories: known(workout?.activeCalories),
    plannedExercises: routine?.ex?.length || 0,
    restEntries: rests.length,
    averageRestSec: rests.length ? signed(rests.reduce((sum, rest) => sum + n(rest.actualSec), 0) / rests.length) : null,
    exerciseRestEntries: rests.filter(rest => rest.kind === 'exercise').length
  }
}

// Activity is deliberately an estimate, not a second calorie target. Steps use a
// conservative body-weight heuristic, while strength-session calories use the saved
// session duration and an intensity band from RIR/RPE when available. A direct value
// imported from a wearable takes precedence for the daily total, but the breakdown
// remains visible so it is clear what is measured and what is inferred.
function estimateStepsCalories(steps, weight) {
  if (steps == null || weight == null || steps <= 0 || weight <= 0) return steps === 0 && weight > 0 ? 0 : null
  return signed(steps * weight * 0.00045)
}

function estimateWorkoutCalories(workout, weight) {
  if (!workout.completed) return null
  if (workout.activeCalories != null) return signed(workout.activeCalories)
  if (workout.durationMinutes == null || workout.durationMinutes <= 0 || weight == null || weight <= 0) return null
  const intense = workout.averageRpe != null ? workout.averageRpe >= 8 : workout.averageRir != null ? workout.averageRir <= 2 : false
  const moderate = workout.averageRpe != null ? workout.averageRpe >= 6 : workout.averageRir != null ? workout.averageRir <= 4 : true
  const met = intense ? 6 : moderate ? 5 : 4.5
  return signed(workout.durationMinutes * 3.5 * weight / 200 * met)
}

function activitySnapshot(S, date, workout, weight) {
  const row = [...(S.healthMetrics || [])].reverse().find(item => item?.d === date) || null
  const steps = known(row?.steps)
  const stepsCalories = steps == null ? null : known(row?.stepsCalories) ?? estimateStepsCalories(steps, known(weight.current))
  const workoutCalories = estimateWorkoutCalories(workout, known(weight.current))
  const deviceActiveCalories = known(row?.activeCalories)
  const inferredParts = [stepsCalories, workoutCalories].filter(value => value != null)
  const activeCalories = deviceActiveCalories != null
    ? deviceActiveCalories
    : inferredParts.length ? signed(inferredParts.reduce((sum, value) => sum + value, 0)) : null
  return {
    steps,
    stepsGoal: Math.max(500, Math.round(n(S.stepsGoal || 10000))),
    stepsCalories,
    stepsCaloriesSource: steps == null ? null : (known(row?.stepsCalories) != null ? 'device' : 'estimate'),
    workoutCalories,
    workoutCaloriesSource: workout.completed ? (workout.activeCalories != null ? 'recorded' : 'estimate') : null,
    activeCalories,
    activeCaloriesSource: deviceActiveCalories != null ? 'device' : inferredParts.length ? 'estimate' : null,
    deviceActiveCalories
  }
}

export function buildDailyBriefing(S = {}, date = new Date().toISOString().slice(0, 10)) {
  const goal = { calories: 2200, protein: 150, carbs: 250, fat: 70, ...(S.nutritionGoal || {}) }
  const totals = dailyTotals(S.nutritionEntries || [], date)
  const waterGoal = n(S.waterGoal || 2000)
  const water = waterTotal(S.waterEntries || [], date)
  const workout = workoutSnapshot(S, date)
  const weight = weightSnapshot(S, date)
  const activity = activitySnapshot(S, date, workout, weight)
  const fasting = S.fasting || {}
  const includesActivity = S.nutritionSettings?.calorieTargetIncludesActivity !== false
  const effectiveCaloriesGoal = !includesActivity && activity.activeCalories != null
    ? n(goal.calories) + activity.activeCalories
    : n(goal.calories)
  const delta = { calories: signed(effectiveCaloriesGoal - n(totals.calories)), protein: signed(n(goal.protein) - n(totals.protein)) }
  const remaining = { calories: Math.max(0, delta.calories), protein: Math.max(0, delta.protein) }
  const over = { calories: Math.max(0, -delta.calories), protein: Math.max(0, -delta.protein) }
  let recommendation
  if (workout.planned && !workout.completed) {
    recommendation = { tone: 'acc', type: 'training', title: 'Training is the next priority', detail: `${workout.plannedName} is planned today. Log the session so nutrition and performance stay connected.`, action: 'Open workout' }
  } else if (goal.protein > 0 && remaining.protein >= 30) {
    recommendation = { tone: 'orange', type: 'nutrition', title: 'Close the protein gap', detail: `${signed(remaining.protein)} g remain for today. Add a protein-rich meal rather than compensating at night.`, action: 'Open nutrition' }
  } else if (waterGoal > 0 && water < waterGoal * .6) {
    recommendation = { tone: 'blue', type: 'hydration', title: 'Hydration is behind', detail: `${signed(Math.max(0, waterGoal - water))} ml remain to reach your water goal.`, action: 'Log water' }
  } else if (workout.averageRir != null && workout.averageRir <= 1) {
    recommendation = { tone: 'violet', type: 'recovery', title: 'Keep recovery in view', detail: `Your logged average is ${workout.averageRir} RIR today. Avoid adding unplanned volume until you see how you recover.`, action: 'Review progress' }
  } else if (!workout.completed && !workout.planned && !totals.calories) {
    recommendation = { tone: 'neutral', type: 'logging', title: 'Create a useful baseline', detail: 'Log your first meal or session today so tomorrow’s briefing can be specific.', action: 'Open nutrition' }
  } else {
    recommendation = { tone: 'acc', type: 'consistency', title: 'Keep the plan consistent', detail: 'Nothing currently overrides the basics: complete the planned work and record what you eat and drink.', action: 'Review coach' }
  }
  return {
    date,
    workout,
    activity,
    nutrition: { totals, goal, effectiveCaloriesGoal, includesActivity, delta, remaining, over, loggedEntries: (S.nutritionEntries || []).filter(item => item?.date === date).length },
    hydration: { water, goal: waterGoal, remaining: Math.max(0, waterGoal - water) },
    fasting: { active: !!fasting.active, goalHours: n(fasting.goalHours || 16), startedAt: fasting.startedAt || null },
    weight,
    recommendation
  }
}
