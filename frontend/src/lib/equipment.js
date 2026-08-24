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

// A deterministic replacement list: same body part first, then same target/muscle group,
// then any available movement. The user still chooses the swap; the app never edits a plan
// behind their back.
export function substitutionsFor(S, exercise, limit = 5) {
  const target = exercise?.tg || exercise?.mg || ''
  return allExercises(S)
    .filter(e => e.id !== exercise?.id && hasEquipment(S, e.eq))
    .map(e => ({ e, score: (e.bp === exercise?.bp ? 8 : 0) + (e.tg === target ? 5 : 0) + (e.mg === exercise?.mg ? 3 : 0) }))
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
