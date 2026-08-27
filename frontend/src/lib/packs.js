// Declarative LiftNex packs.
//
// A pack is data only: routines, optional schedule/cycles and provenance. It never
// contains JavaScript, prompts, credentials or workout history. That boundary keeps
// the format safe to exchange today and gives a future commercial catalogue a stable
// contract without turning third-party content into executable plugins.
import { buildPlanBundle, mergePlan, parsePlan } from './plan-share.js'
import { starterRoutines } from './starter.js'

export const PACK_SCHEMA = 'liftnex-pack-v1'

const clone = value => JSON.parse(JSON.stringify(value))

const packFromPlan = (plan, metadata = {}) => ({
  schema: PACK_SCHEMA,
  kind: 'plan',
  id: metadata.id || 'liftnex-user-pack',
  version: 1,
  name: metadata.name || plan.name || 'LiftNex plan pack',
  description: metadata.description || 'Declarative LiftNex training plan.',
  author: metadata.author || 'LiftNex user',
  license: metadata.license || 'User-created content',
  source: metadata.source || 'local',
  exported: plan.exported,
  // Keep the payload under one explicit key. Consumers can validate this shape before
  // touching their state, and arbitrary top-level fields are never interpreted as code.
  plan: clone(plan)
})

/** Build a portable pack from the user's plan only — never history or private metrics. */
export function buildPlanPack(S, metadata = {}) {
  return packFromPlan(buildPlanBundle(S, metadata.name || ''), metadata)
}

/**
 * Validate a pack and return a normalised, safe-to-merge view.
 * Legacy plan files are accepted as a compatibility bridge, but are presented as local
 * packs so older LiftNex exports remain useful without widening the import surface.
 */
export function parsePack(raw) {
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw
  if (!data || typeof data !== 'object') throw new Error('This is not a LiftNex pack file')

  const legacy = data.schema === 'liftnex-plan-v1' || data.opengym_plan
  const pack = data.schema === PACK_SCHEMA
    ? data
    : legacy ? packFromPlan(data, { name: data.name || 'Imported LiftNex plan', source: 'legacy-plan-file' }) : null
  if (!pack || pack.kind !== 'plan' || !pack.plan || typeof pack.plan !== 'object') {
    throw new Error('This is not a supported LiftNex pack file')
  }

  const parsed = parsePlan(pack.plan)
  return {
    schema: PACK_SCHEMA,
    kind: 'plan',
    id: String(pack.id || 'imported-pack').slice(0, 120),
    version: Number(pack.version) || 1,
    name: String(pack.name || pack.plan.name || 'Imported LiftNex plan').slice(0, 160),
    description: String(pack.description || 'Declarative LiftNex training plan.').slice(0, 500),
    author: String(pack.author || 'Unknown author').slice(0, 120),
    license: String(pack.license || 'Unspecified').slice(0, 200),
    source: String(pack.source || 'imported-file').slice(0, 200),
    bundle: parsed
  }
}

/** Merge only the declarative payload; existing routines/history are retained. */
export function mergePack(S, pack, options = {}) {
  const parsed = pack?.bundle ? pack : parsePack(pack)
  return mergePlan(S, parsed.bundle, { schedule: !!options.schedule })
}

const makeRoutines = specs => specs.map(([name, emoji, exercises]) => ({
  id: 'builtin-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  name,
  emoji,
  ex: exercises.map(([id, sets, reps]) => ({ id, sets, reps, weight: 0 }))
}))

const fullBody = makeRoutines([
  ['Full Body A', 'figureStrength', [['0025', 3, 8], ['0027', 3, 8], ['0043', 3, 10]]],
  ['Full Body B', 'kettlebell', [['0047', 3, 10], ['0085', 3, 10], ['0313', 3, 12]]],
  ['Full Body C', 'barbell', [['0025', 3, 10], ['0043', 3, 8], ['0605', 3, 12]]]
])

const fullBodyState = { routines: fullBody, week: { 1: fullBody[0].id, 3: fullBody[1].id, 5: fullBody[2].id }, customEx: [] }
const starter = starterRoutines()
const starterState = { routines: starter, week: { 1: starter[0].id, 3: starter[1].id, 5: starter[2].id }, customEx: [] }

// Built-ins are intentionally regular data. A paid catalogue can provide the same
// shape from a signed server response later, while the client still enforces this parser.
export const BUILTIN_PACKS = Object.freeze([
  packFromPlan(buildPlanBundle(starterState, 'Push / Pull / Legs'), {
    id: 'liftnex-starter-ppl', name: 'Push / Pull / Legs',
    description: 'Three-day strength template with a simple Mon / Wed / Fri schedule.',
    author: 'LiftNex', license: 'LiftNex built-in pack', source: 'bundled'
  }),
  packFromPlan(buildPlanBundle(fullBodyState, 'Full body · three days'), {
    id: 'liftnex-starter-full-body', name: 'Full body · three days',
    description: 'A compact full-body template for training three times per week.',
    author: 'LiftNex', license: 'LiftNex built-in pack', source: 'bundled'
  })
])

export const getBuiltinPacks = () => BUILTIN_PACKS.map(pack => parsePack(pack))
