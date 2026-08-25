import { describe, expect, it } from 'vitest'
import { buildLongitudinalCoachContext } from './coach.js'

const food = {
  id: 'food:chicken',
  name: 'Chicken breast',
  per100: { calories: 110, protein: 23, carbs: 0, fat: 2, fiber: 0, sugar: 0, salt: .1 }
}

const workout = (date, weight) => ({
  d: date,
  start: Date.parse(`${date}T18:00:00Z`),
  end: Date.parse(`${date}T19:00:00Z`),
  name: 'Upper body',
  entries: [{ id: 'custom-press', target: { mode: 'reps' }, sets: [{ done: true, w: weight, r: 8, rir: 2 }] }],
  prs: weight >= 60 ? ['custom-press'] : []
})

describe('longitudinal coach context', () => {
  it('aggregates complete workout, nutrition and body history without photo blobs', () => {
    const context = buildLongitudinalCoachContext({
      unit: 'kg',
      targetW: 80,
      customEx: [{ id: 'custom-press', n: 'Bench press' }],
      week: { mon: true, wed: true },
      workouts: [workout('2026-08-20', 50), workout('2026-08-24', 60)],
      nutritionEntries: [
        { date: '2026-08-20', meal: 'lunch', grams: 200, food },
        { date: '2026-08-24', meal: 'dinner', grams: 100, food }
      ],
      waterEntries: [{ date: '2026-08-24', ml: 1500 }],
      waterGoal: 2000,
      bodyweight: [{ d: '2026-08-20', w: 82 }, { d: '2026-08-24', w: 81 }],
      bodyMeasurements: [{ d: '2026-08-24', waist: 85 }],
      bodyPhotos: [{ d: '2026-08-24', image: 'data:image/jpeg;base64,secret' }],
      nutritionGoal: { calories: 2200, protein: 150, carbs: 250, fat: 70 }
    }, { date: '2026-08-24', objective: 'build', notes: 'Improve pressing strength', goal: { calories: 2200, protein: 150, carbs: 250, fat: 70 } })

    expect(context.scope).toBe('all-history')
    expect(context.training.sessions).toHaveLength(2)
    expect(context.training.exerciseProgress[0]).toMatchObject({ name: 'Bench press', sessions: 2, weightDelta: 10 })
    expect(context.nutrition.allDays).toHaveLength(2)
    expect(context.nutrition.average.protein).toBe(34.5)
    expect(context.body.weight.change).toBe(-1)
    expect(context.coverage.bodyPhotosStoredLocally).toBe(1)
    expect(context.coverage.bodyPhotosSent).toBe(false)
    expect(JSON.stringify(context)).not.toContain('secret')
  })
})
