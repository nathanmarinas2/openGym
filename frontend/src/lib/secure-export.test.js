import { describe, expect, it } from 'vitest'
import { decryptBackup, encryptBackup } from './secure-export.js'

describe('encrypted backups', () => {
  it('round-trips data without the active workout', async () => {
    const state = { schemaVersion: 5, routines: [{ id: 'r1' }], workouts: [{ id: 'w1' }], active: { id: 'live' } }
    const encrypted = await encryptBackup(state, 'correct horse battery')
    expect(encrypted.schema).toBe('liftnex-encrypted-backup-v1')
    expect(await decryptBackup(encrypted, 'correct horse battery')).toMatchObject({ schemaVersion: 5, routines: [{ id: 'r1' }], workouts: [{ id: 'w1' }], active: null })
    await expect(decryptBackup(encrypted, 'wrong password')).rejects.toThrow()
  })
})
