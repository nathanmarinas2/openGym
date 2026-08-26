// Password-protected local export. The password is used only by Web Crypto in this browser;
// this module never calls the API and never places the password in a request or state object.

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const toB64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)))
const fromB64 = value => Uint8Array.from(atob(value), char => char.charCodeAt(0))

export async function encryptBackup(state, password) {
  if (!password || String(password).length < 8) throw new Error('Password must contain at least 8 characters')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const base = await crypto.subtle.importKey('raw', encoder.encode(String(password)), 'PBKDF2', false, ['deriveKey'])
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 210000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt'])
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify({ ...state, active: null })))
  return { schema: 'liftnex-encrypted-backup-v1', algorithm: 'AES-256-GCM', kdf: 'PBKDF2-SHA-256', iterations: 210000, salt: toB64(salt), iv: toB64(iv), ciphertext: toB64(ciphertext) }
}

export async function decryptBackup(payload, password) {
  if (!payload || payload.schema !== 'liftnex-encrypted-backup-v1') throw new Error('Not a LiftNex encrypted backup')
  const base = await crypto.subtle.importKey('raw', encoder.encode(String(password || '')), 'PBKDF2', false, ['deriveKey'])
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: fromB64(payload.salt), iterations: Number(payload.iterations) || 210000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt'])
  try { return JSON.parse(decoder.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(payload.iv) }, key, fromB64(payload.ciphertext)))) }
  catch { throw new Error('Incorrect password or damaged backup') }
}
