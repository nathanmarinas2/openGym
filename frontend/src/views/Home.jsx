import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { effectiveRoutine, effectiveRoutineId, streakWeeks, lastBW } from '../lib/history.js'
import { fmtNum, todayISO, isoOf, weekKey, DAYS } from '../lib/format.js'
import { t, dateLocale } from '../lib/i18n.js'
import { bwSheet, stepsSheet, dayOverrideSheet, calendarSheet, startFlow, loadStarterPlan } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button, Tappable } from '../components/ui.jsx'
import { glyphOf } from '../lib/glyphs.js'
import { DEFAULT_NUTRITION_GOAL, roundNutrition } from '../lib/nutrition.js'
import { buildDailyBriefing } from '../lib/briefing.js'

const ONBOARDING_EQUIPMENT = {
  home: ['body weight', 'dumbbell', 'resistance band', 'bench'],
  gym: ['body weight', 'barbell', 'dumbbell', 'cable', 'machine', 'bench', 'kettlebell'],
  travel: ['body weight', 'resistance band']
}

function Onboarding({ S, update, nav }) {
  const [step, setStep] = useState(0)
  const [unit, setUnit] = useState(S.unit || 'kg')
  const [place, setPlace] = useState('home')
  const [days, setDays] = useState(S.trainingDaysPerWeek || 3)
  const finish = withStarter => {
    update(s => {
      s.unit = unit
      s.trainingDaysPerWeek = days
      s.onboardingComplete = true
      const current = (s.equipmentProfiles || []).find(profile => profile.id === 'home') || { id: 'home', name: 'Home' }
      s.equipmentProfiles = [...(s.equipmentProfiles || []).filter(profile => profile.id !== 'home'), { ...current, items: ONBOARDING_EQUIPMENT[place] }]
      s.activeEquipmentProfile = 'home'
    })
    if (withStarter) loadStarterPlan()
    else nav('/plan')
  }
  const skip = () => update(s => { s.onboardingComplete = true })
  const choices = step === 0
    ? [{ value: 'kg', label: 'kg', icon: 'scale' }, { value: 'lb', label: 'lb', icon: 'scale' }]
    : step === 1
      ? [{ value: 'home', label: t('Home'), icon: 'house' }, { value: 'gym', label: t('Gym'), icon: 'dumbbell' }, { value: 'travel', label: t('Travel'), icon: 'folder' }]
      : [{ value: 2, label: '2' }, { value: 3, label: '3' }, { value: 4, label: '4' }, { value: 5, label: '5+' }]
  const selected = step === 0 ? unit : step === 1 ? place : days

  return <section className="card onboarding-card" aria-labelledby="onboarding-title">
    <div className="onboarding-progress"><span style={{ width: `${((step + 1) / 4) * 100}%` }} /></div>
    <div className="row between onboarding-meta"><span className="small muted">{t('Welcome!')}</span><span className="small dim">{t('Step {0} of {1}', step + 1, 4)}</span></div>
    <h2 id="onboarding-title">{t(step === 0 ? 'Choose your weight unit' : step === 1 ? 'Where do you train?' : step === 2 ? 'How often do you want to train?' : 'How do you want to start?')}</h2>
    <p className="muted">{t(step === 0 ? 'This keeps your logs and targets consistent.' : step === 1 ? 'LiftNex will filter realistic exercises and substitutions.' : step === 2 ? 'Use this as a starting point for your weekly routine.' : 'Your choices can be changed later in Settings.')}</p>
    {step < 3 ? <div className="onboarding-choice-grid">{choices.map(choice => <button key={choice.value} type="button" className={'onboarding-choice' + (selected === choice.value ? ' on' : '')} aria-pressed={selected === choice.value} onClick={() => step === 0 ? setUnit(choice.value) : step === 1 ? setPlace(choice.value) : setDays(choice.value)}>
      {choice.icon && <Icon name={choice.icon} />}<span>{choice.label}</span>{selected === choice.value && <Icon name="check" className="choice-check" />}
    </button>)}</div> : <div className="onboarding-start-options">
      <Button variant="primary" icon="sparkles" onClick={() => finish(true)}>{t('Load starter plan (PPL)')}</Button>
      <Button icon="list" onClick={() => finish(false)}>{t('Build my own plan')}</Button>
    </div>}
    <div className="onboarding-actions">
      <Button variant="ghost" className="dim" onClick={step === 0 ? skip : () => setStep(value => value - 1)}>{t(step === 0 ? 'Skip' : 'Back')}</Button>
      {step < 3 && <Button variant="tinted" trailingIcon="chevronRight" onClick={() => setStep(value => value + 1)}>{t('Next')}</Button>}
    </div>
  </section>
}

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
  const briefing = buildDailyBriefing(S, todayISO())
  const activity = briefing.activity
  const dailyWorkout = briefing.workout
  const nutrition = briefing.nutrition.totals
  const nutritionGoal = { ...DEFAULT_NUTRITION_GOAL, ...(S.nutritionGoal || {}) }
  const includesActivity = briefing.nutrition.includesActivity
  const stepRow = (S.healthMetrics || []).find(item => item?.d === todayISO() && item.steps != null)
  const steps = stepRow ? Math.max(0, Math.round(+stepRow.steps || 0)) : null
  const stepsGoal = Math.max(500, Math.round(+S.stepsGoal || 10000))
  const recommendationAction = recommendation => recommendation.action === 'Open workout' ? () => nav('/workout')
    : recommendation.action === 'Log water' || recommendation.action === 'Open nutrition' ? () => nav('/nutrition')
      : recommendation.action === 'Review coach' ? () => nav('/coach') : () => nav('/stats')
  const recommendationLabel = recommendation => recommendation.action === 'Open workout' ? t('Open workout')
    : recommendation.action === 'Log water' ? t('Log water')
      : recommendation.action === 'Open nutrition' ? t('Open nutrition')
        : recommendation.action === 'Review coach' ? t('Review coach') : t('Review progress')

  // today's session shown right under the week strip
  const onToday = () => { if (S.active) nav('/workout'); else if (routine) startFlow(routine.id); else dayOverrideSheet(todayISO()) }

  return <div className="narrow">
    <div className="hdr">
      <div><h1>{user ? t('Hi {0}', user.name) : 'LiftNex'}</h1><div className="sub">{today.toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' })}</div></div>
      <button className="iconbtn" onClick={() => nav('/settings')} aria-label={t('Settings')}><Icon name="gear" /></button>
    </div>

    <section className={`card home-next-card ${briefing.recommendation.tone}`} aria-labelledby="home-next-title">
      <div className="small muted">{t('One useful next step')}</div>
      <div className="home-next-body">
        <span className="home-next-icon"><Icon name="sparkles" /></span>
        <div className="grow"><h2 id="home-next-title">{t(briefing.recommendation.title)}</h2><p>{briefing.recommendation.detailKey ? t(briefing.recommendation.detailKey, ...(briefing.recommendation.detailArgs || [])) : t(briefing.recommendation.detail)}</p></div>
      </div>
      <Button size="sm" variant="tinted" trailingIcon="chevronRight" onClick={recommendationAction(briefing.recommendation)}>{recommendationLabel(briefing.recommendation)}</Button>
    </section>

    {!S.onboardingComplete && <Onboarding S={S} update={update} nav={nav} />}

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

    <section className="card home-glance-card" aria-labelledby="home-glance-title">
      <div className="row between home-balance-head">
        <div className="row" style={{ gap: 9, minWidth: 0 }}>
          <span className="lrow-i solid-icon accent-badge" style={{ background: 'var(--acc)' }}><Icon name="dashboard" /></span>
          <div><h2 id="home-glance-title" style={{ margin: 0 }}>{t('Today’s balance')}</h2><div className="small muted">{t('Activity, food and goals in one view')}</div></div>
        </div>
        <span className="home-glance-status">{activity.activeCalories == null ? '—' : `≈ ${roundNutrition(activity.activeCalories)} kcal`}</span>
      </div>
      <div className="home-glance-grid">
        <Tappable className="home-glance-metric" onClick={stepsSheet} aria-label={t('Log steps')}>
          <span className="home-balance-label"><Icon name="footprints" />{t('Steps')}</span>
          <strong>{steps == null ? '—' : steps.toLocaleString()}<span> / {stepsGoal.toLocaleString()}</span></strong>
          <small>{t('Log steps')}</small>
        </Tappable>
        <Tappable className="home-glance-metric" onClick={() => nav('/nutrition')} aria-label={t('Open food diary')}>
          <span className="home-balance-label"><Icon name="forkKnife" />{t('Food')}</span>
          <strong>{roundNutrition(nutrition.calories)}<span> / {roundNutrition(briefing.nutrition.effectiveCaloriesGoal)}</span></strong>
          <small>{roundNutrition(nutrition.protein)} g {t('Protein').toLowerCase()}</small>
        </Tappable>
        <Tappable className="home-glance-metric" onClick={bwSheet} aria-label={t('Body weight')}>
          <span className="home-balance-label"><Icon name="scale" />{t('Body weight')}</span>
          <strong>{bw ? fmtNum(bw.w) : '—'}<span>{bw ? ` ${S.unit}` : ''}</span></strong>
          <small>{bw ? t('Last logged') : t('Log')}</small>
        </Tappable>
      </div>
      <div className="home-glance-foot"><span>{dailyWorkout.completed ? t('{0} session', 1) : routine ? t('Planned') : t('Rest day')}</span><span>{includesActivity ? t('Activity kcal are estimates and are not added to your food target.') : t('Estimated steps + session')}</span></div>
    </section>

    {S.onboardingComplete && !S.routines.length && !S.active && (
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

    <Tappable className="card tappable nutrition-home-card" onClick={() => nav('/nutrition')}>
      <div className="row between">
        <div className="row" style={{ gap: 9, minWidth: 0 }}>
          <span className="lrow-i solid-icon accent-badge" style={{ background: 'var(--acc)' }}><Icon name="forkKnife" /></span>
          <div><div className="lbl2">{t('Nutrition')}</div><div className="ttl">{roundNutrition(nutrition.calories)} / {roundNutrition(nutritionGoal.calories)} kcal</div></div>
        </div>
        <Icon name="chevronRight" className="chev" />
      </div>
      <div className="nutrition-track" style={{ marginTop: 12 }}><span style={{ width: `${Math.min(100, nutritionGoal.calories ? nutrition.calories / nutritionGoal.calories * 100 : 0)}%` }} /></div>
      <div className="small muted" style={{ marginTop: 7 }}>{roundNutrition(nutrition.protein)}g {t('Protein').toLowerCase()} · {t('Open food diary')}</div>
    </Tappable>

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
