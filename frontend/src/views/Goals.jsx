import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { DEFAULT_NUTRITION_GOAL } from '../lib/nutrition.js'
import { t, useLang } from '../lib/i18n.js'
import Icon from '../components/Icon.jsx'
import { Button, NumberField, Section, SelectRow } from '../components/ui.jsx'

const OBJECTIVES = [
  ['performance', 'Improve performance'],
  ['build', 'Build muscle'],
  ['cut', 'Lose fat'],
  ['maintain', 'Maintain weight'],
  ['health', 'General health'],
]

const copy = () => ({
  title: t('Goals'), subtitle: t('One source of truth for everything you want to achieve'),
  intro: t('Set your targets here. Home, Training, Progress, Nutrition and Coach will use them automatically.'),
  primary: t('Primary goal'), body: t('Body composition'), targetWeight: t('Target weight'), noTarget: t('Not set'),
  nutrition: t('Nutrition targets'), nutritionHint: t('Applied to each diary day'), calories: t('Calories'), protein: t('Protein'),
  carbs: t('Carbs'), fat: t('Fat'), movement: t('Daily activity'), steps: t('Daily steps'), hydration: t('Hydration'),
  water: t('Daily water'), training: t('Training'), sessions: t('Planned sessions per week'), noPlan: t('No planned days yet'),
  openPlan: t('Configure plan'), coach: t('Coach uses these targets when reviewing your history.'), currentTarget: t('Current target'), unitSteps: t('steps'),
  unitWater: t('ml'), unitSessions: t('sessions'), savedIn: t('Saved to your profile and synced with your data.')
})

function GoalNumber({ label, value, unit, onChange, ariaLabel, nullable = false }) {
  return <label className="goals-number-field">
    <span>{label}</span>
    <div className="goals-number-control">
      <NumberField value={value} nullable={nullable} decimal={false} aria-label={ariaLabel || label} onChange={onChange} />
      {unit && <i>{unit}</i>}
    </div>
  </label>
}

export default function Goals() {
  useLang()
  const nav = useNavigate()
  const S = useStore(state => state.S)
  const update = useStore(state => state.update)
  const C = copy()
  const objective = S.coachProfile?.objective || 'performance'
  const nutritionGoal = { ...DEFAULT_NUTRITION_GOAL, ...(S.nutritionGoal || {}) }
  const plannedSessions = Object.values(S.week || {}).filter(Boolean).length
  const unit = S.unit || 'kg'
  const objectiveOptions = OBJECTIVES.map(([value, label]) => ({ value, label: t(label) }))
  const setNutrition = (key, value) => update(s => {
    s.nutritionGoal = { ...DEFAULT_NUTRITION_GOAL, ...(s.nutritionGoal || {}), [key]: Math.max(0, Math.round(+value || 0)) }
  })

  return <div className="narrow goals-view">
    <header className="hdr goals-header">
      <div className="row" style={{ gap: 10 }}>
        <button className="iconbtn" onClick={() => nav('/home')} aria-label={t('Back')}><Icon name="chevronLeft" /></button>
        <div><h1>{C.title}</h1><div className="sub">{C.subtitle}</div></div>
      </div>
      <span className="goals-header-mark"><Icon name="target" /></span>
    </header>

    <section className="card goals-hero">
      <div className="goals-hero-icon"><Icon name="target" /></div>
      <div><strong>{t(OBJECTIVES.find(([value]) => value === objective)?.[1] || 'Primary goal')}</strong><p>{C.intro}</p></div>
    </section>

    <Section title={C.primary} footer={C.coach}>
      <SelectRow icon="target" iconTint="var(--acc)" title={C.primary} value={objective} onChange={value => update(s => { s.coachProfile = { ...(s.coachProfile || {}), objective: value } })} options={objectiveOptions} sheetTitle={C.primary} />
    </Section>

    <Section title={C.body}>
      <div className="goals-single-card">
        <GoalNumber label={C.targetWeight} value={S.targetW} unit={unit} nullable ariaLabel={C.targetWeight} onChange={value => update(s => { s.targetW = value == null || value <= 0 ? null : Math.round(value * 10) / 10 })} />
        <span className="goals-field-hint">{S.targetW ? `${C.currentTarget || t('Current target')}: ${S.targetW} ${unit}` : C.noTarget}</span>
      </div>
    </Section>

    <Section title={C.nutrition} footer={C.nutritionHint}>
      <div className="goals-grid goals-grid-four">
        <GoalNumber label={C.calories} value={nutritionGoal.calories} unit="kcal" onChange={value => setNutrition('calories', value)} />
        <GoalNumber label={C.protein} value={nutritionGoal.protein} unit="g" onChange={value => setNutrition('protein', value)} />
        <GoalNumber label={C.carbs} value={nutritionGoal.carbs} unit="g" onChange={value => setNutrition('carbs', value)} />
        <GoalNumber label={C.fat} value={nutritionGoal.fat} unit="g" onChange={value => setNutrition('fat', value)} />
      </div>
    </Section>

    <Section title={C.movement}>
      <div className="goals-grid goals-grid-two">
        <GoalNumber label={C.steps} value={Math.max(500, Math.round(+S.stepsGoal || 10000))} unit={C.unitSteps} onChange={value => update(s => { s.stepsGoal = Math.max(500, Math.min(100000, Math.round(+value || 10000))) })} />
        <GoalNumber label={C.water} value={Math.max(250, Math.round(+S.waterGoal || 2000))} unit={C.unitWater} onChange={value => update(s => { s.waterGoal = Math.max(250, Math.min(10000, Math.round(+value || 2000))) })} />
      </div>
    </Section>

    <Section title={C.training}>
      <div className="goals-plan-row">
        <span className="lrow-i" style={{ '--tint': 'var(--blue)' }}><Icon name="calendar" /></span>
        <div><strong>{C.sessions}</strong><span>{plannedSessions ? `${plannedSessions} ${C.unitSessions}` : C.noPlan}</span></div>
        <Button size="sm" variant="tinted" onClick={() => nav('/plan')}>{C.openPlan}</Button>
      </div>
    </Section>

    <p className="goals-footnote"><Icon name="lock" /> {C.savedIn}</p>
  </div>
}
