import { describe, expect, it } from 'vitest'
import { nutritionDataQuality } from './nutrition.js'

const completeFood = {
  id: 'food:complete',
  source: 'Test source',
  per100: { calories: 100, protein: 20, carbs: 5, fat: 2, sugar: 1, salt: .2 },
  availableNutrients: { calories: true, protein: true, carbs: true, fat: true, sugar: true, salt: true }
}

const incompleteFood = {
  id: 'food:incomplete',
  source: 'Test source',
  per100: { calories: 100, protein: 20 },
  availableNutrients: { calories: true, protein: true, carbs: false, fat: false, sugar: false, salt: false }
}

describe('nutrition data quality', () => {
  it('does not treat missing nutrient fields as zero-confidence data', () => {
    const report = nutritionDataQuality([
      { id: 'entry:complete', date: '2026-08-27', grams: 100, food: completeFood },
      { id: 'entry:incomplete', date: '2026-08-27', grams: 100, food: incompleteFood }
    ])

    expect(report.entries).toBe(2)
    expect(report.completeEntries).toBe(1)
    expect(report.incompleteEntries).toBe(1)
    expect(report.coverage).toBe(67)
    expect(report.confidence).toBe('low')
    expect(report.missingFields.find(item => item.key === 'salt')?.count).toBe(1)
  })

  it('can report a single day without changing the full-history contract', () => {
    const entries = [
      { id: 'entry:one', date: '2026-08-26', grams: 100, food: completeFood },
      { id: 'entry:two', date: '2026-08-27', grams: 100, food: incompleteFood }
    ]

    expect(nutritionDataQuality(entries, '2026-08-27')).toMatchObject({
      entries: 1,
      validEntries: 1,
      incompleteEntries: 1,
      coverage: 33
    })
  })
})
