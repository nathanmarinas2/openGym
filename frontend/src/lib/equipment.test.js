import { describe, expect, it } from 'vitest'
import { activeProfile, availableExercise, newProfile, substitutionsFor } from './equipment.js'
import { EXIDX } from './exercises.js'

describe('equipment profiles', () => {
  const S = { equipmentProfiles: [{ id: 'gym', name: 'Gym', items: ['body weight', 'cable'] }], activeEquipmentProfile: 'gym', customEx: [] }

  it('selects the active profile and filters exercises', () => {
    expect(activeProfile(S).name).toBe('Gym')
    expect(availableExercise(S, EXIDX['0007'])).toBe(true)
    expect(availableExercise(S, { id: 'x', eq: 'barbell' })).toBe(false)
  })

  it('ranks available substitutions by movement context', () => {
    const alternatives = substitutionsFor(S, EXIDX['0007'], 3)
    expect(alternatives.length).toBeGreaterThan(0)
    expect(alternatives.every(e => ['body weight', 'cable'].includes(e.eq))).toBe(true)
  })

  it('creates named profiles with unique ids', () => {
    const profile = newProfile('Travel', ['body weight'])
    expect(profile).toMatchObject({ name: 'Travel', items: ['body weight'] })
    expect(profile.id).toBeTruthy()
  })
})
