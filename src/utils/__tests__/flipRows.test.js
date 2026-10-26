// The All Items and Combination Sets rows now come from the shared flipping
// engine (src/domain/flipping), the same math the mobile app uses. Compared
// with the legacy web math (legacyFlipMath.characterization.test.js), only
// these numbers change:
//
// 1. Tax-exempt items (bonds, teleport tablets, low-level tools and food...)
//    no longer have 2% taken off their profit or shown as tax.
// 2. Combination rows whose set or a part has no price are dropped instead of
//    treating the missing price as 0 gp (which produced made-up profits).
// 3. Partyhat & specs listed itself as a part; it is now Blue partyhat +
//    Sagacious spectacles (data fix in craftedRecipes.js).
//
// Rounding (2% floored), the under-50 gp rule and the 5M cap were already the
// same, so every other number is unchanged.

import { describe, expect, test } from 'vitest'
import { calculateGETax } from '../utils.jsx'
import { buildCombinationRows, toAllItemsRow } from '../flipRows.js'
import { itemRecipes } from '../../domain/flipping/data/craftedRecipes.js'
import { ITEMS, RECIPES, SELF_PART_RECIPE } from './fixtures/flipFixtures.js'
import { legacyAllItemsProfit, legacySetRow } from './fixtures/legacyFlipMath.js'

const TAX_EXEMPT_CHANGES = {
  13190: { before: 189_001, after: 399_001 }, // Old school bond
  1755: { before: -2, after: 4 }, // Chisel
  8013: { before: -3, after: 6 } // Teleport to house (tablet)
}

describe('All Items rows', () => {
  test('only tax-exempt items change profit', () => {
    const changed = Object.fromEntries(ITEMS
      .map(item => [item.id, legacyAllItemsProfit(item), toAllItemsRow(item).profit])
      .filter(([, before, after]) => before !== after)
      .map(([id, before, after]) => [id, { before, after }]))
    expect(changed).toEqual(TAX_EXEMPT_CHANGES)
  })

  test('tax shown under the sell price is 0 for exempt items, otherwise unchanged', () => {
    ITEMS.forEach(item => {
      const expected = TAX_EXEMPT_CHANGES[item.id] ? 0 : calculateGETax(item.high)
      expect(toAllItemsRow(item).tax).toBe(expected)
    })
  })

  test('keeps every other field and builds the wiki image url', () => {
    const whip = ITEMS.find(i => i.id === 4151)
    expect(toAllItemsRow(whip)).toEqual({
      ...whip,
      profit: 20_000,
      tax: 30_000,
      img: 'https://oldschool.runescape.wiki/images/Abyssal_whip.png'
    })
  })

  test('does not mutate the item', () => {
    const item = { ...ITEMS[0] }
    toAllItemsRow(item)
    expect(item).toEqual(ITEMS[0])
  })
})

describe('Combination Sets rows', () => {
  const priced = RECIPES.filter(r => !r.name.startsWith('unpriced'))

  test.each(priced.map(r => [r.name, r]))('%s matches the legacy row exactly', (_, recipe) => {
    const [row] = buildCombinationRows([recipe], ITEMS)
    const legacy = legacySetRow(recipe)
    expect(row).toEqual({ ...legacy, tax: calculateGETax(legacy.sellPrice) })
    // Each part still shows its own buy price, in recipe order.
    expect(row.items.map(p => p.low)).toEqual(legacy.items.map(p => p.low))
  })

  test('rows with an unpriced set or part are dropped instead of pricing it at 0 gp', () => {
    const unpriced = RECIPES.filter(r => r.name.startsWith('unpriced'))
    expect(buildCombinationRows(unpriced, ITEMS)).toEqual([])
  })

  test('a recipe that lists the set as its own part is dropped', () => {
    expect(buildCombinationRows([SELF_PART_RECIPE], ITEMS)).toEqual([])
  })

  test('Partyhat & specs is made from Blue partyhat + Sagacious spectacles', () => {
    const recipe = itemRecipes.find(r => r.itemSet === 12399)
    expect(recipe.itemsToCreateSet).toEqual([1042, 12337])
    const [row] = buildCombinationRows([recipe], ITEMS)
    // 635,259 - 18,111 - 451,021 - 500 fee - 12,705 tax (was 48,532)
    expect(row.profit).toBe(152_922)
  })

  test('sorted by profit, highest first', () => {
    const rows = buildCombinationRows(priced, ITEMS)
    expect(rows.map(r => r.profit)).toEqual([1_424_995, 159_863, 121_242, 71_242, -329_980])
  })

  test('every shipped recipe still produces a row when all its items are priced', () => {
    const ids = [...new Set(itemRecipes.flatMap(r => [r.itemSet, ...r.itemsToCreateSet]))]
    const items = ids.map(id => ({ id, name: `Item ${id}`, icon: 'x.png', limit: 10, high: 1_000, low: 900 }))
    expect(buildCombinationRows(itemRecipes, items)).toHaveLength(itemRecipes.length)
  })
})
