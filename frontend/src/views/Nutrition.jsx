import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { api } from '../lib/api.js'
import { getLang, useLang } from '../lib/i18n.js'
import { todayISO } from '../lib/format.js'
import {
  DEFAULT_NUTRITION_GOAL, MEALS, compactNutritionContext, dailyTotals, entryNutrients,
  healthScore, localCoachInsights, lookupBarcode, nutritionPeriod, nutritionPeriodSummary, recipeAsFood,
  recipePerServing, recipeTotals, roundNutrition, searchFoodSources, waterTotal
} from '../lib/nutrition.js'
import Icon from '../components/Icon.jsx'
import { Button, Check, NumberField, SearchField, TextField } from '../components/ui.jsx'

const EN = {
  title: 'Nutrition', subtitle: 'Fuel your training with a simple food diary', date: 'Day',
  calories: 'Calories', protein: 'Protein', carbs: 'Carbs', fat: 'Fat', fiber: 'Fiber', sugar: 'Sugar', salt: 'Salt',
  goal: 'Daily goals', remaining: 'remaining', meals: 'Meals', addFood: 'Add food',
  searchPlaceholder: 'Search food, brand or ingredient', search: 'Search', searching: 'Searching…',
  barcode: 'Barcode', lookup: 'Look up', scan: 'Scan', stopScanner: 'Close scanner', scannerUnsupported: 'Camera scanning is not supported here. Enter the barcode manually.', scannerError: 'Could not access the camera. Check browser permissions.', filters: 'Filters', hideFilters: 'Hide filters',
  grade: 'Nutrition grade', all: 'All', maxSugar: 'Max sugar / 100g', minProtein: 'Min protein / 100g', category: 'Category',
  healthScore: 'LiftNex score', scoreGood: 'Good', scoreModerate: 'Moderate', scoreLow: 'Low', scoreNoData: 'Not enough data', scoreWhy: 'Why this score',
  scoreExplainer: 'Orientative composition score based on nutrition, declared additives and processing signals. Not medical advice.', scoreNutri: 'Nutri-Score', additiveCount: 'declared additives', novaGroup: 'processing group', scoreNoFlags: 'No major signals detected in the available data.',
  apply: 'Apply filters', results: 'Results', grams: 'grams', add: 'Add', noResults: 'Search for a food to see results.',
  noEntries: 'Nothing logged yet.', breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack',
  quickAdd: 'Add manually', quickAddHint: 'Useful for recipes or when the database has no match.', name: 'Food name',
  save: 'Save food', cancel: 'Cancel', source: 'Check the product label for accuracy.',
  notFound: 'No match found. Try another search or add it manually.', remove: 'Remove', target: 'Target',
  caloriesShort: 'kcal', proteinShort: 'P', carbsShort: 'C', fatShort: 'F',
  goalsHint: 'Tap a value to adjust your daily target.', enterFood: 'Enter at least a name and one nutrient value.',
  recentFoods: 'Recent foods', localDatabase: 'Food catalogue', localDatabaseHint: 'Search thousands of foods and brands; common foods remain available offline.',
  barcodeHint: 'Barcode lookup needs an internet connection.', localSource: 'Values can vary by product; check the product label.',
  micros: 'Micronutrients', microsHint: 'Daily fibre, sugar and salt', showMicros: 'Show details', hideMicros: 'Hide details',
  diary: 'Diary', recipes: 'Recipes', wellness: 'Water & fast', insights: 'Trends', coach: 'Coach', provider: 'Food source',
  calendar: 'Calendar', month: 'Month', previousMonth: 'Previous month', nextMonth: 'Next month',
  trackedDays: 'tracked days', average: 'Average', targetDays: 'target days', trainingDays: 'training days',
  logged: 'food logged',
  noTrendData: 'Log a few meals to unlock useful trends.', nutritionTrend: 'Nutrition trend',
  period7: '7 days', period30: '30 days', exportData: 'Export data', exportHint: 'Download this nutrition period for your own records or analysis.',
  exportCsv: 'CSV', exportJson: 'JSON', exported: 'Nutrition export downloaded', selectedDay: 'Selected day',
  openFoodFacts: 'Open Food Facts', usda: 'USDA', usdaHint: 'USDA is available when the server has a USDA API key.',
  createRecipe: 'Create recipe', recipeHint: 'Build a recipe from foods and save it as one serving entry.',
  servings: 'Servings', ingredients: 'Ingredients', addIngredient: 'Add ingredient', noRecipes: 'No recipes yet.',
  recipeName: 'Recipe name', recipeSearch: 'Search ingredients', saveRecipe: 'Save recipe', addToDiary: 'Add to diary',
  recipeRequired: 'Add a name and at least one ingredient.', perServing: 'per serving',
  water: 'Hydration', waterGoal: 'Daily water goal', waterHint: 'Quick log in millilitres.', addWater: 'Add water',
  customWater: 'Custom amount', waterDone: 'goal reached', fast: 'Fasting timer', fastGoal: 'Target hours', startFast: 'Start fast',
  stopFast: 'End fast', fastingNow: 'Fasting now', fastHistory: 'Recent fasts', noFasts: 'No completed fasts yet.',
  hours: 'hours', localCoach: 'Daily check-in', askCoach: 'Ask AI coach', coachConsent: 'Send a compact nutrition summary to the configured AI provider.',
  coachPrivacy: 'No provider is called until you ask. Local insights work offline.', geminiCoach: 'Gemini coach', coachNoProvider: 'The server has no AI provider configured, so these are local LiftNex insights.',
  coachFallback: 'I could not reach the provider. Use the local check-in below for now.', startLogging: 'Start by logging one meal so your targets become more useful.',
  proteinLow: 'Protein is below 80% of your target. Consider adding a protein-rich serving.', caloriesHigh: 'Calories are above your target today. Keep the next meal balanced rather than compensating aggressively.',
  waterLow: 'Hydration is still below 60% of your goal. Add a glass of water when convenient.', fastingActive: 'Your fast is running. Stop it if you feel unwell; training and health come first.',
  proteinOnTrack: 'Protein target reached. Keep the rest of the day consistent with your goal.', noAdvice: 'Your current log looks balanced. Keep recording and review the trend over several days.',
  coachDisclaimer: 'General fitness guidance only — not medical advice.', sourceOFF: 'Data from Open Food Facts.', sourceUSDA: 'Data from USDA FoodData Central.'
}

const ES = {
  title: 'Nutrición', subtitle: 'Alimenta tu entrenamiento con un diario sencillo', date: 'Día',
  calories: 'Calorías', protein: 'Proteína', carbs: 'Carbohidratos', fat: 'Grasa', fiber: 'Fibra', sugar: 'Azúcar', salt: 'Sal',
  goal: 'Objetivos diarios', remaining: 'restantes', meals: 'Comidas', addFood: 'Añadir alimento',
  searchPlaceholder: 'Busca alimento, marca o ingrediente', search: 'Buscar', searching: 'Buscando…',
  barcode: 'Código de barras', lookup: 'Consultar', scan: 'Escanear', stopScanner: 'Cerrar lector', scannerUnsupported: 'El escaneo con cámara no está disponible aquí. Introduce el código manualmente.', scannerError: 'No se pudo acceder a la cámara. Comprueba los permisos del navegador.', filters: 'Filtros', hideFilters: 'Ocultar filtros',
  grade: 'Calidad nutricional', all: 'Todos', maxSugar: 'Máx. azúcar / 100g', minProtein: 'Mín. proteína / 100g', category: 'Categoría',
  healthScore: 'Puntuación LiftNex', scoreGood: 'Buena', scoreModerate: 'Moderada', scoreLow: 'Baja', scoreNoData: 'Datos insuficientes', scoreWhy: 'Por qué esta puntuación',
  scoreExplainer: 'Puntuación orientativa de composición basada en nutrición, aditivos declarados y señales de procesado. No es consejo médico.', scoreNutri: 'Nutri-Score', additiveCount: 'aditivos declarados', novaGroup: 'grupo de procesado', scoreNoFlags: 'No se detectan señales relevantes en los datos disponibles.',
  apply: 'Aplicar filtros', results: 'Resultados', grams: 'gramos', add: 'Añadir', noResults: 'Busca un alimento para ver resultados.',
  noEntries: 'Todavía no hay registros.', breakfast: 'Desayuno', lunch: 'Comida', dinner: 'Cena', snack: 'Snack',
  quickAdd: 'Añadir manualmente', quickAddHint: 'Útil para recetas o cuando la base de datos no tiene coincidencias.', name: 'Nombre del alimento',
  save: 'Guardar alimento', cancel: 'Cancelar', source: 'Comprueba la etiqueta del producto para mayor precisión.',
  notFound: 'No hay coincidencias. Prueba otra búsqueda o añádelo manualmente.', remove: 'Eliminar', target: 'Objetivo',
  caloriesShort: 'kcal', proteinShort: 'P', carbsShort: 'C', fatShort: 'G',
  goalsHint: 'Toca un valor para ajustar tu objetivo diario.', enterFood: 'Introduce al menos un nombre y un nutriente.',
  recentFoods: 'Alimentos recientes', localDatabase: 'Catálogo de alimentos', localDatabaseHint: 'Busca miles de alimentos y marcas; los alimentos comunes siguen disponibles sin conexión.',
  barcodeHint: 'Consultar un código de barras necesita conexión a Internet.', localSource: 'Los valores pueden variar según el producto; comprueba la etiqueta.',
  micros: 'Micronutrientes', microsHint: 'Fibra, azúcar y sal del día', showMicros: 'Ver detalles', hideMicros: 'Ocultar detalles',
  diary: 'Diario', recipes: 'Recetas', wellness: 'Agua y ayuno', insights: 'Tendencias', coach: 'Coach', provider: 'Fuente de alimentos',
  calendar: 'Calendario', month: 'Mes', previousMonth: 'Mes anterior', nextMonth: 'Mes siguiente',
  trackedDays: 'días registrados', average: 'Media', targetDays: 'días en objetivo', trainingDays: 'días de entrenamiento',
  logged: 'comida registrada',
  noTrendData: 'Registra varias comidas para desbloquear tendencias útiles.', nutritionTrend: 'Tendencia nutricional',
  period7: '7 días', period30: '30 días', exportData: 'Exportar datos', exportHint: 'Descarga este periodo nutricional para guardarlo o analizarlo.',
  exportCsv: 'CSV', exportJson: 'JSON', exported: 'Exportación nutricional descargada', selectedDay: 'Día seleccionado',
  openFoodFacts: 'Open Food Facts', usda: 'USDA', usdaHint: 'USDA está disponible cuando el servidor tiene una clave configurada.',
  createRecipe: 'Crear receta', recipeHint: 'Construye una receta con alimentos y guárdala como una ración.',
  servings: 'Raciones', ingredients: 'Ingredientes', addIngredient: 'Añadir ingrediente', noRecipes: 'Todavía no hay recetas.',
  recipeName: 'Nombre de la receta', recipeSearch: 'Buscar ingredientes', saveRecipe: 'Guardar receta', addToDiary: 'Añadir al diario',
  recipeRequired: 'Añade un nombre y al menos un ingrediente.', perServing: 'por ración',
  water: 'Hidratación', waterGoal: 'Objetivo diario de agua', waterHint: 'Registro rápido en mililitros.', addWater: 'Añadir agua',
  customWater: 'Cantidad personalizada', waterDone: 'objetivo alcanzado', fast: 'Temporizador de ayuno', fastGoal: 'Horas objetivo', startFast: 'Empezar ayuno',
  stopFast: 'Terminar ayuno', fastingNow: 'Ayunando ahora', fastHistory: 'Ayunos recientes', noFasts: 'Todavía no hay ayunos terminados.',
  hours: 'horas', localCoach: 'Revisión diaria', askCoach: 'Preguntar al coach IA', coachConsent: 'Enviar un resumen nutricional al proveedor IA configurado.',
  coachPrivacy: 'No se llama a ningún proveedor hasta que lo pidas. Las recomendaciones locales funcionan sin conexión.', geminiCoach: 'Coach Gemini', coachNoProvider: 'El servidor no tiene proveedor IA configurado; estas son recomendaciones locales de LiftNex.',
  coachFallback: 'No se pudo contactar con el proveedor. Usa la revisión local mientras tanto.', startLogging: 'Empieza registrando una comida para que tus objetivos sean más útiles.',
  proteinLow: 'La proteína está por debajo del 80% de tu objetivo. Valora añadir una ración rica en proteína.', caloriesHigh: 'Hoy superas tu objetivo calórico. Mantén equilibrada la siguiente comida y evita compensaciones agresivas.',
  waterLow: 'La hidratación está por debajo del 60% de tu objetivo. Añade un vaso de agua cuando te venga bien.', fastingActive: 'Tu ayuno está activo. Termínalo si te encuentras mal; la salud y el entrenamiento van primero.',
  proteinOnTrack: 'Has alcanzado la proteína objetivo. Mantén el resto del día alineado con tu objetivo.', noAdvice: 'Tu registro actual parece equilibrado. Sigue registrando y revisa la tendencia durante varios días.',
  coachDisclaimer: 'Orientación general de fitness; no es consejo médico.', sourceOFF: 'Datos de Open Food Facts.', sourceUSDA: 'Datos de USDA FoodData Central.'
}

const labels = () => getLang() === 'es' ? ES : EN
const nice = value => roundNutrition(value).toLocaleString(getLang() === 'es' ? 'es-ES' : 'en-GB', { maximumFractionDigits: 1 })
const percent = (value, goal) => goal > 0 ? Math.min(100, Math.max(0, value / goal * 100)) : 0
const idOf = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const mealName = (meal, C) => C[meal]
const formatDuration = ms => `${Math.floor(ms / 3600000)}h ${Math.floor(ms / 60000) % 60}m`
const isoDay = date => date.toISOString().slice(0, 10)
const dateFromISO = value => new Date(`${String(value).slice(0, 10)}T00:00:00Z`)
const shiftDay = (value, amount) => { const date = dateFromISO(value); date.setUTCDate(date.getUTCDate() + amount); return isoDay(date) }
const trainingSnapshot = (workouts = [], date) => workouts.filter(workout => workout?.d === date).map(workout => {
  const entries = workout.entries || []
  const sets = entries.reduce((sum, entry) => sum + (entry.sets || []).filter(set => set.done !== false).length, 0)
  const volume = entries.reduce((sum, entry) => sum + (entry.sets || []).reduce((inner, set) => inner + (+set.w || 0) * (+set.r || 0), 0), 0)
  return { date: workout.d, name: workout.name || '', exercises: entries.length, sets, volume: roundNutrition(volume) }
})

function LocalCatalogNote({ C }) {
  return <div className="nutrition-provider nutrition-local-source" role="status"><Icon name="folder" /><div><strong>{C.localDatabase}</strong><span>{C.localDatabaseHint}</span></div></div>
}

function MacroLine({ entry, C }) {
  const n = entryNutrients(entry)
  const amount = entry.food?.source === 'LiftNex recipe' ? '1 serving' : `${nice(entry.grams)}g`
  return <span className="small muted">{amount} · {nice(n.calories)} {C.caloriesShort} · {nice(n.protein)}g {C.proteinShort} · {nice(n.carbs)}g {C.carbsShort} · {nice(n.fat)}g {C.fatShort}</span>
}

function FoodScore({ C, food }) {
  const score = healthScore(food)
  if (!score) return <span className="nutrition-score nutrition-score-unknown">{C.scoreNoData}</span>
  const label = score.tone === 'good' ? C.scoreGood : score.tone === 'moderate' ? C.scoreModerate : C.scoreLow
  const signals = []
  if (score.grade) signals.push(`${C.scoreNutri}: ${score.grade.toUpperCase()}`)
  if (score.additiveCount) signals.push(`${score.additiveCount} ${C.additiveCount}: ${score.additives.slice(0, 3).join(', ')}`)
  if (score.novaGroup) signals.push(`${C.novaGroup}: ${score.novaGroup}/4`)
  if (score.sugar > 12) signals.push(`${C.sugar}: ${nice(score.sugar)}g / 100g`)
  if (score.salt > .8) signals.push(`${C.salt}: ${nice(score.salt)}g / 100g`)
  if (score.fiber >= 3) signals.push(`${C.fiber}: ${nice(score.fiber)}g / 100g`)
  if (score.protein >= 8) signals.push(`${C.protein}: ${nice(score.protein)}g / 100g`)
  return <details className={`nutrition-score-detail ${score.tone}`}><summary><span className="nutrition-score-pill">{score.score}</span><span>{C.healthScore} · {label}</span></summary><div className="nutrition-score-popover"><strong>{C.scoreWhy}</strong><p>{C.scoreExplainer}</p>{signals.length ? <ul>{signals.slice(0, 5).map(signal => <li key={signal}>{signal}</li>)}</ul> : <p>{C.scoreNoFlags}</p>}</div></details>
}

function FoodResults({ C, results, grams, setGrams, addFood }) {
  if (!results.length) return null
  return <div className="nutrition-results" aria-live="polite"><div className="small muted nutrition-results-title">{C.results}</div>{results.map(food => <div className="nutrition-food" key={food.id}><span className="nutrition-food-icon"><Icon name="plate" /></span><div className="nutrition-food-main"><div className="nutrition-food-name">{food.name}</div><div className="small muted">{food.brand ? `${food.brand} · ` : ''}{nice(food.per100.calories)} {C.caloriesShort} · {nice(food.per100.protein)}g {C.proteinShort}{food.grade ? ` · ${food.grade.toUpperCase()}` : ''}</div><FoodScore C={C} food={food} /></div><div className="nutrition-add-controls"><NumberField value={grams[food.id] || 100} decimal={false} aria-label={`${C.grams} ${food.name}`} onChange={value => setGrams(g => ({ ...g, [food.id]: value }))} /><span>g</span><Button size="xs" variant="primary" icon="plus" onClick={() => addFood(food)}>{C.add}</Button></div></div>)}</div>
}

function BarcodeScanner({ C, onDetected, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const detectedRef = useRef(onDetected)
  const [error, setError] = useState('')
  useEffect(() => { detectedRef.current = onDetected }, [onDetected])
  useEffect(() => {
    let cancelled = false
    let frame = 0
    const stop = () => streamRef.current?.getTracks().forEach(track => track.stop())
    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia || !('BarcodeDetector' in window)) {
        setError(C.scannerUnsupported)
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
        if (cancelled) { stream.getTracks().forEach(track => track.stop()); return }
        streamRef.current = stream
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        const detector = new window.BarcodeDetector()
        const scan = async () => {
          if (cancelled) return
          try {
            const codes = await detector.detect(videoRef.current)
            const value = codes.map(code => String(code.rawValue || '').replace(/\D/g, '')).find(code => code.length >= 6)
            if (value) { detectedRef.current(value); return }
          } catch {}
          frame = requestAnimationFrame(scan)
        }
        scan()
      } catch {
        if (!cancelled) setError(C.scannerError)
      }
    }
    start()
    return () => { cancelled = true; cancelAnimationFrame(frame); stop() }
  }, [C.scannerError, C.scannerUnsupported])
  return <section className="nutrition-scanner" aria-label={C.barcode}><div className="nutrition-scanner-frame"><video ref={videoRef} muted playsInline /><span className="nutrition-scanner-guide" /></div>{error && <div className="nutrition-alert" role="alert"><Icon name="info" /> <span>{error}</span></div>}<Button size="sm" variant="plain" icon="xmark" onClick={onClose}>{C.stopScanner}</Button></section>
}

function NutritionDiary({ C, S, date, setDate, meal, setMeal, dayEntries, totals, goal, update, addFood, removeEntry, personalFoods, recentFoods }) {
  const [query, setQuery] = useState('')
  const [barcode, setBarcode] = useState('')
  const [filters, setFilters] = useState({ grade: '', maxSugar: '', minProtein: '', category: '' })
  const [results, setResults] = useState([])
  const [grams, setGrams] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showMicros, setShowMicros] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [manual, setManual] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '', fiber: '', sugar: '', salt: '' })
  const runSearch = async () => {
    if (query.trim().length < 2) return
    setLoading(true); setError('')
    try { const found = await searchFoodSources({ query, filters, foods: personalFoods }); setResults(found); if (!found.length) setError(C.notFound) }
    catch (e) { setError(e.message || C.notFound) }
    finally { setLoading(false) }
  }
  const runBarcode = async (value = barcode) => {
    setLoading(true); setError('')
    try { const food = await lookupBarcode(value, { foods: personalFoods }); setResults([food]); setQuery(food.name) }
    catch (e) { setError(e.message || C.notFound) }
    finally { setLoading(false) }
  }
  const saveManual = () => {
    if (!manual.name.trim() || !Object.values(manual).some((value, index) => index > 0 && value !== '' && +value >= 0)) { setError(C.enterFood); return }
    addFood({ id: `manual:${idOf('food')}`, source: 'Manual', name: manual.name.trim(), brand: '', code: '', image: '', serving: '', grade: '', categories: [], labels: [], per100: Object.fromEntries(['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'salt'].map(key => [key, roundNutrition(manual[key])])) })
    setManual({ name: '', calories: '', protein: '', carbs: '', fat: '', fiber: '', sugar: '', salt: '' }); setManualOpen(false); setError('')
  }
  return <>
    <div className="nutrition-date card"><label htmlFor="nutrition-date">{C.date}</label><input id="nutrition-date" className="field" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
    <section className="card nutrition-summary" aria-labelledby="nutrition-summary-title"><div className="row between"><h2 id="nutrition-summary-title">{C.calories}</h2><span className="muted small">{nice(totals.calories)} / {nice(goal.calories)} {C.caloriesShort}</span></div><div className="nutrition-calories"><div className="nutrition-calorie-number">{nice(totals.calories)} <span>{C.caloriesShort}</span></div><div className="nutrition-calorie-copy">{nice(Math.max(0, goal.calories - totals.calories))} {C.remaining}</div><div className="nutrition-track"><span style={{ width: `${percent(totals.calories, goal.calories)}%` }} /></div></div><div className="nutrition-macros">{[['protein', C.protein, 'var(--acc)'], ['carbs', C.carbs, 'var(--blue)'], ['fat', C.fat, 'var(--orange)']].map(([key, label, color]) => <div className="nutrition-macro" key={key}><div className="row between"><span>{label}</span><span>{nice(totals[key])} / {nice(goal[key])}g</span></div><div className="nutrition-track"><span style={{ width: `${percent(totals[key], goal[key])}%`, background: color }} /></div></div>)}</div></section>
    <section className="card nutrition-micros" aria-labelledby="nutrition-micros-title"><button className="nutrition-disclosure" aria-expanded={showMicros} onClick={() => setShowMicros(v => !v)}><span><strong id="nutrition-micros-title">{C.micros}</strong><small>{C.microsHint}</small></span><Icon name="chevronDown" /></button>{showMicros && <div className="nutrition-micros-grid">{[['fiber', C.fiber], ['sugar', C.sugar], ['salt', C.salt]].map(([key, label]) => <div key={key}><span>{label}</span><strong>{nice(totals[key])}g</strong></div>)}</div>}</section>
    <section className="card nutrition-goals" aria-labelledby="nutrition-goals-title"><div className="row between"><h2 id="nutrition-goals-title">{C.goal}</h2><span className="muted small">{C.goalsHint}</span></div><div className="nutrition-goal-grid">{[['calories', C.calories, C.caloriesShort], ['protein', C.protein, 'g'], ['carbs', C.carbs, 'g'], ['fat', C.fat, 'g']].map(([key, label, unit]) => <label key={key}><span>{label}</span><div className="nutrition-goal-input"><NumberField value={goal[key]} decimal={false} aria-label={`${C.target} ${label}`} onChange={value => update(s => { s.nutritionGoal = { ...DEFAULT_NUTRITION_GOAL, ...(s.nutritionGoal || {}), [key]: Math.max(0, roundNutrition(value)) } })} /><i>{unit}</i></div></label>)}</div></section>
    <section className="nutrition-search card" aria-labelledby="nutrition-add-title"><div className="row between"><h2 id="nutrition-add-title">{C.addFood}</h2><span className="tag acc">{mealName(meal, C)}</span></div><LocalCatalogNote C={C} /><div className="nutrition-search-row"><SearchField value={query} placeholder={C.searchPlaceholder} onChange={e => setQuery(e.target.value)} onClear={() => { setQuery(''); setResults([]); setError('') }} onKeyDown={e => { if (e.key === 'Enter') runSearch() }} /><Button variant="primary" size="sm" icon="magnifier" disabled={loading || query.trim().length < 2} onClick={runSearch}>{loading ? C.searching : C.search}</Button></div><div className="nutrition-meal-chips" role="group" aria-label={C.meals}>{MEALS.map(value => <button key={value} className={'chip' + (meal === value ? ' on' : '')} onClick={() => setMeal(value)}>{mealName(value, C)}</button>)}</div>{recentFoods.length > 0 && <div className="nutrition-recent"><div className="small muted">{C.recentFoods}</div><div className="nutrition-recent-list">{recentFoods.map(food => <button className="chip" key={food.id} onClick={() => addFood(food)}>{food.name}</button>)}</div></div>}<div className="nutrition-barcode-row"><label htmlFor="nutrition-barcode">{C.barcode}</label><TextField id="nutrition-barcode" value={barcode} inputMode="numeric" placeholder="e.g. 8412345678901" onChange={e => setBarcode(e.target.value.replace(/\D/g, ''))} /><Button size="sm" icon="search" disabled={loading || barcode.length < 6} onClick={() => runBarcode()}>{C.lookup}</Button><Button size="sm" variant="tinted" icon="camera" disabled={loading} onClick={() => setShowScanner(true)}>{C.scan}</Button></div>{showScanner && <BarcodeScanner C={C} onDetected={code => { setBarcode(code); setShowScanner(false); runBarcode(code) }} onClose={() => setShowScanner(false)} />}<p className="nutrition-source"><Icon name="info" /> {C.barcodeHint}</p><button className="nutrition-filter-toggle" aria-expanded={showFilters} onClick={() => setShowFilters(v => !v)}><Icon name="chevronDown" /> {showFilters ? C.hideFilters : C.filters}</button>{showFilters && <div className="nutrition-filters"><div className="nutrition-filter-grid"><label><span>{C.maxSugar}</span><NumberField value={filters.maxSugar} nullable decimal onChange={value => setFilters(f => ({ ...f, maxSugar: value ?? '' }))} /></label><label><span>{C.minProtein}</span><NumberField value={filters.minProtein} nullable decimal onChange={value => setFilters(f => ({ ...f, minProtein: value ?? '' }))} /></label><label className="nutrition-filter-wide"><span>{C.category}</span><TextField value={filters.category} placeholder="e.g. yogurt" onChange={e => setFilters(f => ({ ...f, category: e.target.value }))} /></label></div><Button size="sm" variant="tinted" onClick={runSearch} disabled={loading || query.trim().length < 2}>{C.apply}</Button></div>}{error && <div className="nutrition-alert" role="alert"><Icon name="info" /> <span>{error}</span></div>}<FoodResults C={C} results={results} grams={grams} setGrams={setGrams} addFood={addFood} />{!results.length && !loading && !error && <p className="muted small nutrition-empty-search">{C.noResults}</p>}<Button size="sm" variant="plain" icon="plus" onClick={() => setManualOpen(v => !v)}>{manualOpen ? C.cancel : C.quickAdd}</Button>{manualOpen && <div className="nutrition-manual"><p className="muted small">{C.quickAddHint}</p><label><span>{C.name}</span><TextField value={manual.name} onChange={e => setManual(m => ({ ...m, name: e.target.value }))} /></label><div className="nutrition-manual-grid">{['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'salt'].map(key => <label key={key}><span>{C[key]} <i>/100g</i></span><NumberField value={manual[key]} nullable decimal onChange={value => setManual(m => ({ ...m, [key]: value ?? '' }))} /></label>)}</div><Button variant="primary" icon="check" onClick={saveManual}>{C.save}</Button></div>}<p className="nutrition-source"><Icon name="info" /> {C.localSource}</p></section>
    <section aria-labelledby="nutrition-meals-title"><h2 className="nutrition-section-title" id="nutrition-meals-title">{C.meals}</h2>{MEALS.map(value => { const mealEntries = dayEntries.filter(entry => entry.meal === value); return <div className="card nutrition-meal" key={value}><div className="row between"><h2>{mealName(value, C)}</h2><Button size="xs" icon="plus" onClick={() => setMeal(value)}>{C.add}</Button></div>{mealEntries.length ? mealEntries.map(entry => <div className="nutrition-entry" key={entry.id}><div className="nutrition-entry-main"><div>{entry.food.name}</div><MacroLine entry={entry} C={C} /></div><button className="iconbtn nutrition-remove" onClick={() => removeEntry(entry.id)} aria-label={`${C.remove} ${entry.food.name}`}><Icon name="trash" /></button></div>) : <p className="muted small nutrition-empty-meal">{C.noEntries}</p>}</div> })}</section>
  </>
}

function NutritionRecipes({ C, S, personalFoods, meal, addFood, update }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState({ name: '', servings: 2, ingredients: [] })
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [grams, setGrams] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const recipes = S.recipes || []
  const perServing = recipePerServing(draft)
  const searchIngredients = async () => {
    if (query.trim().length < 2) return
    setLoading(true); setError('')
    try { setResults(await searchFoodSources({ query, foods: personalFoods })) }
    catch (e) { setError(e.message || C.notFound) }
    finally { setLoading(false) }
  }
  const addIngredient = food => { setDraft(d => ({ ...d, ingredients: [...d.ingredients, { id: idOf('ingredient'), grams: grams[food.id] || 100, food }] })); setResults([]); setQuery('') }
  const saveRecipe = () => {
    if (!draft.name.trim() || !draft.ingredients.length) { setError(C.recipeRequired); return }
    update(s => { s.recipes = [...(s.recipes || []), { ...draft, id: idOf('recipe'), name: draft.name.trim(), servings: Math.max(1, +draft.servings || 1) }] })
    setDraft({ name: '', servings: 2, ingredients: [] }); setOpen(false); setError('')
  }
  const deleteRecipe = id => update(s => { s.recipes = (s.recipes || []).filter(recipe => recipe.id !== id) })
  return <>
    <div className="nutrition-section-intro"><div><h2>{C.recipes}</h2><p className="muted small">{C.recipeHint}</p></div><Button size="sm" variant="primary" icon="plus" onClick={() => setOpen(v => !v)}>{open ? C.cancel : C.createRecipe}</Button></div>
    {open && <section className="card nutrition-recipe-builder"><label><span>{C.recipeName}</span><TextField value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} /></label><label><span>{C.servings}</span><NumberField value={draft.servings} decimal={false} onChange={value => setDraft(d => ({ ...d, servings: value || 1 }))} /></label><div className="nutrition-search-row"><SearchField value={query} placeholder={C.recipeSearch} onChange={e => setQuery(e.target.value)} onClear={() => { setQuery(''); setResults([]) }} onKeyDown={e => { if (e.key === 'Enter') searchIngredients() }} /><Button size="sm" variant="tinted" icon="magnifier" disabled={loading || query.trim().length < 2} onClick={searchIngredients}>{loading ? C.searching : C.search}</Button></div>{error && <div className="nutrition-alert" role="alert"><Icon name="info" /> {error}</div>}{!!results.length && <div className="nutrition-results">{results.map(food => <div className="nutrition-food" key={food.id}><span className="nutrition-food-icon"><Icon name="plate" /></span><div className="nutrition-food-main"><div className="nutrition-food-name">{food.name}</div><div className="small muted">{nice(food.per100.calories)} {C.caloriesShort} · {nice(food.per100.protein)}g {C.proteinShort}</div><FoodScore C={C} food={food} /></div><Button size="xs" variant="primary" icon="plus" onClick={() => addIngredient(food)}>{C.addIngredient}</Button></div>)}</div>}<h3 className="nutrition-subtitle">{C.ingredients}</h3>{draft.ingredients.length ? draft.ingredients.map((ingredient, index) => <div className="nutrition-ingredient" key={ingredient.id}><div className="nutrition-food-main"><div>{ingredient.food.name}</div><div className="small muted">{nice(ingredient.food.per100.calories)} {C.caloriesShort} / 100g</div></div><NumberField value={ingredient.grams} decimal={false} aria-label={`${C.grams} ${ingredient.food.name}`} onChange={value => setDraft(d => ({ ...d, ingredients: d.ingredients.map((item, i) => i === index ? { ...item, grams: value || 1 } : item) }))} /><span>g</span><button className="iconbtn nutrition-remove" aria-label={`${C.remove} ${ingredient.food.name}`} onClick={() => setDraft(d => ({ ...d, ingredients: d.ingredients.filter((_, i) => i !== index) }))}><Icon name="trash" /></button></div>) : <p className="muted small">{C.noEntries}</p>}<div className="nutrition-recipe-total"><span>{C.perServing}</span><strong>{nice(perServing.calories)} {C.caloriesShort} · {nice(perServing.protein)}g P · {nice(perServing.carbs)}g C · {nice(perServing.fat)}g F</strong></div><Button variant="primary" icon="check" onClick={saveRecipe}>{C.saveRecipe}</Button></section>}
    {!recipes.length && !open && <div className="card nutrition-empty-card"><Icon name="plate" /><p>{C.noRecipes}</p></div>}
    <div className="nutrition-recipe-list">{recipes.map(recipe => { const per = recipePerServing(recipe); return <article className="card nutrition-recipe-card" key={recipe.id}><div className="row between"><div><h3>{recipe.name}</h3><div className="small muted">{recipe.ingredients.length} {C.ingredients.toLowerCase()} · {nice(per.calories)} {C.caloriesShort} · {nice(per.protein)}g P {C.perServing}</div></div><Icon name="plate" className="nutrition-card-icon" /></div><div className="nutrition-recipe-actions"><Button size="sm" variant="tinted" icon="plus" onClick={() => addFood(recipeAsFood(recipe), meal, 100)}>{C.addToDiary}</Button><button className="iconbtn nutrition-remove" aria-label={`${C.remove} ${recipe.name}`} onClick={() => deleteRecipe(recipe.id)}><Icon name="trash" /></button></div></article> })}</div>
  </>
}

function NutritionWellness({ C, S, date, update }) {
  const [customWater, setCustomWater] = useState('')
  const [now, setNow] = useState(Date.now())
  const water = waterTotal(S.waterEntries || [], date)
  const waterGoal = Math.max(250, +(S.waterGoal || 2000))
  const fasting = S.fasting || { goalHours: 16, active: false, startedAt: null, history: [] }
  useEffect(() => { if (!fasting.active) return undefined; const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer) }, [fasting.active])
  const fastMs = fasting.active && fasting.startedAt ? Math.max(0, now - fasting.startedAt) : 0
  const addWater = ml => update(s => { s.waterEntries = [...(s.waterEntries || []), { id: idOf('water'), date, ml: Math.max(1, Math.round(+ml || 0)), t: Date.now() }] })
  const stopFast = () => update(s => { const current = s.fasting || fasting; const endedAt = Date.now(); const hours = current.startedAt ? Math.max(0, (endedAt - current.startedAt) / 3600000) : 0; s.fasting = { ...current, active: false, startedAt: null, history: [...(current.history || []), { id: idOf('fast'), date, startedAt: current.startedAt, endedAt, hours: roundNutrition(hours) }].slice(-50) } })
  return <>
    <section className="card nutrition-wellness-card" aria-labelledby="water-title"><div className="row between"><div><h2 id="water-title">{C.water}</h2><div className="nutrition-wellness-number">{nice(water)} <span>/ {nice(waterGoal)} ml</span></div></div><Icon name="droplet" className="nutrition-card-icon" /></div><div className="nutrition-track"><span style={{ width: `${percent(water, waterGoal)}%`, background: 'var(--blue)' }} /></div><div className="small muted nutrition-wellness-copy">{water >= waterGoal ? C.waterDone : C.waterHint}</div><div className="nutrition-water-goal"><label><span>{C.waterGoal}</span><div><NumberField value={waterGoal} decimal={false} aria-label={C.waterGoal} onChange={value => update(s => { s.waterGoal = Math.max(250, Math.min(10000, value || 2000)) })} /><i>ml</i></div></label></div><div className="nutrition-water-actions">{[250, 500, 750].map(ml => <Button key={ml} size="sm" variant="tinted" onClick={() => addWater(ml)}>+{ml} ml</Button>)}</div><div className="nutrition-custom-water"><NumberField value={customWater} nullable decimal={false} aria-label={C.customWater} onChange={value => setCustomWater(value ?? '')} /><Button size="sm" variant="plain" onClick={() => { addWater(customWater); setCustomWater('') }} disabled={!customWater}>{C.addWater}</Button></div></section>
    <section className="card nutrition-fast-card" aria-labelledby="fast-title"><div className="row between"><div><h2 id="fast-title">{C.fast}</h2><div className="nutrition-wellness-number">{fasting.active ? formatDuration(fastMs) : `${fasting.goalHours || 16}h`} <span>{fasting.active ? C.fastingNow : C.fastGoal}</span></div></div><Icon name="timer" className="nutrition-card-icon" /></div><div className="nutrition-track"><span style={{ width: `${fasting.active ? percent(fastMs / 3600000, fasting.goalHours || 16) : 0}%`, background: 'var(--purple)' }} /></div><div className="nutrition-fast-controls"><label><span>{C.fastGoal}</span><NumberField value={fasting.goalHours || 16} decimal={false} aria-label={C.fastGoal} onChange={value => update(s => { s.fasting = { ...(s.fasting || fasting), goalHours: Math.max(1, Math.min(72, value || 16)) } })} /><i>{C.hours}</i></label>{fasting.active ? <Button variant="danger" icon="flag" onClick={stopFast}>{C.stopFast}</Button> : <Button variant="primary" icon="play" onClick={() => update(s => { s.fasting = { ...(s.fasting || fasting), active: true, startedAt: Date.now() } })}>{C.startFast}</Button>}</div>{fasting.active && <p className="small muted">{C.fastingNow} · {nice(Math.max(0, (fasting.goalHours || 16) - fastMs / 3600000))} {C.hours} remaining</p>}<h3 className="nutrition-subtitle">{C.fastHistory}</h3>{(fasting.history || []).length ? <div className="nutrition-fast-history">{(fasting.history || []).slice(-5).reverse().map(item => <div className="nutrition-history-line" key={item.id}><span>{item.date}</span><strong>{nice(item.hours)}h</strong></div>)}</div> : <p className="muted small">{C.noFasts}</p>}</section>
  </>
}

function NutritionInsights({ C, S, date, setDate, entries, goal }) {
  const [periodDays, setPeriodDays] = useState(7)
  const [monthStart, setMonthStart] = useState(`${date.slice(0, 7)}-01`)
  const rows = useMemo(() => nutritionPeriod({ entries, waterEntries: S.waterEntries || [], goal, endDate: date, days: periodDays }), [entries, S.waterEntries, goal, date, periodDays])
  const summary = useMemo(() => nutritionPeriodSummary(rows, goal), [rows, goal])
  const training = useMemo(() => trainingSnapshot(S.workouts || [], date), [S.workouts, date])
  const trainingDays = useMemo(() => new Set((S.workouts || []).map(workout => workout.d).filter(Boolean)), [S.workouts])
  const monthDate = dateFromISO(monthStart)
  const year = monthDate.getUTCFullYear()
  const month = monthDate.getUTCMonth()
  const monthLength = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const leading = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7
  const monthLabel = monthDate.toLocaleDateString(getLang() === 'es' ? 'es-ES' : 'en-GB', { month: 'long', year: 'numeric' })
  const weekdays = getLang() === 'es' ? ['L', 'M', 'X', 'J', 'V', 'S', 'D'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const monthDays = Array.from({ length: leading + monthLength }, (_, index) => {
    if (index < leading) return null
    const day = index - leading + 1
    return isoDay(new Date(Date.UTC(year, month, day)))
  })
  const rowsByDate = new Map(rows.map(row => [row.date, row]))
  const moveMonth = amount => {
    const next = new Date(Date.UTC(year, month + amount, 1))
    setMonthStart(isoDay(next))
  }
  useEffect(() => setMonthStart(`${date.slice(0, 7)}-01`), [date])

  const download = (body, type, name) => {
    const blob = new Blob([body], { type })
    const anchor = document.createElement('a')
    anchor.href = URL.createObjectURL(blob)
    anchor.download = name
    anchor.click()
    URL.revokeObjectURL(anchor.href)
  }
  const exportPeriod = format => {
    const start = rows[0]?.date || date
    const end = rows.at(-1)?.date || date
    const selectedEntries = entries.filter(entry => entry.date >= start && entry.date <= end)
    if (format === 'json') {
      download(JSON.stringify({
        exportedAt: new Date().toISOString(),
        range: { start, end },
        goal,
        summary,
        nutritionEntries: selectedEntries,
        waterEntries: (S.waterEntries || []).filter(entry => entry.date >= start && entry.date <= end),
        workouts: (S.workouts || []).filter(workout => workout.d >= start && workout.d <= end),
        recipes: S.recipes || []
      }, null, 2), 'application/json', `liftnex-nutrition-${start}-${end}.json`)
      return
    }
    const escape = value => `"${String(value ?? '').replaceAll('"', '""')}"`
    const header = ['date', 'meal', 'food', 'grams', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugar_g', 'salt_g']
    const lines = selectedEntries.map(entry => {
      const nutrients = entryNutrients(entry)
      return [entry.date, entry.meal, entry.food?.name, entry.grams, nutrients.calories, nutrients.protein, nutrients.carbs, nutrients.fat, nutrients.fiber, nutrients.sugar, nutrients.salt].map(escape).join(',')
    })
    download([header.map(escape).join(','), ...lines].join('\n'), 'text/csv;charset=utf-8', `liftnex-nutrition-${start}-${end}.csv`)
  }
  const selectCalendarDay = day => { if (day) setDate(day) }
  const monthTotals = day => dailyTotals(entries, day)

  return <>
    <section className="nutrition-insights-head"><div><h2>{C.insights}</h2><p className="muted small">{C.calendar} · {C.nutritionTrend}</p></div><Icon name="chartLine" className="nutrition-card-icon" /></section>
    <section className="card nutrition-calendar" aria-labelledby="nutrition-calendar-title">
      <div className="row between"><h2 id="nutrition-calendar-title">{C.calendar}</h2><div className="nutrition-calendar-nav"><button className="iconbtn" onClick={() => moveMonth(-1)} aria-label={C.previousMonth}><Icon name="chevronLeft" /></button><strong>{monthLabel}</strong><button className="iconbtn" onClick={() => moveMonth(1)} aria-label={C.nextMonth}><Icon name="chevronRight" /></button></div></div>
      <div className="nutrition-calendar-grid nutrition-calendar-weekdays">{weekdays.map((weekday, index) => <span key={`${weekday}-${index}`}>{weekday}</span>)}</div>
      <div className="nutrition-calendar-grid">{monthDays.map((day, index) => {
        if (!day) return <span className="nutrition-calendar-blank" key={`blank-${index}`} />
        const totals = monthTotals(day)
        const row = rowsByDate.get(day)
        const logged = entries.some(entry => entry.date === day)
        const trained = trainingDays.has(day)
        return <button key={day} className={`nutrition-calendar-day${date === day ? ' selected' : ''}${logged ? ' logged' : ''}${trained ? ' trained' : ''}`} onClick={() => selectCalendarDay(day)} aria-label={`${C.selectedDay} ${day}`}><span>{Number(day.slice(-2))}</span>{(logged || trained) && <i style={{ '--day-fill': `${Math.min(100, Math.max(0, totals.calories / (goal.calories || 1) * 100))}%` }} />}</button>
      })}</div>
      <div className="nutrition-calendar-legend"><span><i className="logged" />{C.logged}</span><span><i className="trained" />{C.trainingDays}</span></div>
    </section>
    <section className="nutrition-period-switch"><div><h2>{C.nutritionTrend}</h2><p className="muted small">{summary.trackedDays} {C.trackedDays}</p></div><div className="segmented"><button className={periodDays === 7 ? 'on' : ''} onClick={() => setPeriodDays(7)}>{C.period7}</button><button className={periodDays === 30 ? 'on' : ''} onClick={() => setPeriodDays(30)}>{C.period30}</button></div></section>
    <section className="nutrition-trend-chart card" aria-label={C.nutritionTrend}><div className="nutrition-trend-bars">{rows.map(row => <button key={row.date} className={`nutrition-trend-day${row.date === date ? ' selected' : ''}`} onClick={() => setDate(row.date)} aria-label={row.date}><span className="nutrition-trend-bar" style={{ height: `${Math.max(4, Math.min(100, row.caloriesPct))}%` }} /><small>{row.date.slice(8)}</small></button>)}</div><div className="nutrition-trend-axis"><span>0</span><span>{nice(goal.calories)} {C.caloriesShort}</span></div></section>
    <div className="nutrition-insight-metrics"><div className="card"><span>{C.average} {C.calories}</span><strong>{nice(summary.avgCalories)} <i>{C.caloriesShort}</i></strong><small>{summary.trackedDays ? `${summary.calorieTargetDays}/${summary.trackedDays} ${C.targetDays}` : C.noTrendData}</small></div><div className="card"><span>{C.average} {C.protein}</span><strong>{nice(summary.avgProtein)} <i>g</i></strong><small>{summary.trackedDays ? `${summary.proteinTargetDays}/${summary.trackedDays} ${C.targetDays}` : C.noTrendData}</small></div><div className="card"><span>{C.average} {C.water}</span><strong>{nice(summary.avgWater)} <i>ml</i></strong><small>{training.length ? `${training.length} ${C.trainingDays}` : C.noTrendData}</small></div></div>
    <section className="card nutrition-export-card"><div className="row"><Icon name="download" className="nutrition-card-icon" /><div><h2>{C.exportData}</h2><p className="muted small">{C.exportHint}</p></div></div><div className="nutrition-export-actions"><Button size="sm" variant="tinted" onClick={() => exportPeriod('csv')}>{C.exportCsv}</Button><Button size="sm" variant="primary" onClick={() => exportPeriod('json')}>{C.exportJson}</Button></div></section>
  </>
}

function NutritionCoach({ C, S, date, entries, totals, goal }) {
  const water = waterTotal(S.waterEntries || [], date)
  const waterGoal = S.waterGoal || 2000
  const fasting = S.fasting || {}
  const training = useMemo(() => trainingSnapshot(S.workouts || [], date), [S.workouts, date])
  const period = useMemo(() => nutritionPeriodSummary(nutritionPeriod({ entries: S.nutritionEntries || [], waterEntries: S.waterEntries || [], goal, endDate: date, days: 7 }), goal), [S.nutritionEntries, S.waterEntries, goal, date])
  const local = localCoachInsights({ totals, goal, water, waterGoal, fasting })
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [answer, setAnswer] = useState('')
  const [source, setSource] = useState('local')
  const ask = async () => {
    if (!consent) return
    setLoading(true)
    try { const response = await api('/api/nutrition/coach', { method: 'POST', body: JSON.stringify({ context: compactNutritionContext({ date, totals, goal, entries, water, waterGoal, fasting, training, period }) }) }); setAnswer(response.answer || ''); setSource(response.source || 'local') }
    catch { setAnswer(C.coachFallback); setSource('local') }
    finally { setLoading(false) }
  }
  const insightText = key => C[key] || C.noAdvice
  return <>
    <section className="card nutrition-coach-hero"><div className="row"><span className="nutrition-coach-orb"><Icon name="sparkles" /></span><div><h2>{C.localCoach}</h2><p className="muted small">{C.coachPrivacy}</p></div></div></section>
    <section className="card nutrition-insights" aria-live="polite"><h2>{C.localCoach}</h2>{local.length ? local.map(item => <div className={`nutrition-insight ${item.tone}`} key={item.key}><Icon name={item.tone === 'neutral' ? 'info' : item.tone === 'blue' ? 'droplet' : item.tone === 'violet' ? 'timer' : 'sparkles'} /><span>{insightText(item.key)}</span></div>) : <div className="nutrition-insight acc"><Icon name="checkCircle" /><span>{C.noAdvice}</span></div>}</section>
    <section className="card nutrition-ai-card"><h2>{C.askCoach}</h2><p className="muted small">{C.coachConsent}</p><div className="nutrition-consent"><Check checked={consent} onChange={setConsent} ariaLabel={C.coachConsent} /><span>{C.coachConsent}</span></div><Button variant="primary" icon="sparkles" disabled={!consent || loading} onClick={ask}>{loading ? C.searching : C.askCoach}</Button>{answer && <div className="nutrition-ai-answer"><div className="small muted">{source === 'local' ? C.coachNoProvider : source === 'gemini' ? C.geminiCoach : C.askCoach}</div><p>{answer}</p></div>}<p className="nutrition-source"><Icon name="info" /> {C.coachDisclaimer}</p></section>
  </>
}

export default function Nutrition() {
  useLang()
  const C = labels()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const [section, setSection] = useState('diary')
  const [date, setDate] = useState(todayISO())
  const [meal, setMeal] = useState('breakfast')
  const entries = S.nutritionEntries || []
  const personalFoods = useMemo(() => entries.map(entry => entry.food).filter(Boolean), [entries])
  const recentFoods = useMemo(() => {
    const seen = new Set()
    return [...entries].reverse().map(entry => entry.food).filter(food => {
      if (!food?.id || seen.has(food.id)) return false
      seen.add(food.id)
      return true
    }).slice(0, 6)
  }, [entries])
  const dayEntries = useMemo(() => entries.filter(entry => entry.date === date), [entries, date])
  const totals = useMemo(() => dailyTotals(entries, date), [entries, date])
  const goal = { ...DEFAULT_NUTRITION_GOAL, ...(S.nutritionGoal || {}) }
  const addFood = (food, selectedMeal = meal, selectedGrams = 100) => update(s => { s.nutritionEntries = [...(s.nutritionEntries || []), { id: idOf('nutrition'), date, meal: selectedMeal, grams: Math.max(1, roundNutrition(selectedGrams) || 100), food }] })
  const removeEntry = id => update(s => { s.nutritionEntries = (s.nutritionEntries || []).filter(entry => entry.id !== id) })
  return <div className="narrow nutrition-view"><div className="hdr"><div><h1>{C.title}</h1><div className="sub">{C.subtitle}</div></div><Icon name="plate" className="nutrition-head-icon" /></div><div className="nutrition-tabs" role="tablist" aria-label={C.title}>{[['diary', C.diary, 'list'], ['recipes', C.recipes, 'plate'], ['wellness', C.wellness, 'droplet'], ['insights', C.insights, 'chartLine'], ['coach', C.coach, 'sparkles']].map(([value, label, icon]) => <button key={value} role="tab" aria-selected={section === value} className={section === value ? 'on' : ''} onClick={() => setSection(value)}><Icon name={icon} /><span>{label}</span></button>)}</div>{section === 'diary' && <NutritionDiary C={C} S={S} date={date} setDate={setDate} meal={meal} setMeal={setMeal} dayEntries={dayEntries} totals={totals} goal={goal} update={update} addFood={addFood} removeEntry={removeEntry} personalFoods={personalFoods} recentFoods={recentFoods} />}{section === 'recipes' && <NutritionRecipes C={C} S={S} personalFoods={personalFoods} meal={meal} addFood={addFood} update={update} />}{section === 'wellness' && <NutritionWellness C={C} S={S} date={date} update={update} />}{section === 'insights' && <NutritionInsights C={C} S={S} date={date} setDate={setDate} entries={entries} goal={goal} />}{section === 'coach' && <NutritionCoach C={C} S={S} date={date} entries={dayEntries} totals={totals} goal={goal} />}</div>
}
