// Heart-rate formulas and zones. These helpers never infer a session zone when a workout has
// no recorded heart-rate value; an absent measurement is different from a quiet session.

export const HR_METHODS = ['tanaka', 'fox', 'gulati']
export const ZONE_METHODS = ['percent-max', 'karvonen']

const finite = value => Number.isFinite(Number(value)) ? Number(value) : null

export function estimatedMaxHr(age, method = 'tanaka') {
  const years = finite(age)
  if (years == null || years < 10 || years > 120) return null
  if (method === 'fox') return Math.round(220 - years)
  if (method === 'gulati') return Math.round(206 - 0.88 * years)
  return Math.round(208 - 0.7 * years)
}

export function resolveMaxHr(profile = {}) {
  const manual = finite(profile.maxHr)
  if (manual != null && manual >= 100 && manual <= 240) return { value: Math.round(manual), method: 'manual' }
  const method = HR_METHODS.includes(profile.maxHrMethod) ? profile.maxHrMethod : 'tanaka'
  const value = estimatedMaxHr(profile.age, method)
  return value == null ? { value: null, method } : { value, method }
}

const BOUNDS = [0.5, 0.6, 0.7, 0.8, 0.9, 1]

export function heartRateZones(profile = {}) {
  const max = resolveMaxHr(profile).value
  if (!max) return []
  const resting = finite(profile.restingHr ?? profile.restingHeartRate)
  const karvonen = profile.zoneMethod === 'karvonen' && resting != null && resting >= 30 && resting < max
  const reserve = max - resting
  return BOUNDS.slice(0, -1).map((low, index) => {
    const high = BOUNDS[index + 1]
    const min = karvonen ? resting + reserve * low : max * low
    const maxValue = karvonen ? resting + reserve * high : max * high
    return { zone: index + 1, min: Math.round(min), max: Math.round(maxValue), method: karvonen ? 'karvonen' : 'percent-max' }
  })
}

export function zoneForHeartRate(value, zones) {
  const hr = finite(value)
  if (hr == null || !Array.isArray(zones) || !zones.length) return null
  return zones.find(zone => hr >= zone.min && hr <= zone.max)?.zone || (hr < zones[0].min ? 0 : zones.at(-1).zone)
}

export function sessionHeartRate(workout, profile = {}) {
  const average = finite(workout?.averageHeartRate ?? workout?.avgHeartRate)
  const max = finite(workout?.maxHeartRate ?? workout?.peakHeartRate)
  const resting = finite(workout?.restingHeartRate)
  if (average == null && max == null && resting == null) return { recorded: false, average: null, max: null, resting: null, zones: [] }
  const effectiveProfile = { ...profile, restingHr: profile.restingHr ?? resting }
  const zones = heartRateZones(effectiveProfile)
  return { recorded: true, average, max, resting, averageZone: zoneForHeartRate(average, zones), maxZone: zoneForHeartRate(max, zones), zones }
}

export function heartRateSummary(workouts = [], profile = {}) {
  const sessions = workouts.map(workout => ({ workout, ...sessionHeartRate(workout, profile) })).filter(item => item.recorded)
  const averages = sessions.map(item => item.average).filter(value => value != null)
  const maxes = sessions.map(item => item.max).filter(value => value != null)
  return {
    recordedSessions: sessions.length,
    average: averages.length ? Math.round(averages.reduce((a, b) => a + b, 0) / averages.length * 10) / 10 : null,
    max: maxes.length ? Math.max(...maxes) : null,
    sessions,
    zones: heartRateZones(profile),
    maxHr: resolveMaxHr(profile)
  }
}
