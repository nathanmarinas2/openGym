import { uid } from './format.js'

export const MEASURE_FIELDS = [
  ['waist', 'Waist', 'cm'],
  ['chest', 'Chest', 'cm'],
  ['arm', 'Arm', 'cm'],
  ['thigh', 'Thigh', 'cm'],
  ['bodyFat', 'Body fat', '%']
]

export function latestMeasurement(S) {
  return (S?.bodyMeasurements || []).slice().sort((a, b) => String(a.d).localeCompare(String(b.d))).at(-1) || null
}

export function measurementLabel(m) {
  return MEASURE_FIELDS.filter(([key]) => m?.[key] != null).map(([key, label, unit]) => `${label}: ${m[key]} ${unit}`).join(' · ')
}

export function createMeasurement(values, date) {
  const out = { id: uid(), d: date || new Date().toISOString().slice(0, 10) }
  MEASURE_FIELDS.forEach(([key]) => {
    const n = Number(values?.[key])
    if (Number.isFinite(n) && n > 0) out[key] = Math.round(n * 10) / 10
  })
  return out
}
