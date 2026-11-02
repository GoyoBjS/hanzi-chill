import { describe, expect, it } from 'vitest'
import { Rating } from 'ts-fsrs'
import hsk from '../data/hsk3-levels-1-2.json'
import { contextExamples, exampleFor } from './context'
import { initial, offlineAudioUrls, rate, restore, toggleLearned, withCatalog } from './model'

describe('frases de contexto', () => {
  it('asocia cada palabra a una frase que la contiene y a un audio local distinto', () => {
    const ids = contextExamples.flatMap(example => example.hskIds)
    expect(contextExamples).toHaveLength(18)
    expect(ids).toHaveLength(38)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(contextExamples.map(example => example.audioUrl)).size).toBe(contextExamples.length)
    for (const example of contextExamples) {
      expect(example.pinyin && example.meaning).toBeTruthy()
      expect(offlineAudioUrls).toContain(example.audioUrl)
      for (const id of example.hskIds) {
        const word = hsk.find(card => card.hskId === id)
        expect(word).toBeDefined()
        expect(example.hanzi).toContain(word!.hanzi)
        expect(exampleFor(word!)).toEqual(example)
      }
    }
  })

  it('encuentra el ejemplo de una tarjeta antigua sin alterar su identidad ni su progreso', () => {
    let old = initial()
    const word = old.cards.find(card => card.hanzi === '你')!
    old = toggleLearned(rate(old, word.id, Rating.Good, new Date('2026-11-02T12:00:00Z')), word.id)
    old.cards = old.cards.map(({ hskId: _id, hskLevel: _level, categories: _categories, ...card }) => card)
    const updated = withCatalog(old)
    const restored = restore(JSON.parse(JSON.stringify(updated)))
    expect(restored.cards.find(card => card.id === word.id)?.hskId).toBe(word.hskId)
    expect(exampleFor(restored.cards.find(card => card.id === word.id)!)?.hanzi).toBe('谢谢你！')
    expect(restored.progress[word.id].reps).toBe(1)
    expect(restored.learned).toContain(word.id)
    expect(restored.reviews).toHaveLength(1)
  })
})
