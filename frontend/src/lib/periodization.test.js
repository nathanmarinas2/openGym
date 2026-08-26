import { describe, expect, it } from 'vitest'
import { applyPhaseAdjustment, currentCyclePhase, periodizationStats } from './periodization.js'

describe('periodization', () => {
  const S = { planCycles: [{ id: 'c1', name: 'Block', goal: 'strength', startDate: '2026-01-05', phases: [{ id: 'p1', name: 'Build', weekCount: 4, routineIds: ['r1'] }, { id: 'p2', name: 'Deload', focus: 'deload', weekCount: 1, routineIds: ['r1'] }] }], workouts: [{ id: 'w1', d: '2026-01-12', vol: 100, entries: [{ sets: [{ done: true, setType: 'working' }] }] }] }
  it('resolves the current phase by date without changing templates', () => {
    expect(currentCyclePhase(S, '2026-01-20').phase.id).toBe('p1')
    expect(currentCyclePhase(S, '2026-02-04').phase.id).toBe('p2')
    const cfg = { sets: 5, weight: 100 }
    expect(applyPhaseAdjustment(cfg, currentCyclePhase(S, '2026-02-04'))).toMatchObject({ sets: 3, weight: 90 })
    expect(cfg).toEqual({ sets: 5, weight: 100 })
  })
  it('groups finished sessions by cycle and phase', () => {
    expect(periodizationStats(S)[0]).toMatchObject({ cycleId: 'c1', phaseId: 'p1', workouts: 1, volume: 100 })
  })
})
