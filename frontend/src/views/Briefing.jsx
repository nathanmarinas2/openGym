import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { getLang, useLang } from '../lib/i18n.js'
import { todayISO } from '../lib/format.js'
import { buildDailyBriefing } from '../lib/briefing.js'
import Icon from '../components/Icon.jsx'
import { Button, NumberField } from '../components/ui.jsx'

const COPY = {
  en: {
    title: 'Daily briefing', subtitle: 'One view for today’s training, fuel and recovery.', training: 'Training today', planned: 'Planned', completed: 'Completed', rest: 'Rest day', volume: 'Volume', sets: 'sets', effort: 'Effort', rests: 'Rest', nutrition: 'Fuel remaining', calories: 'Calories', protein: 'Protein', hydration: 'Hydration', fasting: 'Fasting', steps: 'Steps', stepsGoal: 'Daily movement goal', active: 'Active', inactive: 'Not active', body: 'Body trend', noWeight: 'No weight logged', recommendation: 'One useful next step', openWorkout: 'Open workout', openNutrition: 'Open nutrition', openProgress: 'Review progress', openCoach: 'Review coach', logWater: 'Log water', back: 'Home', noPlan: 'No session planned' },
  es: {
    title: 'Resumen diario', subtitle: 'Una vista para el entrenamiento, la nutrición y la recuperación de hoy.', training: 'Entrenamiento de hoy', planned: 'Planificado', completed: 'Completado', rest: 'Día de descanso', volume: 'Volumen', sets: 'series', effort: 'Esfuerzo', rests: 'Descanso', nutrition: 'Combustible restante', calories: 'Calorías', protein: 'Proteína', hydration: 'Hidratación', fasting: 'Ayuno', steps: 'Pasos', stepsGoal: 'Objetivo diario de movimiento', active: 'Activo', inactive: 'No activo', body: 'Tendencia corporal', noWeight: 'No hay peso registrado', recommendation: 'Siguiente paso útil', openWorkout: 'Abrir entrenamiento', openNutrition: 'Abrir nutrición', openProgress: 'Ver progreso', openCoach: 'Ver coach', logWater: 'Registrar agua', back: 'Inicio', noPlan: 'No hay sesión planificada' }
}

const nice = value => Number.isFinite(+value) ? Math.round(+value * 10) / 10 : 0

export default function Briefing() {
  useLang()
  const nav = useNavigate()
  const S = useStore(state => state.S)
  const update = useStore(state => state.update)
  const C = COPY[getLang() === 'es' ? 'es' : 'en']
  const briefing = buildDailyBriefing(S, todayISO())
  const { workout, nutrition, hydration, fasting, steps, weight, recommendation } = briefing
  const setSteps = value => update(s => {
    const date = todayISO()
    const rows = [...(s.healthMetrics || [])]
    const index = rows.findIndex(item => item.d === date)
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
  const action = recommendation.type === 'training' ? () => nav('/workout') : recommendation.type === 'hydration' ? () => nav('/nutrition') : recommendation.type === 'nutrition' ? () => nav('/nutrition') : recommendation.type === 'recovery' ? () => nav('/stats') : recommendation.type === 'consistency' ? () => nav('/coach') : () => nav('/stats')
  return <div className="narrow briefing-view">
    <div className="hdr"><div className="row" style={{ gap: 10 }}><button className="iconbtn" onClick={() => nav('/home')} aria-label={C.back}><Icon name="chevronLeft" /></button><div><h1>{C.title}</h1><div className="sub">{C.subtitle}</div></div></div><Icon name="sparkles" className="nutrition-head-icon" /></div>
    <section className={`card briefing-recommendation ${recommendation.tone}`}><div className="small muted">{C.recommendation}</div><div className="row" style={{ gap: 10, alignItems: 'flex-start', marginTop: 7 }}><Icon name="sparkles" /><div style={{ minWidth: 0, flex: 1 }}><h2>{recommendation.title}</h2><p>{recommendation.detail}</p></div></div><Button size="sm" variant="tinted" onClick={action}>{recommendation.action === 'Open workout' ? C.openWorkout : recommendation.action === 'Log water' ? C.logWater : recommendation.action === 'Open nutrition' ? C.openNutrition : recommendation.action === 'Review progress' ? C.openProgress : C.openCoach}</Button></section>
    <section className="card briefing-section"><div className="row between"><h2>{C.training}</h2><Icon name="dumbbell" className="nutrition-card-icon" /></div><div className="briefing-primary-value">{workout.name || (workout.planned ? workout.plannedName : C.rest)}</div><div className="briefing-status"><span className={workout.completed ? 'good' : workout.planned ? 'pending' : 'muted'}>{workout.completed ? C.completed : workout.planned ? C.planned : C.noPlan}</span>{workout.exercises > 0 && <span>{workout.exercises} exercises · {workout.sets} {C.sets}</span>}</div><div className="briefing-metric-grid"><div><span>{C.volume}</span><strong>{nice(workout.volume)}</strong></div><div><span>{C.effort}</span><strong>{workout.averageRir != null ? `${nice(workout.averageRir)} RIR` : workout.averageRpe != null ? `${nice(workout.averageRpe)} RPE` : '—'}</strong></div><div><span>{C.rests}</span><strong>{workout.averageRestSec != null ? `${nice(workout.averageRestSec)}s` : '—'}</strong></div></div></section>
    <section className="card briefing-section"><div className="row between"><h2>{C.nutrition}</h2><Icon name="plate" className="nutrition-card-icon" /></div><div className="briefing-metric-grid"><div><span>{C.calories}</span><strong>{nice(nutrition.remaining.calories)} kcal</strong></div><div><span>{C.protein}</span><strong>{nice(nutrition.remaining.protein)} g</strong></div><div><span>{C.hydration}</span><strong>{nice(hydration.remaining)} ml</strong></div></div><div className="briefing-status"><span>{nice(nutrition.totals.calories)} / {nice(nutrition.goal.calories)} kcal</span><span>{nice(hydration.water)} / {nice(hydration.goal)} ml</span><span>{fasting.active ? C.active : C.inactive} · {C.fasting}</span></div></section>
    <section className="card briefing-section"><div className="row between"><h2>{C.body}</h2><Icon name="chartLine" className="nutrition-card-icon" /></div>{weight.current != null ? <><div className="briefing-primary-value">{nice(weight.current)} {weight.unit}</div><div className="briefing-status"><span>{weight.trend == null ? '—' : `${weight.trend > 0 ? '+' : ''}${nice(weight.trend)} ${weight.unit} · 7 logs`}</span>{weight.target && <span>{nice(Math.abs(weight.target - weight.current))} {weight.unit} to target</span>}</div></> : <p className="muted small">{C.noWeight}</p>}</section>
    <section className="card briefing-section"><div className="row between"><h2>{C.steps}</h2><Icon name="figureRun" className="nutrition-card-icon" /></div><div className="row between" style={{ alignItems: 'baseline', gap: 12 }}><div className="briefing-primary-value">{steps.steps == null ? '—' : steps.steps.toLocaleString()}</div><label className="briefing-steps-input"><span>{C.stepsGoal}</span><NumberField value={steps.goal} decimal={false} aria-label={C.stepsGoal} onChange={value => update(s => { s.stepsGoal = Math.max(500, Math.min(100000, Math.round(value || 10000))) })} /></label></div><div className="nutrition-track"><span style={{ width: `${steps.goal ? Math.min(100, (steps.steps || 0) / steps.goal * 100) : 0}%`, background: 'var(--blue)' }} /></div><div className="briefing-steps-log"><span className="small muted">{steps.steps == null ? '0' : steps.steps.toLocaleString()} / {steps.goal.toLocaleString()}</span><label><span>{C.steps}</span><NumberField nullable value={steps.steps ?? null} decimal={false} aria-label={C.steps} onChange={setSteps} /></label></div></section>
    <Button variant="plain" icon="chevronLeft" onClick={() => nav('/home')}>{C.back}</Button>
  </div>
}
