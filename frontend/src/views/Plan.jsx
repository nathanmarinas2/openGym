import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { DAYN, uid, exCount, todayISO } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { dayAssignSheet, loadStarterPlan, planToolsSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button, NumberField, SelectRow, Tappable, TextField } from '../components/ui.jsx'
import { glyphOf, DEFAULT_GLYPH } from '../lib/glyphs.js'
import { CYCLE_GOALS, currentCyclePhase, normalizeCycle } from '../lib/periodization.js'

function CyclePlanner({ S, update }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [goal, setGoal] = useState('strength')
  const [startDate, setStartDate] = useState(todayISO())
  const [phaseName, setPhaseName] = useState('Base')
  const [focus, setFocus] = useState('')
  const [weekCount, setWeekCount] = useState(4)
  const current = currentCyclePhase(S, todayISO())
  const save = () => {
    const cycle = normalizeCycle({
      id: uid(), name: name.trim() || t('Training cycle'), goal, startDate,
      phases: [{ id: uid(), name: phaseName.trim() || t('Base'), focus: focus.trim(), weekCount,
        routineIds: S.routines.map(r => r.id) }]
    })
    update(s => { s.planCycles = [...(s.planCycles || []), cycle] })
    setName(''); setFocus(''); setOpen(false)
  }
  return <div className="card" style={{ marginBottom: 18 }}>
    <div className="row between">
      <div><h2 style={{ margin: 0 }}>{t('Cycles & phases')}</h2><div className="small dim">{t('Optional periodization layered over your routine templates.')}</div></div>
      <Button size="sm" variant="tinted" icon={open ? 'xmark' : 'plus'} onClick={() => setOpen(value => !value)}>{open ? t('Close') : t('New cycle')}</Button>
    </div>
    {current && <div className="progline" style={{ marginTop: 12 }}><Icon name="calendar" /><span><b>{current.cycle.name}</b> · {current.phase.name}<span className="dim"> · {t(current.cycle.goal)}</span></span></div>}
    {!current && (S.planCycles || []).length === 0 && <div className="small muted" style={{ marginTop: 12 }}>{t('No active cycle. Your routines work normally without one.')}</div>}
    {open && <div className="sect-b" style={{ marginTop: 14, paddingTop: 14 }}>
      <label className="field-label"><span>{t('Cycle name')}</span><TextField value={name} maxLength={100} placeholder={t('e.g. Spring strength')} onChange={event => setName(event.target.value)} /></label>
      <SelectRow title={t('Goal')} sheetTitle={t('Cycle goal')} value={goal} onChange={setGoal} options={CYCLE_GOALS.map(value => ({ value, label: t(value) }))} />
      <label className="field-label"><span>{t('Start date')}</span><TextField type="date" value={startDate} onChange={event => setStartDate(event.target.value)} /></label>
      <div className="row cfgrow"><label className="field-label grow"><span>{t('First phase')}</span><TextField value={phaseName} maxLength={100} onChange={event => setPhaseName(event.target.value)} /></label><div style={{ minWidth: 120 }}><div className="stp-l">{t('Weeks')}</div><NumberField value={weekCount} decimal={false} onChange={value => setWeekCount(Math.max(1, Math.min(52, value || 1)))} /></div></div>
      <label className="field-label"><span>{t('Focus (optional)')}</span><TextField value={focus} maxLength={300} placeholder={t('What this phase should emphasise')} onChange={event => setFocus(event.target.value)} /></label>
      <div className="small dim" style={{ margin: '8px 0 12px' }}>{t('New phases start with your current routines. You can refine them as the block evolves.')}</div>
      <Button variant="primary" icon="check" onClick={save}>{t('Save cycle')}</Button>
    </div>}
    {(S.planCycles || []).map(cycle => {
      const active = current?.cycle.id === cycle.id
      return <div key={cycle.id} className="item" style={{ marginTop: 12, padding: '11px 0 0', borderTop: '1px solid var(--sep)' }}>
        <div className="row between"><div><div className="tt">{cycle.name}</div><div className="ss">{t(cycle.goal)} · {cycle.startDate}{active ? ' · ' + t('current') : ''}</div></div>{active && <span className="tag acc">{t('Active')}</span>}</div>
        <div className="mchips" style={{ marginTop: 8 }}>{(cycle.phases || []).map(phase => <span key={phase.id} className={'mchip' + (current?.phase.id === phase.id ? ' on' : '')}>{phase.name} · {phase.weekCount}w</span>)}</div>
      </div>
    })}
  </div>
}

export default function Plan() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)

  const addRoutine = () => {
    const r = { id: uid(), name: t('New routine'), emoji: DEFAULT_GLYPH, ex: [] }
    update(s => { s.routines.push(r) })
    nav('/plan/r/' + r.id)
  }

  return <>
    <div className="hdr">
      <div><h1>{t('Plan')}</h1><div className="sub">{t('Your weekly routine')}</div></div>
      <div className="row" style={{ gap: 4 }}><button className="iconbtn" onClick={() => nav('/library')} aria-label={t('Exercises')} title={t('Exercises')}><Icon name="list" /></button><button className="iconbtn" onClick={planToolsSheet} aria-label={t('Share your plan')} title={t('Share your plan')}><Icon name="upload" /></button></div>
    </div>
    <CyclePlanner S={S} update={update} />
    <div className="cols"><div>
      <h4 className="sec">{t('Week schedule')}</h4>
      <div className="list" style={{ display: 'flex', flexDirection: 'column' }}>
        {[1, 2, 3, 4, 5, 6, 0].map(d => {
          const r = S.routines.find(x => x.id === S.week[d])
          return <Tappable key={d} className="item" onClick={() => dayAssignSheet(d)}>
            <div className="grow"><div className="tt">{t(DAYN[d])}</div></div>
            {r ? <span className="tag acc"><Icon name={glyphOf(r.emoji)} />{r.name}</span> : <span className="tag">{t('Rest')}</span>}
            <Icon name="chevronRight" className="chev" /></Tappable>
        })}
      </div>
    </div><div>
      <div className="row between" style={{ marginTop: 22, marginBottom: 10 }}>
        <h4 className="sec" style={{ margin: 0 }}>{t('Routines')}</h4>
        <Button size="sm" variant="tinted" icon="plus" onClick={addRoutine}>{t('New')}</Button>
      </div>
      {S.routines.length ? <div className="list">{S.routines.map(r => <Tappable key={r.id} className="item" onClick={() => nav('/plan/r/' + r.id)}>
        <span className="lrow-i"><Icon name={glyphOf(r.emoji)} /></span>
        <div className="grow"><div className="tt">{r.name}</div><div className="ss">{exCount(r.ex.length)}</div></div>
        <Icon name="chevronRight" className="chev" /></Tappable>)}</div> : <>
        <div className="empty"><div className="ico"><Icon name="clipboard" /></div>{t('No routines yet.')}<br />{t('Create one or load the starter plan.')}</div>
        <Button icon="sparkles" onClick={loadStarterPlan}>{t('Load starter plan (Push / Pull / Legs)')}</Button>
      </>}
    </div></div>
  </>
}
