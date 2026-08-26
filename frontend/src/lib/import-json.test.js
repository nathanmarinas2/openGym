import { describe, expect, it } from 'vitest'
import { mergePlanImport, normalizePlanImport, previewPlanImport } from './import-json.js'

describe('JSON plan importer', () => {
  it('resolves names and turns unknown exercises into reviewable customs', () => {
    const plan = previewPlanImport({ title: 'External block', routines: [{ name: 'Push', exercises: [{ name: 'Bench Press', sets: 3, reps: 8, warmupSets: 2 }, { name: 'Cable thing', bp: 'chest', sets: 2, reps: 12 }] }] }, { customEx: [] })
    expect(plan.routines[0].ex[0].id).toBe('0025')
    expect(plan.customEx).toHaveLength(1)
    expect(plan.warningCount).toBe(1)
    expect(plan.routines[0].ex[0].warmupSets).toBe(2)
  })
  it('merges with fresh routine and cycle IDs without overwriting history', () => {
    const plan = normalizePlanImport({ routines: [{ id: 'r-ai', name: 'Push', exercises: [{ id: '0025', sets: 3, reps: 8 }] }], cycle: { name: 'Block', goal: 'strength', startDate: '2026-08-26', phases: [{ name: 'Build', weekCount: 4, routineIds: ['r-ai'] }] }, week: { 1: 'r-ai' } }, { customEx: [] })
    const state = { routines: [{ id: 'r-existing', name: 'Existing', ex: [] }], week: {}, planCycles: [], workouts: [{ id: 'history' }] }
    mergePlanImport(state, plan)
    expect(state.routines).toHaveLength(2)
    expect(state.routines[1].id).not.toBe('r-ai')
    expect(state.planCycles[0].phases[0].routineIds[0]).toBe(state.routines[1].id)
    expect(state.workouts).toEqual([{ id: 'history' }])
  })
})
