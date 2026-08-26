import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { effectiveRoutine, effectiveRoutineId, streakWeeks, lastBW, setsDoneActive } from '../lib/history.js'
import { fmtNum, fmtDate, todayISO, isoOf, weekKey, DAYS } from '../lib/format.js'
import { t, dateLocale } from '../lib/i18n.js'
import { bwSheet, dayOverrideSheet, calendarSheet, startFlow, loadStarterPlan, bwDeltaColor } from '../sheets.jsx'
import LineChart from '../components/LineChart.jsx'
import Icon from '../components/Icon.jsx'
import { Button, NumberField, Tappable } from '../components/ui.jsx'
import { glyphOf } from '../lib/glyphs.js'
import { DEFAULT_NUTRITION_GOAL, roundNutrition } from '../lib/nutrition.js'
import { buildDailyBriefing } from '../lib/briefing.js'

// Home = what to do now + a quick glance. Deep charts & history live in Stats.
export default function Home() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const user = useStore(s => s.user)
  const [weekOffset, setWeekOffset] = useState(0)

  const today = new Date()
  const routine = effectiveRoutine(S, todayISO())
  const todayOvr = S.dayPlan[todayISO()] !== undefined
  const bw = lastBW(S)
  const prevBW = S.bodyweight.length > 1 ? S.bodyweight[S.bodyweight.length - 2] : null
  const delta = bw && prevBW ? bw.w - prevBW.w : null

  const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7)
  const doneDays = new Set(S.workouts.map(w => w.d))
  const strip = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday); d.setDate(monday.getDate() + i)
    const iso = isoOf(d)
    const eff = effectiveRoutineId(S, iso), ovr = S.dayPlan[iso] !== undefined, done = doneDays.has(iso)
    const dot = done ? ' done' : ovr && eff ? ' ovr' : eff ? ' plan' : ''
    strip.push(<Tappable key={i} className={'wday' + (iso === todayISO() ? ' today' : '')} onClick={() => dayOverrideSheet(iso)}>
      <div className="lbl">{t(DAYS[d.getDay()])}</div><div className="num">{d.getDate()}</div><div className={'dot' + dot} /></Tappable>)
  }
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6)
  const wkLabel = weekOffset === 0 ? t('This week') : `${monday.getDate()} ${monday.toLocaleDateString(dateLocale(), { month: 'short' })} – ${sunday.getDate()} ${sunday.toLocaleDateString(dateLocale(), { month: 'short' })}`

  const wThisWeek = S.workouts.filter(w => weekKey(w.d) === weekKey(todayISO())).length
  const plannedPerWeek = Object.keys(S.week).filter(k => S.week[k]).length
  const bwPoints = S.bodyweight.slice(-30).map(b => ({ t: b.t || new Date(b.d).getTime(), y: b.w, d: b.d }))
  const briefing = buildDailyBriefing(S, todayISO())
  const activity = briefing.activity
  const dailyWorkout = briefing.workout
  const nutrition = briefing.nutrition.totals
  const nutritionGoal = { ...DEFAULT_NUTRITION_GOAL, ...(S.nutritionGoal || {}) }
  const includesActivity = briefing.nutrition.includesActivity
  const stepRow = (S.healthMetrics || []).find(item => item?.d === todayISO() && item.steps != null)
  const steps = stepRow ? Math.max(0, Math.round(+stepRow.steps || 0)) : null
  const stepsGoal = Math.max(500, Math.round(+S.stepsGoal || 10000))
  const setSteps = value => update(s => {
    const date = todayISO()
    const rows = [...(s.healthMetrics || [])]
    const index = rows.findIndex(item => item?.d === date)
    const current = index >= 0 ? { ...rows[index] } : { d: date, source: 'Manual' }
    if (value == null) delete current.steps
    else current.steps = Math.max(0, Math.min(200000, Math.round(value)))
    current.source = current.source || 'Manual'
    const hasValue = Object.keys(current).some(key => !['d', 'source'].includes(key))
    if (!hasValue) { if (index >= 0) rows.splice(index, 1) }
    else if (index >= 0) rows[index] = current
    else rows.push(current)
    s.healthMetrics = rows.sort((a, b) => a.d.localeCompare(b.d))
  })
  const addSteps = amount => setSteps((steps || 0) + amount)

  // today's session shown right under the week strip
  const onToday = () => { if (S.active) nav('/workout'); else if (routine) startFlow(routine.id); else dayOverrideSheet(todayISO()) }

  return <div className="narrow">
    <div className="hdr">
      <div><h1>{user ? t('Hi {0}', user.name) : 'LiftNex'}</h1><div className="sub">{today.toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' })}</div></div>
      <button className="iconbtn" onClick={() => nav('/settings')} aria-label={t('Settings')}><Icon name="gear" /></button>
    </div>

    <div className="card">
      <div className="row between" style={{ marginBottom: 8 }}>
        <button className="iconbtn" style={{ width: 30, height: 30, fontSize: 15 }} onClick={() => setWeekOffset(w => w - 1)} aria-label="Previous week"><Icon name="chevronLeft" /></button>
        <div className="small muted" style={{ fontWeight: 500 }}>{wkLabel}</div>
        <button className="iconbtn" style={{ width: 30, height: 30, fontSize: 15 }} onClick={() => setWeekOffset(w => w + 1)} aria-label="Next week"><Icon name="chevronRight" /></button>
      </div>
      <div className="week">{strip}</div>
    <Tappable className="today-row" onClick={onToday}>
        <div className="row" style={{ gap: 9, minWidth: 0 }}>
          <span className="lrow-i solid-icon" style={{ background: S.active ? 'var(--orange)' : routine ? 'var(--acc)' : 'var(--surface-3)', color: S.active || routine ? 'var(--on-acc)' : 'var(--label)' }}>
            <Icon name={S.active ? 'timer' : routine ? glyphOf(routine.emoji) : 'moon'} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="lbl2">{t('Today')}</div>
            <div className="ttl">{S.active ? t('{0} — in progress', S.active.name) : routine ? routine.name : t('Rest day')}{todayOvr && routine ? ' · ' + t('rescheduled') : ''}</div>
          </div>
        </div>
        {S.active ? <span className="tag" style={{ color: 'var(--orange)', background: 'color-mix(in srgb,var(--orange) 16%,transparent)' }}>{t('Resume')}</span>
          : routine ? <span className="tag acc">{t('Start')}</span>
          : <Icon name="plus" className="chev" />}
      </Tappable>
    </div>

    <section className="card home-balance-card" aria-labelledby="home-balance-title">
      <div className="row between home-balance-head">
        <div className="row" style={{ gap: 9, minWidth: 0 }}>
          <span className="lrow-i solid-icon accent-badge" style={{ background: 'var(--acc)' }}><Icon name="dashboard" /></span>
          <div><h2 id="home-balance-title" style={{ margin: 0 }}>{S.lang === 'es' ? 'Balance de hoy' : 'Today’s balance'}</h2><div className="small muted">{S.lang === 'es' ? 'Actividad, comida y objetivos en una sola vista' : 'Activity, food and goals in one view'}</div></div>
        </div>
        <button className="iconbtn home-balance-detail" onClick={() => nav('/briefing')} aria-label={S.lang === 'es' ? 'Abrir detalle del balance' : 'Open balance details'}><Icon name="chevronRight" /></button>
      </div>
      <div className="home-balance-grid">
        <div className="home-balance-metric steps">
          <div className="home-balance-label"><Icon name="footprints" />{S.lang === 'es' ? 'Pasos' : 'Steps'}</div>
          <strong>{steps == null ? '—' : steps.toLocaleString()}<span> / {stepsGoal.toLocaleString()}</span></strong>
          <small>{activity.stepsCalories == null ? (S.lang === 'es' ? 'kcal: —' : 'kcal: —') : `≈ ${roundNutrition(activity.stepsCalories)} kcal`}</small>
        </div>
        <div className="home-balance-metric workout">
          <div className="home-balance-label"><Icon name="dumbbell" />{S.lang === 'es' ? 'Gimnasio' : 'Gym'}</div>
          <strong>{dailyWorkout.completed ? (S.lang === 'es' ? '1 sesión' : '1 session') : '—'}</strong>
          <small>{activity.workoutCalories == null ? (dailyWorkout.completed ? (S.lang === 'es' ? 'kcal: —' : 'kcal: —') : (S.lang === 'es' ? 'Sin sesión' : 'No session')) : `≈ ${roundNutrition(activity.workoutCalories)} kcal`}</small>
        </div>
        <div className="home-balance-metric food">
          <div className="home-balance-label"><Icon name="forkKnife" />{S.lang === 'es' ? 'Comida' : 'Food'}</div>
          <strong>{roundNutrition(nutrition.calories)}<span> / {roundNutrition(briefing.nutrition.effectiveCaloriesGoal)} kcal</span></strong>
          <small>{briefing.nutrition.over.calories > 0 ? `${roundNutrition(briefing.nutrition.over.calories)} ${S.lang === 'es' ? 'sobre objetivo' : 'over target'}` : `${roundNutrition(briefing.nutrition.remaining.calories)} ${S.lang === 'es' ? 'restantes' : 'remaining'}`}</small>
        </div>
        <div className="home-balance-metric protein">
          <div className="home-balance-label"><Icon name="target" />{S.lang === 'es' ? 'Proteína' : 'Protein'}</div>
          <strong>{roundNutrition(nutrition.protein)}<span> / {roundNutrition(nutritionGoal.protein)} g</span></strong>
          <small>{briefing.nutrition.over.protein > 0 ? `${roundNutrition(briefing.nutrition.over.protein)} g ${S.lang === 'es' ? 'sobre objetivo' : 'over target'}` : `${roundNutrition(briefing.nutrition.remaining.protein)} g ${S.lang === 'es' ? 'restantes' : 'remaining'}`}</small>
        </div>
      </div>
      <div className="nutrition-track home-balance-track"><span style={{ width: `${stepsGoal ? Math.min(100, (steps || 0) / stepsGoal * 100) : 0}`, background: 'var(--blue)' }} /></div>
      <div className="home-balance-activity-total"><span>{S.lang === 'es' ? 'Actividad del día' : 'Today’s activity'}</span><strong>{activity.activeCalories == null ? '—' : `≈ ${roundNutrition(activity.activeCalories)} kcal`}</strong><small>{activity.activeCaloriesSource === 'device' ? (S.lang === 'es' ? 'Dato importado' : 'Imported data') : activity.activeCalories == null ? (S.lang === 'es' ? 'Añade pasos o termina una sesión' : 'Add steps or finish a session') : (S.lang === 'es' ? 'Pasos + sesión estimados' : 'Estimated steps + session')}</small></div>
      <div className="home-balance-step-editor">
        <div className="home-balance-step-title"><span>{S.lang === 'es' ? 'Registrar pasos' : 'Log steps'}</span><span className="muted">{S.lang === 'es' ? 'sin salir de Inicio' : 'without leaving Home'}</span></div>
        <div className="home-steps-actions">
          <div className="home-steps-quick" aria-label={S.lang === 'es' ? 'Añadir pasos' : 'Add steps'}>
            {[500, 1000, 2500].map(amount => <Button key={amount} size="sm" variant="tinted" onClick={() => addSteps(amount)}>+{amount.toLocaleString()}</Button>)}
          </div>
          <label className="home-steps-input"><span>{S.lang === 'es' ? 'Total' : 'Total'}</span><NumberField nullable value={steps} decimal={false} aria-label={S.lang === 'es' ? 'Pasos de hoy' : 'Today’s steps'} onChange={setSteps} /></label>
        </div>
      </div>
      <div className="home-balance-note"><Icon name="info" />{includesActivity
        ? (S.lang === 'es' ? 'Las kcal de actividad son orientativas y no se suman a tu objetivo de comida.' : 'Activity kcal are estimates and are not added to your food target.')
        : (S.lang === 'es' ? 'Tu objetivo permite sumar la actividad estimada cuando hay datos disponibles.' : 'Your target allows estimated activity to extend the available intake when data is available.')}</div>
    </section>

    <section className="card home-goals-card" aria-labelledby="home-goals-title">
      <div className="row between home-goals-head">
        <div className="row" style={{ gap: 9, minWidth: 0 }}>
          <span className="lrow-i solid-icon accent-badge" style={{ background: 'var(--acc)' }}><Icon name="target" /></span>
          <div><h2 id="home-goals-title" style={{ margin: 0 }}>{S.lang === 'es' ? 'Objetivos' : 'Goals'}</h2><div className="small muted">{S.lang === 'es' ? 'Tus metas de entrenamiento, cuerpo y nutrición' : 'Your training, body and nutrition targets'}</div></div>
        </div>
        <Button size="sm" variant="tinted" icon="chevronRight" onClick={() => nav('/goals')}>{S.lang === 'es' ? 'Ver todos' : 'View all'}</Button>
      </div>
      <div className="home-goals-grid">
        <div className="home-goal-item"><span>{S.lang === 'es' ? 'Peso objetivo' : 'Target weight'}</span><strong>{S.targetW ? `${fmtNum(S.targetW)} ${S.unit}` : '—'}</strong><small>{S.targetW ? (S.lang === 'es' ? 'Meta corporal' : 'Body target') : (S.lang === 'es' ? 'Sin definir' : 'Not set')}</small></div>
        <div className="home-goal-item"><span>{S.lang === 'es' ? 'Calorías' : 'Calories'}</span><strong>{roundNutrition(nutritionGoal.calories)} kcal</strong><small>{S.lang === 'es' ? 'Objetivo diario' : 'Daily target'}</small></div>
        <div className="home-goal-item"><span>{S.lang === 'es' ? 'Proteína' : 'Protein'}</span><strong>{roundNutrition(nutritionGoal.protein)} g</strong><small>{S.lang === 'es' ? 'Objetivo diario' : 'Daily target'}</small></div>
        <div className="home-goal-item"><span>{S.lang === 'es' ? 'Pasos' : 'Steps'}</span><strong>{stepsGoal.toLocaleString()}</strong><small>{S.lang === 'es' ? 'Objetivo diario' : 'Daily target'}</small></div>
      </div>
    </section>

    {!S.routines.length && !S.active && (
      <div className="card">
        <div className="row" style={{ gap: 10, marginBottom: 6 }}>
          <span className="lrow-i"><Icon name="sparkles" /></span>
          <div className="big" style={{ fontSize: 22 }}>{t('Welcome!')}</div>
        </div>
        <div className="muted small" style={{ marginBottom: 12 }}>{t('Set up your weekly routine to get going — or load a ready-made Push / Pull / Legs plan.')}</div>
        <Button variant="primary" icon="sparkles" onClick={loadStarterPlan}>{t('Load starter plan (PPL)')}</Button>
        <div style={{ height: 8 }} /><Button onClick={() => nav('/plan')}>{t('Build my own plan')}</Button>
      </div>
    )}

    <div className="card">
      <div className="row between" style={{ marginBottom: 6 }}>
        <h2 style={{ margin: 0 }}>{t('Body weight')}</h2>
        <div className="row" style={{ gap: 8 }}>
          <Button size="sm" icon="target" style={S.targetW ? { color: 'var(--yellow)' } : undefined} onClick={() => nav('/goals')}>{S.targetW ? fmtNum(S.targetW) : t('Goal')}</Button>
          <Button size="sm" icon="plus" onClick={() => bwSheet()}>{t('Log')}</Button>
        </div>
      </div>
      {bw ? <>
        <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
          <div className="big">{fmtNum(bw.w)} <span className="muted" style={{ fontSize: '1rem' }}>{S.unit}</span></div>
          {/* only when it actually moved — an unchanged weight used to read as "− 0" */}
          {!!delta && (
            <span className="small row" style={{ gap: 2, fontWeight: 500, color: bwDeltaColor(delta, bw.w) }}>
              <Icon name={delta > 0 ? 'arrowUp' : 'arrowDown'} style={{ fontSize: 12 }} />
              {fmtNum(Math.abs(delta))}
            </span>
          )}
          <span className="dim small" style={{ marginLeft: 'auto' }}>{fmtDate(bw.d, true)}</span>
        </div>
        {S.targetW && (
          <div className="small row" style={{ color: 'var(--yellow)', marginTop: 4, gap: 5 }}>
            <Icon name="target" style={{ fontSize: 13 }} />
            <span>{t('Goal')} {fmtNum(S.targetW)} {S.unit} · {Math.abs(S.targetW - bw.w) < 0.05 ? t('reached!') : t(S.targetW > bw.w ? '{0} to gain' : '{0} to lose', fmtNum(Math.abs(S.targetW - bw.w)) + ' ' + S.unit)}</span>
          </div>
        )}
        <div className="chart" style={{ marginTop: 8 }}><LineChart points={bwPoints} h={130} unit={S.unit} goal={S.targetW} /></div>
      </> : <div className="muted small">{t("No entries yet — log your weight to start the curve. It's also asked before every workout.")}</div>}
    </div>

    <Tappable className="card tappable nutrition-home-card" onClick={() => nav('/nutrition')}>
      <div className="row between">
        <div className="row" style={{ gap: 9, minWidth: 0 }}>
          <span className="lrow-i solid-icon accent-badge" style={{ background: 'var(--acc)' }}><Icon name="forkKnife" /></span>
          <div><div className="lbl2">{S.lang === 'es' ? 'Nutrición' : t('Nutrition')}</div><div className="ttl">{roundNutrition(nutrition.calories)} / {roundNutrition(nutritionGoal.calories)} kcal</div></div>
        </div>
        <Icon name="chevronRight" className="chev" />
      </div>
      <div className="nutrition-track" style={{ marginTop: 12 }}><span style={{ width: `${Math.min(100, nutritionGoal.calories ? nutrition.calories / nutritionGoal.calories * 100 : 0)}%` }} /></div>
      <div className="small muted" style={{ marginTop: 7 }}>{roundNutrition(nutrition.protein)}g {S.lang === 'es' ? 'proteína' : t('protein')} · {S.lang === 'es' ? 'Abrir diario' : t('Open food diary')}</div>
    </Tappable>

    <div className="home-action-grid">
      <Tappable className="card tappable home-action-card" onClick={() => nav('/briefing')}>
        <span className="lrow-i solid-icon blue-badge" style={{ background: 'var(--blue)' }}><Icon name="dashboard" /></span>
        <div><div className="ttl">{S.lang === 'es' ? 'Resumen diario' : 'Daily briefing'}</div><div className="small muted">{S.lang === 'es' ? 'Entrenamiento, combustible y tendencia' : 'Training, fuel and trend'}</div></div>
        <Icon name="chevronRight" className="chev" />
      </Tappable>
      <Tappable className="card tappable home-action-card" onClick={() => nav('/coach')}>
        <span className="lrow-i solid-icon accent-badge" style={{ background: 'var(--acc)' }}><Icon name="brain" /></span>
        <div><div className="ttl">{S.lang === 'es' ? 'Coach personal' : 'Personal coach'}</div><div className="small muted">{S.lang === 'es' ? 'Revisión de todo tu historial' : 'Review your full history'}</div></div>
        <Icon name="chevronRight" className="chev" />
      </Tappable>
    </div>

    <Tappable className="card tappable" style={{ cursor: 'pointer' }} onClick={() => calendarSheet()}>
      <div className="row between">
        <div>
          <div className="row" style={{ gap: 7, fontSize: 22, fontWeight: 600, letterSpacing: '-.021em' }}>
            <Icon name="flame" style={{ color: 'var(--orange)' }} />
            {t('{0} week streak', streakWeeks(S))}
          </div>
          <div className="muted small" style={{ marginTop: 2 }}>{wThisWeek}{plannedPerWeek ? ' / ' + plannedPerWeek : ''} {t('this week')} · {t(S.workouts.length === 1 ? '{0} workout total' : '{0} workouts total', S.workouts.length)}</div>
        </div>
        <Icon name="calendar" className="chev" style={{ fontSize: 20 }} />
      </div>
    </Tappable>
  </div>
}
