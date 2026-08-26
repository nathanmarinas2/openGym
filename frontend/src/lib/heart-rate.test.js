import { describe, expect, it } from 'vitest'
import { estimatedMaxHr, heartRateZones, sessionHeartRate } from './heart-rate.js'

describe('heart-rate profile', () => {
  it('supports Tanaka, Fox and Gulati formulas', () => {
    expect(estimatedMaxHr(30, 'tanaka')).toBe(187)
    expect(estimatedMaxHr(30, 'fox')).toBe(190)
    expect(estimatedMaxHr(30, 'gulati')).toBe(180)
  })
  it('prioritises a manual maximum and uses Karvonen when resting HR exists', () => {
    const zones = heartRateZones({ age: 30, maxHr: 190, zoneMethod: 'karvonen', restingHr: 60 })
    expect(zones[0]).toMatchObject({ min: 125, max: 138, method: 'karvonen' })
    expect(sessionHeartRate({ averageHeartRate: 150, maxHeartRate: 175 }, { age: 30, maxHr: 190, restingHr: 60 }).recorded).toBe(true)
  })
  it('does not invent a zone for an unrecorded session', () => {
    expect(sessionHeartRate({ d: '2026-08-24' }, { age: 30 }).recorded).toBe(false)
  })
})
