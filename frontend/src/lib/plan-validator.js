import { EXIDX } from './exercises.js'

export const PLAN_DRAFT_SCHEMA = 'liftnex-plan-draft-v1'
const MAX_ROUTINES = 50
const MAX_EXERCISES = 60
const allowedGoals = new Set(['hypertrophy', 'strength', 'power', 'endurance', 'deload'])

const issue = (path, message) => ({ path, message })
const text = (value, max) => String(value == null ? '' : value).trim().slice(0, max)

export function validatePlanDraft(draft = {}) {
  const errors = []
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) return { valid: false, errors: [issue('', 'draft must be an object')], value: null }
  if (draft.schema !== PLAN_DRAFT_SCHEMA) errors.push(issue('schema', `schema must be ${PLAN_DRAFT_SCHEMA}`))
  const routines = Array.isArray(draft.routines) ? draft.routines : []
  if (!routines.length) errors.push(issue('routines', 'at least one routine is required'))
  if (routines.length > MAX_ROUTINES) errors.push(issue('routines', `at most ${MAX_ROUTINES} routines are allowed`))
  const normalizedRoutines = routines.slice(0, MAX_ROUTINES).map((routine, ri) => {
    const exercises = Array.isArray(routine?.exercises) ? routine.exercises : Array.isArray(routine?.ex) ? routine.ex : []
    if (!text(routine?.name, 100)) errors.push(issue(`routines[${ri}].name`, 'routine name is required'))
    if (exercises.length > MAX_EXERCISES) errors.push(issue(`routines[${ri}].exercises`, `at most ${MAX_EXERCISES} exercises are allowed`))
    const ex = exercises.slice(0, MAX_EXERCISES).map((item, ei) => {
      const id = text(item?.id, 80)
      const name = text(item?.name || item?.exercise, 120)
      if (!id && !name) errors.push(issue(`routines[${ri}].exercises[${ei}]`, 'exercise id or name is required'))
      const sets = Math.max(1, Math.min(50, Math.round(Number(item?.sets) || 1)))
      const reps = item?.reps == null ? undefined : Math.max(1, Math.min(200, Math.round(Number(item.reps) || 1)))
      const warmupSets = Math.max(0, Math.min(10, Math.round(Number(item?.warmupSets) || 0)))
      return { ...item, ...(id ? { id } : {}), ...(name ? { name } : {}), sets, ...(reps == null ? {} : { reps }), warmupSets }
    })
    return { ...routine, name: text(routine?.name, 100), exercises: ex, ex }
  })
  let cycle = null
  if (draft.cycle != null) {
    if (typeof draft.cycle !== 'object' || Array.isArray(draft.cycle)) errors.push(issue('cycle', 'cycle must be an object or null'))
    else {
      const goal = text(draft.cycle.goal, 30)
      if (goal && !allowedGoals.has(goal)) errors.push(issue('cycle.goal', 'unsupported cycle goal'))
      cycle = { ...draft.cycle, name: text(draft.cycle.name, 100), goal: allowedGoals.has(goal) ? goal : 'strength', startDate: text(draft.cycle.startDate, 10), phases: Array.isArray(draft.cycle.phases) ? draft.cycle.phases.slice(0, 20) : [] }
    }
  }
  const value = { schema: PLAN_DRAFT_SCHEMA, title: text(draft.title, 120), rationale: text(draft.rationale, 1500), routines: normalizedRoutines, cycle, warnings: Array.isArray(draft.warnings) ? draft.warnings.map(item => text(item, 300)).filter(Boolean).slice(0, 20) : [], confidence: ['high', 'medium', 'low'].includes(draft.confidence) ? draft.confidence : 'low' }
  return { valid: errors.length === 0, errors, value }
}

export const knownExercise = id => !!EXIDX[id]
