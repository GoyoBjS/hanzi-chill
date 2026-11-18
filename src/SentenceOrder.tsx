import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Volume2 } from 'lucide-react'
import type { ContextExample } from './context'
import { ContextText } from './ContextPractice'
import type { Snapshot, Word } from './model'
import { isExampleOrder, orderPrompts, orderRound, roundLength, type OrderQuestion, type Tile } from './ordering'

type Props = {
  words: Word[]
  data: Pick<Snapshot, 'progress' | 'learned'>
  autoplay: boolean
  play: (example: ContextExample) => void
  stop: () => void
  study: () => void
}

export function SentenceOrder({ words, data, autoplay, play, stop, study }: Props) {
  const prompts = useMemo(() => orderPrompts(words, data), [words, data])
  const [round, setRound] = useState<OrderQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [solved, setSolved] = useState(0)
  const summary = useRef<HTMLHeadingElement>(null)
  const complete = round.length > 0 && index === round.length
  useEffect(() => () => stop(), [stop])
  useEffect(() => {
    if (complete) summary.current?.focus()
  }, [complete])

  function start() {
    setRound(orderRound(prompts))
    setIndex(0)
    setSolved(0)
  }

  function advance(correct: boolean) {
    if (correct) setSolved(count => count + 1)
    setIndex(step => step + 1)
    stop()
  }

  return (
    <section className="context-practice" aria-label="Ordena la frase">
      {round[index] ? (
        <OrderingStep key={index} question={round[index]} number={index + 1} autoplay={autoplay} play={play} next={advance}/>
      ) : (
        <div className="exercise-start order-start">
          {complete ? <>
            <h3 ref={summary} tabIndex={-1}>Ronda terminada</h3>
            <p className="order-score"><strong>{solved} de {roundLength}</strong> frases resueltas</p>
          </> : <>
            <h3>Ordena la frase</h3>
            <p>Lee la traducción y toca las piezas para reconstruir cinco frases de tarjetas que ya has repasado o marcado como aprendidas.</p>
          </>}
          {prompts.length ? (
            <button className="primary" onClick={start}>{complete ? 'Otra ronda' : 'Empezar ronda'} <ArrowRight size={17}/></button>
          ) : <>
            <p className="exercise-message">Repasa una tarjeta con frase para empezar o amplía los filtros.</p>
            <button className="primary" onClick={study}>Ir a repasar <ArrowRight size={17}/></button>
          </>}
        </div>
      )}
    </section>
  )
}

function OrderingStep({ question, number, autoplay, play, next }: {
  question: OrderQuestion
  number: number
  autoplay: boolean
  play: (example: ContextExample) => void
  next: (correct: boolean) => void
}) {
  const [answer, setAnswer] = useState<Tile[]>([])
  const [feedback, setFeedback] = useState<'retry' | 'correct' | 'solution' | null>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const result = useRef<HTMLDivElement>(null)
  const bank = useRef<HTMLDivElement>(null)
  const revealed = feedback === 'correct' || feedback === 'solution'
  const placed = new Set(answer.map(tile => tile.id))

  useEffect(() => { title.current?.focus() }, [])
  useEffect(() => {
    if (revealed) result.current?.focus()
  }, [revealed])

  function place(tile: Tile) {
    if (placed.has(tile.id)) return
    setAnswer([...answer, tile])
    setFeedback(null)
  }

  function remove(tile: Tile) {
    setAnswer(answer.filter(item => item.id !== tile.id))
    setFeedback(null)
    bank.current?.querySelector<HTMLButtonElement>(`[data-tile="${tile.id}"]`)?.focus()
  }

  function reveal(status: 'correct' | 'solution') {
    setFeedback(status)
    if (autoplay) play(question.example)
  }

  function check() {
    if (isExampleOrder(answer, question.parts)) reveal('correct')
    else setFeedback('retry')
  }

  return (
    <div className="exercise-card order-card">
      <p className="order-count">Frase {number} de {roundLength}</p>
      <h3 ref={title} tabIndex={-1}>{question.example.meaning}</h3>
      {revealed ? <>
        <div ref={result} tabIndex={-1} className="exercise-feedback" role="status">
          <strong>{feedback === 'correct' ? '¡Orden correcto!' : 'Orden del ejemplo'}</strong>
          <ContextText example={question.example} word={question.word}/>
        </div>
        <button className="listen exercise-listen context-replay" onClick={() => play(question.example)}>
          <Volume2 size={18}/> Escuchar frase
        </button>
        <button className="primary exercise-next" onClick={() => next(feedback === 'correct')}>
          {number === roundLength ? 'Ver resultado' : 'Siguiente frase'} <ArrowRight size={17}/>
        </button>
      </> : <>
        <button className="listen exercise-listen" onClick={() => play(question.example)}><Volume2 size={18}/> Pista de audio</button>
        <div className="order-answer" role="group" aria-label="Tu respuesta">
          {!answer.length && <span>Coloca aquí las piezas</span>}
          {answer.map(tile => (
            <button type="button" className="order-piece" key={tile.id} aria-label={`Quitar ${tile.text}`} onClick={() => remove(tile)}>
              <span lang="zh-Hans">{tile.text}</span>
            </button>
          ))}
        </div>
        <div ref={bank} className="order-bank" role="group" aria-label="Piezas desordenadas">
          {question.tiles.map(tile => (
            <button type="button" className="order-piece" key={tile.id} data-tile={tile.id} lang="zh-Hans"
              aria-disabled={placed.has(tile.id)} tabIndex={placed.has(tile.id) ? -1 : 0} onClick={() => place(tile)}>
              {tile.text}
            </button>
          ))}
        </div>
        {feedback === 'retry' && <p className="exercise-message" role="status">El orden aún no coincide con el audio del ejemplo. Puedes quitar piezas de tu respuesta y probar otra vez.</p>}
        <div className="actions">
          <button className="secondary" onClick={() => reveal('solution')}>Ver solución</button>
          <button className="primary" disabled={answer.length !== question.tiles.length} onClick={check}>Comprobar</button>
        </div>
      </>}
    </div>
  )
}
