import { describe, expect, it } from 'vitest'
import featureLocales, { K } from '../locales/feature-locales.js'
import uiLocales, { UI_KEYS } from '../locales/ui-locales.js'

describe('schema 5 feature translations', () => {
  it('has a translation for every new UI key in every supported non-English locale', () => {
    const keys = Object.values(K)
    for (const [lang, dictionary] of Object.entries(featureLocales)) {
      if (lang === 'en') continue
      expect(keys.filter(key => !dictionary[key]), lang).toEqual([])
    }
  })

  it('keeps the newer goals, briefing and balance surfaces translated too', () => {
    for (const [lang, dictionary] of Object.entries(uiLocales)) {
      if (lang === 'en') continue
      expect(UI_KEYS.filter(key => !dictionary[key]), lang).toEqual([])
    }
  })
})
