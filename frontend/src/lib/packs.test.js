import { describe, expect, it } from 'vitest'
import { buildPlanPack, getBuiltinPacks, mergePack, parsePack, PACK_SCHEMA } from './packs.js'

describe('declarative LiftNex packs', () => {
  const state = {
    routines: [{ id: 'r1', name: 'Push', emoji: 'barbell', ex: [{ id: '0025', sets: 3, reps: 8, weight: 0 }] }],
    week: { 1: 'r1' }, customEx: [], workouts: [{ id: 'history' }], bodyweight: [{ d: '2026-08-27', w: 80 }]
  }

  it('exports plan data without private history', () => {
    const pack = buildPlanPack(state, { name: 'My pack', author: 'Athlete' })
    expect(pack.schema).toBe(PACK_SCHEMA)
    expect(pack.plan.routines).toHaveLength(1)
    expect(pack.plan.workouts).toBeUndefined()
    expect(pack.plan.bodyweight).toBeUndefined()
    expect(parsePack(pack).bundle.routineCount).toBe(1)
  })

  it('merges fresh routine ids and preserves history', () => {
    const pack = buildPlanPack(state)
    const target = { routines: [], week: {}, customEx: [], workouts: [{ id: 'keep' }] }
    const result = mergePack(target, parsePack(pack), { schedule: true })
    expect(result.routines).toBe(1)
    expect(target.routines[0].id).not.toBe('r1')
    expect(target.workouts).toEqual([{ id: 'keep' }])
    expect(target.week[1]).toBe(target.routines[0].id)
  })

  it('ships safe built-in data-only packs', () => {
    const packs = getBuiltinPacks()
    expect(packs.length).toBeGreaterThanOrEqual(2)
    expect(packs.every(pack => pack.kind === 'plan' && pack.bundle.routineCount > 0)).toBe(true)
    expect(packs.every(pack => !('code' in pack) && !('script' in pack))).toBe(true)
  })
})
