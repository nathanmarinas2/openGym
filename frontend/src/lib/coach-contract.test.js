import { describe, expect, it } from 'vitest'
import { normalizeCoachReview } from './coach-contract.js'

describe('coach review contract', () => {
  it('normalizes a provider response and keeps actions confirmable', () => {
    const review = normalizeCoachReview({
      summary: 'Your recent sessions are consistent.',
      strengths: ['Good adherence'],
      actions: [{ type: 'adapt_training', title: 'Review volume', payload: ['not allowed'], requiresConfirmation: false }],
      confidence: 'high'
    })

    expect(review).toMatchObject({
      schema: 'liftnex-coach-review-v1',
      summary: 'Your recent sessions are consistent.',
      confidence: 'high'
    })
    expect(review.actions[0]).toMatchObject({
      type: 'adapt_training',
      requiresConfirmation: false,
      payload: {}
    })
  })

  it('rejects empty or unsafe responses', () => {
    expect(normalizeCoachReview(null)).toBeNull()
    expect(normalizeCoachReview({ strengths: ['Only a list'] })).toBeNull()
    expect(normalizeCoachReview({ summary: 'ok', actions: [{ type: 'delete_everything', title: 'No' }] }).actions).toEqual([])
  })
})
