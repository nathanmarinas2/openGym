import { describe, expect, it } from 'vitest'
import { createMeasurement, latestMeasurement, measurementLabel } from './body.js'

describe('body tracking', () => {
  it('creates a clean dated measurement and ignores invalid values', () => {
    const m = createMeasurement({ waist: '82.34', chest: 0, arm: 'nope' }, '2026-08-24')
    expect(m).toMatchObject({ d: '2026-08-24', waist: 82.3 })
    expect(m.chest).toBeUndefined()
    expect(measurementLabel(m)).toBe('Waist: 82.3 cm')
  })

  it('returns the latest measurement by date', () => {
    const S = { bodyMeasurements: [{ id: 'a', d: '2026-01-01', waist: 90 }, { id: 'b', d: '2026-02-01', waist: 88 }] }
    expect(latestMeasurement(S).id).toBe('b')
  })
})
