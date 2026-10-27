import { test } from 'node:test'
import assert from 'node:assert/strict'
import { purchaseScenario } from './purchaseScenario.ts'
import { ownedOpportunity } from './ownedOpportunity.ts'
import { timeAlternativePresentation } from './timeAlternative.ts'

const recipe = { inputs: [{ id: 1, qty: 2 }, { id: 2, qty: 1 }, { id: 1, qty: 1 }], outputs: [{ id: 1, qty: 1 }, { id: 3, qty: 2 }], coinCost: 3, coinRevenue: 2 }
const market = new Map([[1, { high: 10, low: 8 }], [2, { high: 20, low: 15 }], [3, { high: 100, low: 50 }], [99, { high: NaN, low: -1 }]])
const owned = { 1: '2', 2: '1', 99: 'invalid' }
const run = (texts: Record<number, string> = {}, quotes = market) => purchaseScenario(recipe, 2, 20, owned, texts, id => quotes.get(id), () => 1)
const result = (state: ReturnType<typeof run>) => { assert.equal(state.comparison.kind, 'ready'); if (state.comparison.kind !== 'ready') throw Error('unavailable'); return state.comparison.result }

test('blank reproduces observed with grouped shortages, fees and no proceeds reinvestment', () => {
  const observed = ownedOpportunity(recipe, 2, 20, owned, id => market.get(id), () => 1)
  assert.equal(observed.kind, 'ready')
  assert.deepEqual(run().comparison, observed)
  assert.deepEqual(run().legs.map(l => [l.id, l.shopping, l.source]), [[1, 4, 'observed'], [2, 1, 'observed']])
  assert.equal(result(run()).newCashNeeded, 66)
  assert.equal(result(run()).cashShortfall, 46)
})
test('multiple manual prices affect only purchase costs; sell baseline/output/tax remain observed even for cross-side IDs', () => {
  const snapshot = structuredClone(market)
  const before = result(run())
  const after = result(run({ 1: '5', 2: '7', 99: 'bad' }))
  assert.equal(after.newCashNeeded, 33)
  assert.equal(after.incrementalValue, before.incrementalValue! + 33)
  for (const key of ['sellNowConsumedOwned', 'netReceipts', 'outputTax', 'items'] as const) assert.deepEqual(after[key], before[key])
  assert.deepEqual(market, snapshot)
})
test('manual buy resolves missing or invalid API high without needing observed success', () => {
  for (const high of [null, -1, NaN, Infinity, 1.5]) {
    const quotes = new Map(market); quotes.set(1, { high: high as number, low: 8 })
    assert.equal(result(run({}, quotes)).newCashNeeded, null)
    assert.equal(run({}, quotes).legs[0].source, 'unknown')
    assert.equal(result(run({ 1: '5' }, quotes)).newCashNeeded, 46)
  }
})
test('invalid text is preserved and never falls back; refresh inherits only blank fields and clear resets', () => {
  for (const raw of ['0', '-1', '1.5', '1,000', '1e2', '1000000001']) {
    const state = run({ 1: raw })
    assert.equal(state.legs[0].raw, raw)
    assert.equal(state.legs[0].source, 'invalid')
    assert.equal(result(state).newCashNeeded, null)
    assert.equal(result(state).incrementalValue, null)
    assert.match(timeAlternativePresentation(2, result(state).incrementalValue, '1', '0').message, /Unknown/)
  }
  const texts = { 1: ' 5 ', 2: '' }
  const quotes = new Map(market); quotes.set(2, { high: 30, low: 15 })
  assert.equal(run(texts, quotes).legs[0].raw, ' 5 ')
  assert.equal(run(texts, quotes).legs[1].price, 30)
  assert.equal(run({ 1: 'bad' }, quotes).legs[0].raw, 'bad')
  assert.deepEqual(run({}).comparison, run().comparison)
  assert.equal(result(run()).newCashNeeded, 66)
})
test('safe arithmetic errors become unavailable without affecting observed estimates', () => {
  const state = purchaseScenario({ ...recipe, coinCost: Number.MAX_SAFE_INTEGER }, 2, 20, owned, {}, id => market.get(id), () => 1)
  assert.equal(state.comparison.kind, 'unavailable')
  assert.equal(result(run()).newCashNeeded, 66)
})

test('a price on fully owned stock has no purchase dependency or manual owned valuation', () => {
  const compare = (text: string) => purchaseScenario(recipe, 2, 0, { 1: '6', 2: '2' }, { 1: text }, id => market.get(id), () => 1)
  const baseline = result(compare(''))
  assert.deepEqual(result(compare('999')), baseline)
  assert.deepEqual(result(compare('invalid')), baseline)
  assert.equal(baseline.newCashNeeded, 6)
  assert.equal(baseline.cashShortfall, 6)
})
test('custom time recomputes from custom delta and loses positive surplus immediately on invalid price', () => {
  const before = result(run())
  const cheaper = result(run({ 1: '5', 2: '7' }))
  const observedTime = timeAlternativePresentation(2, before.incrementalValue, '60', '1')
  const customTime = timeAlternativePresentation(2, cheaper.incrementalValue, '60', '1')
  assert.notEqual(customTime.message, observedTime.message)
  const invalidTime = timeAlternativePresentation(2, result(run({ 1: '0' })).incrementalValue, '60', '1')
  assert.equal(invalidTime.positive, false)
  assert.equal(invalidTime.threshold, '')
  assert.match(invalidTime.message, /Unknown/)
  assert.deepEqual(timeAlternativePresentation(2, result(run()).incrementalValue, '60', '1'), observedTime)
})

test('blank assumptions preserve zero observed buy and sell quote semantics', () => {
  for (const [id, side] of [[1, 'high'], [1, 'low'], [3, 'low']] as const) {
    const quotes = new Map(market)
    quotes.set(id, { ...quotes.get(id)!, [side]: 0 })
    const tax = (price: number) => Math.min(price, 1)
    const observed = ownedOpportunity(recipe, 2, 20, owned, key => quotes.get(key), tax)
    const custom = purchaseScenario(recipe, 2, 20, owned, {}, key => quotes.get(key), tax)
    assert.deepEqual(custom.comparison, observed)
  }
})
