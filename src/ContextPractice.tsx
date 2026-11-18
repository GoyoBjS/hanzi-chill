import { useEffect, useState } from 'react'
import { ArrowRight, Volume2 } from 'lucide-react'
import { contextQuestion, splitExample, type ContextExample } from './context'
import type { Word } from './model'

export function ContextText({ example, word }: { example: ContextExample; word: Word }) {
  const parts = splitExample(example, word)
  return (
    <>
      <p className="context-hanzi" lang="zh-Hans">
        {parts ? <>{parts[0]}<mark>{word.hanzi}</mark>{parts[1]}</> : example.hanzi}
      </p>
      <p className="context-pinyin">{example.pinyin}</p>
      <p className="context-meaning">{example.meaning}</p>
    </>
  )
}

type Props = {
  words: Word[]
  blank: boolean
  autoplay: boolean
  play: (example: ContextExample) => void
  stop: () => void
}

export function ContextPractice({ words, blank, autoplay, play, stop }: Props) {
  const [question, setQuestion] = useState<ReturnType<typeof contextQuestion>>()
  const [selected, setSelected] = useState<string | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  useEffect(() => () => stop(), [stop])
  const revealed = selected !== null
  const parts = question && splitExample(question.example, question.word)

  function next() {
    stop()
    const previous = blank ? question?.word.id : question?.example.id
    const item = contextQuestion(words, blank, previous)
    setQuestion(item)
    setSelected(null)
    setUnavailable(!item)
    if (item && !blank && (!question || autoplay)) play(item.example)
  }

  return (
    <section className="context-practice" aria-label={blank ? 'Completar frase' : 'Oír frase'}>
      {question ? (
        <div className="exercise-card">
          <h3>{blank ? '¿Qué palabra falta?' : 'Escucha la frase'}</h3>
          {!blank && <button className="listen exercise-listen" onClick={() => play(question.example)}>
            <Volume2 size={18}/> Escuchar frase
          </button>}
          {blank && !revealed && parts && <>
            <p className="context-hanzi" lang="zh-Hans">{parts[0]}<span className="context-blank" aria-label="palabra que falta">____</span>{parts[1]}</p>
            <p className="context-meaning">{question.example.meaning}</p>
            <div className="exercise-choices" role="group" aria-label="Elige la palabra que falta">
              {question.choices.map(word => <button key={word.id} lang="zh-Hans" onClick={() => setSelected(word.id)}>{word.hanzi}</button>)}
            </div>
          </>}
          {!blank && !revealed && <button className="secondary exercise-next" onClick={() => setSelected(question.word.id)}>Mostrar texto</button>}
          {revealed && <>
            <div className={selected === question.word.id ? 'exercise-feedback right' : 'exercise-feedback try-again'} role="status">
              {blank && <strong>{selected === question.word.id ? '¡Correcto!' : 'La frase completa'}</strong>}
              <ContextText example={question.example} word={question.word}/>
            </div>
            {blank && <button className="listen exercise-listen context-replay" onClick={() => play(question.example)}>
              <Volume2 size={18}/> Escuchar frase
            </button>}
            <button className="primary exercise-next" onClick={next}>Siguiente frase <ArrowRight size={17}/></button>
          </>}
        </div>
      ) : (
        <div className="exercise-start">
          <h3>{blank ? 'Completa una frase' : 'Escucha antes de leer'}</h3>
          <p>{blank ? 'Usa la traducción para elegir la palabra que falta.' : 'Intenta entender el audio y revela después el texto, el pinyin y la traducción.'}</p>
          {unavailable && <p role="status" className="exercise-message">Hay pocos ejemplos con estos filtros. Prueba con otro tema o nivel.</p>}
          <button className="primary" onClick={next}>{blank ? 'Empezar ejercicio' : 'Empezar y activar audio'}</button>
        </div>
      )}
    </section>
  )
}
