import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { api } from '../lib/api.js'
import { DEMO } from '../lib/demo.js'
import { getLang, t, useLang } from '../lib/i18n.js'
import { todayISO } from '../lib/format.js'
import { MOBILE } from '../lib/mobile.js'
import { buildLongitudinalCoachContext } from '../lib/coach.js'
import {
  DEFAULT_NUTRITION_GOAL, MEALS, dailyTotals, entryNutrients,
  healthScore, localCoachInsights, lookupBarcode, nutritionPeriod, nutritionPeriodSummary, recipeAsFood,
  recipePerServing, recipeTotals, roundNutrition, searchFoodSources, waterTotal
} from '../lib/nutrition.js'
import Icon from '../components/Icon.jsx'
import { Button, Check, NumberField, SearchField, TextField } from '../components/ui.jsx'
import { validateCoachAction } from '../lib/coach-draft.js'
import { normalizeCoachReview } from '../lib/coach-contract.js'

const NUTRITION_SEARCH_STORAGE_KEY = 'liftnex:nutrition-search:v1'
const NUTRITION_SEARCH_TTL = 30 * 60 * 1000

function readNutritionSearchState() {
  if (typeof window === 'undefined') return null
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(NUTRITION_SEARCH_STORAGE_KEY) || 'null')
    if (!saved || !saved.savedAt || Date.now() - saved.savedAt > NUTRITION_SEARCH_TTL) {
      window.sessionStorage.removeItem(NUTRITION_SEARCH_STORAGE_KEY)
      return null
    }
    return saved
  } catch {
    return null
  }
}

function persistNutritionSearchState(state) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(NUTRITION_SEARCH_STORAGE_KEY, JSON.stringify({
      ...state,
      // Keep the snapshot bounded: this is a navigation hand-off, not a second database.
      results: (state.results || []).slice(0, 50),
      savedAt: Date.now()
    }))
  } catch {
    // A full sessionStorage must never prevent opening a product detail.
  }
}

function clearNutritionSearchState() {
  if (typeof window === 'undefined') return
  try { window.sessionStorage.removeItem(NUTRITION_SEARCH_STORAGE_KEY) } catch {}
}

const EN = {
  title: 'Nutrition', subtitle: 'Fuel your training with a simple food diary', date: 'Day',
  calories: 'Calories', protein: 'Protein', carbs: 'Carbs', fat: 'Fat', fiber: 'Fiber', sugar: 'Sugar', salt: 'Salt', sodium: 'Sodium', potassium: 'Potassium', calcium: 'Calcium', iron: 'Iron', vitaminC: 'Vitamin C', vitaminD: 'Vitamin D',
  goal: 'Daily goals', remaining: 'remaining', meals: 'Meals', addFood: 'Add food',
  searchPlaceholder: 'Search food, brand or ingredient', search: 'Search', searching: 'Searching…',
  barcode: 'Barcode', lookup: 'Look up', scan: 'Scan', stopScanner: 'Close scanner', scannerUnsupported: 'Camera scanning is not supported here. Enter the barcode manually.', scannerError: 'Could not access the camera. Check browser permissions.', filters: 'Filters', hideFilters: 'Hide filters',
  grade: 'Nutrition grade', all: 'All', maxSugar: 'Max sugar / 100g', minProtein: 'Min protein / 100g', category: 'Category', brand: 'Brand', country: 'Country',
  healthScore: 'LiftNex score', scoreGood: 'Good', scoreModerate: 'Moderate', scoreLow: 'Low', scoreNoData: 'Not enough data', scoreWhy: 'Why this score',
  scoreExplainer: 'Orientative composition score based on nutrition, declared additives and processing signals. Not medical advice.', scoreNutri: 'Nutri-Score', additiveCount: 'declared additives', novaGroup: 'processing group', scoreNoFlags: 'No major signals detected in the available data.', viewProduct: 'View full analysis', productAnalysis: 'Product analysis', fullAnalysis: 'Full analysis', healthierAlternatives: 'Healthier alternatives', healthierAlternativesHint: 'Better-scoring products from this same search.', noAlternatives: 'No higher-scoring alternative was found in this search.', back: 'Back', openAnalysis: 'Open analysis', productPer100: 'Nutrition per 100g',
  scoreBreakdown: 'Full breakdown', scoreNegative: 'Worth checking', scorePositive: 'What helps', scoreContext: 'At a glance', scoreIngredients: 'Ingredients', scoreNoIngredients: 'No ingredient list available.', ingredientsHint: 'Long entries are shortened for readability. Open one to see the complete text.', moreIngredients: 'Show {0} more ingredients', scoreNoAdditives: 'No declared additives', additives: 'Additives', saturatedFat: 'Saturated fat', energy: 'Energy density', processing: 'Processing', scorePer100: 'Per 100g', scoreNeutral: 'Informative', scoreRiskHigh: 'High signal', scoreRiskMedium: 'Moderate signal', scoreNoRisk: 'No significant signal', additiveIngredient: 'Declared additive', watchIngredient: 'Ingredient to watch', listedIngredient: 'Listed ingredient', confidence: 'Data confidence', confidenceHigh: 'High', confidenceMedium: 'Medium', confidenceLow: 'Low', missingData: 'Unknown fields are shown as —, not as zero.', personalFit: 'Personal fit', noPersonalWarnings: 'No conflicts with your preferences detected.', personalWarnings: 'Preference warnings', compare: 'Compare products', compareHint: 'Differences per 100g from this product', sourceMeta: 'Data provenance', countryLabel: 'Country', fetchedLabel: 'Fetched', cacheLabel: 'Cached', moreProtein: 'more protein', lessSugar: 'less sugar', lessSalt: 'less salt', lessSaturatedFat: 'less saturated fat', moreFiber: 'more fibre',
  apply: 'Apply filters', results: 'Results', grams: 'grams', add: 'Add', noResults: 'Search for a food to see results.',
  noEntries: 'Nothing logged yet.', breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack',
  quickAdd: 'Add manually', quickAddHint: 'Useful for recipes or when the database has no match.', name: 'Food name',
  save: 'Save food', cancel: 'Cancel', source: 'Check the product label for accuracy.',
  notFound: 'No match found. Try another search or add it manually.', remove: 'Remove', target: 'Target',
  caloriesShort: 'kcal', proteinShort: 'P', carbsShort: 'C', fatShort: 'F',
  goalsHint: 'Manage these targets from Goals so every part of the app stays in sync.', goals: 'Goals', enterFood: 'Enter at least a name and one nutrient value.',
  recentFoods: 'Recent foods', savedFoods: 'Saved foods', savedFoodsHint: 'Keep the foods you use most close at hand.', favorites: 'Favorites', barcodeHint: 'Barcode lookup needs an internet connection.', localSource: 'Values can vary by product; check the product label.', preferences: 'Personal preferences', diet: 'Diet', none: 'No preference', vegetarian: 'Vegetarian', vegan: 'Vegan', allergens: 'Avoid allergens', allergensHint: 'Comma-separated, e.g. milk, peanuts', avoidAdditives: 'Flag declared additives', savePreferences: 'Save preferences', favorite: 'Favorite', unfavorite: 'Remove favorite', duplicate: 'Duplicate meal',
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
  hours: 'hours', localCoach: 'Daily check-in', askCoach: 'Ask AI coach', coachRefresh: 'Refresh review', coachGenerating: 'Generating review…', coachTitle: 'Personal longitudinal coach', coachSubtitle: 'Uses your complete training, nutrition, weight and progress history.', coachObjective: 'Main objective', objectivePerformance: 'Improve performance', objectiveBuild: 'Build muscle', objectiveCut: 'Lose fat', objectiveMaintain: 'Maintain weight', objectiveHealth: 'General health', coachNotes: 'Optional context', coachNotesPlaceholder: 'Schedule, limitations or preferences you want the coach to consider', coachScope: 'All historical records are summarized locally before analysis. Body photos stay on this device.', coachDataCoverage: 'Data coverage', coachSessions: 'sessions', coachMeals: 'food entries', coachWeight: 'weight logs', coachProteinDays: 'protein target days', coachHealthDays: 'health days', coachDataQuality: 'Nutrition data quality', coachQualityHigh: 'High', coachQualityMedium: 'Medium', coachQualityLow: 'Low', coachDataQualityHint: 'Missing nutrient fields lower confidence; they are not treated as zero.', coachConsent: 'Send this longitudinal summary to the configured AI provider.',
  coachPrivacy: 'No provider is called until you ask. Local insights work offline.', coachProviderGemini: 'Gemini review', coachProviderConnected: 'Connected AI review', coachProviderLocal: 'Local LiftNex review', coachLocalSummary: 'Local review based on {0} training sessions, {1} food-tracked days and {2} weigh-ins.', coachLocalFallback: 'No AI provider was available. This local review uses your logged history and stays on this device.', coachRequestError: 'The coach request could not be completed. The local review is shown instead.', coachSignIn: 'Sign in to use the connected coach. The local review is still available above.', coachEmpty: 'The coach returned no content. Try again.', coachTryAgain: 'Try again', geminiCoach: 'Gemini coach', coachOffline: 'Connected AI is not available in this offline build. This local review stays on this device. Deploy LiftNex with its API configured to use the connected coach.', coachProviderError: 'The connected AI provider is temporarily unavailable. The local review is shown instead.', coachModelError: 'The AI model configured on the server is not available. Check GEMINI_MODEL on the API.', coachKeyError: 'The AI provider rejected the server key. Check the provider secret on the API.', coachRateError: 'The AI provider is rate-limiting requests. Try again in a moment.', coachNetworkError: 'The API could not reach the AI provider. Check its network connection and try again.',
  startLogging: 'Start by logging one meal so your targets become more useful.',
  proteinLow: 'Protein is below 80% of your target. Consider adding a protein-rich serving.', caloriesHigh: 'Calories are above your target today. Keep the next meal balanced rather than compensating aggressively.',
  waterLow: 'Hydration is still below 60% of your goal. Add a glass of water when convenient.', fastingActive: 'Your fast is running. Stop it if you feel unwell; training and health come first.',
  proteinOnTrack: 'Protein target reached. Keep the rest of the day consistent with your goal.', noAdvice: 'Your current log looks balanced. Keep recording and review the trend over several days.',
  coachDisclaimer: 'General fitness guidance only — not medical advice.', coachStrengths: 'What you are doing well', coachImprovements: 'What to improve', coachActions: 'Next 7 days', coachWatchouts: 'Watch-outs', coachQuestions: 'Questions worth answering', coachConfidence: 'Confidence', coachNoReview: 'Ask the coach to generate a review from your full history.', coachAnalysisSize: 'Longitudinal context prepared from your history.', confirmAction: 'Confirm', sourceOFF: 'Data from Open Food Facts.', sourceUSDA: 'Data from USDA FoodData Central.',
  coachPlanTitle: 'Create a plan draft', coachPlanHint: 'Coach can propose routines and cycles; nothing changes until you confirm it.', coachPlanButton: 'Generate draft', coachApply: 'Apply selected changes', coachRevert: 'Reversible plan snapshots', coachUndo: 'Revert'
}

const ES = {
  title: 'Nutrición', subtitle: 'Alimenta tu entrenamiento con un diario sencillo', date: 'Día',
  calories: 'Calorías', protein: 'Proteína', carbs: 'Carbohidratos', fat: 'Grasa', fiber: 'Fibra', sugar: 'Azúcar', salt: 'Sal', sodium: 'Sodio', potassium: 'Potasio', calcium: 'Calcio', iron: 'Hierro', vitaminC: 'Vitamina C', vitaminD: 'Vitamina D',
  goal: 'Objetivos diarios', remaining: 'restantes', meals: 'Comidas', addFood: 'Añadir alimento',
  searchPlaceholder: 'Busca alimento, marca o ingrediente', search: 'Buscar', searching: 'Buscando…',
  barcode: 'Código de barras', lookup: 'Consultar', scan: 'Escanear', stopScanner: 'Cerrar lector', scannerUnsupported: 'El escaneo con cámara no está disponible aquí. Introduce el código manualmente.', scannerError: 'No se pudo acceder a la cámara. Comprueba los permisos del navegador.', filters: 'Filtros', hideFilters: 'Ocultar filtros',
  grade: 'Calidad nutricional', all: 'Todos', maxSugar: 'Máx. azúcar / 100g', minProtein: 'Mín. proteína / 100g', category: 'Categoría',
  healthScore: 'Puntuación LiftNex', scoreGood: 'Buena', scoreModerate: 'Moderada', scoreLow: 'Baja', scoreNoData: 'Datos insuficientes', scoreWhy: 'Por qué esta puntuación',
  scoreExplainer: 'Puntuación orientativa de composición basada en nutrición, aditivos declarados y señales de procesado. No es consejo médico.', scoreNutri: 'Nutri-Score', additiveCount: 'aditivos declarados', novaGroup: 'grupo de procesado', scoreNoFlags: 'No se detectan señales relevantes en los datos disponibles.', viewProduct: 'Ver análisis completo', productAnalysis: 'Análisis del producto', fullAnalysis: 'Análisis completo', healthierAlternatives: 'Alternativas más saludables', healthierAlternativesHint: 'Productos con mejor puntuación dentro de esta misma búsqueda.', noAlternatives: 'No se ha encontrado una alternativa con mayor puntuación en esta búsqueda.', back: 'Volver', openAnalysis: 'Abrir análisis', productPer100: 'Nutrición por 100g', confidence: 'Confianza de los datos', confidenceHigh: 'Alta', confidenceMedium: 'Media', confidenceLow: 'Baja', missingData: 'Los campos desconocidos aparecen como —, no como cero.', personalFit: 'Encaje personal', noPersonalWarnings: 'No se han detectado conflictos con tus preferencias.', personalWarnings: 'Avisos de preferencias', compare: 'Comparar productos', compareHint: 'Diferencias por 100g respecto a este producto',
  scoreBreakdown: 'Desglose completo', scoreNegative: 'A tener en cuenta', scorePositive: 'Lo que suma', scoreContext: 'Resumen del producto', scoreIngredients: 'Ingredientes', scoreNoIngredients: 'No hay lista de ingredientes disponible.', ingredientsHint: 'Las entradas largas se acortan para facilitar la lectura. Abre una para ver el texto completo.', moreIngredients: 'Ver {0} ingredientes más', scoreNoAdditives: 'No hay aditivos declarados', additives: 'Aditivos', saturatedFat: 'Grasas saturadas', energy: 'Densidad energética', processing: 'Procesado', scorePer100: 'Por 100g', scoreNeutral: 'Informativa', scoreRiskHigh: 'Señal alta', scoreRiskMedium: 'Señal moderada', scoreNoRisk: 'Sin señal relevante', additiveIngredient: 'Aditivo declarado', watchIngredient: 'Ingrediente a revisar', listedIngredient: 'Ingrediente declarado', sourceMeta: 'Origen de los datos', countryLabel: 'País', fetchedLabel: 'Consultado', cacheLabel: 'En caché', moreProtein: 'más proteína', lessSugar: 'menos azúcar', lessSalt: 'menos sal', lessSaturatedFat: 'menos grasas saturadas', moreFiber: 'más fibra',
  apply: 'Aplicar filtros', results: 'Resultados', grams: 'gramos', add: 'Añadir', noResults: 'Busca un alimento para ver resultados.',
  noEntries: 'Todavía no hay registros.', breakfast: 'Desayuno', lunch: 'Comida', dinner: 'Cena', snack: 'Snack',
  quickAdd: 'Añadir manualmente', quickAddHint: 'Útil para recetas o cuando la base de datos no tiene coincidencias.', name: 'Nombre del alimento',
  save: 'Guardar alimento', cancel: 'Cancelar', source: 'Comprueba la etiqueta del producto para mayor precisión.',
  notFound: 'No hay coincidencias. Prueba otra búsqueda o añádelo manualmente.', remove: 'Eliminar', target: 'Objetivo',
  caloriesShort: 'kcal', proteinShort: 'P', carbsShort: 'C', fatShort: 'G',
  goalsHint: 'Gestiona estos objetivos desde Objetivos para mantener toda la app sincronizada.', goals: 'Objetivos', enterFood: 'Introduce al menos un nombre y un nutriente.',
  recentFoods: 'Alimentos recientes', savedFoods: 'Alimentos guardados', savedFoodsHint: 'Ten a mano los alimentos que más utilizas.', favorites: 'Favoritos', barcodeHint: 'Consultar un código de barras necesita conexión a Internet.', localSource: 'Los valores pueden variar según el producto; comprueba la etiqueta.', preferences: 'Preferencias personales', diet: 'Dieta', none: 'Sin preferencia', vegetarian: 'Vegetariana', vegan: 'Vegana', allergens: 'Evitar alérgenos', allergensHint: 'Separados por comas, por ejemplo leche, cacahuetes', avoidAdditives: 'Avisar de aditivos declarados', savePreferences: 'Guardar preferencias', favorite: 'Favorito', unfavorite: 'Quitar favorito', duplicate: 'Duplicar comida',
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
  hours: 'horas', localCoach: 'Revisión diaria', askCoach: 'Preguntar al coach IA', coachRefresh: 'Actualizar revisión', coachGenerating: 'Generando revisión…', coachTitle: 'Coach personal longitudinal', coachSubtitle: 'Usa todo tu historial de entrenamiento, nutrición, peso y progreso.', coachObjective: 'Objetivo principal', objectivePerformance: 'Mejorar rendimiento', objectiveBuild: 'Ganar músculo', objectiveCut: 'Perder grasa', objectiveMaintain: 'Mantener peso', objectiveHealth: 'Salud general', coachNotes: 'Contexto opcional', coachNotesPlaceholder: 'Horario, limitaciones o preferencias que quieras que tenga en cuenta', coachScope: 'Todos los registros históricos se resumen localmente antes del análisis. Las fotos corporales permanecen en el dispositivo.', coachDataCoverage: 'Cobertura de datos', coachSessions: 'sesiones', coachMeals: 'registros de comida', coachWeight: 'pesajes', coachProteinDays: 'días con proteína objetivo', coachHealthDays: 'días de salud', coachDataQuality: 'Calidad de los datos nutricionales', coachQualityHigh: 'Alta', coachQualityMedium: 'Media', coachQualityLow: 'Baja', coachDataQualityHint: 'Los nutrientes ausentes reducen la confianza; no se interpretan como cero.', coachConsent: 'Enviar este resumen longitudinal al proveedor IA configurado.',
  coachPrivacy: 'No se llama a ningún proveedor hasta que lo pidas. Las recomendaciones locales funcionan sin conexión.', coachProviderGemini: 'Revisión de Gemini', coachProviderConnected: 'Revisión de IA conectada', coachProviderLocal: 'Revisión local de LiftNex', coachLocalSummary: 'Revisión local basada en {0} sesiones de entrenamiento, {1} días con comidas y {2} pesajes.', coachLocalFallback: 'No había ningún proveedor de IA disponible. Esta revisión local usa tu historial registrado y permanece en este dispositivo.', coachRequestError: 'No se ha podido completar la petición al coach. Se muestra la revisión local como alternativa.', coachSignIn: 'Inicia sesión para usar el coach conectado. La revisión local sigue disponible arriba.', coachEmpty: 'El coach no ha devuelto contenido. Inténtalo de nuevo.', coachTryAgain: 'Reintentar', geminiCoach: 'Coach Gemini', coachOffline: 'La IA conectada no está disponible en esta versión sin backend. Esta revisión local permanece en el dispositivo. Despliega LiftNex con la API configurada para usar el coach conectado.', coachProviderError: 'El proveedor de IA conectado no está disponible temporalmente. Se muestra la revisión local como alternativa.', coachModelError: 'El modelo de IA configurado en el servidor no está disponible. Revisa GEMINI_MODEL en la API.', coachKeyError: 'El proveedor de IA ha rechazado la clave del servidor. Revisa el secreto configurado en la API.', coachRateError: 'El proveedor de IA está limitando las peticiones. Inténtalo de nuevo en un momento.', coachNetworkError: 'La API no puede llegar al proveedor de IA. Comprueba la conexión de red del servidor.',
  startLogging: 'Empieza registrando una comida para que tus objetivos sean más útiles.',
  proteinLow: 'La proteína está por debajo del 80% de tu objetivo. Valora añadir una ración rica en proteína.', caloriesHigh: 'Hoy superas tu objetivo calórico. Mantén equilibrada la siguiente comida y evita compensaciones agresivas.',
  waterLow: 'La hidratación está por debajo del 60% de tu objetivo. Añade un vaso de agua cuando te venga bien.', fastingActive: 'Tu ayuno está activo. Termínalo si te encuentras mal; la salud y el entrenamiento van primero.',
  proteinOnTrack: 'Has alcanzado la proteína objetivo. Mantén el resto del día alineado con tu objetivo.', noAdvice: 'Tu registro actual parece equilibrado. Sigue registrando y revisa la tendencia durante varios días.',
  coachDisclaimer: 'Orientación general de fitness; no es consejo médico.', coachStrengths: 'Lo que estás haciendo bien', coachImprovements: 'Qué mejorar', coachActions: 'Próximos 7 días', coachWatchouts: 'A tener en cuenta', coachQuestions: 'Preguntas que conviene responder', coachConfidence: 'Confianza', coachNoReview: 'Pregunta al coach para generar una revisión usando todo tu historial.', coachAnalysisSize: 'Contexto longitudinal preparado a partir de tu historial.', confirmAction: 'Confirmar', sourceOFF: 'Datos de Open Food Facts.', sourceUSDA: 'Datos de USDA FoodData Central.',
  coachPlanTitle: 'Crear un borrador de plan', coachPlanHint: 'Coach puede proponer rutinas y ciclos; nada cambia hasta que lo confirmes.', coachPlanButton: 'Generar borrador', coachApply: 'Aplicar cambios seleccionados', coachRevert: 'Snapshots de plan reversibles', coachUndo: 'Revertir'
}

export const labels = () => {
  const base = getLang() === 'es' ? ES : EN
  if (getLang() === 'en' || getLang() === 'es') return base
  return new Proxy(base, { get(target, property) {
    const value = target[property]
    return typeof value === 'string' ? t(value) : value
  } })
}
const nice = value => roundNutrition(value).toLocaleString(getLang() === 'es' ? 'es-ES' : 'en-GB', { maximumFractionDigits: 1 })
const percent = (value, goal) => goal > 0 ? Math.min(100, Math.max(0, value / goal * 100)) : 0
const idOf = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const favoriteIds = values => new Set((Array.isArray(values) ? values : []).map(value => typeof value === 'string' ? value : value?.id).filter(Boolean))
const foodSnapshot = food => {
  if (!food?.id) return null
  return {
    ...food,
    per100: { ...(food.per100 || {}) },
    availableNutrients: food.availableNutrients ? { ...food.availableNutrients } : undefined,
    sourceMeta: food.sourceMeta ? { ...food.sourceMeta } : undefined,
    categories: Array.isArray(food.categories) ? food.categories.slice(0, 20) : [],
    labels: Array.isArray(food.labels) ? food.labels.slice(0, 20) : []
  }
}
function toggleFavoriteInState(state, food) {
  const id = food?.id
  if (!id) return
  const ids = favoriteIds(state.nutritionFavorites)
  const saved = Array.isArray(state.nutritionFavoriteFoods) ? state.nutritionFavoriteFoods : []
  if (ids.has(id)) {
    ids.delete(id)
    state.nutritionFavoriteFoods = saved.filter(item => item?.id !== id)
  } else {
    ids.add(id)
    const snapshot = foodSnapshot(food)
    state.nutritionFavoriteFoods = snapshot ? [snapshot, ...saved.filter(item => item?.id !== id)].slice(0, 200) : saved
  }
  state.nutritionFavorites = [...ids]
}
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

function LocalCatalogNote() { return null }

function MacroLine({ entry, C }) {
  const n = entryNutrients(entry)
  const amount = entry.food?.source === 'LiftNex recipe' ? '1 serving' : `${nice(entry.grams)}g`
  return <span className="small muted">{amount} · {nice(n.calories)} {C.caloriesShort} · {nice(n.protein)}g {C.proteinShort} · {nice(n.carbs)}g {C.carbsShort} · {nice(n.fat)}g {C.fatShort}</span>
}

function scoreMetricLabel(C, key) {
  return ({ additives: C.additives, salt: C.salt, saturatedFat: C.saturatedFat, sugar: C.sugar, protein: C.protein, fiber: C.fiber, energy: C.energy, nutriScore: C.scoreNutri, processing: C.processing }[key] || key)
}

function scoreToneLabel(C, tone, kind) {
  if (kind === 'negative' || kind === 'ingredient') return tone === 'low' ? C.scoreRiskHigh : tone === 'moderate' ? C.scoreRiskMedium : tone === 'good' ? C.scoreNoRisk : C.scoreNeutral
  return tone === 'good' ? C.scoreGood : tone === 'moderate' ? C.scoreModerate : tone === 'low' ? C.scoreLow : C.scoreNeutral
}

function ScoreMetric({ C, item }) {
  const value = typeof item.value === 'number' ? nice(item.value) : item.value
  const note = item.key === 'additives' ? (item.value ? item.detail : C.scoreNoAdditives) : item.key === 'energy' ? C.scorePer100 : ['nutriScore', 'processing'].includes(item.key) ? C.scoreContext : C.scorePer100
  return <div className="nutrition-score-row"><span className={`nutrition-score-row-icon ${item.tone}`}><Icon name={item.icon} /></span><span className="nutrition-score-row-copy"><strong>{scoreMetricLabel(C, item.key)}</strong><small>{scoreToneLabel(C, item.tone, item.kind)} · {note}</small></span><span className="nutrition-score-row-value">{value}{item.unit && <small>{item.unit}</small>}</span><span className={`nutrition-score-dot ${item.tone}`} /><Icon name="info" className="nutrition-score-info" /></div>
}

function ScoreGroup({ C, title, items }) {
  return <section className="nutrition-score-group"><h4>{title}</h4><div className="nutrition-score-list">{items.map(item => <ScoreMetric C={C} item={item} key={item.key} />)}</div></section>
}

const ingredientPreview = value => {
  const clean = String(value || '').replace(/\s+/g, ' ').trim()
  if (clean.length <= 92) return clean
  return `${clean.slice(0, 88).replace(/\s+\S*$/, '').trim()}…`
}

function ScoreIngredientRow({ C, item }) {
  const long = String(item.name || '').length > 92
  const content = <>
    <span className={`nutrition-score-row-icon ${item.tone}`}><Icon name="plate" /></span>
    <span className="nutrition-score-row-copy"><strong>{long ? ingredientPreview(item.name) : item.name}</strong><small>{scoreToneLabel(C, item.tone, item.kind)} · {C[item.key]}</small></span>
    <span className={`nutrition-score-dot ${item.tone}`} />
    <Icon name="info" className="nutrition-score-info" />
    {long && <Icon name="chevronDown" className="nutrition-ingredient-chevron" />}
  </>
  if (!long) return <div className="nutrition-score-row nutrition-score-ingredient" key={item.name}>{content}</div>
  return <details className={`nutrition-score-row nutrition-score-ingredient nutrition-score-ingredient-detail ${item.tone}`} key={item.name}>
    <summary className="nutrition-score-row-summary">{content}</summary>
    <div className="nutrition-ingredient-full">{item.name}</div>
  </details>
}

function ScoreIngredients({ C, ingredients }) {
  if (!ingredients.length) return <section className="nutrition-score-group"><h4>{C.scoreIngredients}</h4><p className="nutrition-score-empty">{C.scoreNoIngredients}</p></section>
  const firstIngredients = ingredients.slice(0, 10)
  const remainingIngredients = ingredients.slice(10)
  return <section className="nutrition-score-group"><h4>{C.scoreIngredients}</h4><p className="nutrition-score-group-hint">{C.ingredientsHint}</p><div className="nutrition-score-list">{firstIngredients.map(item => <ScoreIngredientRow C={C} item={item} key={item.name} />)}{remainingIngredients.length > 0 && <details className="nutrition-more-ingredients"><summary>{C.moreIngredients.replace('{0}', remainingIngredients.length)}</summary><div>{remainingIngredients.map(item => <ScoreIngredientRow C={C} item={item} key={item.name} />)}</div></details>}</div></section>
}

function ScorePanel({ C, score, title = C.scoreBreakdown }) {
  const breakdown = score?.breakdown || { negative: [], positive: [], context: [], ingredients: [] }
  const confidenceLabel = score?.confidence === 'high' ? C.confidenceHigh : score?.confidence === 'low' ? C.confidenceLow : C.confidenceMedium
  const personalWarnings = score?.personal?.warnings || []
  return <div className="nutrition-score-popover"><div className="nutrition-score-panel-head"><strong>{title}</strong><span>{C.scoreExplainer}</span></div><div className={`nutrition-score-confidence ${score?.confidence || 'low'}`}><div><strong>{C.confidence}</strong><span>{confidenceLabel}</span></div><p>{C.missingData}</p>{score?.confidenceReasons?.length > 0 && <small>{score.confidenceReasons.join(' · ')}</small>}</div>{personalWarnings.length > 0 ? <div className="nutrition-score-personal warning"><strong>{C.personalWarnings}</strong>{personalWarnings.map(item => <span key={item}>{item}</span>)}</div> : <div className="nutrition-score-personal"><strong>{C.personalFit}</strong><span>{C.noPersonalWarnings}</span></div>}<ScoreGroup C={C} title={C.scoreNegative} items={breakdown.negative} /><ScoreGroup C={C} title={C.scorePositive} items={breakdown.positive} /><ScoreGroup C={C} title={C.scoreContext} items={breakdown.context} /><ScoreIngredients C={C} ingredients={breakdown.ingredients} /></div>
}

function FoodScore({ C, food }) {
  const score = healthScore(food)
  if (!score) return <span className="nutrition-score nutrition-score-unknown">{C.scoreNoData}</span>
  const label = score.tone === 'good' ? C.scoreGood : score.tone === 'moderate' ? C.scoreModerate : C.scoreLow
  return <details className={`nutrition-score-detail ${score.tone}`}>
    <summary><span className="nutrition-score-pill">{score.score}</span><span>{C.healthScore} · {label}</span><Icon name="chevronDown" className="nutrition-score-chevron" /></summary>
    <ScorePanel C={C} score={score} />
  </details>
}

function FoodResults({ C, results, grams, setGrams, addFood, openProduct, preferences = {}, favorites, toggleFavorite }) {
  const storedFavorites = useStore(state => state.S.nutritionFavorites || [])
  const update = useStore(state => state.update)
  const visibleFavorites = Array.isArray(favorites) ? favorites : storedFavorites
  const visibleFavoriteIds = favoriteIds(visibleFavorites)
  const onToggleFavorite = toggleFavorite || (food => update(s => toggleFavoriteInState(s, food)))
  if (!results.length) return null
  return <div className="nutrition-results" aria-live="polite"><div className="small muted nutrition-results-title">{C.results}</div>{results.map(food => { const score = healthScore(food, preferences); const label = score ? (score.tone === 'good' ? C.scoreGood : score.tone === 'moderate' ? C.scoreModerate : C.scoreLow) : C.scoreNoData; const favorite = visibleFavoriteIds.has(food.id); return <article className="nutrition-food nutrition-food-result" key={food.id}><button type="button" className="nutrition-food-open" onClick={() => openProduct(food, results)} aria-label={`${C.viewProduct}: ${food.name}`}><span className="nutrition-food-icon">{food.image ? <img src={food.image} alt="" loading="lazy" /> : <Icon name="plate" />}</span><span className="nutrition-food-main"><span className="nutrition-food-name">{food.name}</span><span className="small muted">{food.brand ? `${food.brand} · ` : ''}{nice(food.per100.calories)} {C.caloriesShort} · {nice(food.per100.protein)}g {C.proteinShort}{food.grade ? ` · ${food.grade.toUpperCase()}` : ''}</span><span className="nutrition-food-score-preview">{score && <span className={`nutrition-score-pill ${score.tone}`}>{score.score}</span>}<span>{C.healthScore} · {label}</span><Icon name="chevronRight" /></span></span></button><div className="nutrition-add-controls"><button type="button" className={'iconbtn nutrition-favorite' + (favorite ? ' on' : '')} onClick={() => onToggleFavorite(food)} aria-label={favorite ? C.unfavorite : C.favorite}><Icon name={favorite ? 'starFill' : 'star'} /></button><div className="nutrition-amount"><NumberField value={grams[food.id] || 100} decimal={false} aria-label={`${C.grams} ${food.name}`} onChange={value => setGrams(g => ({ ...g, [food.id]: value }))} /><span>g</span></div><Button size="xs" variant="primary" icon="plus" onClick={() => addFood(food)}>{C.add}</Button></div></article> })}</div>
}

function SavedFoods({ C, foods = [], recentFoods = [], addFood, openProduct, toggleFavorite }) {
  if (!foods.length && !recentFoods.length) return null
  return <section className="card nutrition-saved" aria-labelledby="nutrition-saved-title">
    <div className="row between nutrition-saved-head"><div><h2 id="nutrition-saved-title">{C.savedFoods}</h2><p className="muted small">{C.savedFoodsHint}</p></div><Icon name="starFill" className="nutrition-card-icon" /></div>
    {foods.length > 0 && <div className="nutrition-saved-group"><div className="nutrition-saved-label">{C.favorites}</div><div className="nutrition-saved-list">{foods.map(food => <article className="nutrition-saved-food" key={food.id}><button type="button" className="nutrition-saved-open" onClick={() => openProduct(food, foods)} aria-label={`${C.openAnalysis}: ${food.name}`}><span className="nutrition-saved-image">{food.image ? <img src={food.image} alt="" loading="lazy" /> : <Icon name="plate" />}</span><span className="nutrition-saved-copy"><strong>{food.name}</strong><small>{food.brand || C.openFoodFacts} · {nice(food.per100?.calories)} {C.caloriesShort} · {nice(food.per100?.protein)}g {C.proteinShort}</small></span></button><Button size="xs" variant="primary" icon="plus" onClick={() => addFood(food)}>{C.add}</Button><button type="button" className="iconbtn nutrition-saved-remove" onClick={() => toggleFavorite(food)} aria-label={C.unfavorite}><Icon name="starFill" /></button></article>)}</div></div>}
    {recentFoods.length > 0 && <div className="nutrition-saved-group"><div className="nutrition-saved-label">{C.recentFoods}</div><div className="nutrition-recent-list nutrition-saved-recent">{recentFoods.map(food => <button type="button" className="chip" key={food.id} onClick={() => addFood(food)}>{food.name}</button>)}</div></div>}
  </section>
}

function NutritionPreferences({ C, S, update }) {
  const preferences = S.nutritionPreferences || {}
  return <section className="card nutrition-preferences" aria-labelledby="nutrition-preferences-title"><div className="row between"><div><h2 id="nutrition-preferences-title">{C.preferences}</h2><p className="muted small">{C.personalFit}</p></div><Icon name="heart" className="nutrition-card-icon" /></div><div className="nutrition-preference-grid"><label><span>{C.diet}</span><select className="field" value={preferences.diet || 'none'} onChange={event => update(s => { s.nutritionPreferences = { ...(s.nutritionPreferences || {}), diet: event.target.value } })}><option value="none">{C.none}</option><option value="vegetarian">{C.vegetarian}</option><option value="vegan">{C.vegan}</option></select></label><label><span>{C.allergens}</span><TextField value={preferences.allergens || ''} placeholder={C.allergensHint} onChange={event => update(s => { s.nutritionPreferences = { ...(s.nutritionPreferences || {}), allergens: event.target.value } })} /></label></div><label className="nutrition-consent"><Check checked={!!preferences.avoidAdditives} onChange={checked => update(s => { s.nutritionPreferences = { ...(s.nutritionPreferences || {}), avoidAdditives: checked } })} ariaLabel={C.avoidAdditives} /><span>{C.avoidAdditives}</span></label></section>
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

function NutritionDiary({ C, S, date, setDate, meal, setMeal, dayEntries, totals, goal, update, addFood, removeEntry, recentFoods, favoriteFoods = [], preferences = {}, favorites = [], toggleFavorite = () => {}, restoreSearch = null }) {
  const nav = useNavigate()
  const [query, setQuery] = useState(() => restoreSearch?.query || '')
  const [barcode, setBarcode] = useState(() => restoreSearch?.barcode || '')
  const [filters, setFilters] = useState(() => ({ grade: '', maxSugar: '', minProtein: '', category: '', brand: '', country: '', ...(restoreSearch?.filters || {}) }))
  const [results, setResults] = useState(() => restoreSearch?.results || [])
  const [grams, setGrams] = useState(() => restoreSearch?.grams || {})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showFilters, setShowFilters] = useState(() => !!restoreSearch?.showFilters)
  const [showMicros, setShowMicros] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [manual, setManual] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '', fiber: '', sugar: '', salt: '' })
  const searchSnapshot = () => ({
    section: 'diary', date, meal, query, barcode, filters, results, grams, showFilters
  })
  const openProduct = (food, alternatives) => {
    const snapshot = searchSnapshot()
    // The product view is a separate route, so preserve the list before React
    // unmounts this page. This also covers browser back, not only our button.
    persistNutritionSearchState(snapshot)
    nav(`/nutrition/product/${encodeURIComponent(food.code || food.id)}`, { state: { food, alternatives, query } })
  }
  const runSearch = async () => {
    if (query.trim().length < 2) return
    setLoading(true); setError('')
    try { const found = await searchFoodSources({ query, filters }); setResults(found); if (!found.length) setError(C.notFound) }
    catch (e) { setError(e.message || C.notFound) }
    finally { setLoading(false) }
  }
  const runBarcode = async (value = barcode) => {
    setLoading(true); setError('')
    try { const food = await lookupBarcode(value); setResults([food]); setQuery(food.name) }
    catch (e) { setError(e.message || C.notFound) }
    finally { setLoading(false) }
  }
  const saveManual = () => {
    if (!manual.name.trim() || !Object.values(manual).some((value, index) => index > 0 && value !== '' && +value >= 0)) { setError(C.enterFood); return }
    addFood({ id: `manual:${idOf('food')}`, source: 'Manual', name: manual.name.trim(), brand: '', code: '', image: '', serving: '', grade: '', categories: [], labels: [], per100: Object.fromEntries(['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'salt'].map(key => [key, roundNutrition(manual[key])])) })
    setManual({ name: '', calories: '', protein: '', carbs: '', fat: '', fiber: '', sugar: '', salt: '' }); setManualOpen(false); setError('')
  }
  const duplicateMeal = selectedMeal => {
    const source = dayEntries.filter(entry => entry.meal === selectedMeal)
    if (!source.length) return
    update(s => { s.nutritionEntries = [...(s.nutritionEntries || []), ...source.map(entry => ({ ...entry, id: idOf('nutrition-copy'), date }))] })
  }
  return <>
    <div className="nutrition-date card"><label htmlFor="nutrition-date">{C.date}</label><input id="nutrition-date" className="field" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
    <section className="card nutrition-summary" aria-labelledby="nutrition-summary-title"><div className="row between"><h2 id="nutrition-summary-title">{C.calories}</h2><span className="muted small">{nice(totals.calories)} / {nice(goal.calories)} {C.caloriesShort}</span></div><div className="nutrition-calories"><div className="nutrition-calorie-number">{nice(totals.calories)} <span>{C.caloriesShort}</span></div><div className="nutrition-calorie-copy">{nice(Math.max(0, goal.calories - totals.calories))} {C.remaining}</div><div className="nutrition-track"><span style={{ width: `${percent(totals.calories, goal.calories)}%` }} /></div></div><div className="nutrition-macros">{[['protein', C.protein, 'var(--acc)'], ['carbs', C.carbs, 'var(--blue)'], ['fat', C.fat, 'var(--orange)']].map(([key, label, color]) => <div className="nutrition-macro" key={key}><div className="row between"><span>{label}</span><span>{nice(totals[key])} / {nice(goal[key])}g</span></div><div className="nutrition-track"><span style={{ width: `${percent(totals[key], goal[key])}%`, background: color }} /></div></div>)}</div></section>
    <section className="card nutrition-micros" aria-labelledby="nutrition-micros-title"><button className="nutrition-disclosure" aria-expanded={showMicros} onClick={() => setShowMicros(v => !v)}><span><strong id="nutrition-micros-title">{C.micros}</strong><small>{C.microsHint}</small></span><Icon name="chevronDown" /></button>{showMicros && <div className="nutrition-micros-grid">{[['fiber', C.fiber, 'g'], ['sugar', C.sugar, 'g'], ['salt', C.salt, 'g'], ['sodium', C.sodium, 'mg'], ['potassium', C.potassium, 'mg'], ['calcium', C.calcium, 'mg'], ['iron', C.iron, 'mg'], ['vitaminC', C.vitaminC, 'mg'], ['vitaminD', C.vitaminD, 'µg']].map(([key, label, unit]) => <div key={key}><span>{label}</span><strong>{nice(totals[key])}{unit}</strong></div>)}</div>}</section>
    <section className="card nutrition-goals" aria-labelledby="nutrition-goals-title"><div className="row between"><div><h2 id="nutrition-goals-title">{C.goal}</h2><span className="muted small">{C.goalsHint}</span></div><Button size="sm" variant="tinted" icon="target" onClick={() => nav('/goals')}>{C.goals}</Button></div><div className="nutrition-goal-grid nutrition-goal-readonly">{[['calories', C.calories, C.caloriesShort], ['protein', C.protein, 'g'], ['carbs', C.carbs, 'g'], ['fat', C.fat, 'g']].map(([key, label, unit]) => <div className="nutrition-goal-readonly-item" key={key}><span>{label}</span><strong>{nice(goal[key])}<i>{unit}</i></strong></div>)}</div></section>
    <NutritionPreferences C={C} S={S} update={update} />
    <SavedFoods C={C} foods={favoriteFoods} recentFoods={recentFoods} addFood={addFood} openProduct={openProduct} toggleFavorite={toggleFavorite} />
    <section className="nutrition-search card" aria-labelledby="nutrition-add-title"><div className="row between"><h2 id="nutrition-add-title">{C.addFood}</h2></div><LocalCatalogNote C={C} /><div className="nutrition-search-row"><SearchField value={query} placeholder={C.searchPlaceholder} onChange={e => setQuery(e.target.value)} onClear={() => { setQuery(''); setResults([]); setError(''); clearNutritionSearchState() }} onKeyDown={e => { if (e.key === 'Enter') runSearch() }} /><Button variant="primary" size="sm" icon="magnifier" disabled={loading || query.trim().length < 2} onClick={runSearch}>{loading ? C.searching : C.search}</Button></div><div className="nutrition-meal-chips" role="group" aria-label={C.meals}>{MEALS.map(value => <button key={value} className={'chip' + (meal === value ? ' on' : '')} onClick={() => setMeal(value)}>{mealName(value, C)}</button>)}</div>{recentFoods.length > 0 && <div className="nutrition-recent"><div className="small muted">{C.recentFoods}</div><div className="nutrition-recent-list">{recentFoods.map(food => <button className="chip" key={food.id} onClick={() => addFood(food)}>{food.name}</button>)}</div></div>}<div className="nutrition-barcode-row"><label htmlFor="nutrition-barcode">{C.barcode}</label><TextField id="nutrition-barcode" value={barcode} inputMode="numeric" placeholder="e.g. 8412345678901" onChange={e => setBarcode(e.target.value.replace(/\D/g, ''))} /><Button size="sm" icon="search" disabled={loading || barcode.length < 6} onClick={() => runBarcode()}>{C.lookup}</Button><Button size="sm" variant="tinted" icon="camera" disabled={loading} onClick={() => setShowScanner(true)}>{C.scan}</Button></div>{showScanner && <BarcodeScanner C={C} onDetected={code => { setBarcode(code); setShowScanner(false); runBarcode(code) }} onClose={() => setShowScanner(false)} />}<p className="nutrition-source"><Icon name="info" /> {C.barcodeHint}</p><button className="nutrition-filter-toggle" aria-expanded={showFilters} onClick={() => setShowFilters(v => !v)}><Icon name="chevronDown" /> {showFilters ? C.hideFilters : C.filters}</button>{showFilters && <div className="nutrition-filters"><div className="nutrition-filter-grid"><label><span>{C.maxSugar}</span><NumberField value={filters.maxSugar} nullable decimal onChange={value => setFilters(f => ({ ...f, maxSugar: value ?? '' }))} /></label><label><span>{C.minProtein}</span><NumberField value={filters.minProtein} nullable decimal onChange={value => setFilters(f => ({ ...f, minProtein: value ?? '' }))} /></label><label className="nutrition-filter-wide"><span>{C.category}</span><TextField value={filters.category} placeholder="e.g. yogurt" onChange={e => setFilters(f => ({ ...f, category: e.target.value }))} /></label><label><span>{C.brand}</span><TextField value={filters.brand} placeholder="e.g. Hacendado" onChange={e => setFilters(f => ({ ...f, brand: e.target.value }))} /></label><label><span>{C.country}</span><TextField value={filters.country} placeholder="e.g. Spain" onChange={e => setFilters(f => ({ ...f, country: e.target.value }))} /></label></div><Button size="sm" variant="tinted" onClick={runSearch} disabled={loading || query.trim().length < 2}>{C.apply}</Button></div>}{error && <div className="nutrition-alert" role="alert"><Icon name="info" /> <span>{error}</span></div>}<FoodResults C={C} results={results} grams={grams} setGrams={setGrams} addFood={addFood} openProduct={openProduct} preferences={preferences} />{!results.length && !loading && !error && <p className="muted small nutrition-empty-search">{C.noResults}</p>}<Button size="sm" variant="plain" icon="plus" onClick={() => setManualOpen(v => !v)}>{manualOpen ? C.cancel : C.quickAdd}</Button>{manualOpen && <div className="nutrition-manual"><p className="muted small">{C.quickAddHint}</p><label><span>{C.name}</span><TextField value={manual.name} onChange={e => setManual(m => ({ ...m, name: e.target.value }))} /></label><div className="nutrition-manual-grid">{['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'salt'].map(key => <label key={key}><span>{C[key]} <i>/100g</i></span><NumberField value={manual[key]} nullable decimal onChange={value => setManual(m => ({ ...m, [key]: value ?? '' }))} /></label>)}</div><Button variant="primary" icon="check" onClick={saveManual}>{C.save}</Button></div>}<p className="nutrition-source"><Icon name="info" /> {C.localSource}</p></section>
    <section aria-labelledby="nutrition-meals-title"><h2 className="nutrition-section-title" id="nutrition-meals-title">{C.meals}</h2>{MEALS.map(value => { const mealEntries = dayEntries.filter(entry => entry.meal === value); return <div className="card nutrition-meal" key={value}><div className="row between"><div><h2>{mealName(value, C)}</h2><span className="muted small">{mealEntries.length} {C.ingredients.toLowerCase()}</span></div><div className="row" style={{ gap: 6 }}><Button size="xs" icon="copy" disabled={!mealEntries.length} onClick={() => duplicateMeal(value)}>{C.duplicate}</Button><Button size="xs" icon="plus" onClick={() => setMeal(value)}>{C.add}</Button></div></div>{mealEntries.length ? mealEntries.map(entry => <div className="nutrition-entry" key={entry.id}><div className="nutrition-entry-main"><div>{entry.food.name}</div><MacroLine entry={entry} C={C} /></div><button className="iconbtn nutrition-remove" onClick={() => removeEntry(entry.id)} aria-label={`${C.remove} ${entry.food.name}`}><Icon name="trash" /></button></div>) : <p className="muted small nutrition-empty-meal">{C.noEntries}</p>}</div> })}</section>
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
  const nav = useNavigate()
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
    <section className="card nutrition-wellness-card" aria-labelledby="water-title"><div className="row between"><div><h2 id="water-title">{C.water}</h2><div className="nutrition-wellness-number">{nice(water)} <span>/ {nice(waterGoal)} ml</span></div></div><Icon name="droplet" className="nutrition-card-icon" /></div><div className="nutrition-track"><span style={{ width: `${percent(water, waterGoal)}%`, background: 'var(--blue)' }} /></div><div className="small muted nutrition-wellness-copy">{water >= waterGoal ? C.waterDone : C.waterHint}</div><div className="nutrition-water-goal"><div><span>{C.waterGoal}</span><strong>{nice(waterGoal)} ml</strong></div><Button size="sm" variant="tinted" icon="target" onClick={() => nav('/goals')}>{C.goals}</Button></div><div className="nutrition-water-actions">{[250, 500, 750].map(ml => <Button key={ml} size="sm" variant="tinted" onClick={() => addWater(ml)}>+{ml} ml</Button>)}</div><div className="nutrition-custom-water"><NumberField value={customWater} nullable decimal={false} aria-label={C.customWater} onChange={value => setCustomWater(value ?? '')} /><Button size="sm" variant="plain" onClick={() => { addWater(customWater); setCustomWater('') }} disabled={!customWater}>{C.addWater}</Button></div></section>
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

function CoachReview({ C, review, update, source = 'ai' }) {
  if (!review) return null
  const groups = [
    ['strengths', C.coachStrengths, 'acc'],
    ['improvements', C.coachImprovements, 'orange'],
    ['watchouts', C.coachWatchouts, 'violet'],
    ['questions', C.coachQuestions, 'neutral']
  ]
  const actions = (review.actions || []).map(item => typeof item === 'string' ? { type: 'review_week', title: item, description: '', payload: {}, requiresConfirmation: true } : item).map(item => validateCoachAction(item).valid ? validateCoachAction(item).value : null).filter(Boolean)
  const confirmAction = action => update(s => { s.coachActionHistory = [...(s.coachActionHistory || []), { ...action, confirmedAt: new Date().toISOString(), source }] })
  return <section className="nutrition-coach-review" aria-live="polite">
    {review.summary && <div className="nutrition-coach-summary-text"><strong>{C.coachTitle}</strong><p>{review.summary}</p></div>}
    {groups.map(([key, title, tone]) => Array.isArray(review[key]) && review[key].length > 0 && <div className={`nutrition-coach-review-group ${tone}`} key={key}><h3>{title}</h3><ul>{review[key].map((item, index) => <li key={`${key}-${index}`}>{item}</li>)}</ul></div>)}
    {actions.length > 0 && <div className="nutrition-coach-review-group blue"><h3>{C.coachActions}</h3><div className="nutrition-coach-action-list">{actions.map((action, index) => <article className="nutrition-coach-action" key={`${action.type}-${index}`}><div><strong>{action.title}</strong>{action.description && <p>{action.description}</p>}</div><Button size="xs" variant="tinted" onClick={() => confirmAction(action)}>{C.confirmAction}</Button></article>)}</div></div>}
    {review.confidence && <div className="nutrition-coach-confidence"><span>{C.coachConfidence}</span><strong>{review.confidence}</strong></div>}
  </section>
}

function localCoachReview(context, C) {
  const coverage = context.coverage || {}
  const local = context.localAnalysis || {}
  const strengths = [
    coverage.workoutSessions ? `${coverage.workoutSessions} ${C.coachSessions} available for comparison.` : '',
    coverage.nutritionDays ? `${coverage.nutritionDays} ${C.coachMeals} with food records.` : ''
  ].filter(Boolean)
  const improvements = (local.findings || []).map(item => `${item.title}: ${item.detail}`).slice(0, 6)
  const actions = (local.actions || []).map(title => ({ type: 'review_week', title, description: '', payload: {}, requiresConfirmation: true })).slice(0, 5)
  const summary = C.coachLocalSummary
    .replace('{0}', coverage.workoutSessions || 0)
    .replace('{1}', coverage.nutritionDays || 0)
    .replace('{2}', coverage.weightEntries || 0)
  return { summary, strengths, improvements, actions, watchouts: [], questions: [], confidence: 'low' }
}

function coachProviderLabel(C, source) {
  return source === 'gemini' ? C.coachProviderGemini : source === 'provider' ? C.coachProviderConnected : C.coachProviderLocal
}

export function NutritionCoach({ C, S, date, totals, goal, update }) {
  const nav = useNavigate()
  const water = waterTotal(S.waterEntries || [], date)
  const waterGoal = S.waterGoal || 2000
  const fasting = S.fasting || {}
  const local = localCoachInsights({ totals, goal, water, waterGoal, fasting })
  const storedProfile = S.coachProfile || {}
  const objective = storedProfile.objective || 'performance'
  const [notes, setNotes] = useState(storedProfile.notes || '')
  const [review, setReview] = useState(null)
  const [consent, setConsent] = useState(!!S.aiConsent)
  const [loading, setLoading] = useState(false)
  const [answer, setAnswer] = useState('')
  const [source, setSource] = useState(null)
  const [requestError, setRequestError] = useState('')
  const [requestId, setRequestId] = useState('')
  useEffect(() => { setNotes(storedProfile.notes || '') }, [storedProfile.notes])
  useEffect(() => { setConsent(!!S.aiConsent) }, [S.aiConsent])
  const context = useMemo(() => buildLongitudinalCoachContext(S, { date, objective, notes, goal }), [S, date, objective, notes, goal])
  const saveProfile = patch => update(s => { s.coachProfile = { ...(s.coachProfile || {}), ...patch } })
  const showLocalReview = (message, diagnosticId = '') => {
    setReview(localCoachReview(context, C))
    setSource('local')
    setRequestError(message)
    setRequestId(diagnosticId || '')
  }
  const providerErrorMessage = error => {
    const code = error?.data?.code
    if (error?.status === 401) return C.coachSignIn
    if (code === 'AI_INVALID_KEY') return C.coachKeyError
    if (code === 'AI_MODEL_NOT_FOUND') return C.coachModelError
    if (code === 'AI_RATE_LIMITED' || error?.status === 429) return C.coachRateError
    if (code === 'AI_NETWORK' || code === 'AI_TIMEOUT') return C.coachNetworkError
    if (code === 'AI_NOT_CONFIGURED') return C.coachOffline
    return C.coachProviderError || C.coachRequestError
  }
  const ask = async () => {
    if (!consent || loading) return
    setLoading(true)
    setReview(null); setAnswer(''); setSource(null); setRequestError(''); setRequestId('')
    if (DEMO || MOBILE) {
      showLocalReview(C.coachOffline)
      setLoading(false)
      return
    }
    try {
      const response = await api('/api/coach', { method: 'POST', body: JSON.stringify({ mode: 'review', context, consent: true }) })
      if (response.coach) {
        const normalized = normalizeCoachReview(response.coach)
        if (!normalized) {
          showLocalReview(C.coachEmpty, response.requestId)
          return
        }
        setReview(normalized)
        setSource(response.source || 'provider')
        setRequestId(response.requestId || '')
      } else if (response.answer) {
        setAnswer(response.answer)
        setSource(response.source || 'provider')
      } else {
        showLocalReview(response.configured === false ? C.coachLocalFallback : C.coachEmpty)
      }
    } catch (error) {
      showLocalReview(providerErrorMessage(error), error?.data?.requestId)
    }
    finally { setLoading(false) }
  }
  const insightText = key => C[key] || C.noAdvice
  const coverage = context.coverage
  const quality = context.nutrition.dataQuality || {}
  const qualityLabel = quality.confidence === 'high' ? C.coachQualityHigh : quality.confidence === 'medium' ? C.coachQualityMedium : C.coachQualityLow
  C.coachDiagnosticId = C.coachDiagnosticId || (getLang() === 'es' ? 'ID de diagnóstico' : 'Diagnostic ID')
  const objectiveOptions = [
    ['performance', C.objectivePerformance],
    ['build', C.objectiveBuild],
    ['cut', C.objectiveCut],
    ['maintain', C.objectiveMaintain],
    ['health', C.objectiveHealth]
  ]
  const objectiveLabel = objectiveOptions.find(([value]) => value === objective)?.[1] || C.objectivePerformance
  return <>
    <section className="card nutrition-coach-hero"><div className="row"><span className="nutrition-coach-orb"><Icon name="brain" /></span><div><h2>{C.coachTitle}</h2><p className="muted small">{C.coachSubtitle}</p></div></div><p className="nutrition-coach-scope"><Icon name="info" /> {C.coachScope}</p></section>
    <section className="card nutrition-coach-profile"><div className="row between"><div><h2>{C.coachObjective}</h2><p className="nutrition-coach-goal-value">{objectiveLabel}</p></div><Button size="sm" variant="tinted" icon="target" onClick={() => nav('/goals')}>{C.goals || 'Goals'}</Button></div><label className="nutrition-coach-notes"><span>{C.coachNotes}</span><TextField value={notes} placeholder={C.coachNotesPlaceholder} maxLength={500} onChange={event => { setNotes(event.target.value); saveProfile({ notes: event.target.value }) }} /></label></section>
    <section className="card nutrition-coach-coverage"><div className="row between"><h2>{C.coachDataCoverage}</h2><span className="tag acc">{context.scope}</span></div><div className="nutrition-coach-coverage-grid"><div><strong>{coverage.workoutSessions}</strong><span>{C.coachSessions}</span></div><div><strong>{coverage.nutritionEntries}</strong><span>{C.coachMeals}</span></div><div><strong>{coverage.weightEntries}</strong><span>{C.coachWeight}</span></div><div><strong>{context.nutrition.proteinDays}</strong><span>{C.coachProteinDays}</span></div><div><strong>{coverage.healthMetricDays}</strong><span>{C.coachHealthDays}</span></div></div>{quality.validEntries > 0 && <div className={'nutrition-coach-data-quality ' + (quality.confidence || 'low')} role="status"><div><strong>{C.coachDataQuality}</strong><span>{quality.coverage}% · {qualityLabel}</span></div><small>{C.coachDataQualityHint}</small></div>}<p className="nutrition-source"><Icon name="info" /> {C.coachAnalysisSize}</p></section>
    <section className="card nutrition-coach-findings"><h2>{C.coachImprovements}</h2>{context.localAnalysis.findings.length ? context.localAnalysis.findings.map((item, index) => <div className={`nutrition-coach-finding ${item.tone}`} key={`${item.title}-${index}`}><Icon name={item.tone === 'orange' ? 'warning' : item.tone === 'neutral' ? 'info' : 'sparkles'} /><div><strong>{item.title}</strong><span>{item.detail}</span></div></div>) : <div className="nutrition-insight acc"><Icon name="checkCircle" /><span>{C.noAdvice}</span></div>}<div className="nutrition-coach-local-actions"><strong>{C.coachActions}</strong>{context.localAnalysis.actions.map((item, index) => <span key={index}>{item}</span>)}</div></section>
    <section className="card nutrition-insights" aria-live="polite"><h2>{C.localCoach}</h2>{local.length ? local.map(item => <div className={`nutrition-insight ${item.tone}`} key={item.key}><Icon name={item.tone === 'neutral' ? 'info' : item.tone === 'blue' ? 'droplet' : item.tone === 'violet' ? 'timer' : 'sparkles'} /><span>{insightText(item.key)}</span></div>) : <div className="nutrition-insight acc"><Icon name="checkCircle" /><span>{C.noAdvice}</span></div>}</section>
    <section className="card nutrition-ai-card"><h2>{C.askCoach}</h2><p className="muted small">{C.coachConsent}</p><div className="nutrition-consent"><Check checked={consent} onChange={value => { setConsent(value); update(s => { s.aiConsent = value }) }} ariaLabel={C.coachConsent} /><span>{C.coachConsent}</span></div><Button variant="primary" icon="sparkles" disabled={!consent || loading} onClick={ask}>{loading ? C.coachGenerating : review || answer ? C.coachRefresh : C.askCoach}</Button>{(review || answer || requestError) && <div className="nutrition-ai-result" aria-live="polite"><div className={`nutrition-ai-status ${source === 'local' ? 'local' : 'connected'}`}><Icon name={source === 'local' ? 'info' : 'sparkles'} /><strong>{coachProviderLabel(C, source)}</strong></div>{requestError && <div className="nutrition-ai-notice"><span>{requestError}{requestId && <small className="nutrition-ai-diagnostic">{C.coachDiagnosticId}: {requestId}</small>}</span>{!DEMO && !MOBILE && <Button size="sm" variant="tinted" onClick={ask}>{C.coachTryAgain}</Button>}</div>}{review ? <CoachReview C={C} review={review} update={update} source={source} /> : answer && <div className="nutrition-ai-answer"><p>{answer}</p></div>}</div>}<p className="nutrition-source"><Icon name="info" /> {C.coachDisclaimer}</p></section>
  </>
}

function productScoreLabel(C, score) {
  if (!score) return C.scoreNoData
  return score.tone === 'good' ? C.scoreGood : score.tone === 'moderate' ? C.scoreModerate : C.scoreLow
}

function productDate(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(getLang() === 'es' ? 'es-ES' : 'en-GB')
}

function NutritionProductHero({ C, food, score, favorite, onToggleFavorite }) {
  const nutrients = [
    ['calories', C.caloriesShort, 'kcal'],
    ['protein', C.protein, 'g'],
    ['sugar', C.sugar, 'g'],
    ['salt', C.salt, 'g']
  ]
  const confidenceLabel = score?.confidence === 'high' ? C.confidenceHigh : score?.confidence === 'low' ? C.confidenceLow : C.confidenceMedium
  const meta = food.sourceMeta || {}
  return <section className="card nutrition-product-hero"><div className="nutrition-product-hero-top"><div className="nutrition-product-image">{food.image ? <img src={food.image} alt={food.name} /> : <Icon name="plate" />}</div><div className="nutrition-product-hero-copy"><h1>{food.name}</h1><p>{food.brand || C.openFoodFacts}</p><div className={`nutrition-product-score ${score?.tone || 'neutral'}`}><span className="nutrition-score-pill">{score?.score ?? '—'}</span><span><strong>{C.healthScore}</strong><small>{productScoreLabel(C, score)}</small></span></div><button type="button" className={'nutrition-product-save' + (favorite ? ' on' : '')} onClick={onToggleFavorite} aria-pressed={favorite}><Icon name={favorite ? 'starFill' : 'star'} /><span>{favorite ? C.unfavorite : C.favorite}</span></button><div className={`nutrition-product-confidence ${score?.confidence || 'low'}`}><span>{C.confidence}</span><strong>{confidenceLabel}</strong></div></div></div><div className="nutrition-product-meta"><span>{C.sourceMeta}: {meta.provider || food.source || C.openFoodFacts}</span>{meta.country && <span>{C.countryLabel}: {meta.country}</span>}{meta.fetchedAt && <span>{C.fetchedLabel}: {productDate(meta.fetchedAt)}</span>}{meta.cacheHit && <span>{C.cacheLabel}</span>}</div>{score?.missingFields?.length > 0 && <p className="nutrition-missing-note"><Icon name="info" /> {C.missingData}</p>}<div className="nutrition-product-nutrients">{nutrients.map(([key, label, unit]) => <div key={key}><span>{label}</span><strong>{score?.breakdown?.negative?.find(item => item.key === key)?.value ?? score?.breakdown?.positive?.find(item => item.key === key)?.value ?? (food.availableNutrients?.[key] === false ? '—' : nice(food.per100?.[key]))}<small>{unit}</small></strong></div>)}</div></section>
}

export function NutritionProduct() {
  useLang()
  const C = labels()
  const nav = useNavigate()
  const location = useLocation()
  const { code } = useParams()
  const preferences = useStore(state => state.S.nutritionPreferences || {})
  const favoriteValues = useStore(state => state.S.nutritionFavorites || [])
  const update = useStore(state => state.update)
  const state = location.state || {}
  const [food, setFood] = useState(state.food || null)
  const [loadedAlternatives, setLoadedAlternatives] = useState(state.alternatives || [])
  const [loading, setLoading] = useState(!state.food && !!code)
  const [loadError, setLoadError] = useState('')
  useEffect(() => {
    if (state.food || !code) { setFood(state.food || null); setLoadedAlternatives(state.alternatives || []); setLoading(false); return }
    let cancelled = false
    setLoading(true); setLoadError('')
    const key = decodeURIComponent(code)
    const load = async () => {
      try {
        const found = /^\d{6,32}$/.test(key) ? await lookupBarcode(key) : (await searchFoodSources({ query: key }))[0]
        if (!found) throw new Error(C.noResults)
        if (!cancelled) { setFood(found); setLoadedAlternatives([]) }
      } catch (error) { if (!cancelled) setLoadError(error.message || C.noResults) }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [code, state.food, state.alternatives, C.noResults])
  useEffect(() => {
    if (!food || loadedAlternatives.length || state.alternatives?.length) return
    let cancelled = false
    searchFoodSources({ query: food.name }).then(items => { if (!cancelled) setLoadedAlternatives(items) }).catch(() => {})
    return () => { cancelled = true }
  }, [food?.id])
  if (!food) return <div className="narrow nutrition-view"><section className="card nutrition-product-missing"><Icon name="plate" /><h1>{C.productAnalysis}</h1><p className="muted">{loading ? C.searching : loadError || C.noResults}</p><Button variant="primary" icon="chevronLeft" onClick={() => nav('/nutrition')}>{C.back}</Button></section></div>
  const score = healthScore(food, preferences)
  const favorite = favoriteIds(favoriteValues).has(food.id)
  const alternatives = [...new Map((Array.isArray(loadedAlternatives) ? loadedAlternatives : []).map(item => [item?.id, item]).filter(([id]) => id)).values()]
    .map(item => ({ food: item, score: healthScore(item, preferences) }))
    .filter(item => item.score && item.food.id !== food.id && (!score || item.score.score > score.score))
    .sort((a, b) => b.score.score - a.score.score)
    .slice(0, 6)
  const openAlternative = candidate => nav(`/nutrition/product/${encodeURIComponent(candidate.code || candidate.id)}`, { state: { food: candidate, alternatives: loadedAlternatives, query: state.query } })
  const comparison = (candidate, key, direction) => {
    if (food.availableNutrients?.[key] === false || candidate.availableNutrients?.[key] === false) return null
    const delta = roundNutrition((candidate.per100?.[key] || 0) - (food.per100?.[key] || 0))
    if (!delta || (direction === 'up' && delta <= 0) || (direction === 'down' && delta >= 0)) return null
    return `${delta > 0 ? '+' : ''}${nice(delta)} ${key === 'protein' ? C.moreProtein : key === 'fiber' ? C.moreFiber : key === 'sugar' ? C.lessSugar : key === 'salt' ? C.lessSalt : C.lessSaturatedFat}`
  }
  return <div className="narrow nutrition-view nutrition-product-view"><header className="nutrition-product-nav"><button type="button" className="iconbtn" aria-label={C.back} onClick={() => nav(-1)}><Icon name="chevronLeft" /></button><div><strong>{C.productAnalysis}</strong><span>{state.query || food.name}</span></div></header><NutritionProductHero C={C} food={food} score={score} favorite={favorite} onToggleFavorite={() => update(s => toggleFavoriteInState(s, food))} /><section className="card nutrition-product-breakdown"><h2>{C.fullAnalysis}</h2>{score ? <ScorePanel C={C} score={score} title={C.fullAnalysis} /> : <p className="nutrition-score-empty">{C.scoreNoData}</p>}</section><section className="card nutrition-alternatives"><h2>{C.healthierAlternatives}</h2><p className="muted small">{C.healthierAlternativesHint}</p>{alternatives.length ? <div className="nutrition-alternative-list">{alternatives.map(({ food: candidate, score: candidateScore }) => <button type="button" className="nutrition-alternative" key={candidate.id} onClick={() => openAlternative(candidate)} aria-label={`${C.openAnalysis}: ${candidate.name}`}><span className="nutrition-alternative-image">{candidate.image ? <img src={candidate.image} alt="" loading="lazy" /> : <Icon name="plate" />}</span><span className="nutrition-alternative-copy"><strong>{candidate.name}</strong><small>{candidate.brand || C.openFoodFacts} · {nice(candidate.per100?.calories)} {C.caloriesShort} · {nice(candidate.per100?.protein)}g {C.proteinShort}</small><span className="nutrition-alternative-deltas">{[comparison(candidate, 'protein', 'up'), comparison(candidate, 'fiber', 'up'), comparison(candidate, 'sugar', 'down'), comparison(candidate, 'salt', 'down'), comparison(candidate, 'saturatedFat', 'down')].filter(Boolean).slice(0, 2).join(' · ') || C.compareHint}</span></span><span className={`nutrition-score-pill ${candidateScore.tone}`}>{candidateScore.score}</span><Icon name="chevronRight" className="nutrition-alternative-chevron" /></button>)}</div> : <p className="nutrition-score-empty">{C.noAlternatives}</p>}</section></div>
}

export default function Nutrition() {
  useLang()
  const C = labels()
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  // Product details are a separate route. Consume the short-lived search
  // snapshot on mount so browser back restores the exact list the user left.
  const [restoreSearch] = useState(() => readNutritionSearchState())
  const [section, setSection] = useState(() => restoreSearch?.section || 'diary')
  const [date, setDate] = useState(() => restoreSearch?.date || todayISO())
  const [meal, setMeal] = useState(() => restoreSearch?.meal || 'breakfast')
  useEffect(() => { if (restoreSearch) clearNutritionSearchState() }, [restoreSearch])
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
  const preferences = S.nutritionPreferences || {}
  const favorites = S.nutritionFavorites || []
  const favoriteFoods = useMemo(() => {
    const ids = favoriteIds(S.nutritionFavorites)
    const candidates = [...(S.nutritionFavoriteFoods || []), ...entries.map(entry => entry.food).reverse()]
    return [...new Map(candidates.filter(food => food?.id && ids.has(food.id)).map(food => [food.id, food])).values()].slice(0, 200)
  }, [entries, S.nutritionFavoriteFoods, S.nutritionFavorites])
  const addFood = (food, selectedMeal = meal, selectedGrams = 100) => update(s => { s.nutritionEntries = [...(s.nutritionEntries || []), { id: idOf('nutrition'), date, meal: selectedMeal, grams: Math.max(1, roundNutrition(selectedGrams) || 100), food }] })
  const removeEntry = id => update(s => { s.nutritionEntries = (s.nutritionEntries || []).filter(entry => entry.id !== id) })
  const toggleFavorite = food => update(s => toggleFavoriteInState(s, food))
  return <div className="narrow nutrition-view"><div className="hdr"><div><h1>{C.title}</h1><div className="sub">{C.subtitle}</div></div><div className="row" style={{ gap: 8 }}><Button size="sm" variant="tinted" icon="brain" onClick={() => nav('/coach')}>{C.coach}</Button><Icon name="forkKnife" className="nutrition-head-icon" /></div></div><div className="nutrition-tabs" role="tablist" aria-label={C.title}>{[['diary', C.diary, 'list'], ['recipes', C.recipes, 'forkKnife'], ['wellness', C.wellness, 'droplet'], ['insights', C.insights, 'chartLine']].map(([value, label, icon]) => <button key={value} role="tab" aria-selected={section === value} className={section === value ? 'on' : ''} onClick={() => setSection(value)}><Icon name={icon} /><span>{label}</span></button>)}</div>{section === 'diary' && <NutritionDiary C={C} S={S} date={date} setDate={setDate} meal={meal} setMeal={setMeal} dayEntries={dayEntries} totals={totals} goal={goal} update={update} addFood={addFood} removeEntry={removeEntry} personalFoods={personalFoods} recentFoods={recentFoods} favoriteFoods={favoriteFoods} preferences={preferences} favorites={favorites} toggleFavorite={toggleFavorite} restoreSearch={restoreSearch} />}{section === 'recipes' && <NutritionRecipes C={C} S={S} personalFoods={personalFoods} meal={meal} addFood={addFood} update={update} />}{section === 'wellness' && <NutritionWellness C={C} S={S} date={date} update={update} />}{section === 'insights' && <NutritionInsights C={C} S={S} date={date} setDate={setDate} entries={entries} goal={goal} />}</div>
}
