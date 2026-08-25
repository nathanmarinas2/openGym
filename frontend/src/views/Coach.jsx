import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { todayISO } from '../lib/format.js'
import { DEFAULT_NUTRITION_GOAL, dailyTotals } from '../lib/nutrition.js'
import { useLang } from '../lib/i18n.js'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import { labels, NutritionCoach } from './Nutrition.jsx'

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
    <Button variant="plain" icon="chevronLeft" onClick={() => nav('/home')}>{C.back}</Button>
  </div>
}
