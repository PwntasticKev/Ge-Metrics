import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evaluateDoseBasket, optimizeDoseBasket, type DoseBasketRequest } from '../doseBasket.ts'
const enginePath = '../../../../src/domain/flipping/geTax.js'
const { geTax } = await import(enginePath) as { geTax: DoseBasketRequest['tax'] }
const fixture = (): DoseBasketRequest => ({
  family: { ordinaryVial: true, limitGroup: 'synthetic', remainingAllowance: 6, vialId: 229,
    items: [1, 2, 3, 4].map(dose => ({ dose, id: 100 + dose })) },
  targetDose: 4, cash: 24300, tax: geTax, snapshot: 'synthetic', scenario: 'declared patient orders',
  quotes: [2100, 4300, 6000, null].map((buy, i) => ({ id: 101 + i, buy, sell: [2200, 4400, 6200, 9000][i], buyCap: [3, 6, 3, 0][i], sellCap: 100 })),
  vial: { buy: 5, sell: 3, buyCap: 100, sellCap: 100, provenance: 'declared supplied vial price' }
})
test('synthetic fair baseline and mixed uplift', () => {
  const r = optimizeDoseBasket(fixture())
  assert.equal(r.bestSingle.economicGain, 1796)
  assert.equal(r.best.economicGain, 2169)
  assert.equal(r.uplift, 373)
  assert.equal(r.coverage.status, 'complete')
})
test('remainder and containers conserve exactly; vial purchase counts against cash', () => {
  const r = fixture(); r.targetDose = 3; r.quotes[3].buy = 1; r.quotes[3].buyCap = 1
  const p = evaluateDoseBasket(r, { 104: 1 })
  assert.deepEqual([p.targetQuantity, p.remainderDose, p.extraVials, p.purchasedVials], [1, 1, 1, 1])
  assert.equal(p.inputDoses, p.targetQuantity * 3 + p.remainderDose)
  assert.equal(p.inputContainers + p.purchasedVials + p.suppliedVials, p.outputContainers + p.soldVials)
  r.cash = 1
  assert.ok(evaluateDoseBasket(r, { 104: 1 }).violations.includes('cash'))
})
test('shared allowance, explicit missing inputs and bounded coverage', () => {
  const r = fixture(); r.family.remainingAllowance = 5
  assert.ok(evaluateDoseBasket(r, { 101: 3, 103: 3 }).violations.includes('family allowance'))
  r.quotes[0].sell = null
  assert.ok(evaluateDoseBasket(r, { 103: 3 }).missingInputs.includes('sell:101'))
  r.vial.buy = null; r.targetDose = 1
  assert.ok(evaluateDoseBasket(r, { 103: 1 }).missingInputs.includes('vial buy'))
  assert.equal(optimizeDoseBasket(fixture(), { maxQuantity: 1, maxCandidates: 2 }).coverage.status, 'bounded')
})
test('owned potions and vials carry declared opportunity costs; zero action wins losses', () => {
  const r = fixture(); r.targetDose = 3
  r.owned = [{ id: 104, quantity: 1, netLiquidation: 10000 }]
  r.ownedVials = { quantity: 2, netLiquidation: 3 }
  const p = evaluateDoseBasket(r, {})
  assert.equal(p.ownedOpportunityCost, 10006)
  assert.equal(p.suppliedVials, 1)
  assert.equal(p.soldVials, 1)
  assert.equal(p.purchasedVials, 0)
  r.quotes.forEach(q => { q.buy = 100000 })
  assert.equal(optimizeDoseBasket(r).best.kind, 'zero-action')
})
test('per-item tax and deterministic input order', () => {
  const r = fixture(); r.quotes[3].sell = 101
  assert.equal(evaluateDoseBasket(r, { 101: 3, 103: 3 }).netRevenue, 3 * 99 + 9)
  const a = optimizeDoseBasket(fixture())
  const b = fixture(); b.family.items.reverse(); b.quotes.reverse()
  assert.deepEqual(optimizeDoseBasket(b).best, a.best)
})
test('all small baskets conserve doses and containers including supplied stock', () => {
  for (let target = 1; target <= 4; target++) for (let x = 0; x <= 3; x++) for (let y = 0; y <= 3; y++) {
    const r = fixture(); r.targetDose = target; r.ownedVials = { quantity: 2, netLiquidation: 3 }
    const p = evaluateDoseBasket(r, { 101: x, 103: y })
    assert.equal(p.inputDoses, p.targetQuantity * target + p.remainderDose)
    assert.equal(p.inputContainers + 2 + p.purchasedVials, p.outputContainers + p.soldVials)
  }
})
test('unknown allowance, unsupported vessels and missing owned values are explicit', () => {
  const r = fixture(); r.family.remainingAllowance = null
  assert.ok(evaluateDoseBasket(r, { 103: 1 }).missingInputs.includes('family allowance'))
  r.family.ordinaryVial = false
  assert.equal(evaluateDoseBasket(r, {}).status, 'unsupported')
  assert.equal(optimizeDoseBasket(r).coverage.status, 'incomplete')
  r.family.ordinaryVial = true; r.owned = [{ id: 103, quantity: 1, netLiquidation: null }]
  assert.ok(evaluateDoseBasket(r, {}).missingInputs.includes('owned liquidation:103'))
})
test('remainder and released vial sales respect caps; vial sales use shared tax', () => {
  const r = fixture(); r.quotes[0].sellCap = 0
  assert.ok(evaluateDoseBasket(r, { 103: 3 }).violations.includes('sell cap:101'))
  r.vial.sellCap = 0
  assert.ok(evaluateDoseBasket(r, { 101: 1, 103: 1 }).violations.includes('sell cap:229'))
  r.vial.sellCap = 100; r.vial.sell = 300000000
  const p = evaluateDoseBasket(r, { 101: 1, 103: 1 })
  assert.equal(p.netRevenue, 8820 + 295000000)
})
test('unsupported owned stock remains explicit in optimizer coverage', () => {
  const r = fixture(); r.owned = [{ id: 999, quantity: 1, netLiquidation: 1 }]
  assert.equal(evaluateDoseBasket(r, {}).status, 'unsupported')
  const result = optimizeDoseBasket(r)
  assert.equal(result.coverage.status, 'incomplete')
  assert.deepEqual(result.unsupportedReasons, ['unsupported owned:999'])
  assert.equal(result.status, 'unsupported')
  assert.equal(optimizeDoseBasket(fixture()).coverage.status, 'complete')
})
test('GP inputs must be nonnegative safe whole integers', () => {
  for (const value of [Number.MAX_VALUE, Infinity, NaN, -1, 0.5]) {
    const requests = [fixture(), fixture(), fixture(), fixture(), fixture()]
    requests[0].cash = value
    requests[1].quotes[0].buy = value
    requests[2].vial.sell = value
    requests[3].owned = [{ id: 101, quantity: 1, netLiquidation: value }]
    requests[4].ownedVials = { quantity: 1, netLiquidation: value }
    for (const r of requests) {
      assert.throws(() => evaluateDoseBasket(r, {}), RangeError)
      assert.throws(() => optimizeDoseBasket(r), RangeError)
    }
  }
})
test('unsafe monetary products, sums and injected tax are rejected before ranking', () => {
  const r = fixture(); r.quotes[3].sell = Number.MAX_SAFE_INTEGER
  assert.throws(() => evaluateDoseBasket(r, { 103: 3 }), RangeError)
  assert.throws(() => optimizeDoseBasket(r), RangeError)
  r.quotes[3].sell = 9000
  for (const tax of [Number.MAX_VALUE, NaN, -1, 0.5, 10000]) {
    r.tax = () => tax
    assert.throws(() => evaluateDoseBasket(r, { 103: 3 }), RangeError)
  }
  const owned = fixture(); owned.owned = [{ id: 101, quantity: 2, netLiquidation: Number.MAX_SAFE_INTEGER }]
  assert.throws(() => optimizeDoseBasket(owned), RangeError)
  const sum = fixture(); sum.owned = [{ id: 101, quantity: 1, netLiquidation: Number.MAX_SAFE_INTEGER }]
  sum.ownedVials = { quantity: 1, netLiquidation: 1 }
  assert.throws(() => evaluateDoseBasket(sum, {}), RangeError)
})
test('cash and vial costs, revenue sums and economic differences stay safe', () => {
  const buy = fixture(); buy.quotes[0].buy = Number.MAX_SAFE_INTEGER
  assert.throws(() => evaluateDoseBasket(buy, { 101: 2 }), RangeError)
  const vial = fixture(); vial.targetDose = 1; vial.vial.buy = Number.MAX_SAFE_INTEGER
  assert.throws(() => evaluateDoseBasket(vial, { 103: 1 }), RangeError)
  const revenue = fixture(); revenue.tax = () => 0; revenue.quotes[3].sell = Number.MAX_SAFE_INTEGER
  assert.throws(() => evaluateDoseBasket(revenue, { 101: 1, 103: 1 }), RangeError)
  const difference = fixture(); difference.quotes[3].sell = 0; difference.quotes[3].buy = 1
  difference.owned = [{ id: 104, quantity: 1, netLiquidation: Number.MAX_SAFE_INTEGER }]
  assert.throws(() => evaluateDoseBasket(difference, { 104: 1 }), RangeError)
  const result = optimizeDoseBasket(fixture())
  assert.ok(Number.isSafeInteger(result.uplift))
  for (const p of [result.best, result.bestSingle]) {
    for (const value of [p.cashOutlay, p.netRevenue, p.ownedOpportunityCost, p.cashSurplus, p.economicGain]) {
      assert.ok(Number.isSafeInteger(value))
    }
  }
})

test('unknown purchase allowance is unnecessary when cash rules out every source purchase', () => {
  for (const cash of [0, 2099]) for (const owned of [false, true]) {
    const r = fixture(); r.cash = cash; r.family.remainingAllowance = null
    if (owned) r.owned = [{ id: 103, quantity: 4, netLiquidation: 6000 }]
    const evaluated = evaluateDoseBasket(r, {})
    assert.equal(evaluated.status, 'feasible')
    assert.equal(evaluated.cashOutlay, 0)
    const result = optimizeDoseBasket(r)
    assert.equal(result.status, 'supported')
    assert.equal(result.coverage.status, 'complete')
    assert.deepEqual(result.missingInputs, [])
    assert.ok(result.coverage.sourceBounds.every(source => source.max === 0))
    assert.deepEqual(result.best.purchases, [])
    assert.deepEqual(result.bestSingle, result.best)
    assert.equal(result.uplift, 0)
    if (owned) assert.deepEqual(result.best, evaluated)
    else assert.equal(result.best.kind, 'zero-action')
    r.family.remainingAllowance = 0
    assert.deepEqual(optimizeDoseBasket(r).best, result.best)
  }
})
test('any potentially affordable purchase still requires unknown allowance beyond search bounds', () => {
  for (const buy of [0, 2100]) for (const maxQuantity of [0, 1]) for (const owned of [false, true]) {
    const r = fixture(); r.cash = 2100; r.family.remainingAllowance = null; r.quotes[0].buy = buy
    if (owned) r.owned = [{ id: 103, quantity: 4, netLiquidation: 6000 }]
    const result = optimizeDoseBasket(r, { maxQuantity })
    assert.equal(result.status, 'incomplete')
    assert.ok(result.missingInputs.includes('family allowance'))
    r.family.remainingAllowance = 0
    const knownZero = optimizeDoseBasket(r, { maxQuantity })
    assert.equal(knownZero.status, 'supported')
    assert.equal(knownZero.coverage.status, 'complete')
    assert.deepEqual(knownZero.best.purchases, [])
  }
})
test('cash-excluded sources retain conservative missing price and cap requirements', () => {
  const r = fixture(); r.cash = 0; r.family.remainingAllowance = null
  r.quotes[0].buyCap = null
  assert.ok(optimizeDoseBasket(r).missingInputs.includes('buy cap:101'))
  r.quotes[0].buyCap = 3; r.quotes[0].buy = null
  const result = optimizeDoseBasket(r)
  assert.ok(result.missingInputs.includes('buy:101'))
  assert.ok(result.missingInputs.includes('family allowance'))
})
test('owned-only vial needs remain evaluated when cash excludes potion purchases', () => {
  const r = fixture(); r.cash = 0; r.targetDose = 1; r.family.remainingAllowance = null
  r.owned = [{ id: 103, quantity: 1, netLiquidation: 1 }]
  assert.ok(evaluateDoseBasket(r, {}).violations.includes('cash'))
  assert.equal(optimizeDoseBasket(r).status, 'supported')
  assert.equal(optimizeDoseBasket(r).best.kind, 'zero-action')
  r.ownedVials = { quantity: 2, netLiquidation: 3 }
  const result = optimizeDoseBasket(r)
  assert.equal(result.status, 'supported')
  assert.equal(result.best.suppliedVials, 2)
  assert.equal(result.best.purchasedVials, 0)
  assert.equal(result.best.inputDoses, result.best.targetQuantity)
  r.ownedVials = undefined; r.vial.buy = null
  assert.ok(optimizeDoseBasket(r).missingInputs.includes('vial buy'))
})
