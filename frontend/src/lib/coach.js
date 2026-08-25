import { EXIDX } from './exercises.js'
import { entryNutrients, roundNutrition } from './nutrition.js'

const number = value => {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(',', '.'))
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

const dateValue = value => {
  const t = new Date(`${String(value || '').slice(0, 10)}T12:00:00Z`).getTime()
  return Number.isFinite(t) ? t : 0
}

const dayOf = value => String(value || '').slice(0, 10)
const average = (items, getter) => items.length ? items.reduce((sum, item) => sum + number(getter(item)), 0) / items.length : 0
const round = value => roundNutrition(value)
const signedRound = value => {
  const n = Number(value)
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0
}

const weekKey = date => {
  const d = new Date(`${date}T12:00:00Z`)
  if (!Number.isFinite(d.getTime())) return ''
  const first = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return `${d.getUTCFullYear()}-${Math.ceil((((d - first) / 86400000) + first.getUTCDay() + 1) / 7)}`
}

const exerciseName = (id, custom = {}) => custom[id]?.n || custom[id]?.name || EXIDX[id]?.n || id || 'Unknown exercise'

const setSummary = (set, target = {}) => ({
  weight: round(number(set?.w)),
  reps: Math.round(number(set?.r)),
  seconds: Math.round(number(set?.sec)),
  speed: round(number(set?.speed)),
  rir: set?.rir == null ? null : round(number(set.rir)),
  rpe: set?.rpe == null ? null : round(number(set.rpe)),
  done: set?.done !== false,
  mode: target?.mode || (set?.speed != null ? 'cardio' : set?.sec != null ? 'time' : 'reps')
})

const workoutSummary = (workout, custom) => {
  const entries = Array.isArray(workout?.entries) ? workout.entries : []
  const exercises = entries.map(entry => {
    const doneSets = (entry.sets || []).filter(set => set?.done !== false)
    const sets = doneSets.map(set => setSummary(set, entry.target || {}))
    const volume = doneSets.reduce((sum, set) => sum + number(set.w) * number(set.r), 0)
    const bestWeight = Math.max(0, ...doneSets.map(set => number(set.w)), number(entry.topW))
    const bestE1rm = Math.max(0, ...doneSets.map(set => {
      const weight = number(set.w), reps = number(set.r)
      return weight > 0 && reps > 0 ? weight * (1 + reps / 30) : 0
    }))
    return {
      id: entry.id,
      name: exerciseName(entry.id, custom),
      mode: entry.target?.mode || 'reps',
      sets: sets.length,
      reps: sets.reduce((sum, set) => sum + set.reps, 0),
      volume: round(volume),
      bestWeight: round(bestWeight),
      bestE1rm: round(bestE1rm),
      effortRated: sets.filter(set => set.rir != null || set.rpe != null).length,
      muscles: EXIDX[entry.id]?.sm || [],
      recentSets: sets.slice(-6)
    }
  }).filter(item => item.sets > 0)
  const completedSets = exercises.reduce((sum, entry) => sum + entry.sets, 0)
  const plannedSets = entries.reduce((sum, entry) => sum + (entry.sets || []).length, 0)
  return {
    id: workout?.id || `${workout?.d}-${workout?.start || ''}`,
    date: dayOf(workout?.d),
    name: workout?.name || 'Workout',
    durationMinutes: workout?.start && workout?.end ? round((number(workout.end) - number(workout.start)) / 60000) : null,
    completedSets,
    plannedSets,
    completion: plannedSets ? round(completedSets / plannedSets * 100) : null,
    volume: round(exercises.reduce((sum, entry) => sum + entry.volume, 0)),
    prs: (workout?.prs || []).map(id => exerciseName(id, custom)),
    exercises
  }
}

const exerciseProgress = (sessions, custom) => {
  const byId = new Map()
  for (const session of sessions) for (const entry of session.exercises) {
    const current = byId.get(entry.id) || {
      id: entry.id, name: exerciseName(entry.id, custom), muscles: entry.muscles, sessions: 0,
      sets: 0, volume: 0, firstDate: session.date, lastDate: session.date,
      firstBestWeight: 0, lastBestWeight: 0, bestWeight: 0, bestE1rm: 0, bestDate: session.date,
      effortRatedSets: 0
    }
    current.sessions += 1
    current.sets += entry.sets
    current.volume += entry.volume
    current.lastDate = session.date || current.lastDate
    if (!current.firstBestWeight) current.firstBestWeight = entry.bestWeight
    current.lastBestWeight = entry.bestWeight || current.lastBestWeight
    if (entry.bestWeight >= current.bestWeight) {
      current.bestWeight = entry.bestWeight
      current.bestDate = session.date
    }
    current.bestE1rm = Math.max(current.bestE1rm, entry.bestE1rm)
    current.effortRatedSets += entry.effortRated
    byId.set(entry.id, current)
  }
  return [...byId.values()]
    .map(item => ({ ...item, volume: round(item.volume), weightDelta: signedRound(item.lastBestWeight - item.firstBestWeight), bestWeight: round(item.bestWeight), bestE1rm: round(item.bestE1rm) }))
    .sort((a, b) => b.sessions - a.sessions || b.bestE1rm - a.bestE1rm)
}

const nutritionHistory = (entries, waterEntries, goal) => {
  const nutrientKeys = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'salt', 'sodium', 'potassium', 'calcium', 'iron', 'vitaminC', 'vitaminD']
  const days = new Map()
  const foods = new Map()
  const addDay = date => {
    if (!date) return null
    if (!days.has(date)) days.set(date, { date, meals: 0, entries: 0, water: 0, totals: Object.fromEntries(nutrientKeys.map(key => [key, 0])) })
    return days.get(date)
  }
  for (const entry of entries) {
    const day = addDay(dayOf(entry?.date))
    if (!day) continue
    const nutrients = entryNutrients(entry)
    day.entries += 1
    day.meals += entry?.meal ? 1 : 0
    for (const key of Object.keys(day.totals)) day.totals[key] += number(nutrients[key])
    const foodId = entry?.food?.id || entry?.food?.name || 'food'
    const food = foods.get(foodId) || { id: foodId, name: entry?.food?.name || 'Food', count: 0, grams: 0, protein: 0, calories: 0 }
    food.count += 1
    food.grams += number(entry?.grams)
    food.protein += number(nutrients.protein)
    food.calories += number(nutrients.calories)
    foods.set(foodId, food)
  }
  for (const entry of waterEntries) {
    const day = addDay(dayOf(entry?.date))
    if (day) day.water += number(entry?.ml ?? entry?.amount ?? entry?.water)
  }
  const rows = [...days.values()].sort((a, b) => dateValue(a.date) - dateValue(b.date))
  for (const row of rows) for (const key of Object.keys(row.totals)) row.totals[key] = round(row.totals[key])
  const logged = rows.filter(row => row.entries > 0)
  const targetDays = logged.filter(row => goal.calories > 0 && row.totals.calories >= goal.calories * .8 && row.totals.calories <= goal.calories * 1.15).length
  const proteinDays = logged.filter(row => goal.protein > 0 && row.totals.protein >= goal.protein * .8).length
  return {
    days: rows,
    loggedDays: logged.length,
    average: {
      calories: round(average(logged, row => row.totals.calories)),
      protein: round(average(logged, row => row.totals.protein)),
      carbs: round(average(logged, row => row.totals.carbs)),
      fat: round(average(logged, row => row.totals.fat)),
      fiber: round(average(logged, row => row.totals.fiber)),
      sugar: round(average(logged, row => row.totals.sugar)),
      salt: round(average(logged, row => row.totals.salt)),
      sodium: round(average(logged, row => row.totals.sodium)),
      potassium: round(average(logged, row => row.totals.potassium)),
      calcium: round(average(logged, row => row.totals.calcium)),
      iron: round(average(logged, row => row.totals.iron)),
      vitaminC: round(average(logged, row => row.totals.vitaminC)),
      vitaminD: round(average(logged, row => row.totals.vitaminD)),
      water: round(average(rows, row => row.water))
    },
    targetDays,
    proteinDays,
    topFoods: [...foods.values()].sort((a, b) => b.count - a.count || b.protein - a.protein).slice(0, 25).map(food => ({ ...food, grams: round(food.grams), protein: round(food.protein), calories: round(food.calories) }))
  }
}

const weightHistory = (bodyweight, targetW, unit) => {
  const points = bodyweight.filter(item => number(item?.w) > 0 && item?.d).sort((a, b) => dateValue(a.d) - dateValue(b.d))
  const first = points[0], last = points[points.length - 1]
  const spanWeeks = first && last ? Math.max(1, (dateValue(last.d) - dateValue(first.d)) / 86400000 / 7) : 0
  return {
    unit,
    entries: points.length,
    first: first ? { date: dayOf(first.d), weight: round(first.w) } : null,
    current: last ? { date: dayOf(last.d), weight: round(last.w) } : null,
    change: first && last ? signedRound(last.w - first.w) : 0,
    weeklyTrend: first && last ? signedRound((last.w - first.w) / spanWeeks) : 0,
    target: targetW ? round(targetW) : null,
    distanceToTarget: targetW && last ? signedRound(targetW - last.w) : null,
    recent: points.slice(-12).map(item => ({ date: dayOf(item.d), weight: round(item.w) }))
  }
}

const localFindings = ({ objective, workouts, training, nutrition, weight, goal, data }) => {
  const findings = []
  const actions = []
  if (!workouts.length) {
    findings.push({ tone: 'neutral', title: 'Falta historial de entrenamiento', detail: 'Todavía no hay sesiones terminadas suficientes para evaluar progresión, volumen o adherencia.' })
    actions.push('Registra 2–3 sesiones antes de cambiar el plan.')
  } else if (workouts.length < 4) {
    findings.push({ tone: 'neutral', title: 'Muestra de entrenamiento pequeña', detail: `Hay ${workouts.length} sesiones; las conclusiones todavía deben tomarse como provisionales.` })
  }
  if (!nutrition.loggedDays) {
    findings.push({ tone: 'neutral', title: 'Falta historial nutricional', detail: 'Sin varios días registrados no se puede distinguir un día raro de un patrón.' })
    actions.push('Registra al menos 5 días de comidas para que el coach detecte patrones reales.')
  } else if (goal.protein > 0 && nutrition.proteinDays / nutrition.loggedDays < .7) {
    findings.push({ tone: 'orange', title: 'Proteína irregular', detail: `${nutrition.proteinDays} de ${nutrition.loggedDays} días alcanzan al menos el 80% del objetivo.` })
    actions.push('Distribuye la proteína entre 3–4 comidas en vez de intentar recuperarla al final del día.')
  }
  if (goal.calories > 0 && nutrition.loggedDays >= 3 && nutrition.average.calories < goal.calories * .75) {
    findings.push({ tone: 'orange', title: 'Ingesta media por debajo del objetivo', detail: `La media registrada es ${nutrition.average.calories} kcal frente a ${goal.calories} kcal, aunque los días sin registrar no cuentan como cero.` })
  }
  if (weight.entries < 2) {
    findings.push({ tone: 'neutral', title: 'Peso insuficiente para ver tendencia', detail: 'Hace falta más de una medición para comparar el objetivo con una tendencia.' })
  } else if (weight.target && Math.abs(weight.distanceToTarget) > .2) {
    const movingToward = (weight.target - weight.current.weight) * weight.change >= 0
    if (!movingToward) findings.push({ tone: 'orange', title: 'La tendencia de peso se aleja del objetivo', detail: `El cambio acumulado es ${weight.change > 0 ? '+' : ''}${weight.change} ${weight.unit}; conviene revisar adherencia, objetivo y periodo antes de recortar más.` })
  }
  if (workouts.length >= 4 && training.every(item => item.effortRatedSets === 0)) {
    findings.push({ tone: 'neutral', title: 'No hay esfuerzo percibido registrado', detail: 'Sin RIR/RPE el coach puede ver volumen, pero no sabe si las series fueron demasiado fáciles o demasiado duras.' })
    actions.push('Activa RIR/RPE en Ajustes para que la revisión valore fatiga y esfuerzo.')
  }
  if (workouts.length && objective === 'performance' && training.some(item => item.sessions >= 3 && item.weightDelta < 0)) {
    findings.push({ tone: 'orange', title: 'Hay ejercicios con retroceso reciente', detail: 'La caída de carga no demuestra un problema por sí sola; hay que cruzarla con volumen, esfuerzo, peso y días sin registrar.' })
  }
  if (!actions.length) actions.push('Mantén el plan actual una semana más y revisa la tendencia con datos completos.')
  return { findings: findings.slice(0, 6), actions: actions.slice(0, 5), data }
}

/**
 * Builds a compact but longitudinal profile. It uses every logged day and every finished
 * session through aggregates and per-exercise histories; only the latest sessions keep set
 * detail. Body-photo blobs never enter this payload.
 */
export function buildLongitudinalCoachContext(S = {}, { date, objective = 'performance', notes = '', goal = {} } = {}) {
  const custom = Object.fromEntries((S.customEx || []).map(item => [item.id, item]))
  const workouts = (S.workouts || []).map(workout => workoutSummary(workout, custom)).filter(item => item.date).sort((a, b) => dateValue(a.date) - dateValue(b.date))
  const detailedFrom = Math.max(0, workouts.length - 12)
  const sessions = workouts.map((session, index) => index >= detailedFrom ? session : {
    ...session,
    exercises: session.exercises.map(({ recentSets, ...exercise }) => exercise)
  })
  const training = exerciseProgress(workouts, custom)
  const nutrition = nutritionHistory(S.nutritionEntries || [], S.waterEntries || [], goal)
  const weight = weightHistory(S.bodyweight || [], S.targetW, S.unit || 'kg')
  const measurements = (S.bodyMeasurements || []).slice().sort((a, b) => dateValue(a.d) - dateValue(b.d))
  const healthMetrics = (S.healthMetrics || []).slice().sort((a, b) => dateValue(a.d) - dateValue(b.d)).slice(-180)
  const fastingHistory = S.fasting?.history || []
  const weeks = new Set(workouts.map(item => weekKey(item.date)).filter(Boolean))
  const plannedPerWeek = Object.values(S.week || {}).filter(Boolean).length
  const plannedSlots = weeks.size * plannedPerWeek
  const completedSets = workouts.reduce((sum, item) => sum + item.completedSets, 0)
  const plannedSets = workouts.reduce((sum, item) => sum + item.plannedSets, 0)
  const local = localFindings({ objective, workouts, training, nutrition, weight, goal, data: { completedSets, plannedSets } })
  return {
    schema: 'liftnex-longitudinal-coach-v1',
    scope: 'all-history',
    generatedAt: new Date().toISOString(),
    language: S.lang || 'en',
    objective: { primary: objective, notes: String(notes || '').slice(0, 500) },
    targets: {
      weight: weight.target,
      nutrition: { calories: round(goal.calories), protein: round(goal.protein), carbs: round(goal.carbs), fat: round(goal.fat) },
      unit: S.unit || 'kg',
      plannedSessionsPerWeek: plannedPerWeek
    },
    coverage: {
      workoutSessions: workouts.length,
      workoutWeeks: weeks.size,
      nutritionEntries: (S.nutritionEntries || []).length,
      nutritionDays: nutrition.loggedDays,
      weightEntries: weight.entries,
      measurementEntries: measurements.length,
      waterEntries: (S.waterEntries || []).length,
      healthMetricDays: (S.healthMetrics || []).length,
      fastingEntries: fastingHistory.length,
      bodyPhotosStoredLocally: (S.bodyPhotos || []).length,
      bodyPhotosSent: false
    },
    training: {
      sessions,
      exerciseProgress: training.slice(0, 80),
      personalRecords: training.filter(item => item.bestWeight > 0 || item.bestE1rm > 0).sort((a, b) => b.bestE1rm - a.bestE1rm).slice(0, 30),
      stats: {
        totalVolume: round(workouts.reduce((sum, item) => sum + item.volume, 0)),
        totalCompletedSets: completedSets,
        totalPlannedSets: plannedSets,
        completionRate: plannedSets ? round(completedSets / plannedSets * 100) : null,
        sessionsPerWeek: weeks.size ? round(workouts.length / weeks.size) : 0,
        plannedSlots,
        adherenceRate: plannedSlots ? round(workouts.length / plannedSlots * 100) : null,
        averageDurationMinutes: round(average(workouts.filter(item => item.durationMinutes != null), item => item.durationMinutes)),
        sessionsLast30Days: workouts.filter(item => dateValue(item.date) >= Date.now() - 30 * 86400000).length,
        sessionsLast90Days: workouts.filter(item => dateValue(item.date) >= Date.now() - 90 * 86400000).length,
        newPRs: workouts.reduce((sum, item) => sum + item.prs.length, 0)
      },
      recentSessions: sessions.slice(-12)
    },
    nutrition: {
      allDays: nutrition.days,
      average: nutrition.average,
      loggedDays: nutrition.loggedDays,
      targetDays: nutrition.targetDays,
      proteinDays: nutrition.proteinDays,
      topFoods: nutrition.topFoods,
      waterGoal: round(S.waterGoal || 2000),
      preferences: S.nutritionPreferences || { diet: 'none', allergens: '', avoidAdditives: false },
      fasting: {
        active: !!S.fasting?.active,
        goalHours: round(S.fasting?.goalHours || 16),
        completed: fastingHistory.length,
        averageHours: round(average(fastingHistory, item => item.hours))
      }
    },
    body: {
      weight,
      measurements,
      photosStoredLocally: (S.bodyPhotos || []).length
    },
    wellness: {
      days: healthMetrics,
      latest: healthMetrics.at(-1) || null,
      metrics: ['steps', 'sleepHours', 'activeCalories', 'restingHeartRate']
        .filter(key => healthMetrics.some(item => item[key] != null))
    },
    routines: (S.routines || []).map(routine => ({ id: routine.id, name: routine.name, exercises: (routine.ex || []).length })),
    localAnalysis: local,
    requestedDate: date || null
  }
}
