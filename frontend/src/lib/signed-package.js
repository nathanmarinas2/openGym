const encoder = new TextEncoder()
const toB64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)))
const fromB64 = value => Uint8Array.from(atob(value), char => char.charCodeAt(0))
const canonical = value => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().filter(key => value[key] !== undefined).map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
  return JSON.stringify(value)
}

async function keyFor(secret) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

export async function signPlanPackage(payload, secret) {
  if (!secret) throw new Error('A local signing key is required')
  const signature = await crypto.subtle.sign('HMAC', await keyFor(secret), encoder.encode(canonical(payload)))
  return { schema: 'liftnex-signed-plan-v1', payload, signature: toB64(signature), signedAt: new Date().toISOString() }
}

export async function verifyPlanPackage(packageValue, secret) {
  if (!packageValue || packageValue.schema !== 'liftnex-signed-plan-v1' || !secret) return false
  return crypto.subtle.verify('HMAC', await keyFor(secret), fromB64(packageValue.signature), encoder.encode(canonical(packageValue.payload)))
}
