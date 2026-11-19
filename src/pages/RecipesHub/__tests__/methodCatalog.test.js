import { describe, expect, it } from 'vitest'
import { createMarket } from '../../../domain/flipping/index.js'
import { DEFAULT_METHOD_KEY, METHODS, findMethod, rankMethod, recipeMeta } from '../methodCatalog.js'
import { dailyVolumes } from '../useWikiMarket.js'

const NOW = 1_800_000_000

describe('method catalog', () => {
  it('lists the live methods plus every wiki processing method, with unique keys', () => {
    const keys = METHODS.map(m => m.key)
    expect(new Set(keys).size).toBe(keys.length)
    expect(keys).toEqual(expect.arrayContaining(['money-makers', 'decanting', 'unfinished-potions', 'herb-cleaning', 'sawmill', 'tanning', 'smelting']))
    METHODS.forEach(m => expect(m.sorts.map(s => s.value)).toContain(m.defaultSort))
  })

  it('falls back to money makers for unknown keys', () => {
    expect(findMethod('nope').key).toBe(DEFAULT_METHOD_KEY)
    expect(findMethod('tanning').key).toBe('tanning')
  })

  it('exposes wiki guide details for money makers', () => {
    const first = findMethod('money-makers').recipes()[0]
    expect(recipeMeta(first.id)?.source).toMatch(/^https:\/\/oldschool\.runescape\.wiki\//)
  })
})

describe('rankMethod', () => {
  const method = {
    key: 'test',
    defaultSort: 'profit',
    recipes: () => [
      { id: 'a', name: 'Good one', inputs: [{ id: 1, qty: 1 }], outputs: [{ id: 2, qty: 1 }], coinCost: 0 },
      { id: 'b', name: 'Loser', inputs: [{ id: 2, qty: 1 }], outputs: [{ id: 1, qty: 1 }], coinCost: 0 }
    ]
  }
  const market = createMarket([
    { id: 1, name: 'Input', limit: 1000, low: 100, high: 105, lowTime: NOW, highTime: NOW, dailyVolume: 60000 },
    { id: 2, name: 'Output', limit: 1000, low: 110, high: 120, lowTime: NOW, highTime: NOW, dailyVolume: 60000 }
  ], { nowSec: NOW })

  it('keeps only profitable recipes', () => {
    const ranked = rankMethod(market, method)
    expect(ranked.map(f => f.id)).toEqual(['a'])
    expect(ranked[0].profit).toBeGreaterThan(0)
  })

  it('filters by name, case-insensitively', () => {
    expect(rankMethod(market, method, { query: 'GOOD' })).toHaveLength(1)
    expect(rankMethod(market, method, { query: 'zzz' })).toHaveLength(0)
  })
})

describe('dailyVolumes', () => {
  it('sums the 24h high and low volume per item', () => {
    expect(dailyVolumes({ 4151: { highPriceVolume: 9000, lowPriceVolume: 5000 }, 2: {} })).toEqual({ 4151: 14000, 2: 0 })
    expect(dailyVolumes(undefined)).toEqual({})
  })
})
