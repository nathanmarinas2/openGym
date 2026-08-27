import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, DEF, hasData } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { ACCENTS, todayISO, localTZ } from '../lib/format.js'
import { effortOf } from '../lib/history.js'
import { api, fetchExport, IS_ANDROID } from '../lib/api.js'
import { pushSupported, enablePush, disablePush, sendTestPush } from '../lib/push.js'
import { wakeLockSupported } from '../lib/wakelock.js'
import { t, LANGS, INSTR_LANGS, getLang, useLang } from '../lib/i18n.js'
import { DEMO, REPO } from '../lib/demo.js'
import { MOBILE, shareExport, syncReminder } from '../lib/mobile.js'
import { clearPhotos } from '../lib/offline.js'
import { decryptBackup, encryptBackup } from '../lib/secure-export.js'
import { loadStarterPlan, confirmSheet, importFromApp, equipmentSheet, apiTokenSheet, packCenterSheet } from '../sheets.jsx'
import { buildDiagnosticReport, readDirtyFlag } from '../lib/diagnostics.js'
import Icon from '../components/Icon.jsx'
import { Section, Row, SelectRow, Switch, Segmented, Button, NumberField } from '../components/ui.jsx'
import AccountForm from '../components/AccountForm.jsx'

function TrainerArea({ user, S, update, toast }) {
  const [clients, setClients] = useState(null)
  const trainer = user?.admin || user?.role === 'trainer'
  const loadClients = () => api('/api/trainer/clients').then(result => setClients(result.clients || [])).catch(() => setClients([]))
  useEffect(() => { if (trainer) loadClients() }, [trainer])
  if (!user) return null
  const createInvite = () => api('/api/trainer/invites', { method: 'POST', body: '{}' }).then(({ invite }) => { navigator.clipboard?.writeText(invite.code).catch(() => {}); toast(t('Trainer invite created: {0}', invite.code)) }).catch(error => toast(error.message || t('Could not create trainer invite')))
  const acceptInvite = () => {
    const code = window.prompt(t('Enter the trainer invitation code.'))
    if (!code) return
    api('/api/trainer/accept', { method: 'POST', body: JSON.stringify({ code }) }).then(({ link }) => { update(s => { s.trainerLinks = [...(s.trainerLinks || []).filter(item => item.trainerId !== link.trainerId), link] }); toast(t('Trainer linked')) }).catch(error => toast(error.message || t('Could not accept trainer invite')))
  }
  return <Section title={t('Trainer mode')} footer={t('Read-only client summaries and signed plan packages only. No remote editing, chat or comments.')}>
    {trainer ? <>
      <Row icon="personCircle" iconTint="var(--teal)" title={t('Professional trainer account')} subtitle={t('{0} linked clients', clients == null ? '—' : clients.length)} />
      <Row icon="key" iconTint="var(--indigo)" title={t('Create athlete invitation')} subtitle={t('Single-use code, valid for 14 days')} accessory="chevron" onClick={createInvite} />
      {clients?.slice(0, 8).map(client => <Row key={client.id} icon="person" iconTint="var(--grey)" title={client.name} subtitle={t('{0} workouts · last {1}', client.workouts, client.lastWorkout || '—')} />)}
    </> : <Row icon="link" iconTint="var(--teal)" title={t('Link a trainer')} subtitle={t('Accept an invitation to share a read-only training summary.')} accessory="chevron" onClick={acceptInvite} />}
  </Section>
}

function DiagnosticsCard({ S, user, online, syncStatus, pushState, toast }) {
  const [, refresh] = useState(0)
  const [busy, setBusy] = useState(false)
  const dirty = readDirtyFlag()
  const report = buildDiagnosticReport(S, { user, online, syncStatus, dirty, mobile: MOBILE })
  const status = syncStatus === 'syncing' ? t('Syncing…')
    : dirty ? t('Pending upload')
      : !online ? t('Offline')
        : user ? syncStatus === 'synced' ? t('Synced') : t('Ready to sync')
          : t('Local only')
  const statusClass = dirty || !online ? 'warn' : user ? 'acc' : ''
  const lastSaved = report.local.lastSavedAt ? new Date(report.local.lastSavedAt).toLocaleString() : t('Not saved yet')

  const checkNow = async () => {
    setBusy(true)
    if (user) await pushState()
    refresh(value => value + 1)
    setBusy(false)
    toast(user ? t('Sync check complete') : t('Local storage check complete'))
  }

  const exportDiagnostics = async () => {
    const current = useStore.getState()
    const json = JSON.stringify(buildDiagnosticReport(current.S, {
      user: current.user, online: current.online, syncStatus: current.syncStatus,
      dirty: readDirtyFlag(), mobile: MOBILE
    }), null, 2)
    const name = 'liftnex-diagnostics-' + todayISO() + '.json'
    if (MOBILE) { try { await shareExport(json, name) } catch { /* share sheet dismissed */ } }
    else { const blob = new Blob([json], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href) }
    toast(t('Private diagnostics exported'))
  }

  return <Section title={t('Sync & diagnostics')} footer={t('The report contains aggregate technical metadata only — never your weights, notes, photos or workout history.')}>
    <Row icon="shield" iconTint="var(--teal)" title={t('Data status')} subtitle={t('Last local save: {0}', lastSaved)}>
      <span className={'tag ' + statusClass}>{status}</span>
    </Row>
    <Row icon="chartLine" iconTint="var(--blue)" title={t('Local data footprint')} subtitle={t('{0} routines · {1} workouts · {2} nutrition entries', report.local.counts.routines, report.local.counts.workouts, report.local.counts['nutrition entries'])} />
    <div className="diagnostic-actions">
      <Button size="sm" variant="tinted" icon="reset" disabled={busy} onClick={checkNow}>{busy ? t('Checking…') : t('Check now')}</Button>
      <Button size="sm" icon="download" onClick={exportDiagnostics}>{t('Export private report')}</Button>
    </div>
  </Section>
}

export default function Settings() {
  useLang()
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const online = useStore(s => s.online)
  const syncStatus = useStore(s => s.syncStatus)
  const { update, replaceState, setUser, pullState, pushState, signOut, signOutAll, resetDemo } = useStore()
  const toast = useUI(s => s.toast)
  const accountStatus = t('Signed in; your data syncs with this account.')
  const signOutEverywhereMessage = t('Signs this profile out on every device, including this one.')
  const fileRef = useRef(null)
  const importRef = useRef(null)
  const wakeOK = wakeLockSupported()

  const doExport = async () => {
    const json = JSON.stringify(S, null, 2)
    const name = 'liftnex-backup-' + todayISO() + '.json'
    // WKWebView can't download blob URLs — the native build hands the file to the share sheet.
    if (MOBILE) {
      try { await shareExport(json, name); toast(t('Backup exported')) } catch (e) { /* share sheet dismissed */ }
      return
    }
    const blob = new Blob([json], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href)
    toast(t('Backup exported'))
  }
  const doImport = ev => {
    const f = ev.target.files[0]; if (!f) return
    const rd = new FileReader()
    rd.onload = async () => {
      try {
        const payload = JSON.parse(rd.result)
        let data = payload
        if (payload?.schema === 'liftnex-encrypted-backup-v1') {
          const password = window.prompt(t('Enter the local password for this encrypted backup.'))
          if (password == null) return
          data = await decryptBackup(payload, password)
        }
        if (!data.workouts || !data.routines) throw new Error('not a LiftNex backup')
        confirmSheet({ title: t('Import backup?'), message: t('This replaces all current data with the backup file.'), confirmText: t('Import'), danger: true, onConfirm: () => { replaceState(Object.assign(JSON.parse(JSON.stringify(DEF)), data), true); toast(t('Backup imported')) } })
      } catch (e) { toast(t('Import failed: {0}', e.message)) }
    }
    rd.readAsText(f)
  }
  const doHistoryExport = async () => {
    try {
      const { body, type } = await fetchExport('csv')
      const blob = new Blob([body], { type })
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'liftnex-history-' + todayISO() + '.csv'; a.click(); URL.revokeObjectURL(a.href)
      toast(t('Training history exported'))
    } catch (e) { toast(e.message || t('Export failed')) }
  }
  const onAccountSuccess = async u => {
    setUser(u)
    if (hasData(useStore.getState().S)) { await pushState(); toast(t('Profile created — data moved into it')) }
    else { await pullState(); toast(t('Welcome, {0}', u.name)) }
  }
  const doEncryptedExport = async () => {
    const password = window.prompt(t('Choose a local password for this encrypted backup (minimum 8 characters).'))
    if (password == null) return
    if (password.length < 8) { toast(t('Password must be at least 8 characters.')); return }
    try {
      const payload = await encryptBackup(S, password)
      const json = JSON.stringify(payload, null, 2)
      const name = 'liftnex-encrypted-backup-' + todayISO() + '.json'
      if (MOBILE) { await shareExport(json, name) } else { const blob = new Blob([json], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href) }
      toast(t('Encrypted backup exported'))
    } catch (e) { toast(t('Export failed')) }
  }
  // Ends the profile's sessions on every device — this one included, so on success it lands in
  // the same place as the plain sign-out above (home, local data cleared). On failure nothing
  // local is touched: still signed in here, and say so rather than leaving a half-signed-out app.
  const signOutEverywhere = () => confirmSheet({
    title: t('Sign out everywhere?'),
    message: signOutEverywhereMessage,
    confirmText: t('Sign out everywhere'), danger: true,
    onConfirm: async () => {
      try { await signOutAll(); nav('/home'); toast(t('Signed out on all devices')) }
      catch (e) { toast(t('Could not sign out everywhere — you are still signed in.')) }
    },
  })

  return <div className="narrow">
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav('/home')} aria-label={t('Home')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginLeft: 10 }}><h1>{t('Settings')}</h1></div>
    </div>

    {/* ---------- account (demo and mobile builds have nothing to sign in to) ---------- */}
    <Section title={MOBILE ? t('Your data') : DEMO ? t('Demo') : t('Account')}>
      {MOBILE ? <>
        <Row icon="lock" iconTint="var(--acc)" title={t('All data stays on this phone')} subtitle={t('No account, no cloud — back it up anytime with Export below.')} />
        <Row icon="rocket" iconTint="var(--indigo)" title={t('Self-host LiftNex')} subtitle={t('Passkey sign-in, sync across your devices, your own data.')} accessory="chevron"
          onClick={() => window.open(REPO, '_blank', 'noopener')} />
      </> : DEMO ? <>
        <Row icon="sparkles" iconTint="var(--acc)" title={t('You’re in the demo')} subtitle={t('Example data, stored only in this browser — change anything you like.')} />
        <Row icon="reset" iconTint="var(--blue)" title={t('Reset demo data')} accessory="chevron"
          onClick={() => confirmSheet({ title: t('Reset demo data?'), message: t('Puts the example plan, workouts and weigh-ins back the way they started.'), confirmText: t('Reset'), onConfirm: () => { resetDemo(); nav('/home'); toast(t('Demo data reset')) } })} />
        <Row icon="rocket" iconTint="var(--indigo)" title={t('Self-host LiftNex')} subtitle={t('Passkey sign-in, sync across your devices, your own data.')} accessory="chevron"
          onClick={() => window.open(REPO, '_blank', 'noopener')} />
      </> : user ? <>
        <Row icon="personCircle" iconTint="var(--grey)" title={user.name} subtitle={accountStatus} />
        {user.admin && <Row icon="wrench" iconTint="var(--indigo)" title={t('Admin dashboard')} accessory="chevron" onClick={() => nav('/admin')} />}
        <Row icon="signOut" iconTint="var(--red)" title={t('Sign out')} danger onClick={() => confirmSheet({ title: t('Sign out?'), message: t('Your data is synced to your profile first, then cleared from this device.'), confirmText: t('Sign out'), danger: true, onConfirm: () => { signOut(); nav('/home') } })} />
        <Row icon="shield" iconTint="var(--red)" title={t('Sign out everywhere')} subtitle={t('Ends this profile’s sessions on all your devices.')} danger onClick={signOutEverywhere} />
      </> : <AccountForm compact initialMode="login" onSuccess={onAccountSuccess} />}
    </Section>
    {!user && !DEMO && !MOBILE && <p className="sect-f" style={{ marginTop: -18, marginBottom: 22 }}>{t('Guest mode — data lives only in this browser.')}</p>}
    <DiagnosticsCard S={S} user={user} online={online} syncStatus={syncStatus} pushState={pushState} toast={toast} />

    {/* ---------- general ---------- */}
    <Section title={t('General')} footer={t('Note: switching units only changes the label — logged numbers are not converted.')}>
      <SelectRow
        icon="globe" iconTint="var(--blue)" title={t('Language')}
        value={S.lang || 'en'} onChange={v => update(s => { s.lang = v })}
        options={Object.entries(LANGS).map(([k, name]) => ({
          value: k, label: name,
          subtitle: INSTR_LANGS.includes(k) ? null : t("Exercise instructions aren't available in this language yet — they stay in English."),
        }))}
      />
      <Row icon="scale" iconTint="var(--teal)" title={t('Weight unit')}>
        <Segmented className="seg-inline"
          options={[{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }]}
          value={S.unit} onChange={v => update(s => { s.unit = v })} />
      </Row>
    </Section>

    <Section title={t('Goals')} footer={t('Used across Home, Training, Progress, Nutrition and Coach.')}>
      <Row icon="target" iconTint="var(--acc)" title={t('Centralized goals')} subtitle={t('Weight, nutrition, activity and training in one place.')} accessory="chevron" onClick={() => nav('/goals')} />
    </Section>

    <Section title={t('Heart-rate profile')} footer={t('Manual maximum takes priority. Karvonen uses the latest resting heart rate when available; these are training estimates, not medical advice.')}>
      <Row icon="person" iconTint="var(--red)" title={t('Age')} subtitle={t('Used for the selected maximum-heart-rate formula')}>
        <NumberField nullable decimal={false} value={S.hrProfile?.age ?? null} aria-label={t('Age')} onChange={v => update(s => { s.hrProfile = { ...(s.hrProfile || {}), age: v } })} />
      </Row>
      <Row icon="heart" iconTint="var(--red)" title={t('Manual max HR')} subtitle={t('Optional · beats per minute')}>
        <NumberField nullable decimal={false} value={S.hrProfile?.maxHr ?? null} aria-label={t('Manual max HR')} onChange={v => update(s => { s.hrProfile = { ...(s.hrProfile || {}), maxHr: v } })} />
      </Row>
      <SelectRow icon="target" iconTint="var(--orange)" title={t('Maximum HR method')} value={S.hrProfile?.maxHrMethod || 'tanaka'} onChange={v => update(s => { s.hrProfile = { ...(s.hrProfile || {}), maxHrMethod: v } })} options={[{ value: 'tanaka', label: 'Tanaka' }, { value: 'fox', label: 'Fox' }, { value: 'gulati', label: 'Gulati' }]} />
      <SelectRow icon="chartLine" iconTint="var(--orange)" title={t('Zone method')} value={S.hrProfile?.zoneMethod || 'percent-max'} onChange={v => update(s => { s.hrProfile = { ...(s.hrProfile || {}), zoneMethod: v } })} options={[{ value: 'percent-max', label: t('Percent of max HR') }, { value: 'karvonen', label: t('Karvonen / heart-rate reserve') }]} />
    </Section>

    <Section title={t('Coach & privacy')} footer={t('AI is optional. Your history is never sent until you give explicit consent. Plans returned by Coach are drafts and require your confirmation.')}>
      <Row icon="shield" iconTint="var(--indigo)" title={t('AI history consent')} subtitle={t('Allow Coach to use the selected training, nutrition, recovery and goal context')}>
        <Switch checked={!!S.aiConsent} ariaLabel={t('AI history consent')} onChange={v => update(s => { s.aiConsent = v })} />
      </Row>
      <Row icon="personCircle" iconTint="var(--teal)" title={t('Coach mode')} subtitle={(user?.role || S.role) === 'admin' ? t('Administrator') : (user?.role || S.role) === 'trainer' ? t('Trainer account') : t('Athlete account')}>
        <Segmented className="seg-inline" options={[{ value: 'athlete', label: t('Athlete') }, { value: 'trainer', label: t('Trainer') }]} value={S.coachMode === 'trainer' ? 'trainer' : 'athlete'} onChange={v => update(s => { s.coachMode = v })} />
      </Row>
    </Section>
    <TrainerArea user={user} S={S} update={update} toast={toast} />

    <Section
      title={t('Daily balance')}
      footer={t('Step and workout calories are informative estimates; they are not medical guidance.')}
    >
      <Row
        icon="flame"
        iconTint="var(--orange)"
        title={t('Calorie target already includes activity')}
        subtitle={t('Recommended to avoid counting steps and workouts twice.')}
      >
        <Switch
          checked={S.nutritionSettings?.calorieTargetIncludesActivity !== false}
          ariaLabel={t('Calorie target includes activity')}
          onChange={v => update(s => { s.nutritionSettings = { ...(s.nutritionSettings || {}), calorieTargetIncludesActivity: v } })}
        />
      </Row>
    </Section>

    {/* ---------- during a workout ---------- */}
    <Section title={t('During a workout')} footer={wakeOK ? t('The screen stays on while a workout is running, so you don’t have to unlock your phone between sets.') : null}>
      <SelectRow icon="timer" iconTint="var(--orange)" title={t('Rest timer')}
        value={S.restSec} onChange={v => update(s => { s.restSec = v })}
        options={[60, 90, 120, 150, 180].map(v => ({ value: v, label: v + 's' }))} />
      <SelectRow icon="timer" iconTint="var(--purple)" title={t('Exercise transition rest')}
        value={S.exerciseRestSec || S.restSec} onChange={v => update(s => { s.exerciseRestSec = v })}
        options={[60, 90, 120, 150, 180, 240].map(v => ({ value: v, label: v + 's' }))} />
      <Row icon="expand" iconTint="var(--teal)" title={t('Focus workout mode')} subtitle={t('Keep only the current exercise and essential set controls visible.')}>
        <Switch checked={!!S.focusMode} ariaLabel={t('Focus workout mode')} onChange={v => update(s => { s.focusMode = v })} />
      </Row>
      {(wakeOK || !MOBILE) && (
        <Row icon="sun" iconTint="var(--yellow)" title={t('Keep screen awake')}
          subtitle={wakeOK ? null : t('Not supported in this browser.')}>
          <Switch checked={wakeOK && S.keepAwake !== false} disabled={!wakeOK}
            onChange={v => update(s => { s.keepAwake = v })} />
        </Row>
      )}
      <Row icon="bell" iconTint="var(--pink)" title={t('Sounds')}>
        <Switch checked={!!S.sound} onChange={v => update(s => { s.sound = v })} />
      </Row>
      {/* Two names for the same judgement, so the column asks in the scale you already think in.
          The (i) sits before the control — you read it on the way to the choice, not after it. */}
      <Row icon="target" iconTint="var(--purple)" title={t('Effort per set')}>
        <button className="helpbtn" aria-label={t('What are RIR and RPE?')} onClick={effortHelpSheet}><Icon name="info" /></button>
        <Segmented className="seg-inline"
          options={[{ value: 'none', label: t('Off') }, { value: 'rir', label: t('RIR') }, { value: 'rpe', label: t('RPE') }]}
          value={effortOf(S)} onChange={v => update(s => { s.effort = v; delete s.showRir })} />
      </Row>
    </Section>

    {(user || MOBILE) && <NotificationsCard S={S} update={update} toast={toast} />}

    {/* ---------- appearance ---------- */}
    <Section title={t('Appearance')} footer={DEMO || MOBILE ? undefined : t('synced with your profile')}>
      <Row icon="moon" iconTint="var(--indigo)" title={t('Theme')}>
        <Segmented
          className="seg-inline"
          options={[{ value: 'dark', icon: 'moon', label: t('Dark') }, { value: 'light', icon: 'sun', label: t('Light') }]}
          value={S.theme === 'light' ? 'light' : 'dark'}
          onChange={v => update(s => { s.theme = v })}
        />
      </Row>
      {/* Purely how the muscle map is drawn — nothing else in the app reads this. */}
      <Row icon="figureStrength" iconTint="var(--teal)" title={t('Body diagram')}>
        <Segmented
          className="seg-inline"
          options={[{ value: 'male', label: t('Male') }, { value: 'female', label: t('Female') }]}
          value={S.body === 'female' ? 'female' : 'male'}
          onChange={v => update(s => { s.body = v })}
        />
      </Row>
      <div className="lrow" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12, paddingTop: 13, paddingBottom: 14 }}>
        <span className="lrow-t">{t('Accent color')}</span>
        <div className="swatches">
          {Object.entries(ACCENTS).map(([k, c]) => (
            <button key={k} className={'swatch' + ((S.accent || 'lime') === k ? ' on' : '')}
              style={{ background: c }} onClick={() => update(s => { s.accent = k })} aria-label={k} />
          ))}
        </div>
      </div>
    </Section>

    {/* ---------- data: fill it, bring things over, back it up, wipe it ---------- */}
    <Section title={t('Data')}>
      <Row icon="sparkles" iconTint="var(--acc)" title={t('Load starter plan (PPL)')} accessory="chevron" onClick={loadStarterPlan} />
      <Row icon="box" iconTint="var(--acc)" title={t('LiftNex pack library')} subtitle={t('Install curated data-only plans or export your own.')} accessory="chevron" onClick={packCenterSheet} />
      <Row icon="shuffle" iconTint="var(--teal)" title={t('Import from another app')}
        subtitle={t('FitNotes, Strong, Hevy, Apple Health body weight or daily Health metrics CSV')}
        accessory="chevron" onClick={() => importRef.current.click()} />
      <Row icon="upload" iconTint="var(--blue)" title={t('Import backup')} accessory="chevron" onClick={() => fileRef.current.click()} />
      <Row icon="download" iconTint="var(--blue)" title={t('Export backup (JSON)')} accessory="chevron" onClick={doExport} />
      <Row icon="lock" iconTint="var(--indigo)" title={t('Export encrypted backup')} subtitle={t('Encrypted locally with a password; the password never reaches the server.')} accessory="chevron" onClick={doEncryptedExport} />
      {user && <Row icon="chartLine" iconTint="var(--teal)" title={t('Export training history (CSV)')} subtitle={t('One row per completed set for spreadsheets and analysis.')} accessory="chevron" onClick={doHistoryExport} />}
      <Row icon="trash" iconTint="var(--red)" title={t('Reset everything')} danger onClick={() => confirmSheet({ title: t('Reset everything?'), message: t('Deletes your plan, workouts and body weight on this device. This cannot be undone.'), confirmText: t('Delete everything'), danger: true, onConfirm: () => { clearPhotos(); replaceState(JSON.parse(JSON.stringify(DEF)), true); nav('/home'); toast(t('All data reset')) } })} />
    </Section>
    <Section title={t('Training context')}>
      <Row icon="barbell" iconTint="var(--orange)" title={t('Gym equipment')} subtitle={t('Profiles for home, gym or travel. Used to filter realistic exercises.')} accessory="chevron" onClick={equipmentSheet} />
      {user && <Row icon="key" iconTint="var(--indigo)" title={t('Personal API access')} subtitle={t('Read-only tokens for CSV and JSON exports.')} accessory="chevron" onClick={apiTokenSheet} />}
    </Section>
    <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={doImport} />
    {/* Reset after reading so picking the same file twice still fires onChange. */}
    <input ref={importRef} type="file" accept=".csv,.xml,text/csv,text/xml" style={{ display: 'none' }}
      onChange={ev => { const f = ev.target.files[0]; if (f) importFromApp(f); ev.target.value = '' }} />

    {/* "Add to Home screen" makes no sense inside the native app */}
    {!MOBILE && <Section title={t('Tip')}>
      <Row icon="lightbulb" iconTint="var(--yellow)"
        title={IS_ANDROID ? t('In Chrome: ⋮ menu → Add to Home screen') : t('In Safari: Share → Add to Home Screen')}
        subtitle={t('to install LiftNex as a full-screen app.') + ' ' + (user ? t('Your data syncs with your profile — sign in anywhere to see it.') : t('Guest data stays on this device — export a backup now and then!'))} />
    </Section>}

    <div className="dim small" style={{ textAlign: 'center', marginTop: 4, lineHeight: 1.6 }}>
      LiftNex · {t('free & open source (AGPL v3)')}<br />
      <a href="https://github.com/nathanmarinas2/openGym" target="_blank" rel="noopener">source code</a> · exercise data: hasaneyldrm/exercises-dataset (CC)
    </div>
  </div>
}
// The whole point is that the two scales are one judgement counted from opposite ends, and a
// paragraph is a bad way to say that — the conversion table shows it in one look. Reading down
// a column is the answer to "what do I put here", so the numbers get their own aligned columns.
const EFFORT_ROWS = [
  ['0', '10', 'Nothing left — went to failure'],
  ['1', '9', 'One more rep in the tank'],
  ['2', '8', 'Two more reps'],
  ['3', '7', 'Three more reps'],
  ['4+', '≤6', 'Easy — warm-up territory'],
]
// RIR 2 / RPE 8: the row a working set usually lands on — the anchor the others are read
// against. Not where the stepper starts; + walks up from the bottom of the scale.
const EFFORT_TYPICAL = 2

function effortHelpSheet() {
  useUI.getState().openSheet(close => <>
    <h3>{t('Effort per set')}</h3>
    <div className="muted small" style={{ lineHeight: 1.5 }}>
      {t('How hard a set was, logged next to weight and reps. Two scales for the same judgement, counted from opposite ends.')}
    </div>
    <div className="efftbl">
      <div className="r hd"><span className="n">{t('RIR')}</span><span className="n">{t('RPE')}</span><span className="f">{t('How it felt')}</span></div>
      {EFFORT_ROWS.map(([rir, rpe, feel], i) => (
        <div key={rir} className={'r' + (i === EFFORT_TYPICAL ? ' on' : '')}>
          <span className="n">{rir}</span><span className="n">{rpe}</span><span className="f">{t(feel)}</span>
        </div>
      ))}
    </div>
    <div className="dim small" style={{ lineHeight: 1.5, display: 'grid', gap: 8 }}>
      <div>{t('RIR counts the reps you left; RPE reads the same effort off a 10-point scale — so RPE ≈ 10 − RIR. Pick the one you already think in.')}</div>
      <div>{t('The highlighted row is where most working sets land. Sets you have already logged keep their own scale, and nothing else reads the value — progression and estimated 1RM are unaffected.')}</div>
    </div>
    <div style={{ height: 8 }} />
  </>)
}

function NotificationsCard({ S, update, toast }) {
  if (MOBILE) return <MobileReminderCard S={S} update={update} toast={toast} />
  return <PushCard S={S} update={update} toast={toast} />
}

// Mobile build: the reminder is a native local notification scheduled on planned weekdays —
// no push server involved. The schedule itself is (re)synced by the store on every persist;
// this card only owns the OS permission prompt when the switch turns on.
function MobileReminderCard({ S, update, toast }) {
  const setReminder = patch => update(s => { s.reminder = { ...(s.reminder || DEF.reminder), ...patch, tz: localTZ() } })
  const toggle = async () => {
    const on = !S.reminder?.on
    if (on) {
      const ok = await syncReminder({ ...S, reminder: { ...(S.reminder || DEF.reminder), on: true } }, true)
      if (!ok) { toast(t('Could not change notification settings')); return }
    }
    setReminder({ on })
  }
  return (
    <Section title={t('Notifications')}
      footer={S.reminder?.on ? t('Reminds you at this time on days that have a routine planned.') : null}>
      <Row icon="calendar" iconTint="var(--orange)" title={t('Workout day reminder')}>
        <Switch checked={!!S.reminder?.on} onChange={toggle} />
      </Row>
      {S.reminder?.on && (
        <Row icon="clock" iconTint="var(--purple)" title={t('Reminder time')}>
          <input type="time" className="timef" value={S.reminder?.time || DEF.reminder.time}
            onChange={e => setReminder({ time: e.target.value })} />
        </Row>
      )}
    </Section>
  )
}

function PushCard({ S, update, toast }) {
  const [on, setOn] = useState(false)
  const [busy, setBusy] = useState(false)
  const supported = pushSupported()

  useEffect(() => {
    if (!supported) return
    navigator.serviceWorker.ready.then(reg => reg.pushManager.getSubscription()).then(sub => setOn(!!sub)).catch(() => {})
  }, [supported])

  const toggle = async v => {
    setBusy(true)
    try {
      if (!v) { await disablePush(); setOn(false); toast(t('Notifications off')) }
      else { await enablePush(); setOn(true); toast(t('Notifications on')) }
    } catch (e) { toast(e.message || t('Could not change notification settings')) }
    setBusy(false)
  }
  const test = async () => {
    try { await sendTestPush(); toast(t('Test sent — should arrive any second')) }
    catch (e) { toast(e.message || t('Test failed')) }
  }

  if (!supported) return (
    <Section title={t('Notifications')}>
      <Row icon="bellSlash" iconTint="var(--grey)" title={t('Not supported in this browser.')} />
    </Section>
  )

  return <>
    <Section
      title={t('Notifications')}
      footer={on && S.reminder?.on
        ? t("Only sent on days you have a routine planned and haven't logged a workout yet.") +
          (S.reminder?.tz ? ' ' + t('Timezone: {0} (auto-detected, updates if you travel).', S.reminder.tz) : '')
        : null}
    >
      <Row icon="bell" iconTint="var(--red)" title={t('Push notifications')} subtitle={t('Rest-timer alerts, even if LiftNex is closed.')}>
        <Switch checked={on} disabled={busy} onChange={toggle} />
      </Row>
      {on && (
        <Row icon="calendar" iconTint="var(--orange)" title={t('Workout day reminder')}>
          <Switch checked={!!S.reminder?.on} onChange={() => update(s => { s.reminder = { ...(s.reminder || DEF.reminder), on: !s.reminder?.on, tz: localTZ() } })} />
        </Row>
      )}
      {on && S.reminder?.on && (
        <Row icon="clock" iconTint="var(--purple)" title={t('Reminder time')}>
          <input type="time" className="timef" value={S.reminder?.time || DEF.reminder.time}
            onChange={e => update(s => { s.reminder = { ...(s.reminder || DEF.reminder), time: e.target.value, tz: localTZ() } })} />
        </Row>
      )}
    </Section>
    {on && <div style={{ marginTop: -12, marginBottom: 22 }}><Button size="sm" icon="bell" onClick={test}>{t('Send test notification')}</Button></div>}
  </>
}
