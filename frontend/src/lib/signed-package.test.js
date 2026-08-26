import { describe, expect, it } from 'vitest'
import { signPlanPackage, verifyPlanPackage } from './signed-package.js'

describe('signed trainer plan packages', () => {
  it('detects tampering and wrong local keys', async () => {
    const value = await signPlanPackage({ schema: 'liftnex-plan-draft-v1', title: 'Block', routines: [{ name: 'Press', exercises: [{ sets: 3 }] }] }, 'local-secret')
    expect(await verifyPlanPackage(value, 'local-secret')).toBe(true)
    expect(await verifyPlanPackage({ ...value, payload: { ...value.payload, title: 'Tampered' } }, 'local-secret')).toBe(false)
    expect(await verifyPlanPackage({ ...value, payload: { ...value.payload, routines: [{ ...value.payload.routines[0], exercises: [{ sets: 99 }] }] } }, 'local-secret')).toBe(false)
    expect(await verifyPlanPackage(value, 'another-secret')).toBe(false)
  })
})
