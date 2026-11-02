import { useEffect, useState } from 'react'
import { ArrowRight, Headphones, Volume2 } from 'lucide-react'
import { makeToneQuestion, makeWordQuestion, type ListeningKind, type ListeningQuestion } from './listening'
import type { Word } from './model'

type Props = { words: Word[]; play: (word: Word) => void; stop: () => void; autoplay: boolean }
const tones = [
  { value: 1, label: '1.º tono', hint: 'alto y sostenido', symbol: 'ˉ' },
  { value: 2, label: '2.º tono', hint: 'ascendente', symbol: 'ˊ' },
  { value: 3, label: '3.º tono', hint: 'baja y sube', symbol: 'ˇ' },
  { value: 4, label: '4.º tono', hint: 'descendente', symbol: 'ˋ' },
]

export function ListeningExercise({ words, play, stop, autoplay }: Props) {
  const [kind, setKind] = useState<ListeningKind>('words')
  const [question, setQuestion] = useState<ListeningQuestion | null>(null)
  const [selected, setSelected] = useState<string | number | null>(null)
  const [round, setRound] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [message, setMessage] = useState('')
  useEffect(() => { stop(); setQuestion(null); setSelected(null); setRound(0); setCorrectCount(0); setMessage('') }, [words, stop])
  useEffect(() => () => stop(), [stop])

  const createQuestion = (previous?: string) => kind === 'words' ? makeWordQuestion(words, previous) : makeToneQuestion(words, previous)
  const begin = (isFirst: boolean) => {
    const next = createQuestion(question?.target.id)
    if (!next) { setMessage(kind === 'tones' ? 'No hay suficientes pares de tonos con estos filtros. Amplía el tema, el nivel, el tipo o el estado.' : 'Necesitas al menos dos pronunciaciones distintas con audio incluido. Prueba con otros filtros.'); return }
    setQuestion(next); setSelected(null); setMessage(''); setRound(isFirst ? 1 : round + 1)
    if (isFirst) setCorrectCount(0)
    if (isFirst || autoplay) play(next.target); else stop()
  }
  const choose = (value: string | number) => {
    if (!question || selected !== null) return
    setSelected(value)
    const correct = question.kind === 'words' ? value === question.target.id : value === question.tone
    if (correct) setCorrectCount(count => count + 1)
  }
  const changeKind = (next: ListeningKind) => { stop(); setKind(next); setQuestion(null); setSelected(null); setRound(0); setCorrectCount(0); setMessage('') }
  const correct = question && selected !== null && (question.kind === 'words' ? selected === question.target.id : selected === question.tone)

  return <section className="listening-exercise" aria-label="Entrenar el oído">
    <div className="section-heading"><div><span className="eyebrow">UNA COSA CADA VEZ</span><h2>Entrena tu oído</h2></div></div>
    <div className="exercise-tabs" aria-label="Tipo de ejercicio"><button aria-pressed={kind === 'words'} onClick={() => changeKind('words')}>Reconocer palabras</button><button aria-pressed={kind === 'tones'} onClick={() => changeKind('tones')}>Distinguir tonos</button></div>
    <p className="exercise-intro">{kind === 'words' ? 'Escucha y elige los caracteres que corresponden al sonido.' : 'Escucha una sílaba y elige el tono que oyes. Los ejemplos contrastan tonos de la misma sílaba.'}</p>
    {!question ? <div className="exercise-start"><div className="empty-icon"><Headphones size={23}/></div><h3>Cuando quieras.</h3><p>Practica a tu ritmo. Estos ejercicios no cambian tus repasos programados.</p><button className="primary" onClick={() => begin(true)}>Empezar y activar audio <ArrowRight size={17}/></button></div> : <div className="exercise-card">
      <div className="exercise-top"><span>RONDA {round}</span><span>{correctCount} aciertos</span></div>
      <h3>{question.kind === 'words' ? '¿Qué palabra has escuchado?' : <>¿Qué tono escuchas en <strong>{question.syllable}</strong>?</>}</h3>
      <button className="listen exercise-listen" onClick={() => play(question.target)}><Volume2 size={19}/> Escuchar audio</button>
      <div className="exercise-choices" role="group" aria-label={question.kind === 'words' ? 'Elige una palabra' : 'Elige un tono'}>
        {question.kind === 'words' ? question.choices.map(word => <button key={word.id} lang="zh-Hans" disabled={selected !== null} className={selected !== null && word.id === question.target.id ? 'answer-correct' : selected === word.id ? 'answer-incorrect' : ''} onClick={() => choose(word.id)}>{word.hanzi}</button>) : tones.map(tone => <button key={tone.value} disabled={selected !== null} className={selected !== null && tone.value === question.tone ? 'answer-correct' : selected === tone.value ? 'answer-incorrect' : ''} onClick={() => choose(tone.value)}><span className="tone-symbol" aria-hidden="true">{tone.symbol}</span><strong>{tone.label}</strong><small>{tone.hint}</small></button>)}
      </div>
      {selected !== null && <div className={`exercise-feedback ${correct ? 'right' : 'try-again'}`} role="status"><strong>{correct ? '¡Bien escuchado!' : 'Casi. La respuesta es:'}</strong><p><span lang="zh-Hans">{question.target.hanzi}</span> · {question.target.pinyin} · {question.target.meaning}{question.kind === 'tones' && <> · {question.tone}.º tono</>}</p></div>}
      {selected !== null && <button className="primary exercise-next" onClick={() => begin(false)}>Siguiente sonido <ArrowRight size={17}/></button>}
      <p className="exercise-note">Puedes repetir el audio. La sesión no modifica el repaso FSRS.</p>
    </div>}
    {message && <p className="exercise-message" role="status">{message}</p>}
  </section>
}
