import { test } from 'node:test'
import assert from 'node:assert/strict'
import { allowanceDeclaration, mappingAllowance, prayerItems } from './allowance.ts'
import { optimizeDoseBasket, type DoseBasketRequest } from '../../lib/doseBasket.ts'
const mapping = () => prayerItems.map(i => ({ ...i, name: `Prayer potion(${i.dose})`, limit: 100 }))
test('blank stays unknown, zero stays exhausted, invalid declarations remain errors', () => {
  assert.deepEqual(allowanceDeclaration('', 100), { value: null, error: null })
  assert.deepEqual(allowanceDeclaration('0', 100), { value: 0, error: null })
  for (const text of [' ', '-1', '1.5', '1,000', '9007199254740992']) assert.ok(allowanceDeclaration(text, 100).error)
  assert.ok(allowanceDeclaration('101', 100).error)
  assert.equal(allowanceDeclaration('100', 100).value, 100)
  assert.equal(allowanceDeclaration('100', 50).value, 100) // refreshed bound validates without rewriting declaration
  assert.ok(allowanceDeclaration('100', 50).error)
})
test('unused-window shortcut requires all four verified, consistent known limits', () => {
  assert.deepEqual(mappingAllowance(), { known: 0, bound: null, verifiedCap: null })
  assert.deepEqual(mappingAllowance(mapping()), { known: 4, bound: 100, verifiedCap: 100 })
  assert.deepEqual(mappingAllowance(mapping().slice(1)), { known: 3, bound: 100, verifiedCap: null })
  const rows = mapping(); rows[0].limit = 50
  assert.deepEqual(mappingAllowance(rows), { known: 4, bound: 50, verifiedCap: null })
  rows[0].name = 'Wrong family'
  assert.deepEqual(mappingAllowance(rows), { known: 3, bound: 100, verifiedCap: null })
  rows[0] = mapping()[0]; rows[0].limit = NaN
  assert.equal(mappingAllowance(rows).verifiedCap, null)
  assert.equal(mappingAllowance([...mapping(), mapping()[0]]).verifiedCap, null)
  assert.equal(mappingAllowance(mapping().map(m => ({ ...m, limit: 0 }))).verifiedCap, 0)
})
test('actual optimizer marks unknown allowance incomplete even with zero-action fallback', () => {
  const request: DoseBasketRequest = {
    family: { ordinaryVial: true, limitGroup: 'prayer-potion-shared', remainingAllowance: allowanceDeclaration('', 100).value, vialId: 229, items: prayerItems },
    cash: 1000, targetDose: 4, quotes: prayerItems.map(i => ({ id: i.id, buy: 10, sell: 1, buyCap: 1, sellCap: 10 })),
    vial: { buy: 1, sell: 1, buyCap: 10, sellCap: 10, provenance: 'test' }, snapshot: 'test', scenario: 'test', tax: () => 0
  }
  const result = optimizeDoseBasket(request)
  assert.equal(result.status, 'incomplete')
  assert.equal(result.coverage.status, 'incomplete')
  assert.ok(result.missingInputs.includes('family allowance'))
  assert.equal(result.best.kind, 'zero-action')
  request.family.remainingAllowance = 0
  assert.equal(optimizeDoseBasket(request).status, 'supported')
})
