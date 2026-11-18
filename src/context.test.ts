import { describe, expect, it } from 'vitest'
import { Rating } from 'ts-fsrs'
import hsk from '../data/hsk3-levels-1-2.json'
import { contextExamples, contextQuestion, exampleFor, splitExample } from './context'
import { initial, offlineAudioUrls, rate, restore, toggleLearned, withCatalog } from './model'

describe('frases de contexto', () => {
  it('asocia cada palabra a una frase que la contiene y a un audio local distinto', () => {
    const ids = contextExamples.flatMap(example => example.hskIds)
    expect(contextExamples).toHaveLength(40)
    expect(hsk.filter(card => card.hskLevel === 1 && ids.includes(card.hskId)).length).toBeGreaterThanOrEqual(100)
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

  it('resalta la palabra completa y las preguntas evitan dejar la solución repetida a la vista', () => {
    const cards = initial().cards
    const cinema = cards.find(word => word.hanzi === '电影')!
    const classifier = cards.find(word => word.hskId === 'w00287')!
    const tea = cards.find(word => word.hanzi === '茶')!
    const thanks = cards.find(word => word.hanzi === '谢谢')!
    expect(splitExample(exampleFor(cinema)!, cinema)).toEqual(['晚上我们去电影院看', '吧。'])
    expect(contextQuestion([classifier, tea], true)).toBeUndefined()
    const question = contextQuestion([classifier, tea, thanks], true, tea.id)!
    expect(question.word.id).toBe(thanks.id)
    expect(question.choices.map(word => word.id).sort()).toEqual([tea.id, thanks.id].sort())
    expect(contextQuestion([tea, thanks], false, exampleFor(tea)!.id)?.word.id).toBe(thanks.id)
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
