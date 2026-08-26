import { uid } from './format.js'
import { normalizeCycle } from './periodization.js'
import { PLAN_DRAFT_SCHEMA, validatePlanDraft } from './plan-validator.js'

const clone = value => JSON.parse(JSON.stringify(value))
const ACTIONS = new Set(['review_week', 'log_food', 'create_menu', 'adapt_training', 'missing_data', 'suggest_deload', 'suggest_routine', 'suggest_cycle'])
const text = (value, max) => String(value == null ? '' : value).trim().slice(0, max)

export function validateCoachAction(action = {}) {
  if (!action || typeof action !== 'object' || Array.isArray(action)) return { valid: false, error: 'Action must be an object.' }
  if (!ACTIONS.has(action.type)) return { valid: false, error: 'Action type is not allowed.' }
  if (!text(action.title, 240)) return { valid: false, error: 'Action title is required.' }
  if (action.description != null && text(action.description, 500) !== String(action.description).trim()) return { valid: false, error: 'Action description is too long.' }
  const payload = action.payload == null ? {} : action.payload
  if (typeof payload !== 'object' || Array.isArray(payload)) return { valid: false, error: 'Action payload must be an object.' }
  return { valid: true, value: { type: action.type, title: text(action.title, 240), description: text(action.description, 500), payload: clone(payload), requiresConfirmation: true } }
}

export function normalizeCoachDraft(draft) {
  const result = validatePlanDraft({ ...(draft || {}), schema: PLAN_DRAFT_SCHEMA })
  if (!result.valid) return result
  return result
}

export function diffPlanDraft(state = {}, draft = {}) {
  const validation = normalizeCoachDraft(draft)
  if (!validation.valid) return { valid: false, errors: validation.errors, changes: [] }
  const value = validation.value
  const existingNames = new Set((state.routines || []).map(routine => routine.name?.trim().toLowerCase()).filter(Boolean))
  const changes = value.routines.map((routine, index) => ({
    key: `routine:${index}:${routine.name}`,
    type: 'add_routine', title: routine.name, description: `${routine.exercises.length} exercises`, selected: !existingNames.has(routine.name.toLowerCase()), routine
  }))
  if (value.cycle) changes.push({ key: `cycle:${value.cycle.name || 'new'}`, type: 'add_cycle', title: value.cycle.name || 'Training cycle', description: `${value.cycle.phases?.length || 0} phases`, selected: true, cycle: value.cycle })
  return { valid: true, value, changes }
}

function addRoutine(state, routine) {
  const id = uid()
  state.routines = state.routines || []
  state.routines.push({ ...clone(routine), id, ex: (routine.ex || routine.exercises || []).map(exercise => ({ ...clone(exercise), id: exercise.id || uid() })) })
  return id
}

export function createPlanSnapshot(state = {}, reason = 'Coach plan change') {
  return { id: uid(), createdAt: new Date().toISOString(), reason: text(reason, 200), routines: clone(state.routines || []), week: clone(state.week || {}), planCycles: clone(state.planCycles || []) }
}

export function applyPlanDraft(state, draft, selectedKeys) {
  const diff = diffPlanDraft(state, draft)
  if (!diff.valid) return { applied: false, errors: diff.errors, snapshot: null, changes: [] }
  const selected = selectedKeys == null ? new Set(diff.changes.filter(change => change.selected).map(change => change.key)) : new Set(selectedKeys)
  const snapshot = createPlanSnapshot(state, `Applied Coach draft: ${diff.value.title || 'plan'}`)
  const routineIds = new Map()
  const applied = []
  for (const change of diff.changes.filter(item => item.type === 'add_routine')) {
    if (!selected.has(change.key)) continue
    routineIds.set(change.routine.id, addRoutine(state, change.routine))
    applied.push(change.key)
  }
  for (const change of diff.changes.filter(item => item.type === 'add_cycle')) {
    if (!selected.has(change.key)) continue
    const source = change.cycle
    const cycle = normalizeCycle({ ...clone(source), id: uid(), phases: (source.phases || []).map(phase => ({ ...clone(phase), id: uid(), routineIds: (phase.routineIds || []).map(id => routineIds.get(id) || id) })) })
    state.planCycles = [...(state.planCycles || []), cycle]
    applied.push(change.key)
  }
  state.coachSnapshots = [snapshot, ...(state.coachSnapshots || [])].slice(0, 20)
  state.coachDrafts = [{ id: uid(), createdAt: new Date().toISOString(), title: diff.value.title, draft: clone(diff.value), appliedKeys: applied }, ...(state.coachDrafts || [])].slice(0, 20)
  return { applied: true, snapshot, applied, changes: diff.changes }
}

export function revertPlanSnapshot(state, snapshotId) {
  const snapshot = (state.coachSnapshots || []).find(item => item.id === snapshotId)
  if (!snapshot) return { reverted: false }
  state.routines = clone(snapshot.routines || [])
  state.week = clone(snapshot.week || {})
  state.planCycles = clone(snapshot.planCycles || [])
  state.coachSnapshots = (state.coachSnapshots || []).filter(item => item.id !== snapshotId)
  return { reverted: true, snapshot }
}

export const allowedCoachActionTypes = [...ACTIONS]
