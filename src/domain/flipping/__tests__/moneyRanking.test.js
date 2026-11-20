// Ranking by what a player can actually earn: set direction picked after caps,
// processing capped by action speed, flukes judged per quote, high alchemy.
import { describe, expect, it } from 'vitest'
import {
  HIGH_ALCH_CASTS_PER_HOUR,
  computeProcessFlip,
  computeSetFlip,
  computeSetFlipOptions,
  createMarket,
  highAlchRecipes,
  rankProcessFlips,
  rankSetFlips,
  withBudget
} from '../index.js'

const NOW = 1_800_000_000
const item = (id, name, low, high, extra = {}) => ({ id, name, low, high, limit: 100, volume: 600_000, highTime: NOW - 60, lowTime: NOW - 60, ...extra })

describe('set direction is chosen after buy-limit and volume caps', () => {
  const recipe = { id: 'ge:1', kind: 'ge-set', setId: 1, parts: [{ id: 2, qty: 1 }, { id: 3, qty: 1 }], conversionCost: 0, reversible: true }
  // Combine: 300 profit each but the set's parts have a buy limit of 2.
  // Split: 100 profit each, the set's buy limit is 1,000.
  const market = createMarket([
    item(1, 'Set', 9_700, 10_300, { limit: 1_000 }),
    item(2, 'Top', 4_800, 4_950, { limit: 2 }),
    item(3, 'Legs', 4_800, 4_950, { limit: 2 })
  ], { nowSec: NOW })

  it('exposes both directions', () => {
    const options = computeSetFlipOptions(recipe, market)
    expect(options.map(o => o.direction)).toEqual(['combine', 'split'])
  })

  it('picks the direction that earns more over 4h, not per set', () => {
    const [combine, split] = computeSetFlipOptions(recipe, market)
    expect(combine.profit).toBeGreaterThan(split.profit)
    expect(split.potential).toBeGreaterThan(combine.potential)
    expect(computeSetFlip(recipe, market).direction).toBe('split')
    expect(computeSetFlip(recipe, market, { pickBy: 'profit' }).direction).toBe('combine')
    expect(rankSetFlips([recipe], market)[0].direction).toBe('split')
  })

  it('re-picks the direction when a cash budget caps the quantity', () => {
    // 10,000 gp buys one set (split) or one set of parts (combine): combine wins per unit.
    expect(computeSetFlip(recipe, market, { budget: 10_000 }).direction).toBe('combine')
    const [flip] = rankSetFlips([recipe], market, { budget: 10_000 })
    expect(flip.direction).toBe('combine')
    expect(flip.maxSets).toBe(1)
  })
})

describe('processing 4h profit respects action speed', () => {
  const market = createMarket([
    item(1, 'Hide', 1_000, 1_050, { limit: 10_000 }),
    item(2, 'Leather', 1_500, 1_520, { limit: 10_000 })
  ], { nowSec: NOW })
  const recipe = { id: 'slow', method: 'x', inputs: [{ id: 1, qty: 1 }], outputs: [{ id: 2, qty: 1 }], coinCost: 0, actionsPerHour: 100 }

  it('caps actions at 4 hours of work', () => {
    const flip = computeProcessFlip(recipe, market)
    expect(flip.maxActions).toBe(400)
    expect(flip.potential).toBe(flip.profit * 400)
    expect(flip.perHour).toBe(flip.profit * 100)
  })

  it('is uncapped by time when the rate is unknown', () => {
    expect(computeProcessFlip({ ...recipe, actionsPerHour: null }, market).maxActions).toBe(10_000)
  })
})

describe('processing flukes are judged on the quotes, not the return', () => {
  it('keeps a high-return recipe whose quotes are all tight', () => {
    const market = createMarket([
      item(1, 'Input', 1_000, 1_010),
      item(2, 'Output', 1_600, 1_620)
    ], { nowSec: NOW })
    const recipe = { id: 'labour', method: 'x', inputs: [{ id: 1, qty: 1 }], outputs: [{ id: 2, qty: 1 }], coinCost: 0 }
    const flip = computeProcessFlip(recipe, market)
    expect(flip.roi).toBeGreaterThan(0.25)
    expect(flip.suspicious).toBe(false)
    expect(rankProcessFlips([recipe], market)).toHaveLength(1)
  })

  it('flags it when one quote is itself a wild spread', () => {
    const market = createMarket([
      item(1, 'Input', 1_000, 1_010),
      item(2, 'Output', 1_000, 1_620)
    ], { nowSec: NOW })
    const recipe = { id: 'fluke', method: 'x', inputs: [{ id: 1, qty: 1 }], outputs: [{ id: 2, qty: 1 }], coinCost: 0 }
    expect(computeProcessFlip(recipe, market).suspicious).toBe(true)
    expect(rankProcessFlips([recipe], market)).toHaveLength(0)
  })
})

describe('high alchemy', () => {
  const market = createMarket([
    item(561, 'Nature rune', 100, 110, { limit: 18_000 }),
    item(1, 'Rune platebody', 38_000, 38_500, { highalch: 39_000, limit: 70 }),
    item(2, 'Junk', 10, 12, { highalch: 5 }),
    item(3, 'No alch', 10, 12)
  ], { nowSec: NOW })
  const recipes = highAlchRecipes(market.all())

  it('builds one recipe per alchable item with the nature rune as an input', () => {
    expect(recipes.map(r => r.id)).toEqual(['alch:1', 'alch:2'])
    expect(recipes[0]).toMatchObject({ coinRevenue: 39_000, outputs: [], actionsPerHour: HIGH_ALCH_CASTS_PER_HOUR })
  })

  it('prices instant buys, pays no tax and caps by the buy limit', () => {
    const flip = computeProcessFlip(recipes[0], market, { buyQuote: 'high' })
    expect(flip).toMatchObject({ cost: 38_500 + 110, revenue: 39_000, tax: 0, profit: 390, buyQuote: 'high', maxActions: 70 })
    expect(flip.perHour).toBe(390 * 70 / 4)
  })

  it('patient buys are cheaper', () => {
    expect(computeProcessFlip(recipes[0], market).profit).toBe(39_000 - 38_000 - 100)
  })

  it('needs a nature rune price', () => {
    expect(highAlchRecipes(market.all().filter(i => i.id !== 561))).toEqual([])
  })
})

describe('council round 1 regressions', () => {
  const market = createMarket([
    item(561, 'Nature rune', 100, 110, { limit: 18_000 }),
    item(1, 'Rune platebody', 38_000, 38_500, { highalch: 39_000, limit: 70 })
  ], { nowSec: NOW })
  const [alch] = highAlchRecipes(market.all())

  it('a cash stack caps processing flips instead of dropping them', () => {
    const flips = rankProcessFlips([alch], market, { buyQuote: 'high', sortBy: 'perHour' })
    // 2 casts at 38,610 each fit in 80,000 gp.
    const [capped] = withBudget(flips, 80_000, 'perHour')
    expect(capped).toMatchObject({ maxActions: 2, potential: 390 * 2, affordable: true })
  })

  it('flags an inverted quote (instant-buy far below instant-sell)', () => {
    const inverted = createMarket([
      item(561, 'Nature rune', 100, 110),
      item(1, 'Glitch', 10_000, 1, { highalch: 10_000 })
    ], { nowSec: NOW })
    const flip = computeProcessFlip(highAlchRecipes(inverted.all())[0], inverted, { buyQuote: 'high' })
    expect(flip.suspicious).toBe(true)
    expect(rankProcessFlips(highAlchRecipes(inverted.all()), inverted, { buyQuote: 'high' })).toEqual([])
  })

  it('judges freshness on the quotes actually used', () => {
    const oldLow = createMarket([
      item(561, 'Nature rune', 100, 110, { lowTime: NOW - 86_400 }),
      item(1, 'Rune platebody', 38_000, 38_500, { highalch: 39_000, lowTime: NOW - 86_400 })
    ], { nowSec: NOW })
    const recipe = highAlchRecipes(oldLow.all())[0]
    expect(computeProcessFlip(recipe, oldLow, { buyQuote: 'high' }).stale).toBe(false)
    expect(computeProcessFlip(recipe, oldLow, { buyQuote: 'low' }).stale).toBe(true)
  })
})

describe('council round 2 regressions', () => {
  it('flags a materially inverted quote even when the recipe return is modest', () => {
    const market = createMarket([
      item(561, 'Nature rune', 100, 110),
      item(1, 'Inverted', 15_000, 10_000, { highalch: 11_000 })
    ], { nowSec: NOW })
    const flip = computeProcessFlip(highAlchRecipes(market.all())[0], market, { buyQuote: 'high' })
    expect(flip.roi).toBeLessThan(0.25)
    expect(flip.suspicious).toBe(true)
  })

  it('ages outputs on their sell (high) quote only', () => {
    const recipe = { id: 'p', method: 'x', inputs: [{ id: 1, qty: 1 }], outputs: [{ id: 2, qty: 1 }], coinCost: 0 }
    const oldOutputLow = createMarket([item(1, 'In', 100, 101), item(2, 'Out', 120, 121, { lowTime: NOW - 86_400 })], { nowSec: NOW })
    const oldOutputHigh = createMarket([item(1, 'In', 100, 101), item(2, 'Out', 120, 121, { highTime: NOW - 86_400 })], { nowSec: NOW })
    expect(computeProcessFlip(recipe, oldOutputLow).stale).toBe(false)
    expect(computeProcessFlip(recipe, oldOutputHigh).stale).toBe(true)
  })

  it('a one-way craft is priced without the set\'s buy quote', () => {
    const recipe = { id: 'combo:1', kind: 'combine', setId: 1, parts: [{ id: 2, qty: 1 }, { id: 3, qty: 1 }], conversionCost: 0, reversible: false }
    const market = createMarket([
      item(1, 'Godsword', null, 10_300),
      item(2, 'Hilt', 4_800, 4_950),
      item(3, 'Blade', 4_800, 4_950)
    ], { nowSec: NOW })
    expect(computeSetFlip(recipe, market)).toMatchObject({ direction: 'combine', cost: 9_600 })
  })
})

describe('council round 3 regressions', () => {
  const recipe = { id: 'ge:1', kind: 'ge-set', setId: 1, parts: [{ id: 2, qty: 1 }, { id: 3, qty: 1 }], conversionCost: 0, reversible: true }
  const OLD = NOW - 86_400
  // Combine (parts low + set high) is fresh; split (set low + parts high) is stale and bigger.
  const market = createMarket([
    item(1, 'Set', 9_000, 10_300, { lowTime: OLD, limit: 1_000 }),
    item(2, 'Top', 4_800, 6_000, { highTime: OLD, limit: 10 }),
    item(3, 'Legs', 4_800, 6_000, { highTime: OLD, limit: 10 })
  ], { nowSec: NOW })

  it('ages each direction on its own quotes', () => {
    const [combine, split] = computeSetFlipOptions(recipe, market)
    expect(combine.stale).toBe(false)
    expect(split.stale).toBe(true)
    expect(split.potential).toBeGreaterThan(combine.potential)
  })

  it('prefers a fresh direction over a bigger stale one', () => {
    expect(computeSetFlip(recipe, market).direction).toBe('combine')
    const ranked = rankSetFlips([recipe], market).filter(f => !f.stale)
    expect(ranked.map(f => f.direction)).toEqual(['combine'])
  })

  it('still returns the stale direction when it is the only one', () => {
    const oneWay = { ...recipe, reversible: true }
    const staleOnly = createMarket([
      item(1, 'Set', 9_000, null, { lowTime: OLD }),
      item(2, 'Top', 4_800, 6_000, { highTime: OLD }),
      item(3, 'Legs', 4_800, 6_000, { highTime: OLD })
    ], { nowSec: NOW })
    expect(computeSetFlip(oneWay, staleOnly)).toMatchObject({ direction: 'split', stale: true })
  })
})
