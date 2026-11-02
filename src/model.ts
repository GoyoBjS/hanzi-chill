import Dexie, { type Table } from 'dexie'
import { createEmptyCard, fsrs, Rating, State, type Card as FSRSCard, type Grade } from 'ts-fsrs'
import Papa from 'papaparse'
import baseDeck from '../data/base-deck.json'
import hskDeck from '../data/hsk3-levels-1-2.json'

export interface Word { id: string; hanzi: string; pinyin: string; meaning: string; audioUrl?: string; source?: string; hskId?: string; hskLevel?: 1 | 2; categories?: string[] }
export interface Settings { speed: number; autoplay: boolean; showPinyin: boolean; newLimit: number }
export interface Review { id: string; cardId: string; at: string; rating: number; introduced?: boolean }
export interface Snapshot { version: 3; cards: Word[]; progress: Record<string, FSRSCard>; settings: Settings; reviews: Review[]; learned?: string[]; legacyArchive?: unknown }
export const defaults: Settings = { speed: 1, autoplay: true, showPinyin: false, newLimit: 5 }
export const offlineAudioUrls = [...baseDeck, ...hskDeck].flatMap(card => card.audioUrl ? [card.audioUrl] : [])
export const keyOf = (word: Pick<Word, 'hanzi' | 'pinyin'>) => `${word.hanzi.normalize('NFKC').trim()}|${word.pinyin.normalize('NFKC').trim().toLocaleLowerCase()}`
export function withCatalog(data: Snapshot): Snapshot {
  const cards = data.cards.map(c => ({ ...c }))
  const catalog = hskDeck as Word[]
  for (const word of catalog) {
    const linked = cards.find(c => c.hskId === word.hskId)
    if (linked) { linked.hskLevel = word.hskLevel; linked.categories = word.categories; continue }
    const sameHanzi = cards.filter(c => c.hanzi === word.hanzi && !c.hskId)
    const exact = sameHanzi.find(c => keyOf(c).replace(/\s+/g, '') === keyOf(word).replace(/\s+/g, ''))
    const existing = exact ?? (sameHanzi.length === 1 && catalog.filter(c => c.hanzi === word.hanzi).length === 1 ? sameHanzi[0] : undefined)
    if (existing) { existing.hskId = word.hskId; existing.hskLevel = word.hskLevel; existing.categories = word.categories; existing.audioUrl ||= word.audioUrl }
    else cards.push({ ...word })
  }
  return { ...data, cards, learned: data.learned ?? [] }
}
export const initial = (): Snapshot => withCatalog({ version: 3, cards: baseDeck, progress: {}, settings: { ...defaults }, reviews: [], learned: [] })
class Database extends Dexie { snapshots!: Table<{ id: string; data: Snapshot }, string>; constructor() { super('hanzi-chill'); this.version(1).stores({ snapshots: 'id' }) } }
export const db = new Database()
export async function load(): Promise<Snapshot> { const saved = (await db.snapshots.get('main'))?.data; return saved ? withCatalog(saved) : initial() }
export async function save(data: Snapshot) { await db.snapshots.put({ id: 'main', data }) }
export function day(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` }
export function stats(data: Snapshot, now = new Date()) {
  const today = day(now)
  const introduced = new Set(data.reviews.filter(r => day(new Date(r.at)) === today && (r.introduced === true || (r.introduced === undefined && data.reviews.find(first => first.cardId === r.cardId)?.id === r.id))).map(r => r.cardId)).size
  const todayReviews = data.reviews.filter(r => day(new Date(r.at)) === today)
  const learned = new Set(data.learned ?? [])
  return { due: data.cards.filter(c => !learned.has(c.id) && data.progress[c.id] && new Date(data.progress[c.id].due) <= now).length, newLeft: Math.max(0, data.settings.newLimit - introduced), reviewed: todayReviews.length, accuracy: todayReviews.length ? Math.round(100 * todayReviews.filter(r => r.rating !== Rating.Again).length / todayReviews.length) : null }
}
export function eligible(data: Snapshot, now = new Date()) {
  const learned = new Set(data.learned ?? [])
  const due = data.cards.filter(c => !learned.has(c.id) && data.progress[c.id] && new Date(data.progress[c.id].due) <= now)
  const fresh = stats(data, now).newLeft ? data.cards.filter(c => !learned.has(c.id) && !data.progress[c.id]) : []
  return [...due, ...fresh]
}
export function toggleLearned(data: Snapshot, id: string): Snapshot {
  const learned = new Set(data.learned ?? [])
  if (learned.has(id)) learned.delete(id); else learned.add(id)
  return { ...data, learned: [...learned] }
}
export function shuffleIds(words: Word[], random = Math.random): string[] {
  const ids = words.map(word => word.id)
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]] }
  return ids
}
export function rate(data: Snapshot, id: string, rating: Rating, now = new Date()): Snapshot {
  const old = data.progress[id]
  const card = old ? { ...old, due: new Date(old.due), last_review: old.last_review ? new Date(old.last_review) : undefined } : createEmptyCard(now)
  const result = fsrs().next(card, now, rating as Grade)
  return { ...data, progress: { ...data.progress, [id]: result.card }, reviews: [...data.reviews, { id: crypto.randomUUID(), cardId: id, at: now.toISOString(), rating, introduced: !old }] }
}
function cleanWord(raw: unknown): Word | null {
  if (!raw || typeof raw !== 'object') return null
  const x = raw as Record<string, unknown>
  if (typeof x.hanzi !== 'string' || typeof x.pinyin !== 'string' || typeof x.meaning !== 'string') return null
  const hanzi = x.hanzi.trim(), pinyin = x.pinyin.trim(), meaning = x.meaning.trim()
  if (!hanzi || !pinyin || !meaning || !/\p{Script=Han}/u.test(hanzi) || hanzi.length > 200 || pinyin.length > 500 || meaning.length > 1000) return null
  return { id: typeof x.id === 'string' && x.id ? x.id : crypto.randomUUID(), hanzi, pinyin, meaning, ...(typeof x.audioUrl === 'string' && /^\/?audio\/[\w.-]+\.mp3$/i.test(x.audioUrl) ? { audioUrl: x.audioUrl } : {}), ...(typeof x.source === 'string' ? { source: x.source } : {}), ...(typeof x.hskId === 'string' && /^w\d{5}$/.test(x.hskId) && (x.hskLevel === 1 || x.hskLevel === 2) ? { hskId: x.hskId, hskLevel: x.hskLevel, categories: Array.isArray(x.categories) ? x.categories.filter((v): v is string => typeof v === 'string') : [] } : {}) }
}
export function parseVocabulary(text: string, existing: Word[]) {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ''), { header: true, skipEmptyLines: 'greedy', transformHeader: h => h.trim().toLowerCase() })
  if (parsed.errors.length) throw Error(`CSV/TSV no válido: ${parsed.errors[0].message}`)
  if (!['hanzi', 'pinyin', 'meaning'].every(h => parsed.meta.fields?.includes(h))) throw Error('El archivo necesita las columnas hanzi, pinyin y meaning.')
  const keys = new Set(existing.map(keyOf)); const cards: Word[] = []; let invalid = 0, duplicates = 0
  for (const row of parsed.data) { const word = cleanWord(row); if (!word) { invalid++; continue } const key = keyOf(word); if (keys.has(key)) { duplicates++; continue } keys.add(key); cards.push(word) }
  return { cards, invalid, duplicates }
}
export function restore(raw: unknown): Snapshot {
  if (!raw || typeof raw !== 'object') throw Error('La copia no es un objeto válido.')
  const x = raw as Record<string, any>
  if (x.version === 2) {
    if (!Array.isArray(x.imported) || !x.schedule || typeof x.schedule !== 'object' || Array.isArray(x.schedule)) throw Error('Copia antigua incompleta.')
    const data = initial(); const seen = new Set(data.cards.map(keyOf))
    for (const item of x.imported) { const word = cleanWord(item); if (!word) throw Error('La copia antigua contiene una tarjeta incompleta.'); if (!seen.has(keyOf(word))) { data.cards.push(word); seen.add(keyOf(word)) } }
    for (const word of data.cards) { const old = x.schedule[keyOf(word)]; if (!old) continue; const due = new Date(old.due); if (isNaN(due.getTime())) throw Error('La copia antigua contiene una fecha inválida.')
      const card = createEmptyCard(); card.due = due; card.state = State.Review; card.stability = Math.max(0.1, Number(old.interval) || 0.1); card.difficulty = 5; card.reps = Math.max(1, Number(old.reps) || 1); card.last_review = old.last && !isNaN(new Date(old.last).getTime()) ? new Date(old.last) : new Date(due.getTime() - card.stability * 86400000); data.progress[word.id] = card
    }
    data.settings = validSettings(x.settings); data.legacyArchive = raw; return data
  }
  if (x.version !== 3 || !Array.isArray(x.cards) || !x.progress || typeof x.progress !== 'object' || !Array.isArray(x.reviews) || !x.settings) throw Error('Formato de copia no reconocido o incompleto.')
  const cards = x.cards.map(cleanWord); if (!cards.length || cards.some((c: Word | null) => !c)) throw Error('La copia contiene tarjetas incompletas.')
  const ids = new Set<string>(); const hskIds = new Set<string>(); for (const card of cards as Word[]) { if (ids.has(card.id) || (card.hskId && hskIds.has(card.hskId))) throw Error('La copia contiene tarjetas duplicadas.'); ids.add(card.id); if (card.hskId) hskIds.add(card.hskId) }
  const progress: Record<string, FSRSCard> = {}
  for (const [id, value] of Object.entries(x.progress)) { const p = value as FSRSCard; if (!ids.has(id) || !p || isNaN(new Date(p.due).getTime()) || ![0,1,2,3].includes(p.state) || !Number.isFinite(p.stability) || !Number.isFinite(p.difficulty) || !Number.isFinite(p.reps) || !Number.isFinite(p.lapses) || !Number.isFinite(p.scheduled_days) || !Number.isFinite(p.learning_steps) || (p.last_review && isNaN(new Date(p.last_review).getTime()))) throw Error('La copia contiene progreso inválido.'); progress[id] = { ...p, due: new Date(p.due), last_review: p.last_review ? new Date(p.last_review) : undefined } }
  for (const r of x.reviews) if (!r || !ids.has(r.cardId) || typeof r.id !== 'string' || isNaN(new Date(r.at).getTime()) || ![1,2,3,4].includes(r.rating)) throw Error('La copia contiene revisiones inválidas.')
  if (x.learned !== undefined && (!Array.isArray(x.learned) || x.learned.some((id: unknown) => typeof id !== 'string' || !ids.has(id)))) throw Error('La copia contiene tarjetas aprendidas inválidas.')
  return withCatalog({ version: 3, cards: cards as Word[], progress, reviews: x.reviews, learned: x.learned ?? [], settings: validSettings(x.settings), ...(x.legacyArchive ? { legacyArchive: x.legacyArchive } : {}) })
}
function validSettings(raw: any): Settings { const s = raw || {}; return { speed: Math.max(.55, Math.min(1.15, Number(s.speed) || defaults.speed)), autoplay: s.autoplay !== false, showPinyin: s.showPinyin === true, newLimit: Math.max(0, Math.min(999, Math.floor(Number.isFinite(Number(s.newLimit)) ? Number(s.newLimit) : 5))) } }



