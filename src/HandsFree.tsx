import { useCallback, useEffect, useRef, useState } from 'react'
import { Volume2 } from 'lucide-react'
import { exampleFor, type ContextExample } from './context'
import { ContextText } from './ContextPractice'
import { hasOfflineAudio } from './listening'
import type { Word } from './model'
import { shuffle } from './shuffle'

type Clip = Pick<Word, 'hanzi' | 'audioUrl'>
type Item = { word: Word; example: ContextExample }
type Session = { endAt: number; endTimer?: number; stepTimer?: number }

export function HandsFree({ words, play, stop }: {
  words: Word[]
  play: (clip: Clip, finished: (ok: boolean) => void) => void
  stop: () => void
}) {
  const [minutes, setMinutes] = useState(5)
  const [card, setCard] = useState<(Item & { phrase: boolean }) | null>(null)
  const [message, setMessage] = useState('')
  const active = useRef<Session | null>(null)
  const cancel = useCallback(() => {
    if (!active.current) return
    window.clearTimeout(active.current.endTimer)
    window.clearTimeout(active.current.stepTimer)
    active.current = null
    stop()
  }, [stop])
  useEffect(() => cancel, [cancel])

  const playlist = words.flatMap(word => {
    const example = exampleFor(word)
    return example && hasOfflineAudio(word) ? [{ word, example }] : []
  })

  function end(text: string) {
    cancel()
    setCard(null)
    setMessage(text)
  }

  function begin() {
    if (!playlist.length || active.current) return
    const items = shuffle(playlist)
    const session: Session = { endAt: Date.now() + minutes * 60_000 }
    active.current = session
    setMessage('')
    let index = 0
    const finish = () => end('Sesión de escucha terminada.')
    const onClip = (ok: boolean, pause: number, next: () => void) => {
      if (active.current !== session) return
      if (!ok) {
        end('El audio se ha interrumpido. Pulsa «Iniciar escucha» para activarlo de nuevo.')
        return
      }
      session.stepTimer = window.setTimeout(() => {
        if (active.current !== session) return
        if (Date.now() >= session.endAt) finish()
        else next()
      }, pause)
    }
    const playWord = () => {
      const item = items[index]
      setCard({ ...item, phrase: false })
      play(item.word, ok => onClip(ok, 2500, () => {
        setCard({ ...item, phrase: true })
        play(item.example, heard => onClip(heard, 1300, () => {
          index = (index + 1) % items.length
          playWord()
        }))
      }))
    }
    session.endTimer = window.setTimeout(finish, minutes * 60_000)
    playWord()
  }

  return (
    <section className="context-practice" aria-label="Escucha manos libres">
      {card ? (
        <div className="exercise-card">
          <h3>{card.phrase ? 'En una frase' : 'Recuerda la palabra'}</h3>
          {card.phrase ? <ContextText example={card.example} word={card.word}/> : <p className="context-hanzi" lang="zh-Hans">{card.word.hanzi}</p>}
          <button className="secondary exercise-next" onClick={() => end('Sesión de escucha detenida.')}>Detener sesión</button>
        </div>
      ) : (
        <div className="exercise-start">
          <h3>Escucha manos libres</h3>
          <p>Escucha la palabra, intenta recordarla durante la pausa y oye cómo se usa en una frase. Las tarjetas se suceden solas.</p>
          <label className="duration-choice">Duración
            <select value={minutes} onChange={event => setMinutes(Number(event.target.value))}>
              <option value={2}>2 minutos</option><option value={5}>5 minutos</option><option value={10}>10 minutos</option>
            </select>
          </label>
          {message && <p role="status">{message}</p>}
          {!playlist.length && <p role="status">Elige un tema o nivel con tarjetas que tengan frase y audio.</p>}
          <button className="primary" disabled={!playlist.length} onClick={begin}><Volume2 size={18}/> Iniciar escucha</button>
        </div>
      )}
    </section>
  )
}
