import { allExercises, equipmentOf } from './exercises.js'
import { uid } from './format.js'

export const DEFAULT_PROFILE = { id: 'home', name: 'Home', items: ['body weight'] }

export function profilesOf(S) {
  const profiles = Array.isArray(S?.equipmentProfiles) ? S.equipmentProfiles : []
  return profiles.length ? profiles : [DEFAULT_PROFILE]
}

export function activeProfile(S) {
  const profiles = profilesOf(S)
  return profiles.find(p => p.id === S?.activeEquipmentProfile) || profiles[0]
}

export function equipmentCatalog(S) {
  return equipmentOf(allExercises(S)).filter(Boolean).sort((a, b) => a.localeCompare(b))
}

export function hasEquipment(S, equipment) {
  const profile = activeProfile(S)
  if (!equipment || !profile?.items?.length) return true
  return profile.items.includes(equipment) || profile.items.includes('*')
}

export function availableExercise(S, exercise) {
  return !activeProfile(S) || hasEquipment(S, exercise?.eq)
}

export function movementPattern(exercise) {
  const name = String(exercise?.n || exercise?.name || '').toLowerCase()
  if (/squat|leg press|lunge|split squat|step up|leg extension/.test(name)) return 'squat'
  if (/deadlift|romanian|good morning|hip thrust|leg curl|glute bridge/.test(name)) return 'hinge'
  if (/bench|push ?up|chest press|chest fly|crossover|dip|pushdown|triceps extension/.test(name)) return 'push'
  if (/row|pull ?up|chin ?up|pulldown|pull down|face pull/.test(name)) return 'pull'
  if (/shoulder press|overhead press|lateral raise|front raise|rear delt|reverse fly/.test(name)) return 'upper-push'
  if (/curl/.test(name)) return 'elbow-flexion'
  if (/plank|crunch|sit[- ]?up|abdominal/.test(name)) return 'core'
  return exercise?.tg || exercise?.mg || exercise?.bp || 'general'
}

// A deterministic replacement list: same body part first, then same target/muscle group,
// then any available movement. The user still chooses the swap; the app never edits a plan
// behind their back.
export function substitutionsFor(S, exercise, limit = 5) {
  const target = exercise?.tg || exercise?.mg || ''
  const pattern = movementPattern(exercise)
  return allExercises(S)
    .filter(e => e.id !== exercise?.id && hasEquipment(S, e.eq) && (movementPattern(e) === pattern || e.tg === target || e.mg === exercise?.mg || e.bp === exercise?.bp))
    .map(e => ({ e, score: (movementPattern(e) === pattern ? 12 : 0) + (e.bp === exercise?.bp ? 8 : 0) + (e.tg === target ? 5 : 0) + (e.mg === exercise?.mg ? 3 : 0) + (e.eq === exercise?.eq ? 2 : 0) }))
    .sort((a, b) => b.score - a.score || a.e.n.localeCompare(b.e.n))
    .slice(0, limit)
    .map(x => x.e)
}

export function profileWithItems(profile, items) {
  return { ...profile, items: [...new Set(items)].sort() }
}

export function newProfile(name, items = []) {
  return { id: uid(), name: String(name || 'New gym').trim().slice(0, 40) || 'New gym', items: [...new Set(items)] }
}
