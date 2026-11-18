import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Volume2, VolumeX, ArrowRight, ArrowLeft, Settings2, Headphones, BookOpen, RotateCcw, Upload, Download, Check, Sparkles, CalendarDays } from 'lucide-react'
import { liveQuery } from 'dexie'
import { Rating } from 'ts-fsrs'
import extraCsv from '../data/vocabulario_chino_extra.csv?raw'
import { ListeningExercise } from './ListeningExercise'
import { ContextPractice, ContextText } from './ContextPractice'
import { HandsFree } from './HandsFree'
import { Today } from './Today'
import { exampleFor } from './context'
import { reminderCalendar } from './reminder'
import { belongsToTopic, topics } from './topics'
import { eligible, initial, load, offlineAudioUrls, parseVocabulary, rate, restore, shuffleIds, stats, toggleLearned, undoRating, updateSnapshot, type ReviewUndo, type Settings, type Snapshot, type Word } from './model'
import './style.css'

type Mode = 'today' | 'study' | 'explore' | 'listen'
type Practice = 'sounds' | 'cloze' | 'sentence' | 'handsfree'
type Clip = Pick<Word, 'hanzi' | 'audioUrl'>
type Confirmation = ReviewUndo & { word: Word; due: Date }
const audioPath = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
const reviewTime = new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' })

function download(content: string, mimeType: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function App() {
  const [data, setData] = useState<Snapshot | null>(null)
  const [ready, setReady] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [mode, setMode] = useState<Mode>('today')
  const [practice, setPractice] = useState<Practice>('sounds')
  const [index, setIndex] = useState(0)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [lastReview, setLastReview] = useState<Confirmation | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [level, setLevel] = useState('all')
  const [category, setCategory] = useState('all')
  const [topic, setTopic] = useState('all')
  const [learnedFilter, setLearnedFilter] = useState('all')
  const [randomOrder, setRandomOrder] = useState<string[] | null>(null)
  const [listenFirst, setListenFirst] = useState(false)
  const [onlyExamples, setOnlyExamples] = useState(false)
  const [offlineProgress, setOfflineProgress] = useState<{ count: number; ready: boolean } | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)
  const serial = useRef(0)
  const csvInput = useRef<HTMLInputElement>(null)
  const jsonInput = useRef<HTMLInputElement>(null)
  const reminderForm = useRef<HTMLFormElement>(null)
  useEffect(() => {
    const subscription = liveQuery(load).subscribe({
      next: snapshot => { setData(snapshot); setReady(true) },
      error: () => {
        setReady(false)
        setError('No se puede abrir el almacenamiento. Comprueba los permisos del navegador y vuelve a cargar.')
        setData(current => current ?? initial())
      },
    })
    return () => subscription.unsubscribe()
  }, [])
  useEffect(() => {
    const refresh = () => setNow(new Date())
    const timer = window.setInterval(refresh, 15_000)
    window.addEventListener('focus', refresh)
    window.addEventListener('pageshow', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('pageshow', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('caches' in window)) return
    let alive = true
    const expected = new Set(offlineAudioUrls.map(path => new URL(audioPath(path), location.href).pathname))
    const check = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration()
        const names = (await caches.keys()).filter(name => name.startsWith('workbox-precache-'))
        const found = new Set<string>()
        for (const name of names) for (const request of await (await caches.open(name)).keys()) { const path = new URL(request.url).pathname; if (expected.has(path)) found.add(path) }
        const ready = found.size === expected.size && !!registration?.active && !registration.installing
        if (alive) { setOfflineProgress({ count: found.size, ready }); if (ready) window.clearInterval(timer) }
      } catch { if (alive) setOfflineProgress(null) }
    }
    void check()
    const timer = window.setInterval(() => void check(), 3000)
    return () => { alive = false; window.clearInterval(timer) }
  }, [])
  const persist = async (change: (snapshot: Snapshot) => Snapshot) => {
    try {
      await updateSnapshot(change)
      setError('')
      return true
    } catch (exception) {
      const detail = exception instanceof Error ? exception.message : ''
      setError('No se pudo guardar el cambio. ' + detail)
      return false
    }
  }
  const words = data?.cards ?? []
  const learnedIds = new Set(data?.learned ?? [])
  const matches = (word: Word) => (level === 'all' || (level === 'other' ? !word.hskLevel : word.hskLevel === Number(level))) && (category === 'all' || word.categories?.includes(category)) && belongsToTopic(word, topic) && (!onlyExamples || !!exampleFor(word))
  const matchesState = (word: Word) => learnedFilter === 'all' || (learnedFilter === 'seen' ? !!data?.progress[word.id] || learnedIds.has(word.id) : (learnedFilter === 'learned') === learnedIds.has(word.id))
  const exerciseWords = useMemo(() => words.filter(word => matches(word) && matchesState(word)), [words, level, category, topic, learnedFilter, onlyExamples, data?.learned, data?.progress])
  const available = data ? eligible(data, now).filter(matches) : []
  const exploreWords = words.filter(word => matches(word) && matchesState(word))
  if (randomOrder) { const order = new Map(randomOrder.map((id, i) => [id, i])); exploreWords.sort((a, b) => (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity)) }
  const current = mode === 'explore' ? exploreWords[index % (exploreWords.length || 1)] : mode === 'study' ? available.find(c => c.id === currentId) ?? available[0] : undefined
  const example = current && exampleFor(current)
  const stop = useCallback(() => {
    serial.current++
    const player = audio.current
    if (player) {
      player.onended = null
      player.onerror = null
      player.pause()
      try { player.currentTime = 0 } catch { /* Aún puede estar cargando los metadatos. */ }
    }
    if ('speechSynthesis' in window) speechSynthesis.cancel()
  }, [])
  const play = useCallback(async (clip: Clip, speed: number, finished?: (ok: boolean) => void) => {
    stop()
    const request = serial.current
    const finish = (ok: boolean) => { if (request === serial.current) finished?.(ok) }
    if (clip.audioUrl) {
      const player = audio.current ?? new Audio()
      audio.current = player
      player.crossOrigin = 'anonymous'
      player.src = audioPath(clip.audioUrl)
      player.playbackRate = speed
      player.preservesPitch = true
      player.onended = () => finish(true)
      try {
        await player.play()
        if (request === serial.current) {
          setStatus('Reproduciendo audio.')
          player.onerror = () => { setStatus('No se pudo terminar el audio.'); finish(false) }
        }
        return
      } catch (exception) {
        if (request !== serial.current) return
        if ((exception as DOMException).name === 'NotAllowedError') {
          setEnabled(false)
          setStatus('El navegador necesita que actives el audio de nuevo.')
          finish(false)
          return
        }
      }
    }
    if ('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window) {
      const voices = speechSynthesis.getVoices()
      const voice = voices.find(v => /^zh[-_]CN$/i.test(v.lang)) ?? voices.find(v => /^zh(?:[-_]|$)/i.test(v.lang))
      if (voice) {
        const utterance = new SpeechSynthesisUtterance(clip.hanzi)
        utterance.voice = voice
        utterance.lang = 'zh-CN'
        utterance.rate = speed
        utterance.onend = () => finish(true)
        utterance.onerror = () => {
          if (request !== serial.current) return
          setStatus('No se pudo reproducir la voz china del dispositivo.')
          finish(false)
        }
        speechSynthesis.speak(utterance)
        setStatus('Voz china del dispositivo.')
        return
      }
    }
    setStatus('Audio no disponible. Instala una voz china en tu dispositivo para escuchar esta tarjeta.')
    finish(false)
  }, [stop])
  const speed = data?.settings.speed ?? 1
  const playClip = useCallback((clip: Clip, finished?: (ok: boolean) => void) => {
    setEnabled(true)
    void play(clip, speed, finished)
  }, [play, speed])
  useEffect(() => {
    setRevealed(false)
    if (current && enabled && data?.settings.autoplay) void play(current, speed)
    else stop()
  }, [current?.id, mode]) // La reproducción automática sigue los cambios de tarjeta.
  const nextAudio = mode === 'explore' ? exploreWords[(index + 1) % exploreWords.length]?.audioUrl : available.find(c => c.id !== current?.id)?.audioUrl
  useEffect(() => {
    if (current && nextAudio) {
      const player = new Audio()
      player.preload = 'auto'
      player.crossOrigin = 'anonymous'
      player.src = audioPath(nextAudio)
      player.load()
    }
  }, [current?.id, nextAudio])
  useEffect(() => () => stop(), [stop])
  if (!data) return <main className="loading">Preparando tu espacio de estudio…</main>
  const summary = stats(data, now)
  const showCard = mode === 'study' || mode === 'explore'
  const practiceKey = [level, topic, category, learnedFilter, onlyExamples].join('|')
  const setSetting = (patch: Partial<Settings>) => void persist(snapshot => ({ ...snapshot, settings: { ...snapshot.settings, ...patch } }))
  const activate = () => { if (current) playClip(current) }
  const changeMode = (next: Mode) => {
    if (next === mode) return
    const at = new Date()
    setMode(next)
    setRevealed(false)
    setStatus('')
    setNow(at)
    if (next === 'study') setCurrentId(eligible(data, at).find(matches)?.id ?? null)
  }
  const startToday = () => {
    setLevel('all'); setTopic('all'); setCategory('all'); setOnlyExamples(false)
    changeMode('study')
    setCurrentId(eligible(data)[0]?.id ?? null)
  }
  const advance = (direction = 1) => { if (mode === 'explore' && exploreWords.length) setIndex((index + direction + exploreWords.length) % exploreWords.length); else if (mode === 'study') { const i = available.findIndex(c => c.id === current?.id); if (available.length > 1) setCurrentId(available[(i + 1) % available.length].id); else setStatus('No hay más tarjetas disponibles ahora. Puedes explorar libremente.') } }
  const answer = async (rating: Rating) => {
    if (!current || busy) return
    setBusy(true)
    let confirmation: Confirmation | undefined
    let nextId: string | undefined
    const saved = await persist(snapshot => {
      const previous = snapshot.progress[current.id]
      const at = new Date()
      if (previous?.reps !== data.progress[current.id]?.reps || !eligible(snapshot, at).some(word => word.id === current.id)) {
        throw Error('La tarjeta o la cola de hoy cambió en otra sesión.')
      }
      const next = rate(snapshot, current.id, rating, at)
      nextId = eligible(next, at).find(matches)?.id
      confirmation = { review: next.reviews[next.reviews.length - 1], previous, word: current, due: next.progress[current.id].due }
      return next
    })
    if (saved) {
      setLastReview(confirmation ?? null)
      setCurrentId(nextId ?? null)
      setRevealed(false)
      setNow(new Date())
    }
    setBusy(false)
  }
  const undo = async () => {
    if (!lastReview || busy) return
    setBusy(true)
    if (await persist(snapshot => undoRating(snapshot, lastReview))) {
      setCurrentId(lastReview.word.id)
      setLastReview(null)
      setStatus('Repaso deshecho.')
      setNow(new Date())
    }
    setBusy(false)
  }
  const markLearned = async () => {
    if (!current) return
    if (await persist(snapshot => toggleLearned(snapshot, current.id))) {
      setStatus(learnedIds.has(current.id) ? 'La tarjeta vuelve a estar disponible para repasar.' : 'Marcada como aprendida. Puedes recuperarla desde Explorar.')
    }
  }
  const addVocabulary = async (text: string) => {
    let result: ReturnType<typeof parseVocabulary> | undefined
    const saved = await persist(snapshot => {
      result = parseVocabulary(text, snapshot.cards)
      return { ...snapshot, cards: [...snapshot.cards, ...result.cards] }
    })
    if (saved && result) setStatus(`Añadidas ${result.cards.length} tarjetas · ${result.duplicates} duplicadas · ${result.invalid} incompletas o inválidas.`)
  }
  const exportBackup = () => {
    download(JSON.stringify(data, null, 2), 'application/json', `hanzi-chill-${new Date().toISOString().slice(0, 10)}.json`)
    setStatus('Copia descargada. Guárdala en un lugar seguro.')
  }
  const importBackup = async (file: File) => {
    try {
      const next = restore(JSON.parse(await file.text()))
      if (await persist(() => next)) {
        setLastReview(null)
        setCurrentId(null)
        setIndex(0)
        changeMode('today')
        setStatus('Copia restaurada correctamente.')
      }
    } catch (exception) {
      setError(`No se pudo restaurar: ${(exception as Error).message}`)
    }
  }
  return <div className="app-shell">
    <header className="header"><div className="brand"><div className="brand-mark">汉</div><div><strong>汉字 <span>Chill</span></strong><small>CHINO A TU RITMO</small></div></div><button className="icon-button" aria-label="Abrir ajustes" aria-expanded={settingsOpen} onClick={() => setSettingsOpen(!settingsOpen)}><Settings2 size={20}/></button></header>
    <main>
      <nav className="tabs" aria-label="Modo de estudio">
        <button className={mode === 'today' ? 'active' : ''} aria-pressed={mode === 'today'} onClick={() => changeMode('today')}><CalendarDays size={17}/> Hoy</button>
        <button className={mode === 'study' ? 'active' : ''} aria-pressed={mode === 'study'} onClick={() => changeMode('study')}><BookOpen size={17}/> Repasar</button>
        <button className={mode === 'explore' ? 'active' : ''} aria-pressed={mode === 'explore'} onClick={() => changeMode('explore')}><Headphones size={17}/> Explorar</button>
        <button className={mode === 'listen' ? 'active' : ''} aria-pressed={mode === 'listen'} onClick={() => changeMode('listen')}><Volume2 size={17}/> Oído</button>
      </nav>
      {mode === 'today' ? (
        <Today data={data} now={now} start={startToday} explore={() => changeMode('explore')} reminder={() => {
          setSettingsOpen(true)
          requestAnimationFrame(() => reminderForm.current?.scrollIntoView({ block: 'center' }))
        }}/>
      ) : <>
      <div className="filters"><label>Nivel<select value={level} onChange={e => { setLevel(e.target.value); setIndex(0) }}><option value="all">Todos</option><option value="1">HSK 3.0 · 1</option><option value="2">HSK 3.0 · 2</option><option value="other">Sin nivel</option></select></label><label className="filter-topic">Tema<select value={topic} onChange={e => { setTopic(e.target.value); setIndex(0) }}><option value="all">Todos</option>{topics.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}<option value="other">Otras palabras</option></select></label><label>Tipo<select value={category} onChange={e => { setCategory(e.target.value); setIndex(0) }}><option value="all">Todos</option><option value="noun">Sustantivos</option><option value="verb">Verbos</option><option value="adjective">Adjetivos</option><option value="pronoun">Pronombres</option><option value="numeral">Números</option><option value="measure word">Clasificadores</option><option value="particle">Partículas</option></select></label>{mode !== 'study' && <label>Estado<select value={learnedFilter} onChange={e => { setLearnedFilter(e.target.value); setIndex(0) }}><option value="all">Todas</option><option value="active">Por aprender</option><option value="seen">Ya vistas</option><option value="learned">Aprendidas</option></select></label>}</div>
      <div className="practice-options"><button className={onlyExamples ? 'selected' : ''} aria-pressed={onlyExamples} onClick={() => { setOnlyExamples(!onlyExamples); setIndex(0) }}>Con frase</button>{mode === 'explore' ? <button className={randomOrder ? 'selected' : ''} aria-pressed={!!randomOrder} onClick={() => { setRandomOrder(randomOrder ? null : shuffleIds(words)); setIndex(0) }}>⤨ {randomOrder ? 'Desactivar orden aleatorio' : 'Activar orden aleatorio'}</button> : mode === 'study' ? <button className={listenFirst ? 'selected' : ''} aria-pressed={listenFirst} onClick={() => { setListenFirst(!listenFirst); setRevealed(false) }}><Headphones size={16}/> {listenFirst ? 'Escuchar primero: sí' : 'Escuchar primero: no'}</button> : null}</div>
      {mode === 'listen' ? <>
        <div className="exercise-tabs practice-tabs" role="group" aria-label="Práctica de oído">
          {([['sounds', 'Palabras y tonos'], ['cloze', 'Completar frase'], ['sentence', 'Oír frase'], ['handsfree', 'Manos libres']] as const).map(([id, label]) => (
            <button key={id} aria-pressed={practice === id} onClick={() => { setPractice(id); setStatus('') }}>{label}</button>
          ))}
        </div>
        {practice === 'sounds' && <ListeningExercise words={exerciseWords} autoplay={data.settings.autoplay} stop={stop} play={playClip}/>}
        {(practice === 'cloze' || practice === 'sentence') && (
          <ContextPractice key={practice + practiceKey} words={exerciseWords} blank={practice === 'cloze'} autoplay={data.settings.autoplay} play={playClip} stop={stop}/>
        )}
        {practice === 'handsfree' && <HandsFree key={practiceKey + speed} words={exerciseWords} play={playClip} stop={stop}/>}
      </> : <>
      <div className="section-heading"><div><span className="eyebrow">{mode === 'study' ? 'TU SESIÓN' : 'A TU AIRE'}</span><h2>{mode === 'study' ? 'Vamos a recordar' : 'Explora el mazo'}</h2></div><span className="counter">{mode === 'explore' ? `${current ? index % exploreWords.length + 1 : 0} / ${exploreWords.length}` : `${available.filter(c => !!data.progress[c.id]).length} pendientes`}</span></div>
      <section className="study-card" aria-label="Tarjeta de estudio">
        {current ? <><div className="card-top"><span><span className="tiny-dot"/> {learnedIds.has(current.id) ? 'APRENDIDA' : mode === 'explore' ? 'EXPLORACIÓN LIBRE' : data.progress[current.id] ? 'REPASO' : 'TARJETA NUEVA'}</span><span>{current.hskLevel ? `HSK 3.0 · ${current.hskLevel}` : '汉字 CHILL'}</span></div><div className="word-area">{mode === 'study' && listenFirst && !revealed ? <div className="listening-prompt"><Headphones size={48}/><p>Escucha e intenta recordar</p></div> : <div className="hanzi" lang="zh-Hans">{current.hanzi}</div>}{(revealed || (data.settings.showPinyin && !(mode === 'study' && listenFirst))) && <div className="pinyin">{current.pinyin}</div>}<div className="meaning">{revealed ? current.meaning : 'Escucha y deja que te suene familiar.'}</div><div className="audio-controls"><button className="listen" onClick={activate}><Volume2 size={18}/> Escuchar de nuevo</button><button className="stop-audio" onClick={() => { stop(); setStatus('Audio detenido.') }}>Detener</button></div></div><div className="card-bottom"><button className="learned-button" aria-pressed={learnedIds.has(current.id)} onClick={markLearned}>{learnedIds.has(current.id) ? '↶ Volver a repasar' : '✓ Marcar aprendida'}</button><span>✳</span></div></> : <div className="empty"><div className="empty-icon"><Check/></div><h3>{mode === 'study' ? 'Por hoy está bien.' : 'No hay tarjetas aquí.'}</h3><p>{mode === 'study' ? 'No quedan tarjetas pendientes con estos filtros. Vuelve cuando quieras o explora el mazo.' : 'Prueba con otro nivel, tipo o estado.'}</p>{mode === 'study' && <button className="primary" onClick={() => changeMode('explore')}>Explorar tarjetas <ArrowRight size={17}/></button>}</div>}
      </section>
      {current && <><div className="actions"><button className="secondary" onClick={() => setRevealed(!revealed)}>{revealed ? 'Ocultar respuesta' : 'Mostrar respuesta'}</button>{mode === 'explore' ? <><button className="back" aria-label="Tarjeta anterior" onClick={() => advance(-1)}><ArrowLeft size={19}/></button><button className="primary" onClick={() => advance()}>Siguiente <ArrowRight size={18}/></button></> : <button className="primary" onClick={() => advance()}>Saltar <ArrowRight size={18}/></button>}</div>
      {revealed && example && <section className="context-example" aria-label="Frase de ejemplo">
        <p className="eyebrow">EN CONTEXTO</p>
        <ContextText example={example} word={current}/>
        <button className="listen" onClick={() => playClip(example)}><Volume2 size={18}/> Escuchar frase</button>
      </section>}
      {mode === 'study' && revealed && <div className="rating-area"><p>¿Qué tal la recordabas?</p><div className="ratings">{([[Rating.Again,'Otra vez'],[Rating.Hard,'Difícil'],[Rating.Good,'Bien'],[Rating.Easy,'Fácil']] as const).map(([r,label]) => <button key={r} disabled={busy || !ready} onClick={() => void answer(r)}>{label}</button>)}</div></div>}</>}
      {!enabled && current && <button className="enable-audio" onClick={activate}><VolumeX size={19}/><span><strong>Activar audio</strong><small>Un toque para escuchar al avanzar</small></span><ArrowRight size={18}/></button>}
      </>}
      </>}
      {mode === 'study' && lastReview && <div className="review-confirmation">
        <p role="status"><strong lang="zh-Hans">{lastReview.word.hanzi}</strong> vuelve el <time dateTime={lastReview.due.toISOString()}>{reviewTime.format(lastReview.due)}</time></p>
        <button className="secondary" disabled={busy} onClick={() => void undo()}><RotateCcw size={16}/> Deshacer repaso</button>
      </div>}
      <p className="status" role="status">{status}</p>{error && <p className="error" role="alert">{error}</p>}
      {offlineProgress && <p className="offline-status" role="status">{offlineProgress.ready ? `✓ Listo para usar sin conexión · ${offlineProgress.count} audios` : `Preparando uso sin conexión · ${offlineProgress.count} / ${offlineAudioUrls.length} audios`}</p>}
      {showCard && <div className="session-summary"><div><span>PARA HOY</span><strong>{summary.newLeft}</strong><small>nuevas disponibles</small></div><div><span>TU RITMO</span><strong>{summary.reviewed}</strong><small>repasos de hoy</small></div><div><span>RECORDADAS</span><strong>{summary.accuracy === null ? '—' : `${summary.accuracy}%`}</strong><small>calificadas sin «Otra vez»</small></div></div>}
      <section className="settings" hidden={!settingsOpen}><div className="settings-head"><div><span className="eyebrow">HAZLO TUYO</span><h2>Ajustes</h2></div><button className="icon-button" aria-label="Cerrar ajustes" onClick={() => setSettingsOpen(false)}>×</button></div>
        <label className="setting"><span><strong>Velocidad de audio</strong><small>Encuentra tu ritmo para escuchar.</small></span><span className="range"><input type="range" min="0.55" max="1.15" step="0.05" value={data.settings.speed} onChange={e => setSetting({ speed: Number(e.target.value) })}/><output>{data.settings.speed.toFixed(2).replace('.',',')}×</output></span></label>
        <label className="setting"><span><strong>Reproducción automática</strong><small>Escuchar al cambiar de tarjeta.</small></span><input type="checkbox" checked={data.settings.autoplay} onChange={e => setSetting({ autoplay: e.target.checked })}/></label>
        <label className="setting"><span><strong>Mostrar pinyin</strong><small>Ver la pronunciación antes de revelar.</small></span><input type="checkbox" checked={data.settings.showPinyin} onChange={e => setSetting({ showPinyin: e.target.checked })}/></label>
         <label className="setting"><span><strong>Nuevas al día</strong><small>Las tarjetas pendientes siempre aparecen.</small></span><input className="number" type="number" min="0" max="999" value={data.settings.newLimit} onChange={e => setSetting({ newLimit: Math.max(0, Math.min(999, Math.floor(Number(e.target.value)))) })}/></label>
         <form ref={reminderForm} className="data-tools reminder" onSubmit={event => {
           event.preventDefault()
           const time = new FormData(event.currentTarget).get('reminder-time')
           if (typeof time !== 'string' || !time) return
           download(reminderCalendar(time), 'text/calendar;charset=utf-8', 'hanzi-chill-recordatorio.ics')
           setSetting({ reminderTime: time })
           setStatus('Evento descargado. Impórtalo en tu calendario para activar el aviso.')
         }}>
           <h3>Recordatorio diario</h3>
           <p>Elige una hora e importa el evento en tu calendario para recibir el aviso con la app cerrada.</p>
           <div className="reminder-controls">
             <label>Hora del aviso <input type="time" name="reminder-time" required key={data.settings.reminderTime} defaultValue={data.settings.reminderTime ?? '19:00'}/></label>
             <button type="submit" className="secondary"><Download size={16}/> Descargar evento diario</button>
           </div>
           <p>En iPhone puedes abrir el archivo adjunto desde Mail o crear un aviso con repetición diaria en Recordatorios. Cambia o elimina el evento desde tu calendario.</p>
         </form>
        <div className="data-tools"><h3>Tu vocabulario y progreso</h3><p>Todo se guarda en este dispositivo. Exporta una copia para llevarla contigo.</p><div className="tool-grid"><button onClick={() => void addVocabulary(extraCsv)}><Sparkles size={17}/> Añadir vocabulario extra</button><button onClick={() => csvInput.current?.click()}><Upload size={17}/> Importar CSV / TSV</button><button onClick={exportBackup}><Download size={17}/> Exportar copia</button><button onClick={() => jsonInput.current?.click()}><RotateCcw size={17}/> Restaurar copia</button></div><input ref={csvInput} hidden type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" onChange={e => { const f=e.target.files?.[0]; if (f) void f.text().then(addVocabulary).catch(() => setError('No se pudo leer el archivo.')); e.target.value='' }}/><input ref={jsonInput} hidden type="file" accept=".json,application/json" onChange={e => { const f=e.target.files?.[0]; if (f && window.confirm('Restaurar sustituirá el mazo, los ajustes y el progreso actuales. ¿Continuar?')) void importBackup(f); e.target.value='' }}/></div>
        <div className="install"><strong>En tu iPhone</strong><p>Abre esta página en Safari, toca Compartir y después «Añadir a pantalla de inicio». Necesitas HTTPS o localhost para instalarla y usarla sin conexión tras la primera carga.</p></div>
      </section>
      <footer><span>汉字 CHILL</span><p>Un pequeño momento para aprender algo nuevo.<br/>Las voces son sintéticas y las traducciones son orientativas; no han sido revisadas profesionalmente.</p><p>Datos HSK adaptados de <a href="https://hearmandarin.com/datasets/">HearMandarin · CC BY 4.0</a>. Traducciones adaptadas de <a href="https://github.com/nar-ran/hsk-vocab-es">nar-ran · MIT</a>. <a href={`${import.meta.env.BASE_URL}creditos-hsk.txt`}>Créditos y licencias</a>.</p></footer>
    </main>
  </div>
}
export default App
