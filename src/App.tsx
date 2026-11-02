import { useCallback, useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX, ArrowRight, ArrowLeft, Settings2, Headphones, BookOpen, RotateCcw, Upload, Download, Check, Sparkles } from 'lucide-react'
import { Rating } from 'ts-fsrs'
import extraCsv from '../data/vocabulario_chino_extra.csv?raw'
import { eligible, initial, load, parseVocabulary, rate, restore, save, shuffleIds, stats, toggleLearned, type Settings, type Snapshot, type Word } from './model'
import './style.css'

type Mode = 'study' | 'explore'
const audioPath = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`

function App() {
  const [data, setData] = useState<Snapshot | null>(null)
  const [mode, setMode] = useState<Mode>('study')
  const [index, setIndex] = useState(0)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [status, setStatus] = useState('Activa el audio para escuchar cada tarjeta.')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [level, setLevel] = useState('all')
  const [category, setCategory] = useState('all')
  const [learnedFilter, setLearnedFilter] = useState('all')
  const [randomOrder, setRandomOrder] = useState<string[] | null>(null)
  const [listenFirst, setListenFirst] = useState(false)
  const audio = useRef<HTMLAudioElement | null>(null)
  const serial = useRef(0)
  const csvInput = useRef<HTMLInputElement>(null)
  const jsonInput = useRef<HTMLInputElement>(null)
  const ready = useRef(false)
  const latest = useRef<Snapshot | null>(null)
  const writes = useRef<Promise<void>>(Promise.resolve())
  useEffect(() => { load().then(d => { latest.current = d; setData(d); setCurrentId(eligible(d)[0]?.id ?? null); ready.current = true }).catch(() => { setError('No se puede abrir el almacenamiento. Comprueba que IndexedDB esté permitido y vuelve a cargar.'); const fallback = initial(); latest.current = fallback; setData(fallback) }) }, [])
  const persist = async (next: Snapshot) => {
    latest.current = next; setData(next)
    const write = writes.current.then(() => save(next)); writes.current = write.catch(() => {})
    try { await write; setError(''); return true } catch { setError('No se pudo guardar el cambio. Sigue visible en esta sesión, pero podría perderse al cerrar; comprueba el espacio y los permisos del navegador.'); return false }
  }
  const words = data?.cards ?? []
  const learnedIds = new Set(data?.learned ?? [])
  const matches = (word: Word) => (level === 'all' || (level === 'other' ? !word.hskLevel : word.hskLevel === Number(level))) && (category === 'all' || word.categories?.includes(category))
  const available = data ? eligible(data).filter(matches) : []
  const exploreWords = words.filter(word => matches(word) && (learnedFilter === 'all' || (learnedFilter === 'learned') === learnedIds.has(word.id)))
  if (randomOrder) { const order = new Map(randomOrder.map((id, i) => [id, i])); exploreWords.sort((a, b) => (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity)) }
  const current = mode === 'explore' ? exploreWords[index % (exploreWords.length || 1)] : available.find(c => c.id === currentId) ?? available[0]
  const stop = useCallback(() => { serial.current++; if (audio.current) { audio.current.pause(); try { audio.current.currentTime = 0 } catch { /* media may not be seekable yet */ } } if ('speechSynthesis' in window) speechSynthesis.cancel() }, [])
  const play = useCallback(async (word: Word, speed: number) => {
    stop(); const request = serial.current
    if (word.audioUrl) {
      const player = audio.current ?? new Audio(); audio.current = player; player.src = audioPath(word.audioUrl); player.playbackRate = speed; player.preservesPitch = true
      try { await player.play(); if (request === serial.current) setStatus('Reproduciendo audio de la tarjeta.') ; return } catch (e) { if (request !== serial.current) return; if ((e as DOMException).name === 'NotAllowedError') { setEnabled(false); setStatus('El navegador necesita que actives el audio de nuevo.'); return } }
    }
    if ('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window) {
      const voices = speechSynthesis.getVoices(); const voice = voices.find(v => /^zh[-_]CN$/i.test(v.lang)) ?? voices.find(v => /^zh(?:[-_]|$)/i.test(v.lang))
      if (voice) { const utterance = new SpeechSynthesisUtterance(word.hanzi); utterance.voice = voice; utterance.lang = 'zh-CN'; utterance.rate = speed; utterance.onerror = () => { if (request === serial.current) setStatus('No se pudo reproducir la voz china del dispositivo.') }; speechSynthesis.speak(utterance); setStatus('Voz china del dispositivo.'); return }
    }
    setStatus('Audio no disponible. Instala una voz china en tu dispositivo para escuchar esta tarjeta.')
  }, [stop])
  useEffect(() => { if (!current || !data) { stop(); return } setRevealed(false); if (enabled && data.settings.autoplay) void play(current, data.settings.speed); else stop() }, [current?.id, mode]) // playback follows card changes, not settings changes
  useEffect(() => { if (!current || !data) return; const next = mode === 'explore' ? exploreWords[(index + 1) % exploreWords.length] : available.find(c => c.id !== current.id); if (next?.audioUrl) { const a = new Audio(); a.preload = 'auto'; a.src = audioPath(next.audioUrl); a.load() } }, [current?.id, mode, index, data, randomOrder, level, category, learnedFilter])
  useEffect(() => () => stop(), [stop])
  if (!data) return <main className="loading">Preparando tu espacio de estudio…</main>
  const summary = stats(data)
  const setSetting = (patch: Partial<Settings>) => void persist({ ...latest.current!, settings: { ...latest.current!.settings, ...patch } })
  const activate = () => { if (!current) return; setEnabled(true); void play(current, data.settings.speed) }
  const changeMode = (next: Mode) => { setMode(next); setRevealed(false); if (next === 'study') setCurrentId(eligible(data)[0]?.id ?? null) }
  const advance = (direction = 1) => { if (mode === 'explore' && exploreWords.length) setIndex((index + direction + exploreWords.length) % exploreWords.length); else if (mode === 'study') { const i = available.findIndex(c => c.id === current?.id); if (available.length > 1) setCurrentId(available[(i + 1) % available.length].id); else setStatus('No hay más tarjetas disponibles ahora. Puedes explorar libremente.') } }
  const answer = async (rating: Rating) => { if (!current || busy) return; setBusy(true); try { const next = rate(latest.current!, current.id, rating); if (await persist(next)) { setCurrentId(eligible(next)[0]?.id ?? null); setRevealed(false) } } catch { setError('No se pudo calcular el próximo repaso.') } finally { setBusy(false) } }
  const markLearned = () => { if (!current) return; const wasLearned = learnedIds.has(current.id); void persist(toggleLearned(latest.current!, current.id)); setStatus(wasLearned ? 'La tarjeta vuelve a estar disponible para repasar.' : 'Marcada como aprendida. Puedes recuperarla desde Explorar.') }
  const addVocabulary = async (text: string) => { try { const result = parseVocabulary(text, data.cards); if (result.cards.length && !(await persist({ ...data, cards: [...data.cards, ...result.cards] }))) return; setStatus(`Añadidas ${result.cards.length} tarjetas · ${result.duplicates} duplicadas · ${result.invalid} incompletas o inválidas.`) } catch (e) { setError((e as Error).message) } }
  const exportBackup = () => { const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = `hanzi-chill-${new Date().toISOString().slice(0,10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setStatus('Copia descargada. Guárdala en un lugar seguro.') }
  const importBackup = async (file: File) => { try { const next = restore(JSON.parse(await file.text())); if (await persist(next)) { setCurrentId(eligible(next)[0]?.id ?? null); setMode('study'); setIndex(0); setStatus('Copia restaurada correctamente.') } } catch (e) { setError(`No se pudo restaurar: ${(e as Error).message}`) } }
  return <div className="app-shell">
    <header className="header"><div className="brand"><div className="brand-mark">汉</div><div><strong>汉字 <span>Chill</span></strong><small>CHINO A TU RITMO</small></div></div><button className="icon-button" aria-label="Abrir ajustes" aria-expanded={settingsOpen} onClick={() => setSettingsOpen(!settingsOpen)}><Settings2 size={20}/></button></header>
    <main>
      <section className="intro"><div><p className="eyebrow"><span className="dot"/> UN MOMENTO PARA TI</p><h1>Un poco de chino,<br/><em>cada día.</em></h1><p>Escucha, descubre y recuerda. Sin prisas.</p></div><div className="intro-symbol" aria-hidden="true">好</div></section>
      <nav className="tabs" aria-label="Modo de estudio"><button className={mode === 'study' ? 'active' : ''} aria-pressed={mode === 'study'} onClick={() => changeMode('study')}><BookOpen size={17}/> Repasar</button><button className={mode === 'explore' ? 'active' : ''} aria-pressed={mode === 'explore'} onClick={() => changeMode('explore')}><Headphones size={17}/> Explorar</button></nav>
      <div className="filters"><label>Nivel<select value={level} onChange={e => { setLevel(e.target.value); setIndex(0) }}><option value="all">Todos</option><option value="1">HSK 3.0 · 1</option><option value="2">HSK 3.0 · 2</option><option value="other">Sin nivel</option></select></label><label>Tipo<select value={category} onChange={e => { setCategory(e.target.value); setIndex(0) }}><option value="all">Todos</option><option value="noun">Sustantivos</option><option value="verb">Verbos</option><option value="adjective">Adjetivos</option><option value="pronoun">Pronombres</option><option value="numeral">Números</option><option value="measure word">Clasificadores</option><option value="particle">Partículas</option></select></label>{mode === 'explore' && <label>Estado<select value={learnedFilter} onChange={e => { setLearnedFilter(e.target.value); setIndex(0) }}><option value="all">Todas</option><option value="active">Por aprender</option><option value="learned">Aprendidas</option></select></label>}</div>
      <div className="practice-options">{mode === 'explore' ? <button className={randomOrder ? 'selected' : ''} aria-pressed={!!randomOrder} onClick={() => { setRandomOrder(randomOrder ? null : shuffleIds(words)); setIndex(0) }}>⤨ {randomOrder ? 'Desactivar orden aleatorio' : 'Activar orden aleatorio'}</button> : <button className={listenFirst ? 'selected' : ''} aria-pressed={listenFirst} onClick={() => { setListenFirst(!listenFirst); setRevealed(false) }}><Headphones size={16}/> {listenFirst ? 'Escuchar primero: sí' : 'Escuchar primero: no'}</button>}</div>
      <div className="section-heading"><div><span className="eyebrow">{mode === 'study' ? 'TU SESIÓN' : 'A TU AIRE'}</span><h2>{mode === 'study' ? 'Vamos a recordar' : 'Explora el mazo'}</h2></div><span className="counter">{mode === 'explore' ? `${current ? index % exploreWords.length + 1 : 0} / ${exploreWords.length}` : `${available.filter(c => !!data.progress[c.id]).length} pendientes`}</span></div>
      <section className="study-card" aria-label="Tarjeta de estudio">
        {current ? <><div className="card-top"><span><span className="tiny-dot"/> {learnedIds.has(current.id) ? 'APRENDIDA' : mode === 'explore' ? 'EXPLORACIÓN LIBRE' : data.progress[current.id] ? 'REPASO' : 'TARJETA NUEVA'}</span><span>{current.hskLevel ? `HSK 3.0 · ${current.hskLevel}` : '汉字 CHILL'}</span></div><div className="word-area">{mode === 'study' && listenFirst && !revealed ? <div className="listening-prompt"><Headphones size={48}/><p>Escucha e intenta recordar</p></div> : <div className="hanzi" lang="zh-Hans">{current.hanzi}</div>}{(revealed || (data.settings.showPinyin && !(mode === 'study' && listenFirst))) && <div className="pinyin">{current.pinyin}</div>}<div className="meaning">{revealed ? current.meaning : 'Escucha y deja que te suene familiar.'}</div><div className="audio-controls"><button className="listen" onClick={activate}><Volume2 size={18}/> Escuchar de nuevo</button><button className="stop-audio" onClick={() => { stop(); setStatus('Audio detenido.') }}>Detener</button></div></div><div className="card-bottom"><button className="learned-button" aria-pressed={learnedIds.has(current.id)} onClick={markLearned}>{learnedIds.has(current.id) ? '↶ Volver a repasar' : '✓ Marcar aprendida'}</button><span>✳</span></div></> : <div className="empty"><div className="empty-icon"><Check/></div><h3>{mode === 'study' ? 'Por hoy está bien.' : 'No hay tarjetas aquí.'}</h3><p>{mode === 'study' ? 'No quedan tarjetas pendientes con estos filtros. Vuelve cuando quieras o explora el mazo.' : 'Prueba con otro nivel, tipo o estado.'}</p>{mode === 'study' && <button className="primary" onClick={() => changeMode('explore')}>Explorar tarjetas <ArrowRight size={17}/></button>}</div>}
      </section>
      {current && <><div className="actions"><button className="secondary" onClick={() => setRevealed(!revealed)}>{revealed ? 'Ocultar respuesta' : 'Mostrar respuesta'}</button>{mode === 'explore' ? <><button className="back" aria-label="Tarjeta anterior" onClick={() => advance(-1)}><ArrowLeft size={19}/></button><button className="primary" onClick={() => advance()}>Siguiente <ArrowRight size={18}/></button></> : <button className="primary" onClick={() => advance()}>Saltar <ArrowRight size={18}/></button>}</div>
      {mode === 'study' && revealed && <div className="rating-area"><p>¿Qué tal la recordabas?</p><div className="ratings">{([[Rating.Again,'Otra vez'],[Rating.Hard,'Difícil'],[Rating.Good,'Bien'],[Rating.Easy,'Fácil']] as const).map(([r,label]) => <button key={r} disabled={busy || !ready.current} onClick={() => void answer(r)}>{label}</button>)}</div></div>}</>}
      {!enabled && current && <button className="enable-audio" onClick={activate}><VolumeX size={19}/><span><strong>Activar audio</strong><small>Un toque para escuchar al avanzar</small></span><ArrowRight size={18}/></button>}
      <p className="status" role="status">{status}</p>{error && <p className="error" role="alert">{error}</p>}
      <div className="session-summary"><div><span>PARA HOY</span><strong>{summary.newLeft}</strong><small>nuevas disponibles</small></div><div><span>TU RITMO</span><strong>{summary.reviewed}</strong><small>repasos de hoy</small></div><div><span>ACIERTOS</span><strong>{summary.accuracy === null ? '—' : `${summary.accuracy}%`}</strong><small>sin contar «Otra vez»</small></div></div>
      <section className="settings" hidden={!settingsOpen}><div className="settings-head"><div><span className="eyebrow">HAZLO TUYO</span><h2>Ajustes</h2></div><button className="icon-button" aria-label="Cerrar ajustes" onClick={() => setSettingsOpen(false)}>×</button></div>
        <label className="setting"><span><strong>Velocidad de audio</strong><small>Encuentra tu ritmo para escuchar.</small></span><span className="range"><input type="range" min="0.55" max="1.15" step="0.05" value={data.settings.speed} onChange={e => setSetting({ speed: Number(e.target.value) })}/><output>{data.settings.speed.toFixed(2).replace('.',',')}×</output></span></label>
        <label className="setting"><span><strong>Reproducción automática</strong><small>Escuchar al cambiar de tarjeta.</small></span><input type="checkbox" checked={data.settings.autoplay} onChange={e => setSetting({ autoplay: e.target.checked })}/></label>
        <label className="setting"><span><strong>Mostrar pinyin</strong><small>Ver la pronunciación antes de revelar.</small></span><input type="checkbox" checked={data.settings.showPinyin} onChange={e => setSetting({ showPinyin: e.target.checked })}/></label>
        <label className="setting"><span><strong>Nuevas al día</strong><small>Las tarjetas pendientes siempre aparecen.</small></span><input className="number" type="number" min="0" max="999" value={data.settings.newLimit} onChange={e => setSetting({ newLimit: Math.max(0, Math.min(999, Number(e.target.value))) })}/></label>
        <div className="data-tools"><h3>Tu vocabulario y progreso</h3><p>Todo se guarda en este dispositivo. Exporta una copia para llevarla contigo.</p><div className="tool-grid"><button onClick={() => void addVocabulary(extraCsv)}><Sparkles size={17}/> Añadir vocabulario extra</button><button onClick={() => csvInput.current?.click()}><Upload size={17}/> Importar CSV / TSV</button><button onClick={exportBackup}><Download size={17}/> Exportar copia</button><button onClick={() => jsonInput.current?.click()}><RotateCcw size={17}/> Restaurar copia</button></div><input ref={csvInput} hidden type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" onChange={e => { const f=e.target.files?.[0]; if (f) void f.text().then(addVocabulary).catch(() => setError('No se pudo leer el archivo.')); e.target.value='' }}/><input ref={jsonInput} hidden type="file" accept=".json,application/json" onChange={e => { const f=e.target.files?.[0]; if (f && window.confirm('Restaurar sustituirá el mazo, los ajustes y el progreso actuales. ¿Continuar?')) void importBackup(f); e.target.value='' }}/></div>
        <div className="install"><strong>En tu iPhone</strong><p>Abre esta página en Safari, toca Compartir y después «Añadir a pantalla de inicio». Necesitas HTTPS o localhost para instalarla y usarla sin conexión tras la primera carga.</p></div>
      </section>
      <footer><span>汉字 CHILL</span><p>Un pequeño momento para aprender algo nuevo.<br/>Las voces son sintéticas y las traducciones son orientativas; no han sido revisadas profesionalmente.</p><p>Datos HSK adaptados de <a href="https://hearmandarin.com/datasets/">HearMandarin · CC BY 4.0</a>. Traducciones adaptadas de <a href="https://github.com/nar-ran/hsk-vocab-es">nar-ran · MIT</a>. <a href={`${import.meta.env.BASE_URL}creditos-hsk.txt`}>Créditos y licencias</a>.</p></footer>
    </main>
  </div>
}
export default App
