// Small IndexedDB layer for durable local-first data.
//
// localStorage remains the fast boot cache and compatibility fallback. IndexedDB is the
// durable copy for larger/long-lived state and photo blobs, so a browser eviction of one
// storage bucket does not erase the training log silently.

const DB_NAME = 'opengym-local'
const DB_VERSION = 1
const STATE_STORE = 'snapshots'
const PHOTO_STORE = 'photos'

let dbPromise

function openDb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  if (dbPromise) return dbPromise
  dbPromise = new Promise(resolve => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STATE_STORE)) db.createObjectStore(STATE_STORE)
      if (!db.objectStoreNames.contains(PHOTO_STORE)) db.createObjectStore(PHOTO_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
    req.onblocked = () => resolve(null)
  })
  return dbPromise
}

function request(db, store, mode, fn) {
  return new Promise(resolve => {
    try {
      const tx = db.transaction(store, mode)
      const req = fn(tx.objectStore(store))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
      tx.onerror = () => resolve(null)
    } catch { resolve(null) }
  })
}

export async function readSnapshot() {
  const db = await openDb()
  return db ? request(db, STATE_STORE, 'readonly', s => s.get('state')) : null
}

export async function writeSnapshot(state) {
  const db = await openDb()
  if (!db) return false
  await request(db, STATE_STORE, 'readwrite', s => s.put(state, 'state'))
  return true
}

export async function putPhoto(id, blob) {
  const db = await openDb()
  if (!db) return false
  await request(db, PHOTO_STORE, 'readwrite', s => s.put(blob, id))
  return true
}

export async function readPhoto(id) {
  const db = await openDb()
  return db ? request(db, PHOTO_STORE, 'readonly', s => s.get(id)) : null
}

export async function deletePhoto(id) {
  const db = await openDb()
  if (!db) return false
  await request(db, PHOTO_STORE, 'readwrite', s => s.delete(id))
  return true
}

export async function clearPhotos() {
  const db = await openDb()
  if (!db) return false
  await request(db, PHOTO_STORE, 'readwrite', s => s.clear())
  return true
}

export const indexedDbAvailable = () => typeof indexedDB !== 'undefined'
