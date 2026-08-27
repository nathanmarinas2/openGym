import { describe, expect, it } from 'vitest'
import { buildDiagnosticReport } from './diagnostics.js'

describe('privacy-first diagnostics', () => {
  it('contains aggregate support data but no journal content', () => {
    const report = buildDiagnosticReport({
      schemaVersion: 5, _ts: 0, routines: [{}], workouts: [{ id: 'secret', entries: [{ sets: [{ w: 100 }] }] }],
      bodyPhotos: [{ id: 'private-photo' }], bodyweight: [{ d: '2026-08-27', w: 80 }]
    }, { online: false, syncStatus: 'offline', dirty: true, now: 0 })
    expect(report.privacy.containsUserContent).toBe(false)
    expect(report.sync.pendingUpload).toBe(true)
    expect(report.local.counts.workouts).toBe(1)
    expect(JSON.stringify(report)).not.toContain('secret')
    expect(JSON.stringify(report)).not.toContain('private-photo')
    expect(JSON.stringify(report)).not.toContain('100')
  })
})
