import { describe, expect, it } from 'vitest'
import { Rating } from 'ts-fsrs'
import { initial, eligible, keyOf, parseVocabulary, rate, restore, shuffleIds, stats, toggleLearned, withCatalog } from './model'

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
    const result = parseVocabulary('hanzi\tpinyin\tmeaning\n你\tnǐ\ttú\n企鹅\tqǐé\t"pingüino, ave"\n好\t\tbien', data.cards)
    expect(result.cards).toHaveLength(1); expect(result.cards[0].meaning).toBe('pingüino, ave'); expect(result.duplicates).toBe(1); expect(result.invalid).toBe(1)
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
describe('catálogo y tarjetas aprendidas', () => {
  it('agrega los dos niveles a una instalación existente sin perder identidades ni progreso', () => {
    const existing = initial(); existing.cards = existing.cards.filter(c => c.id.startsWith('base-')).map(({ hskId: _h, hskLevel: _l, categories: _c, ...card }) => card)
    existing.cards.push({ id: 'imported-123', hanzi: '你们', pinyin: 'nǐmen', meaning: 'vosotros' })
    const id = existing.cards[0].id; const now = new Date('2026-11-02T12:00:00Z')
    const reviewed = rate(rate(existing, id, Rating.Good, now), 'imported-123', Rating.Good, now); const upgraded = withCatalog(reviewed)
    expect(upgraded.cards.filter(c => c.hskLevel === 1)).toHaveLength(300)
    expect(upgraded.cards.filter(c => c.hskLevel === 2)).toHaveLength(200)
    expect(upgraded.cards.filter(c => c.hanzi === '你')).toHaveLength(1)
    expect(upgraded.cards.find(c => c.hanzi === '你')?.id).toBe(id)
    expect(upgraded.cards.filter(c => c.hanzi === '你们')).toHaveLength(1)
    expect(upgraded.cards.find(c => c.hanzi === '你们')?.id).toBe('imported-123')
    expect(upgraded.progress['imported-123'].reps).toBe(1)
    expect(upgraded.progress[id].reps).toBe(1)
    expect(withCatalog(upgraded).cards).toHaveLength(upgraded.cards.length)
    expect(restore(JSON.parse(JSON.stringify(upgraded))).cards.filter(c => c.hanzi === '花')).toHaveLength(2)
  })
  it('aparta y recupera las aprendidas sin modificar FSRS y conserva el estado en la copia', () => {
    const data = initial(); const id = data.cards[0].id
    const learned = toggleLearned(data, id)
    expect(eligible(learned).some(c => c.id === id)).toBe(false)
    expect(restore(JSON.parse(JSON.stringify(learned))).learned).toContain(id)
    expect(eligible(toggleLearned(learned, id)).some(c => c.id === id)).toBe(true)
    expect(learned.progress).toEqual(data.progress)
  })
  it('baraja sin perder ni duplicar tarjetas', () => {
    const words = initial().cards.slice(0, 6); const ids = shuffleIds(words, () => 0)
    expect(new Set(ids)).toEqual(new Set(words.map(c => c.id)))
    expect(ids).not.toEqual(words.map(c => c.id))
  })
})

