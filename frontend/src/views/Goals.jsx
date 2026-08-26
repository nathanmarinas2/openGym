import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { DEFAULT_NUTRITION_GOAL } from '../lib/nutrition.js'
import { useLang } from '../lib/i18n.js'
import Icon from '../components/Icon.jsx'
import { Button, NumberField, Section, SelectRow } from '../components/ui.jsx'

const OBJECTIVES = [
  ['performance', 'Mejorar rendimiento', 'Improve performance'],
  ['build', 'Ganar músculo', 'Build muscle'],
  ['cut', 'Perder grasa', 'Lose fat'],
  ['maintain', 'Mantener peso', 'Maintain weight'],
  ['health', 'Salud general', 'General health'],
]

const copy = es => es ? {
  title: 'Objetivos',
  subtitle: 'Una única fuente para todo lo que quieres conseguir',
  intro: 'Define aquí tus metas. Inicio, Entrenamiento, Progreso, Nutrición y Coach las utilizarán automáticamente.',
  primary: 'Objetivo principal',
  body: 'Composición corporal',
  targetWeight: 'Peso objetivo',
  noTarget: 'Sin definir',
  nutrition: 'Objetivos nutricionales',
  nutritionHint: 'Se aplican a cada día del diario',
  calories: 'Calorías', protein: 'Proteína', carbs: 'Carbohidratos', fat: 'Grasa',
  movement: 'Actividad diaria',
  steps: 'Pasos diarios',
  hydration: 'Hidratación',
  water: 'Agua diaria',
  training: 'Entrenamiento',
  sessions: 'Sesiones planificadas por semana',
  noPlan: 'Aún no hay días planificados',
  openPlan: 'Configurar plan',
  coach: 'El Coach utiliza estos objetivos para revisar tu historial.',
  unitSteps: 'pasos',
  unitWater: 'ml',
  unitSessions: 'sesiones',
  savedIn: 'Se guarda en tu perfil y se sincroniza con tus datos.',
} : {
  title: 'Goals',
  subtitle: 'One source of truth for everything you want to achieve',
  intro: 'Set your targets here. Home, Training, Progress, Nutrition and Coach will use them automatically.',
  primary: 'Primary goal',
  body: 'Body composition',
  targetWeight: 'Target weight',
  noTarget: 'Not set',
  nutrition: 'Nutrition targets',
  nutritionHint: 'Applied to each diary day',
  calories: 'Calories', protein: 'Protein', carbs: 'Carbs', fat: 'Fat',
  movement: 'Daily activity',
  steps: 'Daily steps',
  hydration: 'Hydration',
  water: 'Daily water',
  training: 'Training',
  sessions: 'Planned sessions per week',
  noPlan: 'No planned days yet',
  openPlan: 'Configure plan',
  coach: 'Coach uses these targets when reviewing your history.',
  unitSteps: 'steps',
  unitWater: 'ml',
  unitSessions: 'sessions',
  savedIn: 'Saved to your profile and synced with your data.',
}

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
  const es = S.lang === 'es'
  const C = copy(es)
  const objective = S.coachProfile?.objective || 'performance'
  const nutritionGoal = { ...DEFAULT_NUTRITION_GOAL, ...(S.nutritionGoal || {}) }
  const plannedSessions = Object.values(S.week || {}).filter(Boolean).length
  const unit = S.unit || 'kg'
  const objectiveOptions = OBJECTIVES.map(([value, spanish, english]) => ({ value, label: es ? spanish : english }))
  const setNutrition = (key, value) => update(s => {
    s.nutritionGoal = { ...DEFAULT_NUTRITION_GOAL, ...(s.nutritionGoal || {}), [key]: Math.max(0, Math.round(+value || 0)) }
  })

  return <div className="narrow goals-view">
    <header className="hdr goals-header">
      <div className="row" style={{ gap: 10 }}>
        <button className="iconbtn" onClick={() => nav('/home')} aria-label={es ? 'Volver' : 'Back'}><Icon name="chevronLeft" /></button>
        <div><h1>{C.title}</h1><div className="sub">{C.subtitle}</div></div>
      </div>
      <span className="goals-header-mark"><Icon name="target" /></span>
    </header>

    <section className="card goals-hero">
      <div className="goals-hero-icon"><Icon name="target" /></div>
      <div><strong>{OBJECTIVES.find(([value]) => value === objective)?.[es ? 1 : 2] || C.primary}</strong><p>{C.intro}</p></div>
    </section>

    <Section title={C.primary} footer={C.coach}>
      <SelectRow icon="target" iconTint="var(--acc)" title={C.primary} value={objective} onChange={value => update(s => { s.coachProfile = { ...(s.coachProfile || {}), objective: value } })} options={objectiveOptions} sheetTitle={C.primary} />
    </Section>

    <Section title={C.body}>
      <div className="goals-single-card">
        <GoalNumber label={C.targetWeight} value={S.targetW} unit={unit} nullable ariaLabel={C.targetWeight} onChange={value => update(s => { s.targetW = value == null || value <= 0 ? null : Math.round(value * 10) / 10 })} />
        <span className="goals-field-hint">{S.targetW ? `${es ? 'Meta actual' : 'Current target'}: ${S.targetW} ${unit}` : C.noTarget}</span>
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
