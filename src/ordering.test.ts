import { describe, expect, it } from 'vitest'
import { Rating } from 'ts-fsrs'
import sentenceTiles from '../data/sentence-tiles.json'
import { contextExamples } from './context'
import { initial, rate, toggleLearned } from './model'
import { isExampleOrder, orderPrompts, orderRound } from './ordering'

describe('ordena la frase', () => {
  it('tiene piezas que reconstruyen todas las frases del mazo', () => {
    const parts: Record<string, string[]> = sentenceTiles
    expect(Object.keys(parts).sort()).toEqual(contextExamples.map(example => example.id).sort())
    for (const example of contextExamples) {
      const pieces = parts[example.id]
      expect(pieces.join('')).toBe(example.hanzi.replace(/\p{Punctuation}/gu, ''))
      expect(pieces.length).toBeLessThanOrEqual(8)
      expect(new Set(pieces).size).toBeGreaterThan(1)
    }
  })

  it('repite únicamente frases de tarjetas vistas si aún hay pocos ejemplos', () => {
    const data = initial()
    const me = data.cards.find(word => word.hanzi === '我')!
    const water = data.cards.find(word => word.hanzi === '水')!
    const thanks = data.cards.find(word => word.hanzi === '谢谢')!
    expect(orderRound(orderPrompts(data.cards, data))).toEqual([])
    const seen = toggleLearned(toggleLearned(rate(data, me.id, Rating.Good), water.id), thanks.id)
    const prompts = orderPrompts(data.cards, seen)
    expect(prompts.map(prompt => prompt.example.id).sort()).toEqual(['context-002', 'context-003'])
    const round = orderRound(prompts, () => 0.99)
    expect(round.map(question => question.example.id)).toEqual([
      prompts[0].example.id, prompts[1].example.id, prompts[0].example.id, prompts[1].example.id, prompts[0].example.id,
    ])
    expect(orderPrompts([water], seen)).toHaveLength(1)
    expect(orderRound(orderPrompts([water], seen))).toHaveLength(5)
  })

  it('elige cinco ejemplos distintos cuando puede y desordena incluso con piezas iguales', () => {
    const data = initial()
    const prompts = orderPrompts(data.cards, { progress: {}, learned: data.cards.map(card => card.id) })
    const round = orderRound(prompts, () => 0.99)
    expect(round).toHaveLength(5)
    expect(new Set(round.map(question => question.example.id)).size).toBe(5)
    for (const question of round) {
      expect(isExampleOrder(question.tiles, question.parts)).toBe(false)
      const ordered = [...question.tiles].sort((left, right) => left.id - right.id)
      expect(isExampleOrder(ordered, question.parts)).toBe(true)
    }
    const duplicate = prompts.find(prompt => prompt.example.id === 'context-089')!
    const [question] = orderRound([duplicate], () => 0.99)
    expect(new Set(question.tiles.map(tile => tile.id)).size).toBe(question.parts.length)
    expect(isExampleOrder(question.tiles, question.parts)).toBe(false)
  })
})
