import { describe, expect, it } from 'vitest'
import { COMBINATION_RECIPES, buildCombinationRows, isRecommendable, sortRows, toAllItemsRow } from '../flipRows.js'
import { calculateGETax, getItemSetProfit } from '../utils.jsx'
import { enchantingBoltsRecipes } from '../../components/Table/data/enchanting-bolts-filters.jsx'
import { plankMakeRecipes } from '../../components/Table/data/plank-make-filters.jsx'

const NOW = 1_800_000_000
const item = (id, name, low, high, extra = {}) => ({ id, name, icon: `${name}.png`, low, high, limit: 100, volume: 600_000, highTime: NOW - 60, lowTime: NOW - 60, ...extra })

describe('All Items ranking', () => {
  const rows = [
    item(1, 'Big margin, tiny limit', 1_000_000, 1_100_000, { limit: 2 }), // 78k each, 156k / 4h
    item(2, 'Small margin, big limit', 1_000, 1_100, { limit: 10_000 }), // 78 each, 780k / 4h
    item(3, 'Fluke', 100, 1_000), // 900% roi
    item(4, 'Stale', 1_000, 1_200, { highTime: NOW - 86_400, lowTime: NOW - 86_400, limit: 10_000 })
  ].map(i => toAllItemsRow(i, { nowSec: NOW }))

  it('ranks by 4h profit by default, flagged rows last', () => {
    expect(sortRows(rows).map(r => r.id)).toEqual([2, 1, 4, 3])
  })

  it('can rank by profit each', () => {
    // Flagged rows still sink: fluke (880 each) then stale (176 each).
    expect(sortRows(rows, 'profit').map(r => r.id)).toEqual([1, 2, 3, 4])
  })

  it('a cash stack caps quantities, so unaffordable giants drop below steady earners', () => {
    const budgeted = [
      item(1, 'Giant', 1_000_000_000, 1_100_000_000, { limit: 8 }),
      item(2, 'Steady', 1_000, 1_100, { limit: 10_000 })
    ].map(i => toAllItemsRow(i, { nowSec: NOW, budget: 50_000_000 }))
    expect(budgeted[0]).toMatchObject({ maxQty: 0, potential: 0 })
    expect(budgeted[1].maxQty).toBe(10_000)
    expect(sortRows(budgeted).map(r => r.id)).toEqual([2, 1])
  })

  it('flags stale and fluke rows as not recommendable', () => {
    expect(rows.map(isRecommendable)).toEqual([true, true, false, false])
  })
})

describe('Combination rows', () => {
  it('include GE item sets (split or combine) and crafted combinations', () => {
    expect(COMBINATION_RECIPES.some(r => r.kind === 'ge-set' && r.reversible)).toBe(true)
    expect(COMBINATION_RECIPES.some(r => r.kind === 'combine')).toBe(true)
  })

  it('show a split as buying the set and selling the parts', () => {
    const recipe = { id: 'ge:1', kind: 'ge-set', setId: 1, parts: [{ id: 2, qty: 1 }, { id: 3, qty: 1 }], conversionCost: 0, reversible: true }
    const items = [
      item(1, 'Set', 9_700, 10_300, { limit: 1_000 }),
      item(2, 'Top', 4_800, 4_950, { limit: 2 }),
      item(3, 'Legs', 4_800, 4_950, { limit: 2 })
    ]
    const [row] = buildCombinationRows([recipe], items, { nowSec: NOW })
    expect(row).toMatchObject({ direction: 'split', name: 'Set → parts', sellPrice: 9_900, maxQty: 1_000 })
    expect(row.items.map(p => [p.id, p.low])).toEqual([[1, 9_700]])
    expect(row.potential).toBe(row.profit * 1_000)
  })
})

describe('legacy processing helper', () => {
  const items = [item(10, 'Set', 0, 1_000), item(11, 'Part', 100, 110), item(12, 'Unpriced', 0, 0), item(13, 'Bond-like', 0, 1_000)]

  it('leaves out rows with an unpriced ingredient instead of pricing it at 0', () => {
    expect(getItemSetProfit({ itemSet: 10, itemsToCreateSet: [11, 12] }, items)).toBeUndefined()
    expect(getItemSetProfit({ itemSet: 10, itemsToCreateSet: [11] }, items)).toMatchObject({ profit: 1_000 - 100 - 20 })
  })

  it('applies GE tax exemptions by item id', () => {
    expect(calculateGETax(1_000)).toBe(20)
    expect(calculateGETax(10_000_000, 13190)).toBe(0) // Old school bond
    expect(calculateGETax(1_000, 8007)).toBe(0) // Varrock teleport tablet
  })
})

describe('recipe data fixes', () => {
  it('charges a tenth of a cast of runes per enchanted bolt', () => {
    const opal = enchantingBoltsRecipes.find(r => r.itemSet === 9236)
    expect(opal.itemQuantities).toEqual({ 556: 0.2, 564: 0.1 })
  })

  it('makes teak and mahogany planks from teak and mahogany logs', () => {
    const logFor = plank => plankMakeRecipes.find(r => r.itemSet === plank).itemsToCreateSet[0]
    expect(logFor(8780)).toBe(6333)
    expect(logFor(8782)).toBe(6332)
    expect(plankMakeRecipes.map(r => r.itemSet)).toEqual([960, 8778, 8780, 8782])
  })
})
