import { test } from 'node:test'
import assert from 'node:assert/strict'
import { compareOwnedInputOpportunity, type OwnedInputOpportunityRequest } from '../ownedInputOpportunity.ts'
const enginePath = '../../../../src/domain/flipping/geTax.js'
const { geTax } = await import(enginePath) as { geTax: OwnedInputOpportunityRequest['tax'] }
const base: OwnedInputOpportunityRequest = {
  recipe: { inputs: [{ id: 440, qty: 1 }, { id: 453, qty: 2 }], outputs: [{ id: 2353, qty: 1 }] },
  goal: 3, budget: 19, owned: { 440: 8, 453: 2 },
  quotes: { 440: { sell: 9 }, 453: { buy: 5, sell: 4 }, 2353: { sell: 35 } }, tax: geTax
}
test('steel fixed batch compares consumed owned stock and keeps surplus', () => {
  const p = compareOwnedInputOpportunity(base)
  assert.deepEqual(p.items, [
    { id: 440, consumed: 3, consumedOwned: 3, purchases: 0, surplus: 5, produced: 0 },
    { id: 453, consumed: 6, consumedOwned: 2, purchases: 4, surplus: 0, produced: 0 },
    { id: 2353, consumed: 0, consumedOwned: 0, purchases: 0, surplus: 0, produced: 3 }
  ])
  assert.deepEqual([p.newCashNeeded, p.sellNowConsumedOwned, p.netReceipts, p.incrementalValue, p.cashAffordable, p.cashShortfall], [20, 35, 105, 50, false, 1])
})
test('canonical tax is per unit at threshold, exemption and cap; multioutput/direct coins', () => {
  const p = compareOwnedInputOpportunity({ ...base, goal: 2, owned: { 440: 2, 453: 4 }, budget: 0,
    recipe: { ...base.recipe, coinRevenue: 7, outputs: [{ id: 1, qty: 2 }, { id: 2, qty: 1 }, { id: 8007, qty: 1 }, { id: 3, qty: 1 }] },
    quotes: { 440: { sell: 50 }, 453: { sell: 49 }, 1: { sell: 49 }, 2: { sell: 50 }, 8007: { sell: 100 }, 3: { sell: 300_000_000 } } })
  assert.equal(p.sellNowConsumedOwned, 294)
  assert.equal(p.outputTax, 10_000_002)
  assert.equal(p.netReceipts, 590_000_508)
  assert.equal(p.newCashNeeded, 0)
  assert.equal(p.cashAffordable, true)
})
test('duplicates aggregate before ownership and cross-side IDs preserve gross quantities', () => {
  const p = compareOwnedInputOpportunity({ ...base, goal: 1, owned: { 1: 3, 9: 8 },
    recipe: { inputs: [{ id: 1, qty: 2 }, { id: 1, qty: 2 }], outputs: [{ id: 1, qty: 1 }, { id: 1, qty: 2 }] }, quotes: { 1: { buy: 10, sell: 5 } } })
  assert.deepEqual(p.items[0], { id: 1, consumed: 4, consumedOwned: 3, purchases: 1, surplus: 0, produced: 3 })
  assert.equal(p.items[1].surplus, 8)
  assert.equal(p.incrementalValue, -10)
})
test('missing quotes are side-specific, deduplicated, and unknown is not zero', () => {
  const p = compareOwnedInputOpportunity({ ...base, quotes: {} })
  assert.deepEqual(p.missingQuotes, [{ id: 440, side: 'sell' }, { id: 453, side: 'buy' }, { id: 453, side: 'sell' }, { id: 2353, side: 'sell' }])
  assert.deepEqual([p.newCashNeeded, p.sellNowConsumedOwned, p.netReceipts, p.incrementalValue, p.cashAffordable, p.cashShortfall], [null, null, null, null, null, null])
  const ownAll = compareOwnedInputOpportunity({ ...base, owned: { 440: 3, 453: 6, 9: 10 }, quotes: {} })
  assert.equal(ownAll.newCashNeeded, 0)
  assert.ok(ownAll.missingQuotes.every(q => q.side === 'sell' && q.id !== 9))
})
test('zero goal needs no quotes or tax; fees are upfront without proceeds funding', () => {
  const zero = compareOwnedInputOpportunity({ ...base, goal: 0, quotes: {}, tax: () => { throw Error('unused') } })
  assert.deepEqual([zero.newCashNeeded, zero.netReceipts, zero.sellNowConsumedOwned, zero.incrementalValue], [0, 0, 0, 0])
  assert.deepEqual(zero.missingQuotes, [])
  const p = compareOwnedInputOpportunity({ ...base, owned: { 440: 3, 453: 6 }, budget: 0, recipe: { ...base.recipe, coinCost: 1, coinRevenue: 100 } })
  assert.equal(p.newCashNeeded, 3)
  assert.equal(p.cashShortfall, 3)
  assert.ok(p.incrementalValue! > 0)
})
test('reject invalid numeric contracts and tax results', () => {
  for (const n of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => compareOwnedInputOpportunity({ ...base, goal: n }), RangeError)
    assert.throws(() => compareOwnedInputOpportunity({ ...base, budget: n }), RangeError)
    assert.throws(() => compareOwnedInputOpportunity({ ...base, owned: { 440: n } }), RangeError)
    assert.throws(() => compareOwnedInputOpportunity({ ...base, recipe: { ...base.recipe, coinCost: n } }), RangeError)
    assert.throws(() => compareOwnedInputOpportunity({ ...base, quotes: { 453: { buy: n } } }), RangeError)
    assert.throws(() => compareOwnedInputOpportunity({ ...base, tax: () => n }), RangeError)
  }
  for (const n of [0, -1, 1.5, NaN, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => compareOwnedInputOpportunity({ ...base, recipe: { ...base.recipe, inputs: [{ id: n, qty: 1 }] } }), RangeError)
    assert.throws(() => compareOwnedInputOpportunity({ ...base, recipe: { ...base.recipe, outputs: [{ id: 1, qty: n }] } }), RangeError)
  }
  assert.throws(() => compareOwnedInputOpportunity({ ...base, owned: Object.fromEntries([['bad', 1]]) }), RangeError)
  assert.throws(() => compareOwnedInputOpportunity({ ...base, tax: p => p + 1 }), RangeError)
})
test('reject unsafe products and sums even when later subtraction could cancel', () => {
  const max = Number.MAX_SAFE_INTEGER
  assert.throws(() => compareOwnedInputOpportunity({ ...base, goal: max }), RangeError)
  assert.throws(() => compareOwnedInputOpportunity({ ...base, recipe: { ...base.recipe, inputs: [{ id: 1, qty: max }, { id: 1, qty: 1 }] }, goal: 0 }), RangeError)
  assert.throws(() => compareOwnedInputOpportunity({ ...base, goal: 2, quotes: { 440: { sell: max }, 453: { buy: max, sell: 1 }, 2353: { sell: max } }, tax: () => 0 }), RangeError)
  assert.throws(() => compareOwnedInputOpportunity({ ...base, goal: 1, owned: {}, recipe: { inputs: [{ id: 1, qty: 1 }], outputs: [{ id: 2, qty: 1 }] , coinCost: 1 }, quotes: { 1: { buy: max }, 2: { sell: max } }, tax: () => 0 }), RangeError)
})

test('zero quotes are known; aggregate gross overflow cannot hide behind tax', () => {
  const p = compareOwnedInputOpportunity({ ...base, quotes: { 440: { sell: 0 }, 453: { buy: 0, sell: 0 }, 2353: { sell: 0 } } })
  assert.equal(p.incrementalValue, 0)
  assert.deepEqual(p.missingQuotes, [])
  const half = Math.floor(Number.MAX_SAFE_INTEGER / 2) + 1
  assert.throws(() => compareOwnedInputOpportunity({ ...base, goal: 1, owned: {},
    recipe: { inputs: [{ id: 1, qty: 1 }], outputs: [{ id: 2, qty: 1 }, { id: 3, qty: 1 }] },
    quotes: { 1: { buy: 0 }, 2: { sell: half }, 3: { sell: half } }, tax: price => price }), RangeError)
})

test('missing purchases do not mask unsafe known combined opportunity costs', () => {
  assert.throws(() => compareOwnedInputOpportunity({ goal: 1, budget: 0,
    recipe: { inputs: [{ id: 1, qty: 1 }, { id: 2, qty: 1 }, { id: 3, qty: 1 }], outputs: [{ id: 4, qty: 1 }] },
    owned: { 3: 1 }, quotes: { 1: { buy: Number.MAX_SAFE_INTEGER }, 3: { sell: 1 }, 4: { sell: 1 } }, tax: () => 0 }), RangeError)
})
