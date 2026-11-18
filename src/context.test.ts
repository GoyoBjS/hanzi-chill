import { describe, expect, it } from 'vitest'
import { Rating } from 'ts-fsrs'
import hsk from '../data/hsk3-levels-1-2.json'
import extraCsv from '../data/vocabulario_chino_extra.csv?raw'
import { contextExamples, contextQuestion, exampleFor, splitExample } from './context'
import { initial, offlineAudioUrls, parseVocabulary, rate, restore, toggleLearned, withCatalog } from './model'

describe('frases de contexto', () => {
  it('asocia cada palabra a una frase que la contiene y a un audio local distinto', () => {
    const ids = contextExamples.flatMap(example => example.hskIds)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.sort()).toEqual(hsk.map(card => card.hskId).sort())
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

  it('cubre el mazo inicial y el vocabulario extra con sus grafías y lecturas originales', () => {
    const deck = initial().cards
    const extras = parseVocabulary(extraCsv, deck).cards
    expect(extras.some(word => word.hanzi === '西班牙语')).toBe(true)
    for (const word of [...deck, ...extras]) {
      const sentence = exampleFor(word)
      expect(sentence?.audioUrl, word.hanzi + ' ' + word.pinyin).toBeTruthy()
      expect(splitExample(sentence!, word)).toBeDefined()
    }
    const flower = hsk.find(word => word.hskId === 'w00358')!
    const spend = hsk.find(word => word.hskId === 'w00357')!
    expect(exampleFor(flower)?.meaning).toContain('flores')
    expect(exampleFor(spend)?.meaning).toContain('gasté')
  })

  it('conserva los ejemplos propios de CSV en la copia y valida los tres campos', () => {
    const data = initial()
    const csv = [
      'hanzi,pinyin,meaning,example_hanzi,example_pinyin,example_meaning',
      '企鹅,qǐ’é,pingüino,那只企鹅在游泳。,Nà zhī qǐ’é zài yóuyǒng.,Ese pingüino está nadando.',
      '茄子,qiézi,berenjena,这是一只猫。,Zhè shì yì zhī māo.,Esto es un gato.',
    ].join('\n')
    const result = parseVocabulary(csv, data.cards)
    expect(result.invalid).toBe(1)
    expect(result.cards).toHaveLength(1)
    const copy = restore(JSON.parse(JSON.stringify({ ...data, cards: [...data.cards, ...result.cards] })))
    const word = copy.cards.find(card => card.hanzi === '企鹅')!
    expect(exampleFor(word)?.meaning).toBe('Ese pingüino está nadando.')
    expect(contextQuestion([word], false)).toBeUndefined()
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
