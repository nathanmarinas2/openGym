// Privacy-first diagnostics. This report is deliberately aggregate: it helps a user
// or support team understand sync/storage state without exporting the actual journal.
const COUNT_FIELDS = [
  ['routines', 'routines'], ['workouts', 'workouts'], ['bodyweight', 'bodyweight entries'],
  ['bodyMeasurements', 'body measurements'], ['nutritionEntries', 'nutrition entries'],
  ['waterEntries', 'water entries'], ['recipes', 'recipes'], ['healthMetrics', 'health metrics'],
  ['recoveryCheckins', 'recovery check-ins'], ['planCycles', 'training cycles']
]

export const readDirtyFlag = () => {
  try { return localStorage.getItem('gym_dirty') === '1' } catch { return false }
}

export function buildDiagnosticReport(S = {}, { user = null, online = true, syncStatus = 'unknown', dirty = readDirtyFlag(), mobile = false, now = Date.now() } = {}) {
  const counts = Object.fromEntries(COUNT_FIELDS.map(([key, label]) => [label, Array.isArray(S[key]) ? S[key].length : 0]))
  return {
    schema: 'liftnex-diagnostics-v1',
    generatedAt: new Date(now).toISOString(),
    app: 'LiftNex',
    dataSchemaVersion: S.schemaVersion || 1,
    privacy: { containsUserContent: false, containsWorkoutValues: false, containsPhotos: false, containsCredentials: false },
    sync: { signedIn: !!user, online: !!online, status: syncStatus, pendingUpload: !!dirty },
    local: { lastSavedAt: S._ts ? new Date(S._ts).toISOString() : null, hasActiveWorkout: !!S.active, counts },
    runtime: { mobile: !!mobile }
  }
}
