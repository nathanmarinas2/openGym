import { describe, it, expect } from 'vitest'
import { buildDailyBriefing } from './briefing.js'

describe('buildDailyBriefing', () => {
  it('exposes saved rest data and daily steps without treating missing steps as zero', () => {
    const date = '2026-08-25'
    const S = {
      unit: 'kg', stepsGoal: 10000, week: {}, dayPlan: {}, routines: [], bodyweight: [],
      nutritionGoal: { calories: 2200, protein: 150, carbs: 250, fat: 70 },
      nutritionEntries: [], waterEntries: [], healthMetrics: [{ d: date, steps: 4200, source: 'Manual' }],
      fasting: { active: false }, workouts: [{ d: date, name: 'Pull', entries: [{ id: 'row', sets: [{ w: 50, r: 8, done: true }] }], restLog: [
        { kind: 'set', actualSec: 60, plannedSec: 90, completed: true },
        { kind: 'exercise', actualSec: 90, plannedSec: 120, completed: true }
      ] }]
    }
    const briefing = buildDailyBriefing(S, date)
    expect(briefing.steps).toEqual({ steps: 4200, goal: 10000, source: 'Manual' })
    expect(briefing.workout.restEntries).toBe(2)
    expect(briefing.workout.averageRestSec).toBe(75)
    expect(briefing.workout.exerciseRestEntries).toBe(1)
  })

  it('keeps an unlogged steps day distinct from zero steps', () => {
    const briefing = buildDailyBriefing({ stepsGoal: 10000, healthMetrics: [], workouts: [], routines: [], week: {}, dayPlan: [] }, '2026-08-25')
    expect(briefing.steps.steps).toBeNull()
  })
})
