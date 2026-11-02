import { offlineAudioUrls, type Word } from './model'

export type ListeningKind = 'words' | 'tones'
export type WordQuestion = { kind: 'words'; target: Word; choices: Word[] }
export type ToneQuestion = { kind: 'tones'; target: Word; syllable: string; tone: number }
export type ListeningQuestion = WordQuestion | ToneQuestion

// Pares de una sola sílaba con lecturas diferentes; se usan solo las grabaciones locales del mazo.
const toneGroups: { syllable: string; items: [string, number][] }[] = [
  { syllable: 'ban', items: [['w00007', 4], ['w00304', 1]] },
  { syllable: 'da', items: [['w00025', 4], ['w00327', 3]] },
  { syllable: 'mai', items: [['w00116', 3], ['w00117', 4]] },
  { syllable: 'shui', items: [['w00192', 3], ['w00194', 4]] },
  { syllable: 'xiao', items: [['w00234', 3], ['w00463', 4]] },
  { syllable: 'yu', items: [['w00267', 3], ['w00483', 2]] },
  { syllable: 'you', items: [['w00263', 3], ['w00477', 2], ['w00481', 4]] },
]
const bundledAudio = new Set(offlineAudioUrls.map(path => path.replace(/^\//, '')))
const pick = <T,>(items: T[], random: () => number) => items[Math.floor(random() * items.length)]
function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]] }
  return result
}
function hasOfflineAudio(word: Word) { return !!word.audioUrl && bundledAudio.has(word.audioUrl.replace(/^\//, '')) }
function readings(word: Word): string[] {
  return word.pinyin.normalize('NFC').toLocaleLowerCase().split('/').map(part => part.replace(/[\s’'\-]/g, '')).filter(Boolean)
}
function differentSound(a: Word, b: Word): boolean {
  const first = readings(a), second = readings(b)
  return first.length > 0 && second.length > 0 && first.every(reading => !second.includes(reading))
}

export function makeWordQuestion(words: Word[], previousId?: string, random = Math.random): WordQuestion | null {
  const unique = new Map<string, Word>()
  for (const word of words) if (hasOfflineAudio(word) && !unique.has(word.hanzi.normalize('NFKC'))) unique.set(word.hanzi.normalize('NFKC'), word)
  const pool = [...unique.values()]
  const validTargets = pool.filter(word => pool.some(other => other.id !== word.id && differentSound(word, other)))
  if (!validTargets.length) return null
  const candidates = validTargets.filter(word => word.id !== previousId)
  const target = pick(candidates.length ? candidates : validTargets, random)
  const others: Word[] = []
  for (const word of shuffle(pool, random)) {
    if (word.id !== target.id && [target, ...others].every(choice => differentSound(word, choice))) others.push(word)
    if (others.length === 3) break
  }
  return { kind: 'words', target, choices: shuffle([target, ...others], random) }
}

export function makeToneQuestion(words: Word[], previousId?: string, random = Math.random): ToneQuestion | null {
  const byId = new Map(words.filter(hasOfflineAudio).map(word => [word.hskId, word]))
  const possible = toneGroups.flatMap(group => {
    const entries = group.items.flatMap(([id, tone]) => { const word = byId.get(id); return word ? [{ kind: 'tones' as const, target: word, syllable: group.syllable, tone }] : [] })
    return new Set(entries.map(entry => entry.tone)).size >= 2 ? entries : []
  })
  if (!possible.length) return null
  const candidates = possible.filter(question => question.target.id !== previousId)
  return pick(candidates.length ? candidates : possible, random)
}
