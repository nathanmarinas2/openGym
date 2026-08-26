import { describe, it, expect } from 'vitest'
import { buildDailyBriefing } from './briefing.js'

describe('buildDailyBriefing', () => {
  it('exposes rest, steps and activity estimates in the daily briefing', () => {
    const date = '2026-08-25'
    const S = {
      unit: 'kg', stepsGoal: 10000, week: {}, dayPlan: {}, routines: [], bodyweight: [{ d: date, w: 80 }],
      nutritionGoal: { calories: 2200, protein: 150, carbs: 250, fat: 70 },
      nutritionEntries: [], waterEntries: [], healthMetrics: [{ d: date, steps: 4200, source: 'Manual' }],
      fasting: { active: false }, workouts: [{ d: date, name: 'Pull', start: Date.parse(`${date}T10:00:00Z`), end: Date.parse(`${date}T11:00:00Z`), entries: [{ id: 'row', sets: [{ w: 50, r: 8, done: true }] }], restLog: [
        { kind: 'set', actualSec: 60, plannedSec: 90, completed: true },
        { kind: 'exercise', actualSec: 90, plannedSec: 120, completed: true }
      ] }]
    }
    const briefing = buildDailyBriefing(S, date)
    expect(briefing.activity.steps).toBe(4200)
    expect(briefing.activity.stepsCalories).toBe(151.2)
    expect(briefing.activity.workoutCalories).toBe(420)
    expect(briefing.activity.activeCalories).toBe(571.2)
    expect(briefing.workout.restEntries).toBe(2)
    expect(briefing.workout.averageRestSec).toBe(75)
    expect(briefing.workout.exerciseRestEntries).toBe(1)
  })

  it('keeps calories unknown when there is no weight or activity data', () => {
    const briefing = buildDailyBriefing({ week: {}, dayPlan: {}, routines: [], nutritionEntries: [], waterEntries: [], healthMetrics: [], workouts: [] }, '2026-08-25')
    expect(briefing.activity.steps).toBeNull()
    expect(briefing.activity.stepsCalories).toBeNull()
    expect(briefing.activity.workoutCalories).toBeNull()
    expect(briefing.activity.activeCalories).toBeNull()
  })

  it('can optionally include recorded activity in the available calorie target', () => {
    const date = '2026-08-25'
    const briefing = buildDailyBriefing({
      week: {}, dayPlan: {}, routines: [],
      nutritionGoal: { calories: 2200, protein: 150 }, nutritionEntries: [], waterEntries: [],
      bodyweight: [{ d: date, w: 80 }], healthMetrics: [{ d: date, steps: 10000 }],
      nutritionSettings: { calorieTargetIncludesActivity: false }, workouts: []
    }, date)
    expect(briefing.activity.activeCalories).toBe(360)
    expect(briefing.nutrition.effectiveCaloriesGoal).toBe(2560)
    expect(briefing.nutrition.remaining.calories).toBe(2560)
  })

})
