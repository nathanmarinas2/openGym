import { describe, expect, it } from 'vitest'
import { replaceActiveEntry, substitutionCandidates } from './substitutions.js'

describe('pain and fatigue substitutions', () => {
  it('keeps the superset and session prescription while replacing the exercise', () => {
    const S = { customEx: [], routines: [], workouts: [], exWeights: {}, equipmentProfiles: [{ id: 'home', items: ['body weight', 'barbell', 'dumbbell'] }], activeEquipmentProfile: 'home' }
    const entry = { id: '0025', sg: 'a', target: { sets: 3, reps: 8, weight: 50, mode: 'reps' }, sets: [{ w: 50, r: 8, done: false }] }
    const next = replaceActiveEntry(S, entry, { id: '0091', bp: 'shoulders', eq: 'barbell' })
    expect(next.id).toBe('0091')
    expect(next.sg).toBe('a')
    expect(next.target.reps).toBe(8)
    expect(next.substitutionOf).toBe('0025')
  })
  it('only suggests available exercises in the same movement family or muscle group', () => {
    const S = { customEx: [], equipmentProfiles: [{ id: 'home', items: ['body weight'] }], activeEquipmentProfile: 'home' }
    expect(substitutionCandidates(S, { id: '0025', n: 'barbell bench press', bp: 'chest', tg: 'pectorals' }).every(exercise => exercise.eq === 'body weight')).toBe(true)
  })
})
