import { EXIDX } from './exercises.js'
import { uid } from './format.js'
import { matchExercise } from './import-csv.js'
import { normalizeCycle } from './periodization.js'
import { validatePlanDraft } from './plan-validator.js'

const MAX_ROUTINES = 50
const MAX_EXERCISES = 60
const clean = (value, max) => String(value == null ? '' : value).trim().slice(0, max)

function findExercise(S, item) {
  const id = clean(item?.id, 80)
  if (id && (EXIDX[id] || (S.customEx || []).some(exercise => exercise.id === id))) return { id, matchedBy: 'id' }
  const name = clean(item?.name || item?.exercise || item?.exerciseName, 120)
  const custom = (S.customEx || []).find(exercise => exercise.n?.toLowerCase() === name.toLowerCase())
  if (custom) return { id: custom.id, matchedBy: 'custom-name' }
  const matched = matchExercise(name)
  if (matched) return { id: matched, matchedBy: 'alias' }
  const customId = `custom-import-${uid()}`
  return { id: customId, matchedBy: 'custom', custom: { id: customId, n: name || 'Imported exercise', bp: clean(item?.bp || item?.muscle || 'upper legs', 50), eq: 'custom', tg: '', desc: 'Imported exercise — review before training.', custom: true } }
}

function normalizeRoutine(S, routine, warnings, routineIndex) {
  const items = Array.isArray(routine?.exercises) ? routine.exercises : Array.isArray(routine?.ex) ? routine.ex : []
  const ex = items.slice(0, MAX_EXERCISES).map((item, exerciseIndex) => {
    const found = findExercise(S, item)
    if (found.matchedBy === 'custom') warnings.push(`Unknown exercise “${found.custom.n}” was added for review.`)
    const cfg = {
      ...item, id: found.id, sets: Math.max(1, Math.min(50, Math.round(Number(item?.sets) || 1))),
      ...(item?.reps == null ? {} : { reps: Math.max(1, Math.min(200, Math.round(Number(item.reps) || 1))) }),
      ...(item?.weight == null ? {} : { weight: Math.max(0, Number(item.weight) || 0) }),
      ...(item?.setType ? { setType: item.setType === 'warmup' ? 'warmup' : 'working' } : {}),
      ...(Number(item?.warmupSets) > 0 ? { warmupSets: Math.min(10, Math.round(Number(item.warmupSets))) } : {}),
      ...(Array.isArray(item?.warmup) ? { warmup: item.warmup.slice(0, 10).map(set => ({ ...set, setType: 'warmup' })) } : {}),
      ...(item?.sg ? { sg: clean(item.sg, 60) } : {})
    }
    return cfg
  })
  if (items.length > MAX_EXERCISES) warnings.push(`Routine ${routineIndex + 1} exceeded the exercise limit; extra exercises were ignored.`)
  return { id: uid(), sourceId: clean(routine?.id, 80) || undefined, name: clean(routine?.name || routine?.title || `Imported routine ${routineIndex + 1}`, 100), emoji: clean(routine?.emoji, 30), prog: clean(routine?.prog, 30) || undefined, ex }
}

export function normalizePlanImport(raw, S = {}) {
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('JSON must contain an object')
  const sourceCustom = Array.isArray(data.customEx) ? data.customEx.filter(item => item && item.id).map(item => ({ ...item, n: item.n || item.name || item.exercise || 'Imported exercise' })) : []
  const resolverState = { ...S, customEx: [...(S.customEx || []), ...sourceCustom] }
  const draft = data.schema === 'liftnex-plan-draft-v1'
    ? validatePlanDraft(data).value
    : { schema: 'liftnex-plan-draft-v1', title: data.title || data.name || 'Imported plan', rationale: data.rationale || '', routines: data.routines || data.plans || [], cycle: data.cycle || null, warnings: [], confidence: 'low' }
  if (!draft) throw new Error('Invalid Coach draft')
  const validation = validatePlanDraft({ ...draft, schema: 'liftnex-plan-draft-v1' })
  if (!validation.valid) throw new Error(validation.errors.map(item => `${item.path}: ${item.message}`).join('; '))
  const warnings = [...(validation.value.warnings || [])]
  const customEx = []
  const routines = validation.value.routines.slice(0, MAX_ROUTINES).map((routine, index) => {
    const next = normalizeRoutine(resolverState, routine, warnings, index)
    next.ex.forEach(item => { if (item.id.startsWith('custom-import-')) customEx.push({ id: item.id, n: item.name || item.exercise || item.exerciseName || 'Imported exercise', bp: item.bp || 'upper legs', eq: 'custom', custom: true }) })
    return next
  })
  const importedCustom = sourceCustom.filter(item => routines.some(routine => routine.ex.some(exercise => exercise.id === item.id)))
  const cycles = validation.value.cycle ? [normalizeCycle({ ...validation.value.cycle, id: uid(), phases: validation.value.cycle.phases || [] })] : Array.isArray(data.planCycles) ? data.planCycles.slice(0, 20).map(normalizeCycle) : []
  return { schema: 'liftnex-plan-import-v1', title: validation.value.title, routines, customEx: [...importedCustom, ...customEx], cycle: cycles[0] || null, planCycles: cycles, week: data.week || {}, warnings: [...new Set(warnings)].slice(0, 30), confidence: validation.value.confidence }
}

export function previewPlanImport(raw, S = {}) {
  const plan = normalizePlanImport(raw, S)
  return { ...plan, routineCount: plan.routines.length, exerciseCount: plan.routines.reduce((sum, routine) => sum + routine.ex.length, 0), warningCount: plan.warnings.length }
}

export function mergePlanImport(S, plan) {
  const customIds = new Map()
  for (const exercise of plan.customEx || []) {
    const same = (S.customEx || []).find(item => item.n?.toLowerCase() === exercise.n?.toLowerCase() && item.bp === exercise.bp)
    if (same) customIds.set(exercise.id, same.id)
    else { const id = uid(); customIds.set(exercise.id, id); S.customEx = [...(S.customEx || []), { ...exercise, n: exercise.n || exercise.name || 'Imported exercise', id }] }
  }
  const routineIds = new Map()
  for (const routine of plan.routines || []) {
    const id = uid(); routineIds.set(routine.id, id); if (routine.sourceId) routineIds.set(routine.sourceId, id)
    const { sourceId, ...routineData } = routine
    S.routines.push({ ...routineData, id, ex: (routine.ex || []).map(item => ({ ...item, id: customIds.get(item.id) || item.id })) })
  }
  const cycles = plan.planCycles?.length ? plan.planCycles : plan.cycle ? [plan.cycle] : []
  if (cycles.length) S.planCycles = [...(S.planCycles || []), ...cycles.map(cycle => ({ ...cycle, id: uid(), phases: (cycle.phases || []).map(phase => ({ ...phase, id: uid(), routineIds: (phase.routineIds || []).map(id => routineIds.get(id) || id) })) }))]
  if (plan.week && typeof plan.week === 'object') for (const [day, routineId] of Object.entries(plan.week)) if (routineIds.has(routineId)) S.week[day] = routineIds.get(routineId)
  return { routines: plan.routines?.length || 0, exercises: plan.routines?.reduce((sum, routine) => sum + routine.ex.length, 0) || 0, warnings: plan.warnings || [] }
}
