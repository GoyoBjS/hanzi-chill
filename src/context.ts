import examples from '../data/context-examples.json'
import hskDeck from '../data/hsk3-levels-1-2.json'
import type { Word } from './model'
import { shuffle } from './shuffle'

export interface Sentence {
  hanzi: string
  pinyin: string
  meaning: string
}

export interface ContextExample extends Sentence {
  id: string
  hskIds: string[]
  audioUrl?: string
  variants?: Pick<Word, 'hanzi' | 'pinyin'>[]
  lastOccurrence?: string[]
}

export const contextExamples: ContextExample[] = examples
const byWord = new Map(contextExamples.flatMap(example => example.hskIds.map(id => [id, example] as const)))
const readingKey = (word: Pick<Word, 'hanzi' | 'pinyin'>) =>
  `${word.hanzi.normalize('NFKC').trim()}|${word.pinyin.normalize('NFKC').toLowerCase().replace(/[\s’'-]/gu, '')}`
const byReading = new Map<string, ContextExample | null>()
for (const word of hskDeck) {
  const example = byWord.get(word.hskId)
  if (!example) continue
  for (const pinyin of word.pinyin.split('/')) {
    const key = readingKey({ hanzi: word.hanzi, pinyin })
    const previous = byReading.get(key)
    byReading.set(key, previous === undefined || previous === example ? example : null)
  }
}
for (const example of contextExamples) {
  for (const word of example.variants ?? []) byReading.set(readingKey(word), example)
}

export function exampleFor(word: Pick<Word, 'id' | 'hanzi' | 'pinyin' | 'hskId' | 'example'>): ContextExample | undefined {
  if (word.example) return { ...word.example, id: word.id, hskIds: [] }
  const linked = word.hskId && byWord.get(word.hskId)
  return linked || byReading.get(readingKey(word)) || undefined
}

export function splitExample(example: ContextExample, word: Pick<Word, 'hanzi' | 'hskId'>) {
  const index = word.hskId && example.lastOccurrence?.includes(word.hskId)
    ? example.hanzi.lastIndexOf(word.hanzi)
    : example.hanzi.indexOf(word.hanzi)
  return index < 0 ? undefined : [example.hanzi.slice(0, index), example.hanzi.slice(index + word.hanzi.length)] as const
}

export function contextQuestion(words: Word[], blank: boolean, previousId?: string) {
  const candidates = words.flatMap(word => {
    const example = exampleFor(word)
    if (!example || !splitExample(example, word)) return []
    if (blank ? example.hanzi.indexOf(word.hanzi) !== example.hanzi.lastIndexOf(word.hanzi) : !example.audioUrl) return []
    return [{ word, example }]
  })
  const fresh = candidates.filter(item => (blank ? item.word.id : item.example.id) !== previousId)
  const pool = fresh.length ? fresh : candidates
  const question = pool[Math.floor(Math.random() * pool.length)]
  if (!question) return undefined
  const choices = new Map<string, Word>()
  if (blank) {
    for (const { word } of candidates) {
      if (word.hanzi !== question.word.hanzi && word.meaning !== question.word.meaning) choices.set(word.hanzi, word)
    }
    if (!choices.size) return undefined
  }
  const distractors = shuffle([...choices.values()]).slice(0, 3)
  return { ...question, choices: shuffle([question.word, ...distractors]) }
}
