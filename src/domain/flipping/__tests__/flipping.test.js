import { describe, it, expect } from 'vitest'
import {
  geTax,
  createMarket,
  computeItemFlip,
  rankItemFlips,
  computeSetFlip,
  rankSetFlips,
  buildRecipes,
  normalizeLegacyRecipe
} from '../index.js'

const NOW = 1_800_000_000
const fresh = { highTime: NOW - 60, lowTime: NOW - 120 }
const item = (id, name, low, high, extra = {}) => ({ id, name, low, high, limit: 100, volume: 6000, ...fresh, ...extra })

describe('geTax', () => {
  it('takes 2% rounded down', () => expect(geTax(729_999, 4151)).toBe(14_599))
  it('caps at 5M per item', () => expect(geTax(1_000_000_000, 1)).toBe(5_000_000))
  it('exempts items under 50 gp', () => expect(geTax(49, 1)).toBe(0))
  it('exempts Old school bonds', () => expect(geTax(10_000_000, 13190)).toBe(0))
  it('handles bad input', () => expect(geTax(NaN, 1)).toBe(0))
})

describe('computeItemFlip', () => {
  const market = createMarket([item(4151, 'Abyssal whip', 711_503, 729_999, { limit: 70, volume: 5150 })], { nowSec: NOW })
  const flip = computeItemFlip(market.get(4151), { nowSec: NOW })

  it('buys low, sells high, pays tax', () => {
    expect(flip).toMatchObject({ buyAt: 711_503, sellAt: 729_999, tax: 14_599, profit: 3_897 })
  })

  it('caps quantity by buy limit and 4h share of volume', () => {
    // limit 70, 5150/6 = 858 fillable -> 70
    expect(flip.maxQty).toBe(70)
    expect(flip.potential).toBe(3_897 * 70)
  })

  it('caps by volume when the market is thin', () => {
    const thin = createMarket([item(1, 'Thin', 100, 200, { limit: 10_000, volume: 60 })], { nowSec: NOW })
    expect(computeItemFlip(thin.get(1), { nowSec: NOW }).maxQty).toBe(10)
  })

  it('assumes a buy limit of 8 when the wiki has none', () => {
    const noLimit = createMarket([item(1, 'New item', 1000, 1100, { limit: undefined, volume: 6000 })], { nowSec: NOW })
    expect(computeItemFlip(noLimit.get(1), { nowSec: NOW })).toMatchObject({ limit: 8, limitAssumed: true, maxQty: 8 })
  })

  it('flags stale prices', () => {
    const old = createMarket([item(1, 'Old', 100, 200, { highTime: NOW - 8 * 3600 })], { nowSec: NOW })
    expect(computeItemFlip(old.get(1), { nowSec: NOW }).stale).toBe(true)
    expect(flip.stale).toBe(false)
  })

  it('returns null without both prices', () => {
    const missing = createMarket([item(1, 'No low', null, 200)], { nowSec: NOW })
    expect(computeItemFlip(missing.get(1), { nowSec: NOW })).toBeNull()
  })
})

describe('rankItemFlips', () => {
  it('drops losers and sorts by potential, high to low', () => {
    const market = createMarket([
      item(1, 'Small', 100, 120), // 18 profit
      item(2, 'Big', 1000, 1200), // 176 profit
      item(3, 'Loser', 100, 101)
    ], { nowSec: NOW })
    expect(rankItemFlips(market).map(f => f.name)).toEqual(['Big', 'Small'])
  })

  it('hides fluke spreads unless asked', () => {
    const market = createMarket([item(1, 'Fluke', 10, 136_200), item(2, 'Real', 1000, 1100)], { nowSec: NOW })
    expect(rankItemFlips(market).map(f => f.name)).toEqual(['Real'])
    expect(rankItemFlips(market, { includeSuspicious: true })[0]).toMatchObject({ name: 'Fluke', suspicious: true })
  })

  it('can sort by profit per item', () => {
    const market = createMarket([
      item(1, 'High margin, tiny limit', 10_000, 11_000, { limit: 1 }),
      item(2, 'Low margin, huge limit', 100, 110, { limit: 1000 })
    ], { nowSec: NOW })
    expect(rankItemFlips(market, { sortBy: 'profit' })[0].name).toBe('High margin, tiny limit')
    expect(rankItemFlips(market)[0].name).toBe('Low margin, huge limit')
  })
})

describe('computeSetFlip', () => {
  const recipe = { id: 'ge:1', kind: 'ge-set', setId: 1, parts: [{ id: 2, qty: 1 }, { id: 3, qty: 2 }], conversionCost: 0, reversible: true }

  it('combines when parts are cheap', () => {
    const market = createMarket([
      item(1, 'Set', 9000, 10_000, { limit: 8 }),
      item(2, 'Helm', 2000, 2100, { limit: 70 }),
      item(3, 'Gauntlet', 1000, 1100, { limit: 70 })
    ], { nowSec: NOW })
    const flip = computeSetFlip(recipe, market)
    expect(flip.direction).toBe('combine')
    expect(flip.buy.map(l => [l.name, l.qty, l.price])).toEqual([['Helm', 1, 2000], ['Gauntlet', 2, 1000]])
    expect(flip.sell).toEqual([expect.objectContaining({ name: 'Set', price: 10_000 })])
    expect(flip.cost).toBe(4000)
    expect(flip.profit).toBe(10_000 - 4000 - 200)
    // limits: 70/1, 70/2 -> 35 sets
    expect(flip.maxSets).toBe(35)
  })

  it('splits when the set is cheap', () => {
    const market = createMarket([
      item(1, 'Set', 3000, 3100, { limit: 8 }),
      item(2, 'Helm', 2000, 2100),
      item(3, 'Gauntlet', 1000, 1100)
    ], { nowSec: NOW })
    const flip = computeSetFlip(recipe, market)
    expect(flip.direction).toBe('split')
    expect(flip.cost).toBe(3000)
    expect(flip.revenue).toBe(2100 + 2200)
    expect(flip.tax).toBe(42 + 22 * 2)
    expect(flip.maxSets).toBe(8)
  })

  it('never splits one-way crafted combinations', () => {
    const market = createMarket([
      item(1, 'Godsword', 3000, 3100),
      item(2, 'Blade', 2000, 2100),
      item(3, 'Hilt', 1000, 1100)
    ], { nowSec: NOW })
    const flip = computeSetFlip({ ...recipe, reversible: false, kind: 'combine' }, market)
    expect(flip.direction).toBe('combine')
    expect(flip.profit).toBeLessThan(0)
  })

  it('includes conversion cost', () => {
    const market = createMarket([item(1, 'Set', 9000, 10_000), item(2, 'A', 1000, 1100), item(3, 'B', 1000, 1100)], { nowSec: NOW })
    const flip = computeSetFlip({ ...recipe, reversible: false, conversionCost: 500 }, market)
    expect(flip.cost).toBe(1000 + 2000 + 500)
  })

  it('limits sets by the thinnest market', () => {
    const market = createMarket([
      item(1, 'Set', 9000, 10_000, { volume: 6000 }),
      item(2, 'Helm', 2000, 2100, { volume: 60 }), // 10 fillable / 4h
      item(3, 'Gauntlet', 1000, 1100)
    ], { nowSec: NOW })
    expect(computeSetFlip(recipe, market).maxSets).toBe(10)
  })

  it('returns null when any price is missing', () => {
    const market = createMarket([item(1, 'Set', 9000, 10_000), item(2, 'Helm', null, 2100), item(3, 'G', 1, 2)], { nowSec: NOW })
    expect(computeSetFlip(recipe, market)).toBeNull()
  })
})

describe('recipes', () => {
  it('normalizes legacy recipes with repeats and qty overrides', () => {
    expect(normalizeLegacyRecipe({ name: 'Sunfire', itemSet: 9, itemsToCreateSet: [1, 2, 2] }).parts)
      .toEqual([{ id: 1, qty: 1 }, { id: 2, qty: 2 }])
    expect(normalizeLegacyRecipe({ name: 'Venator', itemSet: 9, itemsToCreateSet: [5], qty: { id: 5, qty: 5 } }).parts)
      .toEqual([{ id: 5, qty: 5 }])
  })

  it('rejects recipes that contain their own set', () => {
    expect(normalizeLegacyRecipe({ name: 'Bad', itemSet: 9, itemsToCreateSet: [1, 9] })).toBeNull()
  })

  it('prefers GE sets over duplicate crafted recipes', () => {
    const recipes = buildRecipes(
      [{ name: 'Dup', itemSet: 100, itemsToCreateSet: [1, 2] }, { name: 'Godsword', itemSet: 200, itemsToCreateSet: [3, 4] }],
      [{ setId: 100, name: 'Set', parts: [{ id: 1, qty: 1 }, { id: 2, qty: 1 }] }]
    )
    expect(recipes.map(r => [r.setId, r.kind, r.reversible])).toEqual([[100, 'ge-set', true], [200, 'combine', false]])
  })

  it('ships the generated GE set list', () => {
    expect(buildRecipes().length).toBeGreaterThan(100)
  })
})

describe('rankSetFlips', () => {
  it('sorts by 4h potential, high to low', () => {
    const recipes = [
      { id: 'a', kind: 'ge-set', setId: 1, parts: [{ id: 2, qty: 1 }], conversionCost: 0, reversible: true },
      { id: 'b', kind: 'ge-set', setId: 3, parts: [{ id: 4, qty: 1 }], conversionCost: 0, reversible: true }
    ]
    const market = createMarket([
      item(1, 'Small set', 1000, 1100), item(2, 'Small part', 900, 1000),
      item(3, 'Big set', 10_000, 11_000), item(4, 'Big part', 9000, 10_000)
    ], { nowSec: NOW })
    expect(rankSetFlips(recipes, market).map(f => f.name)).toEqual(['Big set', 'Small set'])
  })
})

describe('review regressions', () => {
  it('hides items with no trades in the last day but keeps unknown volume', () => {
    const market = createMarket([
      item(1, 'Dead', 1000, 1100, { volume: 0 }),
      item(2, 'Unknown volume', 1000, 1100, { volume: null })
    ], { nowSec: NOW })
    expect(rankItemFlips(market).map(f => f.name)).toEqual(['Unknown volume'])
    expect(computeItemFlip(market.get(2), { nowSec: NOW }).maxQty).toBe(100)
  })

  it('hides sets whose quantity exceeds the buy limit', () => {
    const recipe = { id: 'x', kind: 'combine', setId: 1, parts: [{ id: 2, qty: 150_000 }], conversionCost: 0, reversible: false }
    const market = createMarket([item(1, 'Heart', 1_000_000, 1_100_000), item(2, 'Mote', 1, 2, { limit: 25_000, volume: 1e9 })], { nowSec: NOW })
    expect(computeSetFlip(recipe, market).maxSets).toBe(0)
    expect(rankSetFlips([recipe], market)).toEqual([])
  })

  it('labels crafted recipes that make the same item', () => {
    const recipes = buildRecipes([
      { name: 'Pirate Hat', itemSet: 8928, itemsToCreateSet: [1, 2] },
      { name: 'Pirate hat & patch', itemSet: 8928, itemsToCreateSet: [3, 2] },
      { name: 'Solo', itemSet: 9000, itemsToCreateSet: [4] }
    ], [])
    expect(recipes.map(r => r.variant ?? null)).toEqual(['Pirate Hat', 'Pirate hat & patch', null])
  })
})

describe('market items', () => {
  it('carry the high alch value for the alchemy tool', () => {
    const market = createMarket([item(1, 'Staff', 8000, 8600, { highalch: 9300 })], { nowSec: NOW })
    expect(market.get(1).highalch).toBe(9300)
  })
})
