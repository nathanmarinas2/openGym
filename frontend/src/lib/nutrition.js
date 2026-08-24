// Nutrition helpers kept independent from the UI so the diary remains testable,
// local-first and easy to swap to another food provider later.

export const MEALS = ['breakfast', 'lunch', 'dinner', 'snack']

export const DEFAULT_NUTRITION_GOAL = {
  calories: 2200,
  protein: 150,
  carbs: 250,
  fat: 70
}

export const NUTRIENT_KEYS = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'salt']

const localFood = (id, name, values, categories = [], aliases = []) => ({
  id: `local:${id}`, code: '', source: 'LiftNex local catalog', name, brand: '', image: '', serving: '100g',
  grade: '', categories, labels: [], aliases, per100: values
})

// Small, dependency-free starter catalogue. It keeps the diary useful on first launch,
// on a plane, and in a self-hosted instance with no food API configured. User foods logged
// previously are merged into this list by searchFoods, so the catalogue grows locally.
export const LOCAL_FOODS = [
  localFood('banana', 'Banana', { calories: 89, protein: 1.1, carbs: 22.8, fat: .3, fiber: 2.6, sugar: 12.2, salt: 0 }, ['fruit'], ['plantain', 'plátano']),
  localFood('apple', 'Apple', { calories: 52, protein: .3, carbs: 13.8, fat: .2, fiber: 2.4, sugar: 10.4, salt: 0 }, ['fruit'], ['manzana']),
  localFood('orange', 'Orange', { calories: 47, protein: .9, carbs: 11.8, fat: .1, fiber: 2.4, sugar: 9.4, salt: 0 }, ['fruit'], ['naranja']),
  localFood('strawberries', 'Strawberries', { calories: 32, protein: .7, carbs: 7.7, fat: .3, fiber: 2, sugar: 4.9, salt: 0 }, ['fruit'], ['berries', 'fresas']),
  localFood('oats', 'Oats', { calories: 389, protein: 16.9, carbs: 66.3, fat: 6.9, fiber: 10.6, sugar: 1, salt: 0 }, ['grains', 'breakfast'], ['porridge', 'oatmeal', 'avena']),
  localFood('brown rice cooked', 'Brown rice, cooked', { calories: 123, protein: 2.7, carbs: 25.6, fat: 1, fiber: 1.6, sugar: .2, salt: 0 }, ['grains', 'side dish'], ['rice', 'arroz']),
  localFood('white rice cooked', 'White rice, cooked', { calories: 130, protein: 2.7, carbs: 28.2, fat: .3, fiber: .4, sugar: .1, salt: 0 }, ['grains', 'side dish'], ['rice', 'arroz']),
  localFood('whole wheat bread', 'Whole wheat bread', { calories: 247, protein: 13, carbs: 41, fat: 4.2, fiber: 7, sugar: 6, salt: 1.1 }, ['grains', 'breakfast'], ['bread', 'toast', 'pan']),
  localFood('pasta cooked', 'Pasta, cooked', { calories: 158, protein: 5.8, carbs: 30.9, fat: .9, fiber: 1.8, sugar: .6, salt: 0 }, ['grains', 'side dish']),
  localFood('pizza margherita', 'Pizza Margherita', { calories: 250, protein: 11, carbs: 31, fat: 9, fiber: 2, sugar: 3.5, salt: 1.1 }, ['ready meals', 'grains'], ['pizza', 'pizza margarita', 'margherita']),
  localFood('pizza pepperoni', 'Pizza Pepperoni', { calories: 298, protein: 12, carbs: 30, fat: 13, fiber: 2, sugar: 3, salt: 1.4 }, ['ready meals', 'grains'], ['pizza', 'pepperoni']),
  localFood('hamburger', 'Hamburger with bun', { calories: 250, protein: 13, carbs: 24, fat: 11, fiber: 1.5, sugar: 4, salt: 1.1 }, ['ready meals', 'protein'], ['burger', 'hamburguesa']),
  localFood('french fries', 'French fries', { calories: 312, protein: 3.4, carbs: 41, fat: 15, fiber: 3.8, sugar: .3, salt: .6 }, ['ready meals', 'side dish'], ['chips', 'patatas fritas']),
  localFood('corn flakes', 'Corn flakes', { calories: 357, protein: 7.5, carbs: 84, fat: .4, fiber: 3.3, sugar: 8, salt: .9 }, ['grains', 'breakfast'], ['cereal', 'cereales']),
  localFood('granola', 'Granola', { calories: 471, protein: 10, carbs: 64, fat: 20, fiber: 8, sugar: 23, salt: .3 }, ['grains', 'breakfast'], ['muesli']),
  localFood('potato boiled', 'Potato, boiled', { calories: 87, protein: 1.9, carbs: 20.1, fat: .1, fiber: 1.8, sugar: .9, salt: 0 }, ['vegetables', 'side dish']),
  localFood('sweet potato', 'Sweet potato, baked', { calories: 90, protein: 2, carbs: 20.7, fat: .2, fiber: 3.3, sugar: 6.5, salt: 0 }, ['vegetables', 'side dish'], ['yam']),
  localFood('chicken breast', 'Chicken breast, cooked', { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, salt: .2 }, ['meat', 'protein'], ['pollo']),
  localFood('salmon', 'Salmon, baked', { calories: 208, protein: 20.4, carbs: 0, fat: 13.4, fiber: 0, sugar: 0, salt: .6 }, ['fish', 'protein'], ['salmón']),
  localFood('tuna', 'Tuna, canned in water', { calories: 116, protein: 25.5, carbs: 0, fat: .8, fiber: 0, sugar: 0, salt: .9 }, ['fish', 'protein'], ['canned tuna']),
  localFood('egg', 'Egg', { calories: 143, protein: 12.6, carbs: .7, fat: 9.5, fiber: 0, sugar: .4, salt: .4 }, ['protein', 'breakfast'], ['eggs', 'huevo']),
  localFood('greek yogurt', 'Greek yogurt, plain', { calories: 59, protein: 10.3, carbs: 3.6, fat: .4, fiber: 0, sugar: 3.2, salt: .1 }, ['dairy', 'breakfast'], ['yogurt', 'yogur']),
  localFood('milk', 'Milk, semi-skimmed', { calories: 47, protein: 3.2, carbs: 4.8, fat: 1.6, fiber: 0, sugar: 4.8, salt: .1 }, ['dairy', 'breakfast'], ['leche']),
  localFood('cheddar', 'Cheddar cheese', { calories: 402, protein: 25, carbs: 1.3, fat: 33, fiber: 0, sugar: 0, salt: 1.5 }, ['dairy', 'protein'], ['cheese', 'queso']),
  localFood('tofu', 'Tofu, firm', { calories: 76, protein: 8.1, carbs: 1.9, fat: 4.8, fiber: .3, sugar: .6, salt: .1 }, ['plant protein', 'protein']),
  localFood('lentils', 'Lentils, cooked', { calories: 116, protein: 9, carbs: 20.1, fat: .4, fiber: 7.9, sugar: 1.8, salt: 0 }, ['legumes', 'plant protein'], ['lentejas']),
  localFood('chickpeas', 'Chickpeas, cooked', { calories: 164, protein: 8.9, carbs: 27.4, fat: 2.6, fiber: 7.6, sugar: 4.8, salt: .1 }, ['legumes', 'plant protein'], ['garbanzo', 'garbanzos']),
  localFood('black beans', 'Black beans, cooked', { calories: 132, protein: 8.9, carbs: 23.7, fat: .5, fiber: 8.7, sugar: .3, salt: .1 }, ['legumes', 'plant protein']),
  localFood('avocado', 'Avocado', { calories: 160, protein: 2, carbs: 8.5, fat: 14.7, fiber: 6.7, sugar: .7, salt: 0 }, ['fruit', 'healthy fats'], ['aguacate']),
  localFood('olive oil', 'Olive oil', { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, salt: 0 }, ['healthy fats', 'cooking'], ['oil', 'aceite de oliva']),
  localFood('almonds', 'Almonds', { calories: 579, protein: 21.2, carbs: 21.6, fat: 49.9, fiber: 12.5, sugar: 4.4, salt: 0 }, ['nuts', 'snack'], ['almendras']),
  localFood('peanut butter', 'Peanut butter', { calories: 588, protein: 25, carbs: 20, fat: 50, fiber: 6, sugar: 9.2, salt: 1 }, ['nuts', 'breakfast'], ['peanuts']),
  localFood('whey protein', 'Whey protein powder', { calories: 400, protein: 80, carbs: 8, fat: 6, fiber: 0, sugar: 2, salt: 1 }, ['supplement', 'protein'], ['protein powder']),
  localFood('tomato', 'Tomato', { calories: 18, protein: .9, carbs: 3.9, fat: .2, fiber: 1.2, sugar: 2.6, salt: .04 }, ['vegetables'], ['tomate']),
  localFood('broccoli', 'Broccoli', { calories: 34, protein: 2.8, carbs: 6.6, fat: .4, fiber: 2.6, sugar: 1.7, salt: .04 }, ['vegetables'], ['brócoli']),
  localFood('spinach', 'Spinach', { calories: 23, protein: 2.9, carbs: 3.6, fat: .4, fiber: 2.2, sugar: .4, salt: .2 }, ['vegetables', 'leafy greens'], ['espinaca']),
  localFood('mixed vegetables', 'Mixed vegetables', { calories: 65, protein: 3.5, carbs: 12, fat: .5, fiber: 4, sugar: 4, salt: .2 }, ['vegetables']),
  localFood('honey', 'Honey', { calories: 304, protein: .3, carbs: 82.4, fat: 0, fiber: .2, sugar: 82.1, salt: 0 }, ['sweeteners']),
  localFood('dark chocolate', 'Dark chocolate, 70%', { calories: 598, protein: 7.8, carbs: 45.9, fat: 42.6, fiber: 10.9, sugar: 24, salt: 0 }, ['snack', 'treat'], ['chocolate'])
]

const number = value => {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(',', '.'))
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

const first = (...values) => values.find(value => value != null && value !== '')

const tagName = tag => String(tag || '').replace(/^[a-z]{2}:/i, '').replace(/-/g, ' ').trim()
const searchable = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const nutrientsFrom = nutriments => ({
  calories: number(first(nutriments?.['energy-kcal_100g'], nutriments?.['energy-kcal_value'], nutriments?.['energy-kcal'])),
  protein: number(first(nutriments?.proteins_100g, nutriments?.protein_100g)),
  carbs: number(first(nutriments?.carbohydrates_100g, nutriments?.carbohydrate_100g)),
  fat: number(first(nutriments?.fat_100g, nutriments?.fats_100g)),
  fiber: number(first(nutriments?.fiber_100g, nutriments?.fibers_100g)),
  sugar: number(first(nutriments?.sugars_100g, nutriments?.sugar_100g)),
  salt: number(first(nutriments?.salt_100g))
})

const canonicalId = (source, code, name) => {
  const raw = `${source}:${code || name || 'food'}`.toLowerCase()
  return raw.replace(/[^a-z0-9:_-]+/g, '-').slice(0, 180)
}

/** Convert an Open Food Facts product into the small snapshot stored in a diary entry. */
export function normalizeFood(product, source = 'Open Food Facts') {
  if (!product) return null
  const name = String(first(product.product_name, product.generic_name, product.product_name_en, 'Unnamed food')).trim()
  const categories = Array.isArray(product.categories_tags) ? product.categories_tags.map(tagName).filter(Boolean) : []
  const labels = Array.isArray(product.labels_tags) ? product.labels_tags.map(tagName).filter(Boolean) : []
  const grade = String(first(product.nutrition_grade_fr, product.nutrition_grades, '')).toLowerCase().slice(0, 1)
  return {
    id: canonicalId(source, product.code, name),
    code: product.code ? String(product.code) : '',
    source,
    name,
    brand: String(product.brands || '').split(',')[0].trim(),
    image: product.image_front_small_url || product.image_front_url || '',
    serving: String(product.serving_size || '').trim(),
    grade: /^[a-e]$/.test(grade) ? grade : '',
    categories,
    aliases: [],
    labels,
    per100: nutrientsFrom(product.nutriments || {})
  }
}

export function scaleNutrients(food, grams = 100) {
  const factor = Math.max(0, number(grams)) / 100
  return Object.fromEntries(NUTRIENT_KEYS.map(key => [key, number(food?.per100?.[key]) * factor]))
}

export function entryNutrients(entry) {
  return scaleNutrients(entry?.food, entry?.grams)
}

export function dailyTotals(entries = [], date) {
  const totals = Object.fromEntries(NUTRIENT_KEYS.map(key => [key, 0]))
  for (const entry of entries) {
    if (date && entry?.date !== date) continue
    const values = entryNutrients(entry)
    for (const key of NUTRIENT_KEYS) totals[key] += values[key]
  }
  return totals
}

export function filterFoods(foods = [], filters = {}) {
  const query = searchable(String(filters.query || '').trim())
  const grade = searchable(filters.grade)
  const category = searchable(String(filters.category || '').trim())
  const minProtein = filters.minProtein === '' || filters.minProtein == null ? null : number(filters.minProtein)
  const maxSugar = filters.maxSugar === '' || filters.maxSugar == null ? null : number(filters.maxSugar)
  return foods.filter(food => {
    const haystack = searchable([food.name, food.brand, ...(food.aliases || []), ...(food.categories || []), ...(food.labels || [])].join(' '))
    if (query && !haystack.includes(query)) return false
    if (grade && food.grade !== grade) return false
    if (category && !haystack.includes(category)) return false
    if (minProtein != null && number(food.per100?.protein) < minProtein) return false
    if (maxSugar != null && number(food.per100?.sugar) > maxSugar) return false
    return true
  })
}

const mergeFoodSources = foods => {
  const seen = new Set()
  return [...LOCAL_FOODS, ...(foods || [])].filter(food => {
    if (!food?.id || seen.has(food.id)) return false
    seen.add(food.id)
    return true
  })
}

/** Search the local catalogue. Results never need a network request or API key. */
export function searchFoods({ query, filters = {}, foods = [] } = {}) {
  const q = String(query || '').trim()
  if (q.length < 2) return []
  return filterFoods(mergeFoodSources(foods), { ...filters, query: q }).slice(0, 32)
}

/**
 * Search the broad public food database through LiftNex's same-origin proxy.
 * Open Food Facts does not require a USDA key; local foods remain a fallback
 * so the diary is still useful when the network is unavailable.
 */
export async function searchFoodSources({ query, filters = {}, foods = [], signal } = {}) {
  const q = String(query || '').trim()
  if (q.length < 2) return []
  const local = searchFoods({ query: q, filters, foods })
  try {
    const params = new URLSearchParams({ q })
    const response = await fetch(`/api/nutrition/off/search?${params}`, { signal, headers: { Accept: 'application/json' } })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || `Open Food Facts returned ${response.status}`)
    const remote = (data.products || []).map(product => normalizeFood(product)).filter(Boolean)
    const seen = new Set()
    return filterFoods([...remote, ...mergeFoodSources(foods)].filter(food => {
      if (!food?.id || seen.has(food.id)) return false
      seen.add(food.id)
      return true
    }), { ...filters, query: q }).slice(0, 32)
  } catch (error) {
    if (local.length) return local
    throw error
  }
}

/** Look up one product by barcode. The API version is explicit so it is easy to migrate later. */
export async function lookupBarcode(code, { signal, foods = [] } = {}) {
  const barcode = String(code || '').replace(/\D/g, '')
  if (barcode.length < 6) throw new Error('Enter a valid barcode')
  const localMatch = mergeFoodSources(foods).find(food => food.code === barcode)
  if (localMatch) return localMatch
  const params = new URLSearchParams({ code: barcode })
  const response = await fetch(`/api/nutrition/off/barcode?${params}`, { signal, headers: { Accept: 'application/json' } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || `Open Food Facts returned ${response.status}`)
  if (data.status !== 1 || !data.product) throw new Error('Food not found in Open Food Facts')
  return normalizeFood({ ...data.product, code: data.product.code || barcode })
}

export const roundNutrition = value => Math.round(number(value) * 10) / 10

export function recipeTotals(recipe) {
  const totals = Object.fromEntries(NUTRIENT_KEYS.map(key => [key, 0]))
  for (const ingredient of recipe?.ingredients || []) {
    const values = scaleNutrients(ingredient.food, ingredient.grams)
    for (const key of NUTRIENT_KEYS) totals[key] += values[key]
  }
  return totals
}

export function recipePerServing(recipe) {
  const servings = Math.max(1, number(recipe?.servings) || 1)
  const totals = recipeTotals(recipe)
  return Object.fromEntries(NUTRIENT_KEYS.map(key => [key, totals[key] / servings]))
}

export function recipeAsFood(recipe) {
  const perServing = recipePerServing(recipe)
  return {
    id: `recipe:${recipe?.id || 'recipe'}`,
    code: '', source: 'LiftNex recipe', name: recipe?.name || 'Recipe', brand: '', image: '', serving: '1 serving',
    grade: '', categories: ['recipe'], labels: [], per100: perServing
  }
}

export function waterTotal(entries = [], date) {
  return entries.filter(entry => !date || entry?.date === date).reduce((sum, entry) => sum + number(entry?.ml), 0)
}

export function localCoachInsights({ totals = {}, goal = {}, water = 0, waterGoal = 2000, fasting = {} } = {}) {
  const insights = []
  const hasNutrition = !!(totals.calories || totals.protein || totals.carbs || totals.fat)
  if (!hasNutrition && !water && !fasting?.active) return [{ tone: 'neutral', key: 'startLogging' }]
  if (hasNutrition && goal.protein > 0 && totals.protein < goal.protein * .8) insights.push({ tone: 'acc', key: 'proteinLow' })
  if (hasNutrition && goal.calories > 0 && totals.calories > goal.calories * 1.15) insights.push({ tone: 'orange', key: 'caloriesHigh' })
  if (waterGoal > 0 && water < waterGoal * .6) insights.push({ tone: 'blue', key: 'waterLow' })
  if (fasting?.active) insights.push({ tone: 'violet', key: 'fastingActive' })
  if (goal.protein > 0 && totals.protein >= goal.protein) insights.push({ tone: 'acc', key: 'proteinOnTrack' })
  return insights.slice(0, 4)
}

export function compactNutritionContext({ date, totals, goal, entries = [], water, waterGoal, fasting } = {}) {
  return {
    date, totals, goal, water, waterGoal,
    fasting: fasting ? { active: !!fasting.active, goalHours: fasting.goalHours || 16, startedAt: fasting.startedAt || null } : null,
    foods: entries.slice(-30).map(entry => ({ meal: entry.meal, name: entry.food?.name, grams: entry.grams, nutrients: entryNutrients(entry) }))
  }
}

/** Search USDA only through LiftNex's authenticated server proxy; no browser API key. */
export async function searchUSDA({ query, filters = {}, signal } = {}) {
  const q = String(query || '').trim()
  if (q.length < 2) return []
  const params = new URLSearchParams({ q, pageSize: '32' })
  const response = await fetch(`/api/nutrition/usda/search?${params}`, { signal, headers: { Accept: 'application/json' } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || `USDA returned ${response.status}`)
  return filterFoods(data.foods || [], filters)
}
