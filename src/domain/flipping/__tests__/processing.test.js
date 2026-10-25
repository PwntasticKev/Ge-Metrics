import { describe, it, expect } from 'vitest'
import { createMarket, computeProcessFlip, rankProcessFlips, decantingRecipes, herbCleaningRecipes, unfinishedPotionRecipes } from '../index.js'

const NOW = 1_800_000_000
const item = (id, name, low, high, extra = {}) => ({ id, name, low, high, limit: 2000, volume: 60_000, highTime: NOW - 60, lowTime: NOW - 60, ...extra })

describe('computeProcessFlip', () => {
  const market = createMarket([
    item(1, 'Teak logs', 100, 110, { limit: 13_000 }),
    item(2, 'Teak plank', 500, 560, { limit: 10_000 })
  ], { nowSec: NOW })
  const recipe = { id: 'saw:teak', method: 'sawmill', inputs: [{ id: 1, qty: 1 }], outputs: [{ id: 2, qty: 1 }], coinCost: 350 }

  it('buys inputs low, pays coins and tax, sells outputs high', () => {
    const flip = computeProcessFlip(recipe, market)
    expect(flip).toMatchObject({ cost: 450, revenue: 560, tax: 11, profit: 99, name: 'Teak plank' })
  })

  it('caps actions by input buy limits and liquidity', () => {
    // limit 13000; volume 60000/6 = 10000 fillable
    expect(computeProcessFlip(recipe, market).maxActions).toBe(10_000)
  })

  it('reports per-hour profit when actions per hour are known', () => {
    expect(computeProcessFlip(recipe, market, { actionsPerHour: 1000 }).perHour).toBe(99_000)
  })

  it('counts coins received as untaxed revenue', () => {
    const alch = { id: 'alch', method: 'x', inputs: [{ id: 1, qty: 1 }], outputs: [], coinRevenue: 120 }
    expect(computeProcessFlip(alch, market)).toMatchObject({ revenue: 120, tax: 0, profit: 20, name: 'Teak logs' })
  })

  it('returns null when an item is missing or unpriced', () => {
    expect(computeProcessFlip({ ...recipe, inputs: [{ id: 99, qty: 1 }] }, market)).toBeNull()
  })

  it('ranks profitable recipes high to low and hides losers', () => {
    const loser = { ...recipe, id: 'bad', coinCost: 10_000 }
    expect(rankProcessFlips([loser, recipe], market).map(f => f.id)).toEqual(['saw:teak'])
  })
})

describe('decantingRecipes', () => {
  const items = [
    item(10, 'Prayer potion(1)', 1, 1), item(11, 'Prayer potion(2)', 1, 1),
    item(12, 'Prayer potion(3)', 1, 1), item(13, 'Prayer potion(4)', 1, 1),
    item(20, 'Games necklace(4)', 1, 1), item(21, 'Games necklace(3)', 1, 1)
  ]
  const recipes = decantingRecipes(items)

  it('matches dose counts exactly', () => {
    const threeToFour = recipes.find(r => r.id === 'decant:12:13')
    expect(threeToFour.inputs).toEqual([{ id: 12, qty: 4 }])
    expect(threeToFour.outputs).toEqual([{ id: 13, qty: 3 }])
    const oneToFour = recipes.find(r => r.id === 'decant:10:13')
    expect(oneToFour.inputs[0].qty * 1).toBe(oneToFour.outputs[0].qty * 4)
  })

  it('covers every dose pair and skips jewellery', () => {
    expect(recipes).toHaveLength(12)
    expect(recipes.some(r => r.name.includes('Games'))).toBe(false)
  })

  it('finds a profitable decant', () => {
    const market = createMarket([
      item(12, 'Prayer potion(3)', 6000, 6200), item(13, 'Prayer potion(4)', 8500, 9000)
    ], { nowSec: NOW })
    // 4 x (3) at 6000 = 24000 -> 3 x (4) at 9000 = 27000 - 3*180 tax
    const flip = computeProcessFlip(decantingRecipes(market.all()).find(r => r.id === 'decant:12:13'), market)
    expect(flip.profit).toBe(27_000 - 24_000 - 540)
  })
})

describe('herb recipes', () => {
  const items = [
    item(1, 'Grimy ranarr weed', 1, 1), item(2, 'Ranarr weed', 1, 1), item(3, 'Ranarr potion (unf)', 1, 1),
    item(4, 'Grimy snapdragon', 1, 1), item(5, 'Snapdragon', 1, 1), item(6, 'Snapdragon seed', 1, 1),
    item(7, 'Snapdragon potion (unf)', 1, 1), item(8, 'Vial of water', 1, 1), item(9, 'Grimy unknown', 1, 1)
  ]

  it('pairs grimy and clean herbs', () => {
    expect(herbCleaningRecipes(items).map(r => [r.inputs[0].id, r.outputs[0].id])).toEqual([[1, 2], [4, 5]])
  })

  it('builds unfinished potions from the clean herb, not the seed', () => {
    expect(unfinishedPotionRecipes(items).map(r => r.inputs.map(i => i.id))).toEqual([[2, 8], [5, 8]])
  })
})

describe('bundled method data', async () => {
  const { processingMethods, moneyMakingRecipes } = await import('../index.js')
  const validEntry = e => Number.isInteger(e.id) && e.id > 0 && Number.isFinite(e.qty) && e.qty > 0

  it('has well-formed curated processing recipes with unique ids', () => {
    const recipes = processingMethods.flatMap(m => m.recipes)
    expect(processingMethods.length).toBeGreaterThan(10)
    expect(recipes.every(r => r.inputs.length && r.outputs.length && r.inputs.every(validEntry) && r.outputs.every(validEntry))).toBe(true)
    expect(new Set(recipes.map(r => r.id)).size).toBe(recipes.length)
    expect(processingMethods.every(m => m.source.startsWith('https://oldschool.runescape.wiki/'))).toBe(true)
  })

  it('has well-formed wiki money making recipes with unique ids', () => {
    expect(moneyMakingRecipes.length).toBeGreaterThan(100)
    expect(moneyMakingRecipes.every(r => r.inputs.every(validEntry) && r.outputs.every(validEntry))).toBe(true)
    expect(new Set(moneyMakingRecipes.map(r => r.id)).size).toBe(moneyMakingRecipes.length)
  })
})
