import { describe, expect, it } from 'vitest'
import { initial, offlineAudioUrls, type Word } from './model'
import { makeToneQuestion, makeWordQuestion } from './listening'
import { belongsToTopic, topics } from './topics'

const find = (id: string): Word => {
  const word = initial().cards.find(card => card.hskId === id)
  if (!word) throw Error(`Falta ${id}`)
  return word
}

describe('práctica de oído', () => {
  it('elige palabras diferentes con audios incluidos y evita repetir el objetivo anterior', () => {
    const words = initial().cards
    const first = makeWordQuestion(words, undefined, () => 0)
    expect(first).not.toBeNull()
    expect(first!.choices).toContainEqual(first!.target)
    expect(new Set(first!.choices.map(w => w.hanzi)).size).toBe(first!.choices.length)
    expect(first!.choices).toHaveLength(4)
    expect(offlineAudioUrls).toContain(first!.target.audioUrl)
    const next = makeWordQuestion(words, first!.target.id, () => 0)
    expect(next!.target.id).not.toBe(first!.target.id)
    expect(makeWordQuestion([first!.target])).toBeNull()
  })
  it('solo propone tonos si hay dos lecturas de una misma sílaba con audio local', () => {
    const buy = find('w00116'), sell = find('w00117')
    const first = makeToneQuestion([buy, sell], undefined, () => 0)
    expect(first).toMatchObject({ syllable: 'mai', tone: 3, target: { hanzi: '买' } })
    expect(makeToneQuestion([buy, sell], first!.target.id, () => 0)).toMatchObject({ syllable: 'mai', tone: 4, target: { hanzi: '卖' } })
    expect(makeToneQuestion([buy])).toBeNull()
    expect(makeToneQuestion([{ ...buy, audioUrl: undefined }, sell])).toBeNull()
  })
  it('no enfrenta homófonos que no se pueden distinguir al escucharlos', () => {
    const he = find('w00200'), it = find('w00201'), she = find('w00202'), person = find('w00170')
    expect(makeWordQuestion([he, it, she])).toBeNull()
    const question = makeWordQuestion([he, it, she, person], undefined, () => 0)!
    expect(question.choices).toHaveLength(2)
    expect(new Set(question.choices.map(word => word.pinyin)).size).toBe(2)
  })
})

describe('temas cotidianos', () => {
  it('agrupa todas las entradas HSK y admite varias situaciones', () => {
    const cards = initial().cards.filter(card => card.hskId)
    expect(cards).toHaveLength(500)
    expect(cards.every(card => topics.some(topic => belongsToTopic(card, topic.id)))).toBe(true)
    expect(belongsToTopic(find('w00017'), 'comer')).toBe(true)
    expect(belongsToTopic(find('w00272'), 'conversar')).toBe(true)
    expect(belongsToTopic(find('w00357'), 'naturaleza')).toBe(false)
    expect(belongsToTopic(find('w00358'), 'naturaleza')).toBe(true)
    expect(belongsToTopic({ hanzi: '企鹅' }, 'other')).toBe(true)
  })
})
