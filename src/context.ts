import examples from '../data/context-examples.json'
import type { Word } from './model'
import { shuffle } from './shuffle'

export interface ContextExample {
  id: string
  hanzi: string
  pinyin: string
  meaning: string
  hskIds: string[]
  audioUrl: string
  lastOccurrence?: string[]
}

export const contextExamples: ContextExample[] = examples
const byWord = new Map(contextExamples.flatMap(example => example.hskIds.map(id => [id, example] as const)))
export const exampleFor = (word: Pick<Word, 'hskId'>) => word.hskId ? byWord.get(word.hskId) : undefined

export function splitExample(example: ContextExample, word: Pick<Word, 'hanzi' | 'hskId'>) {
  const index = word.hskId && example.lastOccurrence?.includes(word.hskId)
    ? example.hanzi.lastIndexOf(word.hanzi)
    : example.hanzi.indexOf(word.hanzi)
  return index < 0 ? undefined : [example.hanzi.slice(0, index), example.hanzi.slice(index + word.hanzi.length)] as const
}

export function contextQuestion(words: Word[], blank: boolean, previousId?: string) {
  const candidates = words.flatMap(word => {
    const example = exampleFor(word)
    if (!example || !splitExample(example, word) || (blank && example.hanzi.indexOf(word.hanzi) !== example.hanzi.lastIndexOf(word.hanzi))) return []
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
