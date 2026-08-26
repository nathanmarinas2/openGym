import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { todayISO } from '../lib/format.js'
import { DEFAULT_NUTRITION_GOAL, dailyTotals } from '../lib/nutrition.js'
import { t, useLang } from '../lib/i18n.js'
import { api } from '../lib/api.js'
import { buildLongitudinalCoachContext } from '../lib/coach.js'
import { applyPlanDraft, diffPlanDraft, revertPlanSnapshot } from '../lib/coach-draft.js'
import Icon from '../components/Icon.jsx'
import { Button, Check } from '../components/ui.jsx'
import { labels, NutritionCoach } from './Nutrition.jsx'

function localPlanDraft(S) {
  const routines = (S.routines || []).slice(0, 3).map(routine => ({ id: routine.id, name: routine.name, exercises: (routine.ex || []).map(exercise => ({ ...exercise })) }))
  return { schema: 'liftnex-plan-draft-v1', title: t('Local plan draft'), rationale: t('A conservative draft based on your current routine templates. Review every change before applying it.'), routines, cycle: null, warnings: [t('No connected Coach provider was available; this is a local draft.')], confidence: 'low' }
}

function CoachPlanBuilder({ S, update, C }) {
  const [draft, setDraft] = useState(null)
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(false)
  const [source, setSource] = useState(null)
  const context = buildLongitudinalCoachContext(S, { date: todayISO(), objective: S.coachProfile?.objective || 'performance', notes: S.coachProfile?.notes || '', goal: { ...DEFAULT_NUTRITION_GOAL, ...(S.nutritionGoal || {}) } })
  const diff = draft ? diffPlanDraft(S, draft) : null
  const create = async () => {
    if (!S.aiConsent || loading) return
    setLoading(true)
    try {
      const response = await api('/api/coach', { method: 'POST', body: JSON.stringify({ mode: 'plan', context, draft: { requestedGoal: S.coachProfile?.objective || 'performance', weeks: 4 }, consent: true }) })
      const candidate = response.draft || response.plan
      if (!candidate || !diffPlanDraft(S, candidate).valid) throw new Error('invalid draft')
      setDraft(candidate); setSelected(diffPlanDraft(S, candidate).changes.filter(item => item.selected).map(item => item.key)); setSource(response.source || 'provider')
    } catch {
      const fallback = localPlanDraft(S)
      setDraft(fallback); setSelected(diffPlanDraft(S, fallback).changes.map(item => item.key)); setSource('local')
    } finally { setLoading(false) }
  }
  const apply = () => {
    if (!draft || !selected.length) return
    let result
    update(s => { result = applyPlanDraft(s, draft, selected) })
    if (result?.applied) { setDraft(null); setSelected([]) }
  }
  const revert = id => update(s => { revertPlanSnapshot(s, id) })
  return <section className="card coach-plan-builder">
    <div className="row between"><div><h2 style={{ margin: 0 }}>{C.coachPlanTitle || t('Create a plan draft')}</h2><p className="muted small">{C.coachPlanHint || t('Coach can propose routines and cycles; nothing changes until you confirm it.')}</p></div><Icon name="clipboard" style={{ color: 'var(--acc)' }} /></div>
    {!S.aiConsent && <div className="nutrition-ai-notice"><span>{C.coachConsent}</span></div>}
    <Button variant="primary" icon="sparkles" disabled={!S.aiConsent || loading || !(S.routines || []).length} onClick={create}>{loading ? (C.coachGenerating || t('Generating…')) : draft ? (C.coachRefresh || t('Refresh draft')) : (C.coachPlanButton || t('Generate draft'))}</Button>
    {source && <div className="small dim" style={{ marginTop: 8 }}>{source === 'local' ? (C.coachProviderLocal || t('Local LiftNex draft')) : (C.coachProviderConnected || t('Connected AI draft'))}</div>}
    {diff?.valid && <div className="coach-plan-diff" style={{ marginTop: 12 }}><h3>{draft.title}</h3><p className="muted small">{draft.rationale}</p>{diff.changes.map(change => <label key={change.key} className="row" style={{ alignItems: 'flex-start', gap: 8, padding: '9px 0', borderBottom: '1px solid var(--sep)' }}><Check checked={selected.includes(change.key)} onChange={value => setSelected(current => value ? [...new Set([...current, change.key])] : current.filter(key => key !== change.key))} /><span><b>{change.title}</b><br /><span className="small muted">{change.type === 'add_routine' ? t('Routine') : t('Cycle')} · {change.description}</span></span></label>)}{draft.warnings?.length > 0 && <div className="small" style={{ color: 'var(--yellow)', marginTop: 10 }}>{draft.warnings.join(' ')}</div>}<Button variant="tinted" icon="check" disabled={!selected.length} onClick={apply}>{C.coachApply || t('Apply selected changes')}</Button></div>}
    {(S.coachSnapshots || []).length > 0 && <><h3 className="sec">{C.coachRevert || t('Reversible plan snapshots')}</h3><div className="list">{S.coachSnapshots.slice(0, 5).map(snapshot => <div key={snapshot.id} className="item"><div className="grow"><div className="tt">{snapshot.reason}</div><div className="ss">{snapshot.createdAt.slice(0, 10)}</div></div><Button size="sm" variant="tinted" onClick={() => revert(snapshot.id)}>{C.coachUndo || t('Revert')}</Button></div>)}</div></>}
  </section>
}

export default function Coach() {
  useLang()
  const nav = useNavigate()
  const C = labels()
  const S = useStore(state => state.S)
  const update = useStore(state => state.update)
  const date = todayISO()
  const goal = { ...DEFAULT_NUTRITION_GOAL, ...(S.nutritionGoal || {}) }
  const totals = dailyTotals(S.nutritionEntries || [], date)
  return <div className="narrow nutrition-view coach-view">
    <div className="hdr"><div className="row" style={{ gap: 10 }}><button className="iconbtn" onClick={() => nav('/home')} aria-label={C.back}><Icon name="chevronLeft" /></button><div><h1>{C.coach}</h1><div className="sub">{C.coachSubtitle}</div></div></div><Icon name="sparkles" className="nutrition-head-icon" /></div>
    <NutritionCoach C={C} S={S} date={date} totals={totals} goal={goal} update={update} />
    <CoachPlanBuilder C={C} S={S} update={update} />
    <Button variant="plain" icon="chevronLeft" onClick={() => nav('/home')}>{C.back}</Button>
  </div>
}
