import { uid } from './format.js'

export const CYCLE_GOALS = ['hypertrophy', 'strength', 'power', 'endurance', 'deload']

const date = value => String(value || '').slice(0, 10)
const dayMs = 86400000
const atNoon = value => new Date(`${date(value)}T12:00:00`).getTime()

export function normalizeCycle(cycle = {}) {
  return {
    id: String(cycle.id || uid()), name: String(cycle.name || 'Training cycle').slice(0, 100),
    goal: CYCLE_GOALS.includes(cycle.goal) ? cycle.goal : 'strength', startDate: date(cycle.startDate),
    phases: (Array.isArray(cycle.phases) ? cycle.phases : []).slice(0, 20).map(phase => ({
      id: String(phase.id || uid()), name: String(phase.name || 'Phase').slice(0, 100), focus: String(phase.focus || '').slice(0, 300),
      weekCount: Math.max(1, Math.min(52, Math.round(Number(phase.weekCount) || 1))),
      routineIds: Array.isArray(phase.routineIds) ? [...new Set(phase.routineIds.map(String))].slice(0, 50) : [], notes: String(phase.notes || '').slice(0, 1000),
      adjustments: phase.adjustments && typeof phase.adjustments === 'object' ? { ...phase.adjustments } : undefined
    }))
  }
}

export function phaseWindow(cycle, phaseIndex) {
  const normalized = normalizeCycle(cycle)
  const start = atNoon(normalized.startDate)
  const offsetWeeks = normalized.phases.slice(0, phaseIndex).reduce((sum, phase) => sum + phase.weekCount, 0)
  const phase = normalized.phases[phaseIndex]
  if (!phase || !Number.isFinite(start)) return null
  return { cycle: normalized, phase, phaseIndex, startDate: new Date(start + offsetWeeks * 7 * dayMs).toISOString().slice(0, 10), endDate: new Date(start + (offsetWeeks + phase.weekCount) * 7 * dayMs - dayMs).toISOString().slice(0, 10) }
}

export function resolveCyclePhase(cycle, targetDate = new Date().toISOString()) {
  const normalized = normalizeCycle(cycle)
  if (!normalized.startDate || atNoon(targetDate) < atNoon(normalized.startDate)) return null
  let elapsedWeeks = Math.floor((atNoon(targetDate) - atNoon(normalized.startDate)) / (7 * dayMs))
  for (let index = 0; index < normalized.phases.length; index += 1) {
    const phase = normalized.phases[index]
    if (elapsedWeeks < phase.weekCount) return phaseWindow(normalized, index)
    elapsedWeeks -= phase.weekCount
  }
  return null
}

export function currentCyclePhase(S = {}, targetDate = new Date().toISOString().slice(0, 10)) {
  return (S.planCycles || []).map(normalizeCycle).filter(cycle => cycle.startDate && atNoon(targetDate) >= atNoon(cycle.startDate))
    .sort((a, b) => atNoon(b.startDate) - atNoon(a.startDate)).map(cycle => resolveCyclePhase(cycle, targetDate)).find(Boolean) || null
}

export function phaseAppliesToRoutine(phaseResult, routineId) {
  const routineIds = phaseResult?.phase?.routineIds
  return !Array.isArray(routineIds) || routineIds.length === 0 || !routineId || routineIds.includes(String(routineId))
}

export function phaseForWorkout(workout, S = {}) {
  if (workout?.phaseId || workout?.cycleId) return { cycleId: workout.cycleId || null, phaseId: workout.phaseId || null, phaseName: workout.phaseName || null }
  const phase = currentCyclePhase(S, workout?.d)
  return phase ? { cycleId: phase.cycle.id, phaseId: phase.phase.id, phaseName: phase.phase.name } : { cycleId: null, phaseId: null, phaseName: null }
}

// Adjustments are deliberately narrow and ephemeral. A deload can reduce a session's sets or
// load, but this returns a copied config and never edits the routine template.
export function applyPhaseAdjustment(cfg = {}, phase) {
  if (!phase) return { ...cfg }
  const isDeload = phase.cycle?.goal === 'deload' || /deload|descarga/i.test(`${phase.phase?.name || ''} ${phase.phase?.focus || ''}`)
  if (!isDeload) return { ...cfg }
  const setFactor = Math.max(0.4, Math.min(1, Number(phase.phase?.adjustments?.setFactor) || 0.6))
  const loadFactor = Math.max(0.7, Math.min(1, Number(phase.phase?.adjustments?.loadFactor) || 0.9))
  const out = { ...cfg, sets: Math.max(1, Math.ceil((cfg.sets || 1) * setFactor)) }
  if (out.weight > 0) out.weight = Math.round(out.weight * loadFactor * 10) / 10
  if (out.warmupWeight > 0) out.warmupWeight = Math.round(out.warmupWeight * loadFactor * 10) / 10
  return out
}

export function periodizationStats(S = {}) {
  const groups = new Map()
  for (const workout of S.workouts || []) {
    const ref = phaseForWorkout(workout, S)
    const key = `${ref.cycleId || 'none'}:${ref.phaseId || 'none'}`
    const item = groups.get(key) || { key, cycleId: ref.cycleId, phaseId: ref.phaseId, phaseName: ref.phaseName || 'Unassigned', workouts: 0, volume: 0, sets: 0 }
    item.workouts += 1; item.volume += Number(workout.vol) || 0
    item.sets += (workout.entries || []).reduce((sum, entry) => sum + (entry.sets || []).filter(set => set.done && set.setType !== 'warmup').length, 0)
    groups.set(key, item)
  }
  return [...groups.values()].map(item => ({ ...item, volume: Math.round(item.volume * 10) / 10 })).sort((a, b) => b.workouts - a.workouts)
}
