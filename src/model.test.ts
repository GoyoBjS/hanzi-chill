import { describe, expect, it } from 'vitest'
import { Rating } from 'ts-fsrs'
import { initial, eligible, keyOf, parseVocabulary, rate, restore, stats } from './model'

describe('repaso FSRS', () => {
  it('programa y conserva las cuatro calificaciones y limita las nuevas', () => {
    const now = new Date('2026-11-02T12:00:00Z'); let data = initial(); data.settings.newLimit = 1
    const id = data.cards[0].id
    data = rate(data, id, Rating.Good, now)
    expect(data.progress[id].reps).toBe(1)
    expect(new Date(data.progress[id].due).getTime()).toBeGreaterThan(now.getTime())
    expect(stats(data, now).newLeft).toBe(0)
    expect(eligible(data, now)).toHaveLength(0)
    const imported = restore(JSON.parse(JSON.stringify(data)))
    expect(imported.progress[id].reps).toBe(1)
    expect(imported.reviews).toHaveLength(1)
    for (const rating of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]) expect(rate(initial(), id, rating, now).progress[id].due).toBeInstanceOf(Date)
  })
})
describe('importaciones', () => {
  it('valida, admite comillas y tabuladores, y deduplica hanzi y pinyin', () => {
    const data = initial()
    const result = parseVocabulary('hanzi\tpinyin\tmeaning\n你\tnǐ\ttú\n我们\twǒmen\t"nosotros, nosotras"\n好\t\tbien', data.cards)
    expect(result.cards).toHaveLength(1); expect(result.cards[0].meaning).toBe('nosotros, nosotras'); expect(result.duplicates).toBe(1); expect(result.invalid).toBe(1)
    expect(() => parseVocabulary('hanzi,meaning\n你,tú', data.cards)).toThrow()
  })
  it('conserva la copia antigua y traduce la fecha de vencimiento', () => {
    const base = initial().cards[0]; const legacy = { version: 2, imported: [], settings: { speed: .65 }, schedule: { [keyOf(base)]: { due: 1800000000000, interval: 3, reps: 2 } } }
    const data = restore(legacy); expect(data.legacyArchive).toEqual(legacy); expect(data.progress[base.id].due.getTime()).toBe(1800000000000); expect(data.settings.speed).toBe(.65); const reviewed = rate(data, base.id, Rating.Good, new Date(1800000000000)); expect(stats(reviewed, new Date(1800000000000)).newLeft).toBe(5)
  })
  it('rechaza copias corruptas antes de sustituir los datos', () => {
    expect(() => restore({ version: 3, cards: [], settings: {}, progress: {}, reviews: [] })).toThrow()
    expect(() => restore({ version: 2, imported: [], schedule: { [keyOf(initial().cards[0])]: { due: 'inválida' } } })).toThrow()
  })
})

