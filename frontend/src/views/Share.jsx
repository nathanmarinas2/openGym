import { useMemo } from 'react'
import { decodePlanToken, parsePlan, planPrintHTML } from '../lib/plan-share.js'
import { EXIDX } from '../lib/exercises.js'
import { fmtNum } from '../lib/format.js'
import { fmtSec } from '../lib/history.js'
import { t } from '../lib/i18n.js'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'

function printShared(bundle) {
  const S = { unit: 'kg', routines: bundle.routines, week: bundle.week }
  const ifr = document.createElement('iframe')
  ifr.setAttribute('aria-hidden', 'true')
  ifr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;'
  document.body.appendChild(ifr)
  const doc = ifr.contentWindow.document
  doc.open(); doc.write(planPrintHTML(S, bundle.name)); doc.close()
  setTimeout(() => { ifr.contentWindow?.print(); setTimeout(() => ifr.remove(), 1000) }, 120)
}

export default function Share() {
  const parsed = useMemo(() => {
    try {
      const token = new URLSearchParams(window.location.search).get('plan')
      return token ? parsePlan(decodePlanToken(token)) : null
    } catch { return null }
  }, [])

  if (!parsed) return <div className="narrow empty"><div className="ico"><Icon name="link" /></div>{t('This shared plan link is invalid or expired.')}</div>
  const custom = Object.fromEntries((parsed.customEx || []).map(e => [e.id, e]))
  return <div className="narrow">
    <div className="hdr"><div><h1>{parsed.name || t('Shared plan')}</h1><div className="sub">LiftNex · {t('read-only preview')}</div></div></div>
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="row" style={{ gap: 9 }}><span className="lrow-i"><Icon name="lock" /></span><div className="small">{t('This link contains routines only. It cannot see or change your training history.')}</div></div>
    </div>
    {(parsed.routines || []).map(r => <section className="card" key={r.id}>
      <h2 style={{ marginTop: 0 }}>{r.emoji ? `${r.emoji} ` : ''}{r.name}</h2>
      <div className="list">{(r.ex || []).map((e, i) => {
        const ex = EXIDX[e.id] || custom[e.id]
        const mode = e.mode === 'time' ? fmtSec(e.sec || 45) : `${e.sets || 1} × ${e.reps || 10}`
        const load = e.weight ? ` · ${fmtNum(e.weight)} kg` : ''
        return <div className="item" key={i}><div className="grow"><div className="tt capitalize">{ex?.n || t('Unknown exercise')}</div><div className="ss">{mode}{load}</div></div></div>
      })}</div>
    </section>)}
    <Button variant="primary" icon="download" onClick={() => printShared(parsed)}>{t('Print / Save as PDF')}</Button>
  </div>
}
