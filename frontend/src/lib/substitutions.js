import { buildSets, modeOf } from './history.js'
import { substitutionsFor } from './equipment.js'

export function substitutionCandidates(S, exercise, limit = 6) {
  return substitutionsFor(S, exercise, limit)
}

// A swap is scoped to the active session. It keeps the superset id and the prescribed
// configuration, then rebuilds untouched sets for the replacement exercise. The routine
// template and finished workout history are never changed by this helper.
export function replaceActiveEntry(S, entry, replacement) {
  const target = { ...(entry?.target || {}), id: replacement.id }
  if (!target.mode) target.mode = modeOf(target)
  return {
    ...entry,
    id: replacement.id,
    target,
    sets: buildSets(S, target),
    substitutionOf: entry.id,
    substitutionReason: 'pain-or-fatigue'
  }
}
