import { describe, expect, it } from 'vitest'
import { calculateRecovery, normalizeRecoveryCheckin } from './recovery.js'

describe('recovery orientation', () => {
  it('makes manual pain and fatigue signals visible without diagnosing', () => {
    const S = {
      customEx: [{ id: 'press', n: 'Press', bp: 'chest', tg: 'chest' }],
      workouts: [{ d: '2026-08-25', entries: [{ id: 'press', sets: [{ w: 50, r: 8, done: true }] }] }],
      recoveryCheckins: [normalizeRecoveryCheckin({ id: 'r1', date: '2026-08-26', energy: 2, sleepHours: 5, soreness: [{ muscle: 'chest', level: 4 }], painfulMuscles: [{ muscle: 'chest', until: '2026-08-28' }] })],
      healthMetrics: []
    }
    const result = calculateRecovery(S, '2026-08-26')
    expect(result.status).toBe('fatigued')
    expect(result.muscles.chest.status).toBe('fatigued')
    expect(result.metrics.sleepHours).toBe(5)
  })

  it('reports detraining only after a long gap and makes empty data explicit', () => {
    const trained = { customEx: [{ id: 'press', n: 'Press', bp: 'chest', tg: 'chest' }], workouts: [{ d: '2026-07-01', entries: [{ id: 'press', sets: [{ w: 50, r: 8, done: true }] }] }] }
    expect(calculateRecovery(trained, '2026-08-26').status).toBe('detraining')
    expect(calculateRecovery({}, '2026-08-26').status).toBe('insufficient')
  })
})
