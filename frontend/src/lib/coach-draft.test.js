import { describe, expect, it } from 'vitest'
import { applyPlanDraft, createPlanSnapshot, diffPlanDraft, revertPlanSnapshot, validateCoachAction } from './coach-draft.js'

const draft = { schema: 'liftnex-plan-draft-v1', title: 'Base', rationale: 'A small block', routines: [{ id: 'r-ai', name: 'AI push', exercises: [{ id: 'bench_press', sets: 3, reps: 8 }] }], cycle: { name: 'Spring', goal: 'strength', startDate: '2026-08-26', phases: [{ id: 'p-ai', name: 'Build', weekCount: 4, routineIds: ['r-ai'] }] }, warnings: [], confidence: 'medium' }

describe('Coach plan drafts', () => {
  it('whitelists actions and exposes a reviewable diff', () => {
    expect(validateCoachAction({ type: 'review_week', title: 'Review next week' }).valid).toBe(true)
    expect(validateCoachAction({ type: 'delete_everything', title: 'No' }).valid).toBe(false)
    expect(diffPlanDraft({ routines: [{ name: 'Existing' }] }, draft).changes.map(item => item.type)).toEqual(['add_routine', 'add_cycle'])
  })
  it('applies only selected plan changes and can revert without touching history', () => {
    const state = { routines: [], week: {}, planCycles: [], workouts: [{ id: 'history' }], nutritionEntries: [{ id: 'food' }] }
    const result = applyPlanDraft(state, draft, [`routine:0:AI push`])
    expect(result.applied).toEqual(['routine:0:AI push'])
    expect(state.routines).toHaveLength(1)
    expect(state.planCycles).toHaveLength(0)
    expect(state.workouts).toEqual([{ id: 'history' }])
    expect(state.nutritionEntries).toEqual([{ id: 'food' }])
    expect(revertPlanSnapshot(state, result.snapshot.id).reverted).toBe(true)
    expect(state.routines).toEqual([])
  })
  it('creates snapshots limited to plan data', () => {
    const snapshot = createPlanSnapshot({ routines: [{ id: 'r' }], week: { 1: 'r' }, planCycles: [], workouts: [{ id: 'w' }] }, 'test')
    expect(snapshot).toMatchObject({ reason: 'test', routines: [{ id: 'r' }], week: { 1: 'r' } })
    expect(snapshot.workouts).toBeUndefined()
  })
})
