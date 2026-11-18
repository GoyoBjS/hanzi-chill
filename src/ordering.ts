import sentenceTiles from '../data/sentence-tiles.json'
import { exampleFor, type ContextExample } from './context'
import type { Snapshot, Word } from './model'
import { shuffle } from './shuffle'

export const roundLength = 5

const tileSets: Readonly<Record<string, readonly string[]>> = sentenceTiles
type Prompt = { word: Word; example: ContextExample; parts: readonly string[] }
export type Tile = { id: number; text: string }
export type OrderQuestion = Prompt & { tiles: Tile[] }

export function orderPrompts(words: Word[], progress: Pick<Snapshot, 'progress' | 'learned'>) {
  const learned = new Set(progress.learned ?? [])
  const prompts = new Map<string, Prompt>()
  for (const word of words) {
    if (!progress.progress[word.id] && !learned.has(word.id)) continue
    const example = exampleFor(word)
    if (!example?.audioUrl || prompts.has(example.id)) continue
    const parts = tileSets[example.id]
    if (parts?.some(text => text !== parts[0])) prompts.set(example.id, { word, example, parts })
  }
  return [...prompts.values()]
}

export function orderRound(prompts: readonly Prompt[], random = Math.random): OrderQuestion[] {
  if (!prompts.length) return []
  const pool = shuffle(prompts, random)
  return Array.from({ length: roundLength }, (_, index) => {
    const prompt = pool[index % pool.length]
    const tiles = shuffle(prompt.parts.map((text, id) => ({ id, text })), random)
    if (isExampleOrder(tiles, prompt.parts)) {
      const first = tiles[0]
      const different = tiles.findIndex(tile => tile.text !== first.text)
      tiles[0] = tiles[different]
      tiles[different] = first
    }
    return { ...prompt, tiles }
  })
}

export function isExampleOrder(answer: readonly Tile[], parts: readonly string[]) {
  return answer.length === parts.length && answer.every((tile, index) => tile.text === parts[index])
}
