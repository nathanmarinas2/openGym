import { describe, expect, it } from 'vitest'
import { buildSets, workoutVolume, warmupVolume, setTypeOf } from './history.js'
import { bestSetOf } from './onerm.js'
import { applyPrescription } from './progression.js'
import { parseWorkoutCSV } from './import-csv.js'

describe('warm-up sets', () => {
  it('builds independent warm-ups before working sets', () => {
    const sets = buildSets({ exWeights: {} }, { id: '0025', sets: 2, reps: 8, weight: 80, warmupSets: 2, warmupPercent: 50 })
    expect(sets.map(setTypeOf)).toEqual(['warmup', 'warmup', 'working', 'working'])
    expect(sets.slice(0, 2).map(set => set.w)).toEqual([40, 40])
  })

  it('excludes warm-ups from volume, 1RM and progression', () => {
    const workout = { entries: [{ id: '0025', sets: [{ setType: 'warmup', done: true, w: 100, r: 10 }, { setType: 'working', done: true, w: 60, r: 5 }] }] }
    expect(workoutVolume(workout)).toBe(300)
    expect(warmupVolume(workout)).toBe(1000)
    expect(bestSetOf(workout.entries[0]).est).toBe(70)
    const sets = applyPrescription(workout.entries[0].sets.map(set => ({ ...set, done: false })), { weight: 70, reps: 5 })
    expect(sets[0].w).toBe(100)
    expect(sets[1].w).toBe(70)
  })

  it('imports and keeps setType from CSV', () => {
    const parsed = parseWorkoutCSV('Date,Exercise,Set Type,Weight,Reps\n2026-08-24,Bench Press,warmup,30,10\n2026-08-24,Bench Press,working,60,5')
    const sets = parsed.workouts[0].entries[0].sets
    expect(sets.map(setTypeOf)).toEqual(['warmup', 'working'])
    expect(parsed.warmups).toBe(1)
  })
})
