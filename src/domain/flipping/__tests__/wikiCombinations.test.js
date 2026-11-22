// Wiki combinations: NPC conversions (coin fee) and multi-part crafts from the
// OSRS Wiki recipe data, merged into the Combination Items recipes.
import { describe, expect, it } from 'vitest'
import { buildRecipes, computeSetFlip, createMarket } from '../index.js'
import wikiCombinations from '../data/wikiCombinations.js'
import { craftedRecipes } from '../index.js'
import { COMBINATION_RECIPES, buildCombinationRows, describeHow } from '../../../utils/flipRows.js'
import { dedupe, toCombination } from '../../../../scripts/generate-wiki-combinations.js'

const NOW = 1_800_000_000
const item = (id, name, low, high, extra = {}) => ({ id, name, icon: `${name}.png`, low, high, limit: 8, volume: 600, highTime: NOW - 60, lowTime: NOW - 60, ...extra })

describe('generator', () => {
  const byName = new Map([
    ['voidwaker', { id: 27690, name: 'Voidwaker' }],
    ['voidwaker blade', { id: 27684, name: 'Voidwaker blade' }],
    ['voidwaker hilt', { id: 27681, name: 'Voidwaker hilt' }],
    ['voidwaker gem', { id: 27687, name: 'Voidwaker gem' }],
    ['mystic smoke staff', { id: 11998, name: 'Mystic smoke staff' }],
    ['smoke battlestaff', { id: 11998 - 1, name: 'Smoke battlestaff' }]
  ])
  const row = (materials, output, facilities = '') => ({ page_name: output.name, production_json: JSON.stringify({ materials, facilities, output }) })

  it('turns an NPC recipe into parts plus a coin fee', () => {
    const voidwaker = toCombination(row([
      { name: 'Voidwaker blade', quantity: '1' }, { name: 'Voidwaker hilt', quantity: '1' },
      { name: 'Voidwaker gem', quantity: '1' }, { name: 'Coins', quantity: '500000' }
    ], { name: 'Voidwaker', quantity: '1', cost: 29_000_000 }, 'Madam Sikaro'), byName)
    expect(voidwaker).toMatchObject({ setId: 27690, conversionCost: 500_000, via: 'Madam Sikaro' })
    expect(voidwaker.parts.map(p => p.id)).toEqual([27681, 27684, 27687])
  })

  it('skips recipes with an untradeable part or several outputs', () => {
    expect(toCombination(row([{ name: 'Mystery', quantity: '1' }], { name: 'Voidwaker', quantity: '1', cost: 1e9 }), byName)).toBeNull()
    expect(toCombination(row([{ name: 'Voidwaker gem', quantity: '1' }], { name: 'Voidwaker', quantity: '2', cost: 1e9 }), byName)).toBeNull()
  })

  it('keeps the no-diary fee for one NPC, and keeps a free skilling route beside it', () => {
    const base = { name: 'Mystic smoke staff', setId: 11998, parts: [{ id: 11997, qty: 1 }], skills: null, source: null }
    const kept = dedupe([
      { ...base, conversionCost: 20_000, via: 'Thormac' },
      { ...base, conversionCost: 40_000, via: 'Thormac' },
      { ...base, conversionCost: 0, via: 'Anvil' }
    ])
    expect(kept.map(c => [c.via, c.conversionCost])).toEqual([['Anvil', 0], ['Thormac', 40_000]])
  })
})

describe('combination recipes', () => {
  const ids = recipes => new Set(recipes.map(r => r.setId))

  it('adds wiki combinations such as Voidwaker, Necklace of rupture and Oathplate', () => {
    expect(wikiCombinations.length).toBeGreaterThan(100)
    const all = ids(COMBINATION_RECIPES)
    for (const id of [27690, 21895, 30753]) expect(all.has(id)).toBe(true)
  })

  it('prices fortified Masori and repaired Torva from plates and components, not whole armour', () => {
    const body = COMBINATION_RECIPES.filter(r => r.setId === 27238)
    expect(body.map(r => r.parts)).toEqual([[{ id: 27229, qty: 1 }, { id: 27269, qty: 4 }]])
    const plate = COMBINATION_RECIPES.filter(r => r.setId === 26384)
    expect(plate.map(r => r.parts)).toEqual([[{ id: 26378, qty: 1 }, { id: 26394, qty: 2 }]])
  })

  it('keeps the free route and the NPC route as separate rows, with where-to-make text', () => {
    const arcane = COMBINATION_RECIPES.filter(r => r.setId === 12825)
    expect(arcane.map(r => r.conversionCost).sort((a, b) => a - b)).toEqual([0, 1_500_000])
    expect(arcane.map(describeHow).sort()).toEqual(['Abbot Langley · 1.5M fee', 'Anvil · Prayer 90, Smithing 85'])
  })

  it('does not duplicate a hand-made recipe that the wiki also lists', () => {
    const recipes = buildRecipes(craftedRecipes)
    const voidwakers = recipes.filter(r => r.setId === 27690)
    expect(voidwakers).toHaveLength(1)
    expect(describeHow(voidwakers[0])).toBe('Madam Sikaro · 500k fee')
  })

  it('charges the NPC fee in profit', () => {
    const recipe = COMBINATION_RECIPES.find(r => r.setId === 27690)
    const market = createMarket([
      item(27690, 'Voidwaker', 29_000_000, 30_000_000),
      item(27681, 'Voidwaker hilt', 9_000_000, 9_100_000),
      item(27684, 'Voidwaker blade', 9_000_000, 9_100_000),
      item(27687, 'Voidwaker gem', 9_000_000, 9_100_000)
    ].map(i => ({ ...i, dailyVolume: i.volume })), { nowSec: NOW })
    const flip = computeSetFlip(recipe, market)
    expect(flip.cost).toBe(27_000_000 + 500_000)
    expect(flip.profit).toBe(30_000_000 - 27_500_000 - 600_000)
    const [row] = buildCombinationRows([recipe], [
      item(27690, 'Voidwaker', 29_000_000, 30_000_000),
      item(27681, 'Voidwaker hilt', 9_000_000, 9_100_000),
      item(27684, 'Voidwaker blade', 9_000_000, 9_100_000),
      item(27687, 'Voidwaker gem', 9_000_000, 9_100_000)
    ], { nowSec: NOW })
    expect(row.how).toBe('Madam Sikaro · 500k fee')
  })
})

describe('potion making', () => {
  it('builds finished potions from the wiki herblore recipes at 2,500 an hour', async () => {
    const { POTIONS_PER_HOUR, potionRecipes } = await import('../index.js')
    const recipes = potionRecipes()
    expect(recipes.length).toBeGreaterThan(50)
    const prayer = recipes.find(r => r.name === 'Prayer potion(3)')
    // Ranarr potion (unf) + snape grass.
    expect(prayer).toMatchObject({ inputs: [{ id: 99, qty: 1 }, { id: 231, qty: 1 }], outputs: [{ id: 139, qty: 1 }], actionsPerHour: POTIONS_PER_HOUR })
    expect(recipes.some(r => /\(unf\)/.test(r.name))).toBe(false)
  })

  it('is listed on the Recipes page', async () => {
    const { findMethod } = await import('../../../pages/RecipesHub/methodCatalog.js')
    expect(findMethod('potions')).toMatchObject({ key: 'potions', defaultSort: 'perHour' })
  })
})
