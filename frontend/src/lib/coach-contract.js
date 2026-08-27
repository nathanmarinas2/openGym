// The browser validates the provider response a second time. The API already normalizes
// it, but treating every network response as untrusted keeps the commercial client safe
// when a self-hosted API is upgraded independently from the frontend.
export const COACH_REVIEW_SCHEMA = 'liftnex-coach-review-v1'
const ACTION_TYPES = new Set(['review_week', 'log_food', 'create_menu', 'adapt_training', 'missing_data', 'suggest_deload', 'suggest_routine', 'suggest_cycle'])

const text = (value, max = 500) => String(value ?? '').trim().slice(0, max)
const list = (value, max = 8) => Array.isArray(value)
  ? value.map(item => typeof item === 'string' ? text(item) : text(item?.text || item?.title || item?.detail)).filter(Boolean).slice(0, max)
  : []

export function normalizeCoachReview(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const summary = text(input.summary || input.overview, 1600)
  if (!summary) return null
  const actions = Array.isArray(input.actions || input.weeklyActions)
    ? (input.actions || input.weeklyActions).map(item => {
      if (typeof item === 'string') return { type: 'review_week', title: text(item, 160), description: '', payload: {}, requiresConfirmation: true }
      if (!item || typeof item !== 'object') return null
      const type = text(item.type || 'review_week', 40)
      const title = text(item.title || item.text, 160)
      if (!title || !ACTION_TYPES.has(type)) return null
      return {
        type,
        title,
        description: text(item.description || item.detail, 500),
        payload: item.payload && typeof item.payload === 'object' && !Array.isArray(item.payload) ? item.payload : {},
        requiresConfirmation: item.requiresConfirmation !== false
      }
    }).filter(Boolean).slice(0, 6)
    : []
  return {
    schema: COACH_REVIEW_SCHEMA,
    summary,
    strengths: list(input.strengths),
    improvements: list(input.improvements || input.weaknesses),
    actions,
    watchouts: list(input.watchouts || input.cautions),
    questions: list(input.questions),
    confidence: ['high', 'medium', 'low'].includes(input.confidence) ? input.confidence : 'medium'
  }
}
