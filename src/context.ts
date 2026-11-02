import examples from '../data/context-examples.json'
import type { Word } from './model'

export interface ContextExample {
  id: string
  hanzi: string
  pinyin: string
  meaning: string
  hskIds: string[]
  audioUrl: string
}

export const contextExamples: ContextExample[] = examples
const byWord = new Map(contextExamples.flatMap(example => example.hskIds.map(id => [id, example] as const)))
export const exampleFor = (word: Pick<Word, 'hskId'>) => word.hskId ? byWord.get(word.hskId) : undefined
