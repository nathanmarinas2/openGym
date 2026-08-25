import { describe, expect, it } from 'vitest'
import { mergeImport, parseHealthMetricsCSV, parseImport } from './import-csv.js'

describe('health metrics import', () => {
  const csv = 'date,steps,sleep hours,active calories,resting heart rate\n2026-08-24,10000,7.5,450,58\n2026-08-25,8000,6,390,62'

  it('normalizes provider-neutral daily metrics', () => {
    const parsed = parseHealthMetricsCSV(csv)
    expect(parsed.kind).toBe('healthMetrics')
    expect(parsed.healthMetrics).toEqual([
      { d: '2026-08-24', source: 'Health metrics import', steps: 10000, sleepHours: 7.5, activeCalories: 450, restingHeartRate: 58 },
      { d: '2026-08-25', source: 'Health metrics import', steps: 8000, sleepHours: 6, activeCalories: 390, restingHeartRate: 62 }
    ])
  })

  it('finds health CSVs through the general importer and merges by day', () => {
    const parsed = parseImport(csv, { unit: 'kg' })
    expect(parsed.kind).toBe('healthMetrics')
    const state = { healthMetrics: [{ d: '2026-08-24', steps: 9000 }] }
    const result = mergeImport(state, parsed)
    expect(result).toEqual({ added: 1, skipped: 1 })
    expect(state.healthMetrics[0].steps).toBe(10000)
    expect(state.healthMetrics).toHaveLength(2)
  })
})
