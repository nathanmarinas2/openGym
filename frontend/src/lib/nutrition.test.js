import { describe, expect, it } from 'vitest'
import { dailyTotals, filterFoods, healthScore, LOCAL_FOODS, localCoachInsights, normalizeFood, nutritionPeriod, nutritionPeriodSummary, recipePerServing, recipeTotals, scaleNutrients, searchFoods, waterTotal } from './nutrition.js'

describe('nutrition helpers', () => {
  const food = normalizeFood({
    code: '123', product_name: 'Oats', brands: 'Example', nutrition_grade_fr: 'a',
    categories_tags: ['en:breakfast-cereals'], labels_tags: ['en:vegan'],
    nutriments: {
      'energy-kcal_100g': 380, proteins_100g: 13, carbohydrates_100g: 68,
      fat_100g: 7, fiber_100g: 10, sugars_100g: 1, salt_100g: .1
    }
  })

  it('normalizes a product and scales nutrients by grams', () => {
    expect(food.name).toBe('Oats')
    expect(food.grade).toBe('a')
    expect(scaleNutrients(food, 50)).toMatchObject({ calories: 190, protein: 6.5, carbs: 34 })
  })

  it('sums only entries from the selected day', () => {
    const totals = dailyTotals([
      { date: '2026-08-24', grams: 50, food },
      { date: '2026-08-23', grams: 100, food }
    ], '2026-08-24')
    expect(totals.calories).toBe(190)
    expect(totals.protein).toBe(6.5)
  })

  it('filters by grade, protein and sugar', () => {
    const highProtein = { ...food, id: 'protein', name: 'Protein yogurt', grade: 'b', categories: ['dairy'], per100: { ...food.per100, protein: 10, sugar: 4 } }
    expect(filterFoods([food, highProtein], { grade: 'b', minProtein: 8, maxSugar: 5 })).toHaveLength(1)
    expect(filterFoods([food, highProtein], { category: 'breakfast cereals' })).toHaveLength(1)
  })

  it('searches the built-in catalogue without a network request', () => {
    expect(searchFoods({ query: 'banana' }).some(item => item.name === 'Banana')).toBe(true)
    expect(searchFoods({ query: 'plátano' }).some(item => item.name === 'Banana')).toBe(true)
    expect(searchFoods({ query: 'pavo' }).some(item => item.name === 'Turkey breast, cooked')).toBe(true)
    expect(searchFoods({ query: 'pollo' }).some(item => item.name === 'Chicken breast, cooked')).toBe(true)
    expect(searchFoods({ query: 'my bowl', foods: [{ ...food, id: 'manual:bowl', name: 'My bowl' }] })).toHaveLength(1)
  })

  it('keeps the photographed product available as an offline barcode fallback', () => {
    const food = LOCAL_FOODS.find(item => item.code === '8480012010648')
    expect(food).toMatchObject({ name: 'Pizza fresca 4 quesos', brand: '' })
    expect(food.per100).toMatchObject({ calories: 266, protein: 15, carbs: 26, fat: 11, salt: 1.6 })
  })

  it('explains a transparent composition score without claiming medical certainty', () => {
    const clean = healthScore(food)
    const processed = healthScore({ ...food, additives: ['citric acid', 'stabilizer'], novaGroup: 4, per100: { ...food.per100, sugar: 24, salt: 1.8 } })
    expect(clean.score).toBeGreaterThan(processed.score)
    expect(processed.additiveCount).toBe(2)
    expect(processed.novaGroup).toBe(4)
    expect(['good', 'moderate', 'low']).toContain(processed.tone)
    expect(processed.breakdown.negative.map(item => item.key)).toEqual(['additives', 'salt', 'saturatedFat', 'sugar'])
    expect(processed.breakdown.positive.map(item => item.key)).toEqual(['protein', 'fiber', 'energy'])
  })

  it('calculates recipe servings and hydration independently', () => {
    const recipe = { servings: 2, ingredients: [{ grams: 100, food }, { grams: 50, food }] }
    expect(recipeTotals(recipe).calories).toBe(570)
    expect(recipePerServing(recipe).protein).toBe(9.75)
    expect(waterTotal([{ date: '2026-08-24', ml: 500 }, { date: '2026-08-23', ml: 1000 }], '2026-08-24')).toBe(500)
  })

  it('builds a period oldest-first and ignores unlogged days in averages', () => {
    const entries = [
      { date: '2026-08-23', grams: 100, food },
      { date: '2026-08-24', grams: 50, food }
    ]
    const rows = nutritionPeriod({ entries, goal: { calories: 200, protein: 10 }, endDate: '2026-08-24', days: 3 })
    expect(rows.map(row => row.date)).toEqual(['2026-08-22', '2026-08-23', '2026-08-24'])
    expect(rows[0].logged).toBe(false)
    expect(nutritionPeriodSummary(rows, { calories: 200, protein: 10 }).trackedDays).toBe(2)
    expect(nutritionPeriodSummary(rows, { calories: 200, protein: 10 }).avgCalories).toBe(285)
  })

  it('returns local coach signals without a provider', () => {
    const insights = localCoachInsights({ totals: { calories: 1000, protein: 40 }, goal: { calories: 2200, protein: 150 }, water: 300, waterGoal: 2000 })
    expect(insights.map(item => item.key)).toEqual(expect.arrayContaining(['proteinLow', 'waterLow']))
  })
})
