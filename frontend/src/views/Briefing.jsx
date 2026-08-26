import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { t, useLang } from '../lib/i18n.js'
import { todayISO } from '../lib/format.js'
import { buildDailyBriefing } from '../lib/briefing.js'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'

const copy = () => ({
  title: t('Daily briefing'), subtitle: t('One view for today’s training, fuel and recovery.'), training: t('Training today'),
  planned: t('Planned'), completed: t('Completed'), rest: t('Rest day'), volume: t('Volume'), sets: t('sets'), effort: t('Effort'),
  rests: t('Rest'), activity: t('Activity today'), steps: t('Steps'), gym: t('Gym'), activeCalories: t('Active calories'),
  estimated: t('Estimated'), noSteps: t('No steps logged'), noActivity: t('No activity logged'), nutrition: t('Fuel remaining'),
  calories: t('Calories'), protein: t('Protein'), hydration: t('Hydration'), fasting: t('Fasting'), active: t('Active'),
  inactive: t('Not active'), body: t('Body trend'), noWeight: t('No weight logged'), recommendation: t('One useful next step'),
  openWorkout: t('Open workout'), openNutrition: t('Open nutrition'), openProgress: t('Review progress'), openCoach: t('Review coach'),
  logWater: t('Log water'), back: t('Home'), noPlan: t('No session planned')
})

const nice = value => Number.isFinite(+value) ? Math.round(+value * 10) / 10 : 0

export default function Briefing() {
  useLang()
  const nav = useNavigate()
  const S = useStore(state => state.S)
  const C = copy()
  const briefing = buildDailyBriefing(S, todayISO())
  const { workout, activity, nutrition, hydration, fasting, weight, recommendation } = briefing
  const action = recommendation.type === 'training' ? () => nav('/workout') : recommendation.type === 'hydration' ? () => nav('/nutrition') : recommendation.type === 'nutrition' ? () => nav('/nutrition') : recommendation.type === 'recovery' ? () => nav('/stats') : recommendation.type === 'consistency' ? () => nav('/coach') : () => nav('/stats')
  return <div className="narrow briefing-view">
    <div className="hdr"><div className="row" style={{ gap: 10 }}><button className="iconbtn" onClick={() => nav('/home')} aria-label={C.back}><Icon name="chevronLeft" /></button><div><h1>{C.title}</h1><div className="sub">{C.subtitle}</div></div></div><Icon name="sparkles" className="nutrition-head-icon" /></div>
    <section className={`card briefing-recommendation ${recommendation.tone}`}><div className="small muted">{C.recommendation}</div><div className="row" style={{ gap: 10, alignItems: 'flex-start', marginTop: 7 }}><Icon name="sparkles" /><div style={{ minWidth: 0, flex: 1 }}><h2>{t(recommendation.title)}</h2><p>{recommendation.detailKey ? t(recommendation.detailKey, ...(recommendation.detailArgs || [])) : t(recommendation.detail)}</p></div></div><Button size="sm" variant="tinted" onClick={action}>{recommendation.action === 'Open workout' ? C.openWorkout : recommendation.action === 'Log water' ? C.logWater : recommendation.action === 'Open nutrition' ? C.openNutrition : recommendation.action === 'Review progress' ? C.openProgress : C.openCoach}</Button></section>
    <section className="card briefing-section"><div className="row between"><h2>{C.training}</h2><Icon name="dumbbell" className="nutrition-card-icon" /></div><div className="briefing-primary-value">{workout.name || (workout.planned ? workout.plannedName : C.rest)}</div><div className="briefing-status"><span className={workout.completed ? 'good' : workout.planned ? 'pending' : 'muted'}>{workout.completed ? C.completed : workout.planned ? C.planned : C.noPlan}</span>{workout.exercises > 0 && <span>{t('{0} exercises', workout.exercises)} · {workout.sets} {C.sets}</span>}</div><div className="briefing-metric-grid"><div><span>{C.volume}</span><strong>{nice(workout.volume)}</strong></div><div><span>{C.effort}</span><strong>{workout.averageRir != null ? `${nice(workout.averageRir)} RIR` : workout.averageRpe != null ? `${nice(workout.averageRpe)} RPE` : '—'}</strong></div><div><span>{C.rests}</span><strong>{workout.averageRestSec != null ? `${nice(workout.averageRestSec)}s` : '—'}</strong></div></div></section>
    <section className="card briefing-section"><div className="row between"><h2>{C.activity}</h2><Icon name="footprints" className="nutrition-card-icon" /></div><div className="briefing-metric-grid"><div><span>{C.steps}</span><strong>{activity.steps == null ? '—' : `${activity.steps.toLocaleString()} / ${activity.stepsGoal.toLocaleString()}`}</strong></div><div><span>{C.gym}</span><strong>{activity.workoutCalories == null ? '—' : `≈ ${nice(activity.workoutCalories)} kcal`}</strong></div><div><span>{C.activeCalories}</span><strong>{activity.activeCalories == null ? '—' : `≈ ${nice(activity.activeCalories)} kcal`}</strong></div></div><div className="briefing-status"><span>{activity.stepsCalories == null ? C.noSteps : `≈ ${nice(activity.stepsCalories)} kcal ${C.steps.toLowerCase()}`}</span><span>{activity.activeCaloriesSource === 'device' ? t('Health data') : activity.activeCalories == null ? C.noActivity : C.estimated}</span></div></section>
    <section className="card briefing-section"><div className="row between"><h2>{C.nutrition}</h2><Icon name="plate" className="nutrition-card-icon" /></div><div className="briefing-metric-grid"><div><span>{C.calories}</span><strong>{nice(nutrition.remaining.calories)} kcal</strong></div><div><span>{C.protein}</span><strong>{nice(nutrition.remaining.protein)} g</strong></div><div><span>{C.hydration}</span><strong>{nice(hydration.remaining)} ml</strong></div></div><div className="briefing-status"><span>{nice(nutrition.totals.calories)} / {nice(nutrition.effectiveCaloriesGoal)} kcal</span><span>{nice(hydration.water)} / {nice(hydration.goal)} ml</span><span>{fasting.active ? C.active : C.inactive} · {C.fasting}</span></div></section>
    <section className="card briefing-section"><div className="row between"><h2>{C.body}</h2><Icon name="chartLine" className="nutrition-card-icon" /></div>{weight.current != null ? <><div className="briefing-primary-value">{nice(weight.current)} {weight.unit}</div><div className="briefing-status"><span>{weight.trend == null ? '—' : `${weight.trend > 0 ? '+' : ''}${nice(weight.trend)} ${weight.unit} · 7 ${t('logs')}`}</span>{weight.target && <span>{nice(Math.abs(weight.target - weight.current))} {weight.unit} {t('to target')}</span>}</div></> : <p className="muted small">{C.noWeight}</p>}</section>
    <Button variant="plain" icon="chevronLeft" onClick={() => nav('/home')}>{C.back}</Button>
  </div>
}
