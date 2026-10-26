// Characterization of the web's flip math as it shipped before the switch to
// the shared engine (src/domain/flipping). These pin today's numbers so the
// switch can be checked against them: see flipRows.test.js for the exact
// list of numbers that change and why.

import { describe, expect, test } from 'vitest'
import { calculateGETax } from '../utils.jsx'
import { ITEMS, RECIPES, SELF_PART_RECIPE } from './fixtures/flipFixtures.js'
import { legacyAllItemsProfit, legacySetRow } from './fixtures/legacyFlipMath.js'

const byId = Object.fromEntries(ITEMS.map(i => [i.id, i]))

describe('legacy All Items profit (before shared engine)', () => {
  test.each([
    [4151, 20_000, 30_000], // plain 2% tax
    [1511, 27, 2], // 2.98 rounds down to 2
    [1925, 9, 0], // under 50 gp
    [22325, 15_000_000, 5_000_000], // capped at 5M
    [13190, 189_001, 210_000], // bond: taxed although exempt in game
    [1755, -2, 6], // chisel: taxed although exempt in game
    [8013, -3, 9], // house tablet: taxed although exempt in game
    [4587, 0, 1_200], // no buy price -> 0 profit
    [2, 0, 0] // never traded -> 0 profit
  ])('item %i: profit %i, tax label %i', (id, profit, taxLabel) => {
    expect(legacyAllItemsProfit(byId[id])).toBe(profit)
    expect(calculateGETax(byId[id].high)).toBe(taxLabel)
  })
})

describe('legacy Combination Sets rows (before shared engine)', () => {
  test.each([
    ['armadylGodsword', 'Armadyl godsword (set)', 6_185_056, 121_242, [5_488_891, 451_222]],
    ['blowpipe', 'Toxic blowpipe (empty)', 9_194_767, 159_863, [8_851_009]],
    ['venatorBow', 'Venator bow (uncharged)', 66_000_000, 1_424_995, [12_651_001]],
    ['twoBlades', 'Armadyl godsword (set)', 6_185_056, -329_980, [5_488_891, 451_222, 451_222]],
    ['withFee', 'Armadyl godsword (set)', 6_185_056, 71_242, [5_488_891, 451_222]],
    // Missing prices count as 0 gp, so these rows show made-up profits.
    ['unpricedSet', 'Unpriced set', 0, -18_111, [18_111]],
    ['unpricedPart', 'Set with an unpriced part (set)', 1_000_000, 961_889, [18_111, 0]]
  ])('%s', (recipeName, name, sellPrice, profit, partLows) => {
    const row = legacySetRow(RECIPES.find(r => r.name === recipeName))
    expect(row).toMatchObject({ name, sellPrice, profit, background: true })
    expect(row.items.map(p => p.low)).toEqual(partLows)
    // Parts never carry a quantity label for these recipes.
    expect(row.items.every(p => p.qty === undefined)).toBe(true)
  })

  test('Partyhat & specs listed itself as a part: buy price included the set itself', () => {
    const row = legacySetRow(SELF_PART_RECIPE)
    expect(row.profit).toBe(48_532)
    expect(row.items.map(p => p.id)).toEqual([1042, 12399])
  })

  test('tax label under the sell price is 2% capped at 5M', () => {
    expect(calculateGETax(6_185_056)).toBe(123_701)
    expect(calculateGETax(385_000_000)).toBe(5_000_000)
  })
})
