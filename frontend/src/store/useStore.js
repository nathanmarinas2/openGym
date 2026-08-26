import { create } from 'zustand'
import { api } from '../lib/api.js'
import { localTZ } from '../lib/format.js'
import { registerCustom } from '../lib/exercises.js'
import { DEMO, DEMO_SEEDED } from '../lib/demo.js'
import { MOBILE, nativeLoad, nativeSave, syncReminder } from '../lib/mobile.js'
import { clearPhotos, readSnapshot, writeSnapshot } from '../lib/offline.js'

const KEY = 'gym_state_v1'
export const STATE_SCHEMA_VERSION = 4
export const DEF = {
  unit: 'kg', restSec: 90, exerciseRestSec: 120, stepsGoal: 10000, sound: true, keepAwake: true, lang: 'en',
  theme: 'dark', accent: 'lime', body: 'male', targetW: null,
  bodyweight: [], routines: [], week: {}, dayPlan: {},
  exWeights: {}, workouts: [], active: null, customEx: [], gifSize: 'full',
  // effort: which per-set effort scale is logged — 'none' | 'rir' | 'rpe'. null, not 'none', so
  // that a profile which never chose (loaded state is overlaid on DEF, on every path: local,
  // server pull, backup import) still falls back to the `showRir` boolean this replaced and
  // keeps the column it had. See effortOf.
  reminder: { on: false, time: '08:00', tz: null }, effort: null,
  bodyMeasurements: [], bodyPhotos: [],
  nutritionEntries: [],
  nutritionGoal: { calories: 2200, protein: 150, carbs: 250, fat: 70 },
  nutritionSettings: { calorieTargetIncludesActivity: true },
  nutritionPreferences: { diet: 'none', allergens: '', avoidAdditives: false },
  nutritionFavorites: [],
  recipes: [],
  waterEntries: [], waterGoal: 2000,
  fasting: { goalHours: 16, active: false, startedAt: null, history: [] },
  coachProfile: { objective: 'performance', notes: '' },
  coachActionHistory: [],
  healthMetrics: [],
  schemaVersion: STATE_SCHEMA_VERSION,
  equipmentProfiles: [{ id: 'home', name: 'Home', items: ['body weight'] }],
  activeEquipmentProfile: 'home'
}
const clone = o => JSON.parse(JSON.stringify(o))
const migrateState = input => {
  const state = Object.assign(clone(DEF), input || {})
  state.nutritionPreferences = { ...DEF.nutritionPreferences, ...(input?.nutritionPreferences || {}) }
  state.nutritionSettings = { ...DEF.nutritionSettings, ...(input?.nutritionSettings || {}) }
  state.coachProfile = { ...DEF.coachProfile, ...(input?.coachProfile || {}) }
  for (const key of ['nutritionFavorites', 'coachActionHistory', 'healthMetrics']) if (!Array.isArray(state[key])) state[key] = []
  state.schemaVersion = STATE_SCHEMA_VERSION
  return state
}
const mergeArray = (local = [], remote = []) => {
  const out = [...remote]
  for (const item of local) {
    const key = item?.id || item?.date || item?.d
    const idx = key == null ? out.findIndex(x => JSON.stringify(x) === JSON.stringify(item)) : out.findIndex(x => (x?.id || x?.date || x?.d) === key)
    if (idx < 0) out.push(item)
    else out[idx] = item
  }
  return out
}
const mergeStates = (local, remote) => {
  const merged = migrateState(Object.assign(clone(DEF), remote, local))
  for (const key of ['routines', 'workouts', 'bodyweight', 'customEx', 'bodyMeasurements', 'bodyPhotos', 'nutritionEntries', 'nutritionFavorites', 'recipes', 'waterEntries', 'equipmentProfiles', 'coachActionHistory', 'healthMetrics']) {
    if (Array.isArray(local?.[key]) || Array.isArray(remote?.[key])) merged[key] = mergeArray(local?.[key], remote?.[key])
  }
  for (const key of ['exWeights', 'week', 'dayPlan']) merged[key] = { ...(remote?.[key] || {}), ...(local?.[key] || {}) }
  return migrateState(merged)
}

function loadState() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return migrateState(JSON.parse(raw))
  } catch (e) { /* ignore */ }
  return migrateState(DEF)
}

  const hasData = st => !!((st.workouts || []).length || (st.routines || []).length || (st.bodyweight || []).length || (st.bodyMeasurements || []).length || (st.nutritionEntries || []).length || (st.recipes || []).length || (st.waterEntries || []).length || (st.healthMetrics || []).length || (st.fasting?.history || []).length || st.fasting?.active || (st.equipmentProfiles || []).some(p => p.name !== 'Home' || (p.items || []).length > 1))

export const useStore = create((set, get) => {
  let pushTm = null
  let saveTm = null
  let serverRevision = null

  // Mobile build: mirror the state into a file in the app's data directory (survives WebView
  // storage eviction) and keep the native reminder schedule in step with the weekly plan.
  const nativePersist = () => {
    clearTimeout(saveTm)
    saveTm = setTimeout(() => { saveTm = null; nativeSave(get().S); syncReminder(get().S) }, 800)
  }

  const persist = (S, push = true) => {
    S.schemaVersion = STATE_SCHEMA_VERSION
    S._ts = Date.now()
    registerCustom(S.customEx)
    localStorage.setItem(KEY, JSON.stringify(S))
    // IndexedDB is intentionally fire-and-forget: it must never block a workout set or make
    // the app unusable in private browsing where IDB can be unavailable.
    writeSnapshot(S).catch(() => {})
    set({ S })
    if (MOBILE) nativePersist()
    if (push && get().user) {
      clearTimeout(pushTm)
      pushTm = setTimeout(() => get().pushState(), 1500)
    }
  }

  // A setting changed right before switching away/closing the tab must not get lost mid-debounce
  // (e.g. setting the reminder time then immediately backgrounding to test it). On mobile the
  // same applies to the file mirror — backgrounding is often the last thing before the OS
  // kills the app.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return
    if (MOBILE && saveTm) {
      clearTimeout(saveTm)
      saveTm = null
      nativeSave(get().S)
    }
    if (pushTm) {
      clearTimeout(pushTm)
      pushTm = null
      get().pushState()
    }
  })

  // Everything a sign-out leaves behind on this device, whichever way it was triggered.
  const clearLocalSession = () => {
    serverRevision = null
    clearPhotos().catch(() => {})
    get().setUser(null)
    localStorage.removeItem('gym_guest')
    localStorage.removeItem('gym_dirty')
    localStorage.removeItem(KEY)
    persist(clone(DEF), false)
  }

  return {
    S: (() => { const s = loadState(); registerCustom(s.customEx); return s })(),
    user: (() => { try { return JSON.parse(localStorage.getItem('gym_user')) || null } catch { return null } })(),
    ready: false,
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    syncStatus: 'idle',

    // Mutate a draft of S via producer fn, then persist + schedule sync.
    update(mut, push = true) {
      const S = clone(get().S)
      mut(S)
      persist(S, push)
    },
    replaceState(S, push = false) { persist(migrateState(S), push) },

    isGuest: () => localStorage.getItem('gym_guest') === '1',
    setGuest(v) { if (v) localStorage.setItem('gym_guest', '1'); else localStorage.removeItem('gym_guest'); set({}) },

    setUser(u) {
      if (u) { localStorage.setItem('gym_user', JSON.stringify(u)); localStorage.removeItem('gym_guest') }
      else localStorage.removeItem('gym_user')
      set({ user: u })
    },

    async pushState() {
      if (!get().user) return
      clearTimeout(pushTm)
      set({ syncStatus: 'syncing' })
      try {
        // Photo blobs live in this device's IndexedDB. Metadata is intentionally not uploaded:
        // syncing a filename without its image would make another device look as if it had a
        // broken photo, and uploading private images would change the privacy model.
        const outbound = clone(get().S)
        outbound.bodyPhotos = []
        const { revision } = await api('/api/data', {
          method: 'PUT', body: JSON.stringify({ state: outbound, baseRevision: serverRevision })
        })
        serverRevision = revision || serverRevision
        localStorage.removeItem('gym_dirty')
        set({ syncStatus: 'synced' })
      } catch (e) {
        // A second device changed the profile. Merge additive workout data locally, then retry
        // against the revision returned by the server; this avoids silently losing either copy.
        if (e.status === 409 && e.data?.state) {
          serverRevision = e.data.revision || null
          persist(mergeStates(get().S, e.data.state), false)
          return get().pushState()
        }
        localStorage.setItem('gym_dirty', '1')
        set({ syncStatus: 'offline' })
      }
    },
    async pullState() {
      try {
        const { state, revision } = await api('/api/data')
        serverRevision = revision || null
        const S = get().S
        const dirty = localStorage.getItem('gym_dirty') === '1'
        if (state && (!hasData(S) || ((state._ts || 0) >= (S._ts || 0) && !dirty))) {
          const active = S.active
          const next = Object.assign(clone(DEF), state)
          if (active) next.active = active
          next.bodyPhotos = S.bodyPhotos || []
          persist(next, false)
        } else if (hasData(S)) { await get().pushState() }
      } catch (e) { set({ syncStatus: 'offline' }) /* offline — keep local */ }
    },

    async signOut() {
      try { await get().pushState(); await api('/api/logout', { method: 'POST', body: '{}' }) } catch (e) { /* */ }
      clearLocalSession()
    },

    // "Sign out everywhere": the server bumps this profile's session version, which kills every
    // session it has on any device — this browser included, so the app has to end up exactly
    // where a normal signOut leaves it. Unlike signOut the request is NOT swallowed: if it fails
    // the sessions elsewhere are all still valid, and wiping this device's copy of the data
    // would sign the user out of the one place the bump didn't reach. Caller reports the error.
    async signOutAll() {
      await get().pushState()   // never throws — stores gym_dirty and moves on when offline
      await api('/api/logout/all', { method: 'POST', body: '{}' })
      clearLocalSession()
    },

    // Demo build only: drop the seeded example profile back in (Settings → "Reset demo data").
    // Dynamic import so the generator never ships in a self-hosted bundle.
    async resetDemo() {
      const { buildDemoState } = await import('../lib/demoSeed.js')
      localStorage.removeItem('gym_dirty')
      persist(Object.assign(clone(DEF), buildDemoState()), false)
    },

    // Boot: ask the server who we are, then pull.
    async boot() {
      // Recover the durable browser snapshot before asking the network. This is a second
      // chance after localStorage eviction, and keeps the app useful on a plane or in a gym
      // with unreliable Wi-Fi.
      if (!MOBILE && !DEMO) {
        const durable = await readSnapshot()
        if (durable && (durable._ts || 0) > (get().S._ts || 0)) persist(Object.assign(clone(DEF), durable), false)
      }
      // Mobile build: no backend either — restore from the file mirror (the durable copy;
      // localStorage may have been evicted since the last run) and go straight in.
      if (MOBILE) {
        const saved = await nativeLoad()
        const S = get().S
        if (saved && (!hasData(S) || (saved._ts || 0) >= (S._ts || 0))) {
          persist(Object.assign(clone(DEF), saved), false)
        } else if (hasData(S)) {
          nativeSave(S)   // first run after an update from a file-less version: seed the mirror
        }
        get().setGuest(true)
        syncReminder(get().S)
        set({ ready: true })
        return
      }
      // Demo build (GitHub Pages): no backend at all — seed once, stay in guest mode.
      if (DEMO) {
        if (!localStorage.getItem(DEMO_SEEDED)) {
          localStorage.setItem(DEMO_SEEDED, '1')
          await get().resetDemo()
        }
        get().setGuest(true)
        set({ ready: true })
        return
      }
      try {
        const me = await api('/api/me')
        get().setUser(me.user)
        await get().pullState()
        // Re-stamp the reminder's timezone on every load — keeps it correct if you're travelling,
        // without needing to revisit Settings.
        const tz = localTZ()
        if (get().S.reminder?.on && get().S.reminder.tz !== tz) {
          get().update(s => { s.reminder = { ...s.reminder, tz } })
        }
      } catch (e) {
        if (e.status === 401) get().setUser(null)
      }
      set({ ready: true })
    }
  }
})

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useStore.setState({ online: true })
    if (useStore.getState().user) useStore.getState().pushState()
  })
  window.addEventListener('offline', () => useStore.setState({ online: false, syncStatus: 'offline' }))
}

export { hasData }
