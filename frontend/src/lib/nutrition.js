// Nutrition helpers kept independent from the UI so the diary remains testable,
// local-first and easy to swap to another food provider later.

export const MEALS = ['breakfast', 'lunch', 'dinner', 'snack']

export const DEFAULT_NUTRITION_GOAL = {
  calories: 2200,
  protein: 150,
  carbs: 250,
  fat: 70
}

export const NUTRIENT_KEYS = [
  'calories', 'protein', 'carbs', 'fat', 'saturatedFat', 'fiber', 'sugar', 'salt',
  'sodium', 'potassium', 'calcium', 'iron', 'vitaminC', 'vitaminD'
]

const localFood = (id, name, values, categories = [], aliases = [], code = '') => ({
  id: `local:${id}`, code, source: 'LiftNex local catalog', name, brand: '', image: '', serving: '100g',
  grade: '', categories, labels: [], aliases, per100: values,
  availableNutrients: Object.fromEntries(Object.keys(values).map(key => [key, true])),
  missingNutrients: [], sourceMeta: { provider: 'LiftNex local catalog', fetchedAt: null, country: null, cacheHit: false }
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
  localFood('pizza fresca four cheese', 'Pizza fresca 4 quesos', { calories: 266, protein: 15, carbs: 26, fat: 11, fiber: 0, sugar: 1.2, salt: 1.6 }, ['ready meals', 'pizza'], ['pizza cuatro quesos', 'pizza 4 quesos', 'four cheese pizza'], '8480012010648'),
  localFood('hamburger', 'Hamburger with bun', { calories: 250, protein: 13, carbs: 24, fat: 11, fiber: 1.5, sugar: 4, salt: 1.1 }, ['ready meals', 'protein'], ['burger', 'hamburguesa']),
  localFood('french fries', 'French fries', { calories: 312, protein: 3.4, carbs: 41, fat: 15, fiber: 3.8, sugar: .3, salt: .6 }, ['ready meals', 'side dish'], ['chips', 'patatas fritas']),
  localFood('corn flakes', 'Corn flakes', { calories: 357, protein: 7.5, carbs: 84, fat: .4, fiber: 3.3, sugar: 8, salt: .9 }, ['grains', 'breakfast'], ['cereal', 'cereales']),
  localFood('granola', 'Granola', { calories: 471, protein: 10, carbs: 64, fat: 20, fiber: 8, sugar: 23, salt: .3 }, ['grains', 'breakfast'], ['muesli']),
  localFood('potato boiled', 'Potato, boiled', { calories: 87, protein: 1.9, carbs: 20.1, fat: .1, fiber: 1.8, sugar: .9, salt: 0 }, ['vegetables', 'side dish']),
  localFood('sweet potato', 'Sweet potato, baked', { calories: 90, protein: 2, carbs: 20.7, fat: .2, fiber: 3.3, sugar: 6.5, salt: 0 }, ['vegetables', 'side dish'], ['yam']),
  localFood('chicken breast', 'Chicken breast, cooked', { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, salt: .2 }, ['meat', 'protein'], ['pollo']),
  localFood('turkey breast', 'Turkey breast, cooked', { calories: 135, protein: 29, carbs: 0, fat: 1.6, fiber: 0, sugar: 0, salt: .2 }, ['meat', 'protein'], ['pavo', 'turkey', 'dinde']),
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
const OFF_DIRECT_BASE = 'https://world.openfoodfacts.net'
const OFF_FIELDS = [
  'code', 'product_name', 'generic_name', 'product_name_en', 'brands', 'image_front_small_url',
  'image_front_url', 'nutriments', 'serving_size', 'nutrition_grades', 'nutrition_grade_fr',
  'nutriscore_grade', 'nova_group', 'ingredients_text', 'additives_tags', 'allergens_tags',
  'categories_tags', 'labels_tags', 'countries_tags', 'countries', 'stores_tags'
].join(',')
const API_ORIGIN = String(import.meta.env.VITE_API_ORIGIN || '').replace(/\/$/, '')
const apiUrl = path => API_ORIGIN ? API_ORIGIN + path : path
const isStaticDemo = () => import.meta.env.VITE_DEMO === '1'
const foodSearchUrl = query => {
  if (!isStaticDemo()) return apiUrl(`/api/nutrition/off/search?${new URLSearchParams({ q: query })}`)
  const params = new URLSearchParams({ json: '1', search_terms: query, page_size: '32', page: '1', fields: OFF_FIELDS })
  return `${OFF_DIRECT_BASE}/cgi/search.pl?${params}`
}
const foodBarcodeUrl = code => {
  if (!isStaticDemo()) return apiUrl(`/api/nutrition/off/barcode?${new URLSearchParams({ code })}`)
  const params = new URLSearchParams({ fields: OFF_FIELDS })
  return `${OFF_DIRECT_BASE}/api/v2/product/${encodeURIComponent(code)}.json?${params}`
}

const foodCacheStorageKey = 'liftnex_food_search_cache_v2'
const barcodeCacheStorageKey = 'liftnex_food_barcode_cache_v2'
const readPersistedCache = key => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '{}')
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch { return {} }
}
const persistedSearchCache = readPersistedCache(foodCacheStorageKey)
const persistedBarcodeCache = readPersistedCache(barcodeCacheStorageKey)
const savePersistedCache = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* private mode/quota — memory cache still works */ }
}

// Open Food Facts contains products in many languages. Keep the interface in the
// user's language, but broaden common Spanish food terms for the remote search too.
// This is intentionally small and dependency-free; the local aliases still make
// these foods available when the public catalogue is temporarily unreachable.
const SEARCH_SYNONYMS = [
  ['pechuga de pavo', ['turkey breast', 'dinde']],
  ['pechuga de pollo', ['chicken breast', 'poulet']],
  ['pavo', ['turkey', 'turkey breast', 'dinde']],
  ['pollo', ['chicken', 'chicken breast', 'poulet']],
  ['ternera', ['beef', 'veal']],
  ['cerdo', ['pork']],
  ['jamon', ['ham']],
  ['pescado', ['fish']],
  ['atun', ['tuna']],
  ['huevo', ['egg']],
  ['leche', ['milk']],
  ['yogur', ['yogurt']],
  ['queso', ['cheese']],
  ['arroz', ['rice']],
  ['avena', ['oats', 'oatmeal']],
  ['manzana', ['apple']],
  ['platano', ['banana']],
  ['fresas', ['strawberries', 'strawberry']],
  ['pan', ['bread']],
  ['patata', ['potato']],
  ['tomate', ['tomato']]
]

const queryVariants = query => {
  const original = String(query || '').trim()
  const normalized = searchable(original)
  const variants = [original]
  for (const [source, equivalents] of SEARCH_SYNONYMS) {
    if (normalized !== source && !normalized.includes(source)) continue
    for (const equivalent of equivalents) {
      variants.push(equivalent)
      if (normalized !== source) variants.push(original.replace(new RegExp(source, 'i'), equivalent))
    }
  }
  return [...new Set(variants)].filter(Boolean).slice(0, 4)
}

const SEARCH_CACHE_TTL = 5 * 60 * 1000
const PERSISTED_CACHE_TTL = 24 * 60 * 60 * 1000
const FOOD_SEARCH_CACHE = new Map(Object.entries(persistedSearchCache).map(([key, value]) => [key, value]).filter(([, value]) => value?.at && Date.now() - value.at < PERSISTED_CACHE_TTL))
const BARCODE_CACHE = new Map(Object.entries(persistedBarcodeCache).map(([key, value]) => [key, value]).filter(([, value]) => value?.at && Date.now() - value.at < PERSISTED_CACHE_TTL))

const searchCacheKey = (query, filters = {}) => JSON.stringify([
  searchable(query),
  filters.grade || '',
  filters.maxSugar ?? '',
  filters.minProtein ?? '',
  searchable(filters.category || ''),
  searchable(filters.brand || ''),
  searchable(filters.country || '')
])

const rememberSearch = (key, foods) => {
  const value = { at: Date.now(), foods }
  FOOD_SEARCH_CACHE.set(key, value)
  const persisted = Object.fromEntries([...FOOD_SEARCH_CACHE.entries()].slice(-60))
  savePersistedCache(foodCacheStorageKey, persisted)
  if (FOOD_SEARCH_CACHE.size <= 80) return
  const oldest = [...FOOD_SEARCH_CACHE.entries()].sort((a, b) => a[1].at - b[1].at)[0]
  if (oldest) FOOD_SEARCH_CACHE.delete(oldest[0])
}

const nutrientFields = {
  calories: ['energy-kcal_100g', 'energy-kcal_value', 'energy-kcal'],
  protein: ['proteins_100g', 'protein_100g'],
  carbs: ['carbohydrates_100g', 'carbohydrate_100g'],
  fat: ['fat_100g', 'fats_100g'],
  saturatedFat: ['saturated-fat_100g', 'saturated_fat_100g'],
  fiber: ['fiber_100g', 'fibers_100g'],
  sugar: ['sugars_100g', 'sugar_100g'],
  salt: ['salt_100g'],
  sodium: ['sodium_100g'],
  potassium: ['potassium_100g'],
  calcium: ['calcium_100g'],
  iron: ['iron_100g'],
  vitaminC: ['vitamin-c_100g', 'vitamin_c_100g'],
  vitaminD: ['vitamin-d_100g', 'vitamin_d_100g']
}

const nutrientsFrom = nutriments => {
  const per100 = {}, availableNutrients = {}
  for (const key of NUTRIENT_KEYS) {
    const raw = first(...(nutrientFields[key] || []).map(field => nutriments?.[field]))
    const available = raw != null && raw !== '' && Number.isFinite(+raw)
    availableNutrients[key] = available
    per100[key] = available ? Math.max(0, +raw) : 0
  }
  return { per100, availableNutrients, missingNutrients: NUTRIENT_KEYS.filter(key => !availableNutrients[key]) }
}

const canonicalId = (source, code, name) => {
  const raw = `${source}:${code || name || 'food'}`.toLowerCase()
  return raw.replace(/[^a-z0-9:_-]+/g, '-').slice(0, 180)
}

/** Convert an Open Food Facts product into the small snapshot stored in a diary entry. */
export function normalizeFood(product, source = 'Open Food Facts', meta = {}) {
  if (!product) return null
  const name = String(first(product.product_name, product.generic_name, product.product_name_en, 'Unnamed food')).trim()
  const categories = Array.isArray(product.categories_tags) ? product.categories_tags.map(tagName).filter(Boolean) : []
  const labels = Array.isArray(product.labels_tags) ? product.labels_tags.map(tagName).filter(Boolean) : []
  const countries = Array.isArray(product.countries_tags) ? product.countries_tags.map(tagName).filter(Boolean) : String(product.countries || '').split(',').map(value => value.trim()).filter(Boolean)
  const grade = String(first(product.nutriscore_grade, product.nutrition_grade_fr, product.nutrition_grades, '')).toLowerCase().slice(0, 1)
  const nutrients = nutrientsFrom(product.nutriments || {})
  const missingFields = [...nutrients.missingNutrients]
  if (!String(product.ingredients_text || '').trim()) missingFields.push('ingredients')
  if (!grade) missingFields.push('nutriScore')
  if (!product.nova_group) missingFields.push('processing')
  return {
    id: canonicalId(source, product.code, name),
    code: product.code ? String(product.code) : '',
    source,
    name,
    brand: String(product.brands || '').split(',')[0].trim(),
    image: product.image_front_small_url || product.image_front_url || '',
    serving: String(product.serving_size || '').trim(),
    grade: /^[a-e]$/.test(grade) ? grade : '',
    novaGroup: Number.isFinite(+product.nova_group) && +product.nova_group > 0 ? +product.nova_group : null,
    additives: Array.isArray(product.additives_tags) ? product.additives_tags.map(tagName).filter(Boolean) : [],
    allergens: Array.isArray(product.allergens_tags) ? product.allergens_tags.map(tagName).filter(Boolean) : [],
    ingredientsText: String(product.ingredients_text || '').trim(),
    categories, countries,
    aliases: [],
    labels,
    per100: nutrients.per100,
    availableNutrients: nutrients.availableNutrients,
    missingNutrients: nutrients.missingNutrients,
    missingFields,
    sourceMeta: {
      provider: source,
      fetchedAt: meta.fetchedAt || product._liftNexFetchedAt || new Date().toISOString(),
      country: meta.country || countries[0] || null,
      cacheHit: !!meta.cacheHit
    }
  }
}

const SCORE_GRADE_BASE = { a: 84, b: 73, c: 61, d: 47, e: 32 }

export const nutrientKnown = (food, key) => food?.availableNutrients
  ? food.availableNutrients[key] === true
  : food?.per100?.[key] != null
const displayValue = (food, key) => nutrientKnown(food, key) ? number(food?.per100?.[key]) : '—'
const preferenceCheck = (food, preferences = {}) => {
  const avoid = String(preferences.allergens || '').split(',').map(item => searchable(item).trim()).filter(Boolean)
  const allergens = (food?.allergens || []).map(searchable)
  const allergenMatches = avoid.filter(item => allergens.some(value => value.includes(item) || item.includes(value)))
  const style = preferences.diet || 'none'
  const haystack = searchable([food?.name, food?.ingredientsText, ...(food?.categories || []), ...(food?.labels || [])].join(' '))
  const styleMismatch = style === 'vegan' && !/(vegan|plant|vegetable|legume|tofu)/.test(haystack)
    ? 'Not clearly vegan'
    : style === 'vegetarian' && /(meat|chicken|turkey|beef|pork|fish|tuna|salmon)/.test(haystack)
      ? 'May not be vegetarian'
      : ''
  const warnings = [...allergenMatches.map(item => `Allergen: ${item}`), ...(styleMismatch ? [styleMismatch] : [])]
  return { score: warnings.length ? 0 : 100, warnings, allergenMatches, styleMismatch }
}

const splitIngredients = value => {
  const parts = []
  let current = ''
  let depth = 0
  for (const character of String(value || '')) {
    if (character === '(') depth += 1
    if (character === ')') depth = Math.max(0, depth - 1)
    if ((character === ',' || character === ';') && depth === 0) {
      if (current.trim()) parts.push(current.trim())
      current = ''
      continue
    }
    current += character
  }
  if (current.trim()) parts.push(current.trim())
  return parts.filter(Boolean).slice(0, 40)
}

/**
 * A transparent LiftNex composition score, not a medical judgement or a copy of Yuka's
 * proprietary rating. It uses the public product snapshot: Nutri-Score when available,
 * sugar/salt/saturated fat, fibre/protein, declared additive count and NOVA group.
 */
export function healthScore(food, preferences = {}) {
  const values = food?.per100 || {}
  const hasData = ['calories', 'protein', 'carbs', 'fat', 'sugar', 'salt'].some(key => nutrientKnown(food, key) && (number(values[key]) > 0 || values[key] === 0)) || /^[a-e]$/.test(food?.grade || '')
  if (!hasData) return null
  let score = SCORE_GRADE_BASE[food.grade] ?? 58
  const calories = number(values.calories)
  const sugar = number(values.sugar)
  const salt = number(values.salt)
  const saturatedFat = number(values.saturatedFat)
  const fiber = number(values.fiber)
  const protein = number(values.protein)
  if (nutrientKnown(food, 'sugar') && sugar > 22) score -= 14
  else if (nutrientKnown(food, 'sugar') && sugar > 12) score -= 7
  if (nutrientKnown(food, 'salt') && salt > 1.5) score -= 14
  else if (nutrientKnown(food, 'salt') && salt > .8) score -= 7
  if (nutrientKnown(food, 'saturatedFat') && saturatedFat > 10) score -= 10
  else if (nutrientKnown(food, 'saturatedFat') && saturatedFat > 5) score -= 5
  if (nutrientKnown(food, 'fiber') && fiber >= 6) score += 7
  else if (nutrientKnown(food, 'fiber') && fiber >= 3) score += 3
  if (nutrientKnown(food, 'protein') && protein >= 15) score += 5
  else if (nutrientKnown(food, 'protein') && protein >= 8) score += 2
  const additiveCount = Array.isArray(food.additives) ? food.additives.length : 0
  score -= Math.min(15, additiveCount * 2)
  if (food.novaGroup === 4) score -= 10
  else if (food.novaGroup === 3) score -= 5
  score = Math.max(0, Math.min(100, Math.round(score)))
  const additives = Array.isArray(food.additives) ? food.additives : []
  const additiveTone = additiveCount > 5 ? 'low' : additiveCount > 0 ? 'moderate' : 'good'
  const nutrientTone = (value, warning, high, known = true) => !known ? 'unknown' : value >= high ? 'good' : value >= warning ? 'moderate' : 'neutral'
  const lowerIsBetter = (value, warning, high, known = true) => !known ? 'unknown' : value > high ? 'low' : value > warning ? 'moderate' : 'good'
  const ingredientList = splitIngredients(food.ingredientsText)
  const ingredientSignals = ingredientList.map(name => {
    const normalized = searchable(name)
    const isAdditive = additives.some(additive => {
      const tag = searchable(additive)
      return tag && (normalized.includes(tag) || tag.includes(normalized))
    })
    const isWatch = /(azucar|sugar|jarabe|syrup|glucosa|glucose|fructosa|fructose|sal|salt|grasas? hidrogenadas|hydrogenated)/.test(normalized)
    return {
      name,
      kind: 'ingredient',
      tone: isAdditive ? 'low' : isWatch ? 'moderate' : 'good',
      key: isAdditive ? 'additiveIngredient' : isWatch ? 'watchIngredient' : 'listedIngredient'
    }
  })
  const breakdown = {
    negative: [
      { key: 'additives', kind: 'negative', icon: 'sparkles', tone: additiveTone, value: additiveCount, unit: '', detail: additives.join(', ') },
      { key: 'salt', kind: 'negative', icon: 'droplet', tone: lowerIsBetter(salt, .8, 1.5, nutrientKnown(food, 'salt')), value: displayValue(food, 'salt'), unit: 'g / 100g' },
      { key: 'saturatedFat', kind: 'negative', icon: 'droplet', tone: lowerIsBetter(saturatedFat, 5, 10, nutrientKnown(food, 'saturatedFat')), value: displayValue(food, 'saturatedFat'), unit: 'g / 100g' },
      { key: 'sugar', kind: 'negative', icon: 'flame', tone: lowerIsBetter(sugar, 12, 22, nutrientKnown(food, 'sugar')), value: displayValue(food, 'sugar'), unit: 'g / 100g' }
    ],
    positive: [
      { key: 'protein', kind: 'positive', icon: 'dumbbell', tone: nutrientTone(protein, 8, 15, nutrientKnown(food, 'protein')), value: displayValue(food, 'protein'), unit: 'g / 100g' },
      { key: 'fiber', kind: 'positive', icon: 'heart', tone: nutrientTone(fiber, 3, 6, nutrientKnown(food, 'fiber')), value: displayValue(food, 'fiber'), unit: 'g / 100g' },
      { key: 'energy', kind: 'positive', icon: 'flame', tone: nutrientTone(600 - calories, 0, 200, nutrientKnown(food, 'calories')), value: displayValue(food, 'calories'), unit: 'kcal / 100g' }
    ],
    context: [
      { key: 'nutriScore', kind: 'context', icon: 'scale', tone: food.grade === 'a' || food.grade === 'b' ? 'good' : food.grade ? 'moderate' : 'neutral', value: food.grade ? food.grade.toUpperCase() : '—', unit: '' },
      { key: 'processing', kind: 'context', icon: 'plate', tone: food.novaGroup === 4 ? 'low' : food.novaGroup === 3 ? 'moderate' : food.novaGroup ? 'good' : 'neutral', value: food.novaGroup ? `NOVA ${food.novaGroup}/4` : '—', unit: '' }
    ],
    ingredients: ingredientSignals
  }
  const coreFields = ['calories', 'protein', 'carbs', 'fat', 'sugar', 'salt']
  const coreKnown = coreFields.filter(key => nutrientKnown(food, key)).length
  const confidence = coreKnown >= 5 && food.ingredientsText && food.grade && food.novaGroup ? 'high' : coreKnown >= 3 ? 'medium' : 'low'
  const confidenceReasons = [
    coreKnown < coreFields.length ? `${coreFields.length - coreKnown} core nutrient fields missing` : '',
    !food.ingredientsText ? 'ingredients not available' : '',
    !food.grade ? 'Nutri-Score not available' : '',
    !food.novaGroup ? 'processing data not available' : ''
  ].filter(Boolean)
  return {
    score,
    tone: score >= 75 ? 'good' : score >= 55 ? 'moderate' : 'low',
    grade: food.grade || '',
    additives,
    additiveCount,
    novaGroup: food.novaGroup || null,
    sugar,
    salt,
    saturatedFat,
    fiber,
    protein,
    calories: displayValue(food, 'calories'),
    confidence,
    confidenceReasons,
    missingFields: food.missingFields || [],
    personal: preferenceCheck(food, preferences),
    breakdown
  }
}

export function scaleNutrients(food, grams = 100) {
  const factor = Math.max(0, number(grams)) / 100
  return Object.fromEntries(NUTRIENT_KEYS.map(key => [key, number(food?.per100?.[key]) * factor]))
}

export function entryNutrients(entry) {
  return scaleNutrients(entry?.food, entry?.grams)
}

// Existing totals stay numeric for the diary UI. This companion report preserves the
// difference between an actual zero and a provider field that was not supplied.
export function nutritionDataQuality(entries = [], date = null) {
  const coreFields = ['calories', 'protein', 'carbs', 'fat', 'sugar', 'salt']
  const relevant = entries.filter(entry => !date || entry?.date === date)
  const valid = relevant.filter(entry => entry?.food && Number(entry?.grams) > 0)
  const missingByField = Object.fromEntries(coreFields.map(key => [key, 0]))
  let knownCells = 0
  for (const entry of valid) {
    for (const key of coreFields) {
      if (nutrientKnown(entry.food, key)) knownCells += 1
      else missingByField[key] += 1
    }
  }
  const possibleCells = valid.length * coreFields.length
  const coverage = possibleCells ? Math.round(knownCells / possibleCells * 100) : 0
  const missingFields = Object.entries(missingByField)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({ key, count }))
  const sourceCounts = {}
  for (const entry of valid) {
    const source = String(entry.food.sourceMeta?.provider || entry.food.source || 'Unknown').trim() || 'Unknown'
    sourceCounts[source] = (sourceCounts[source] || 0) + 1
  }
  return {
    entries: relevant.length,
    validEntries: valid.length,
    invalidEntries: Math.max(0, relevant.length - valid.length),
    completeEntries: valid.filter(entry => coreFields.every(key => nutrientKnown(entry.food, key))).length,
    incompleteEntries: valid.filter(entry => coreFields.some(key => !nutrientKnown(entry.food, key))).length,
    coreFields,
    coverage,
    confidence: !valid.length ? 'low' : coverage >= 95 ? 'high' : coverage >= 70 ? 'medium' : 'low',
    missingFields,
    sources: Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]).map(([source, count]) => ({ source, count }))
  }
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
  const brand = searchable(String(filters.brand || '').trim())
  const country = searchable(String(filters.country || '').trim())
  const minProtein = filters.minProtein === '' || filters.minProtein == null ? null : number(filters.minProtein)
  const maxSugar = filters.maxSugar === '' || filters.maxSugar == null ? null : number(filters.maxSugar)
  return foods.filter(food => {
    const haystack = searchable([food.name, food.brand, ...(food.aliases || []), ...(food.categories || []), ...(food.labels || [])].join(' '))
    const countryText = searchable([...(food.countries || []), food.sourceMeta?.country || ''].join(' '))
    if (query && !haystack.includes(query)) return false
    if (grade && food.grade !== grade) return false
    if (category && !haystack.includes(category)) return false
    if (brand && !searchable(food.brand).includes(brand)) return false
    if (country && !countryText.includes(country)) return false
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
 * Open Food Facts is the only source used here: results are real products and
 * brands from its worldwide catalogue, not a local approximation.
 */
export async function searchFoodSources({ query, filters = {}, signal } = {}) {
  const q = String(query || '').trim()
  if (q.length < 2) return []
  const cacheKey = searchCacheKey(q, filters)
  const cached = FOOD_SEARCH_CACHE.get(cacheKey)
  if (cached && Date.now() - cached.at < SEARCH_CACHE_TTL) return cached.foods

  const variants = queryVariants(q)
  const remote = []
  const failed = []
  const hasFilters = Object.values(filters).some(value => value !== '' && value != null)
  for (const searchTerm of variants) {
    try {
      const response = await fetch(foodSearchUrl(searchTerm), {
        signal,
        credentials: API_ORIGIN ? 'include' : 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' }
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || `Open Food Facts returned ${response.status}`)
      remote.push(...(data.products || []).map(product => normalizeFood(product, data.source || 'Open Food Facts', { fetchedAt: data.fetchedAt, cacheHit: data.cache?.hit })).filter(Boolean))
    } catch (error) {
      if (signal?.aborted) throw error
      failed.push(error)
    }
    // The query may be Spanish while the returned product is labelled in English (or the
    // reverse). A translated variant is already proof that this product matches; applying the
    // original Spanish text again would incorrectly discard turkey/chicken results.
    const filteredSoFar = remote.filter(food => filterFoods([food], { ...filters, query: searchTerm }).length > 0)
    if (remote.length >= 32 && (!hasFilters || filteredSoFar.length)) break
  }
  const remoteFiltered = filterFoods(remote, { ...filters, query: '' })
  const seen = new Set()
  const combined = remoteFiltered.filter(food => {
    if (!food?.id || seen.has(food.id)) return false
    seen.add(food.id)
    return true
  })
  const output = combined.slice(0, 32)
  if (output.length) {
    rememberSearch(cacheKey, output)
    return output
  }
  if (failed.length === variants.length) throw failed[0]
  rememberSearch(cacheKey, output)
  return output
}

/** Look up one product by barcode. The API version is explicit so it is easy to migrate later. */
export async function lookupBarcode(code, { signal, foods = [] } = {}) {
  const barcode = String(code || '').replace(/\D/g, '')
  if (barcode.length < 6) throw new Error('Enter a valid barcode')
  const cached = BARCODE_CACHE.get(barcode)
  if (cached && Date.now() - cached.at < PERSISTED_CACHE_TTL) return cached.food
  const response = await fetch(foodBarcodeUrl(barcode), {
    signal,
    credentials: API_ORIGIN ? 'include' : 'same-origin',
    cache: 'no-store',
    headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' }
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || `Open Food Facts returned ${response.status}`)
  if (!data.product || (data.status !== 1 && data.status !== 'success' && !data.code)) throw new Error('Food not found in Open Food Facts')
  const food = normalizeFood({ ...data.product, code: data.product.code || barcode }, data.source || 'Open Food Facts', { fetchedAt: data.fetchedAt, cacheHit: data.cache?.hit })
  BARCODE_CACHE.set(barcode, { at: Date.now(), food })
  savePersistedCache(barcodeCacheStorageKey, Object.fromEntries([...BARCODE_CACHE.entries()].slice(-80)))
  return food
}

export const roundNutrition = value => Math.round(number(value) * 10) / 10

// Diary entries use 100 g as the default only when no amount was supplied. Keep
// a real user-entered amount (including small values such as 2 g) intact.
export const normalizeFoodGrams = (value, fallback = 100) => {
  const grams = roundNutrition(value)
  return grams > 0 ? Math.max(1, grams) : fallback
}

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

const isoDate = value => {
  const date = value instanceof Date ? new Date(value) : new Date(`${String(value || '').slice(0, 10)}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

const isoDay = date => date.toISOString().slice(0, 10)

/** Return daily nutrition/hydration rows, oldest first, for trend cards and exports. */
export function nutritionPeriod({ entries = [], waterEntries = [], goal = DEFAULT_NUTRITION_GOAL, endDate, days = 7 } = {}) {
  const end = isoDate(endDate) || isoDate(new Date())
  const count = Math.max(1, Math.min(366, Math.round(number(days) || 7)))
  const rows = []
  for (let offset = count - 1; offset >= 0; offset--) {
    const date = new Date(end)
    date.setUTCDate(date.getUTCDate() - offset)
    const day = isoDay(date)
    const totals = dailyTotals(entries, day)
    const water = waterTotal(waterEntries, day)
    rows.push({
      date: day,
      totals,
      water,
      logged: entries.some(entry => entry?.date === day),
      caloriesPct: goal.calories > 0 ? totals.calories / goal.calories * 100 : 0,
      proteinPct: goal.protein > 0 ? totals.protein / goal.protein * 100 : 0
    })
  }
  return rows
}

/** Summarise a period without treating unlogged days as zero-calorie days. */
export function nutritionPeriodSummary(rows = [], goal = DEFAULT_NUTRITION_GOAL) {
  const tracked = rows.filter(row => row.logged)
  const avg = key => tracked.length ? tracked.reduce((sum, row) => sum + number(row.totals?.[key]), 0) / tracked.length : 0
  return {
    days: rows.length,
    trackedDays: tracked.length,
    avgCalories: avg('calories'),
    avgProtein: avg('protein'),
    avgCarbs: avg('carbs'),
    avgFat: avg('fat'),
    avgFiber: avg('fiber'),
    avgWater: rows.length ? rows.reduce((sum, row) => sum + number(row.water), 0) / rows.length : 0,
    proteinTargetDays: tracked.filter(row => goal.protein > 0 && row.totals.protein >= goal.protein * .8).length,
    calorieTargetDays: tracked.filter(row => goal.calories > 0 && row.totals.calories >= goal.calories * .8 && row.totals.calories <= goal.calories * 1.15).length
  }
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

export function compactNutritionContext({ date, totals, goal, entries = [], water, waterGoal, fasting, training = [], period = null } = {}) {
  return {
    date, totals, goal, water, waterGoal,
    fasting: fasting ? { active: !!fasting.active, goalHours: fasting.goalHours || 16, startedAt: fasting.startedAt || null } : null,
    foods: entries.slice(-30).map(entry => ({ meal: entry.meal, name: entry.food?.name, grams: entry.grams, nutrients: entryNutrients(entry) })),
    training: training.slice(-12).map(session => ({ date: session.date || session.d, name: session.name || '', exercises: session.exercises || 0, sets: session.sets || 0, volume: session.volume || 0 })),
    period: period ? {
      days: period.days,
      trackedDays: period.trackedDays,
      avgCalories: roundNutrition(period.avgCalories),
      avgProtein: roundNutrition(period.avgProtein),
      avgCarbs: roundNutrition(period.avgCarbs),
      avgFat: roundNutrition(period.avgFat),
      avgWater: roundNutrition(period.avgWater),
      proteinTargetDays: period.proteinTargetDays,
      calorieTargetDays: period.calorieTargetDays
    } : null
  }
}

/** Search USDA only through LiftNex's authenticated server proxy; no browser API key. */
export async function searchUSDA({ query, filters = {}, signal } = {}) {
  const q = String(query || '').trim()
  if (q.length < 2) return []
  const params = new URLSearchParams({ q, pageSize: '32' })
  const response = await fetch(apiUrl(`/api/nutrition/usda/search?${params}`), { signal, credentials: API_ORIGIN ? 'include' : 'same-origin', headers: { Accept: 'application/json' } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || `USDA returned ${response.status}`)
  return filterFoods(data.foods || [], filters)
}
