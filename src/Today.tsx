import { ArrowRight } from 'lucide-react'
import { stats, weekHistory, type Snapshot } from './model'

const dayLabel = new Intl.DateTimeFormat('es', { weekday: 'short' })
const fullDayLabel = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' })

export function Today({ data, now, start, explore, reminder, orderSentence }: {
  data: Snapshot
  now: Date
  start: () => void
  explore: () => void
  reminder: (opener: HTMLButtonElement) => void
  orderSentence: () => void
}) {
  const { due, newLeft } = stats(data, now)
  const { days, difficult } = weekHistory(data, now)
  const hasWork = due + newLeft > 0
  return (
    <section className="today" aria-labelledby="today-title">
      <div className="today-card">
        <h1 id="today-title">Hoy</h1>
        <p><strong>{due}</strong> pendientes <span aria-hidden="true">·</span> <strong>{newLeft}</strong> nuevas</p>
        {!hasWork && <p>Por hoy está bien. Puedes seguir explorando.</p>}
        <div className="today-actions">
          <button className="primary" onClick={hasWork ? start : explore}>
            {hasWork ? 'Empezar repaso' : 'Explorar tarjetas'} <ArrowRight size={17}/>
          </button>
          <button className="secondary" onClick={event => reminder(event.currentTarget)}>Recordatorio diario</button>
          <button className="secondary" onClick={orderSentence}>Ordena la frase</button>
        </div>
      </div>
      <div className="weekly-history">
        <h2>Últimos siete días</h2>
        <ul className="week-days" aria-label="Repasos por día">
          {days.map(({ date, count }, index) => (
            <li key={date.toDateString()} title={fullDayLabel.format(date)}>
              <span>{index === 6 ? 'Hoy' : dayLabel.format(date)}</span>
              <strong>{count}</strong>
            </li>
          ))}
        </ul>
        {difficult.length > 0 && <>
          <h3>Palabras que más cuestan</h3>
          <ul className="difficult-words">
            {difficult.map(({ word, count }) => (
              <li key={word.id}>
                <span><strong lang="zh-Hans">{word.hanzi}</strong> · {word.pinyin} · {word.meaning}</span>
                <small>{count} × «Otra vez»</small>
              </li>
            ))}
          </ul>
        </>}
      </div>
    </section>
  )
}
