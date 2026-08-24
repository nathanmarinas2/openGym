import { describe, expect, it } from 'vitest'
import { buildPlanBundle, decodePlanToken, encodePlanToken, parsePlan } from './plan-share.js'

describe('plan read-only sharing', () => {
  const S = {
    unit: 'kg',
    routines: [{ id: 'r1', name: 'Push', emoji: 'arm', ex: [{ id: '0007', sets: 3, reps: 8, weight: 40 }] }],
    week: { 1: 'r1' }, customEx: [], workouts: [], bodyweight: []
  }

  it('round trips a unicode-safe token', () => {
    const bundle = buildPlanBundle(S, 'Rutina de Nathan 💪')
    expect(decodePlanToken(encodePlanToken(bundle))).toMatchObject({ name: 'Rutina de Nathan 💪', opengym_plan: 1 })
  })

  it('validates a decoded plan and reports its schedule', () => {
    const parsed = parsePlan(decodePlanToken(encodePlanToken(buildPlanBundle(S, 'Push'))))
    expect(parsed.routineCount).toBe(1)
    expect(parsed.exerciseCount).toBe(1)
    expect(parsed.scheduledDays).toBe(1)
    expect(parsed.dropped).toBe(0)
  })
})
