/// <reference types="node" />
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { deriveCapitalPlan, type CapitalPlanInput } from '../confirmedCapital.ts'
import { createSlot } from '../slots/slots.ts'

const now = 1800000000000
const declaration = { id: 'cash', amountGp: 2000000, confirmedAt: now, activityRevision: 4 }
const input: CapitalPlanInput = { declaration, activityRevision: 4, now, reserveGp: 500000, slotCount: 3, slots: [], holdings: [], sales: [] }
const offer = createSlot({ itemId: 1, name: 'Item', icon: null, side: 'buy', price: 1000000, qty: 1 }, 'offer', now)!

describe('confirmed capital planning seam', () => {
  it('keeps missing cash unknown even with profitable sales', () => {
    const result = deriveCapitalPlan({ ...input, declaration: null, sales: [{ id: 'sale', lotId: null, itemId: 1, name: 'Item', icon: null, qty: 1, buyPrice: 1, sellPrice: 9000000, tax: 0, profit: 8999999, boughtAt: now, soldAt: now }] })
    assert.equal(result.status, 'unknown')
    assert.equal(result.spendableGp, null)
    assert.equal(result.planBudget, null)
    assert.equal(result.nextActions.reviewHistoricalSales, 1)
  })

  it('deducts reserve once without subtracting existing commitments', () => {
    const result = deriveCapitalPlan({ ...input, slots: [offer] })
    assert.equal(result.spendableGp, 1500000)
    assert.deepEqual(result.planBudget, { cash: 1500000, slots: 2 })
    assert.equal(deriveCapitalPlan({ ...input, reserveGp: 3000000 }).spendableGp, 0)
  })

  it('counts fully filled open offers as occupied, with collection unknown', () => {
    const result = deriveCapitalPlan({ ...input, slots: [{ ...offer, side: 'sell', filled: 1, filledValue: 600000 }] })
    assert.equal(result.freeSlots, 2)
    assert.equal(result.nextActions.reviewCollection, 1)
    assert.equal(result.spendableGp, 1500000)
  })

  it('requires reconfirmation for every activity revision mismatch', () => {
    for (const activityRevision of [3, 5]) {
      const result = deriveCapitalPlan({ ...input, activityRevision })
      assert.equal(result.status, 'reconfirm')
      assert.equal(result.spendableGp, null)
      assert.equal(result.planBudget, null)
      assert.ok(result.reasons.includes('activity-changed'))
    }
  })

  it('rejects invalid money, revisions, times and slot counts instead of using old cash', () => {
    const invalid: CapitalPlanInput[] = [
      ...[-1, 0.5, Infinity, Number.MAX_SAFE_INTEGER + 1].map(reserveGp => ({ ...input, reserveGp })),
      ...[-1, 1.5, NaN].map(amountGp => ({ ...input, declaration: { ...declaration, amountGp } })),
      ...[0, now + 1, NaN].map(confirmedAt => ({ ...input, declaration: { ...declaration, confirmedAt } })),
      ...[0, 4, 9, 3.5].map(slotCount => ({ ...input, slotCount })),
      { ...input, activityRevision: -1 }, { ...input, now: NaN }
    ]
    for (const value of invalid) {
      assert.equal(deriveCapitalPlan(value).status, 'invalid')
      assert.equal(deriveCapitalPlan(value).planBudget, null)
    }
  })

  it('uses a replacement balance once regardless of recorded proceeds or inventory value', () => {
    const lot = { id: 'lot', itemId: 1, name: 'Item', icon: null, qty: 10, buyPrice: 9000000, boughtAt: now, windowStart: now, reminderId: null }
    const sale = { id: 'sale', lotId: 'old', itemId: 1, name: 'Item', icon: null, qty: 1, buyPrice: 1, sellPrice: 600000, tax: 0, profit: 599999, boughtAt: now, soldAt: now }
    const replacement = { ...input, declaration: { ...declaration, amountGp: 2600000 }, holdings: [lot], sales: [sale] }
    assert.equal(deriveCapitalPlan(replacement).spendableGp, 2100000)
    assert.deepEqual(deriveCapitalPlan(replacement), deriveCapitalPlan(replacement))
    assert.equal(deriveCapitalPlan({ ...input, declaration: { ...declaration, amountGp: 0 } }).spendableGp, 0)
  })

  it('accepts partial linked sells without adding their quantities to inventory', () => {
    const lot = { id: 'lot', itemId: 1, name: 'Item', icon: null, qty: 10, buyPrice: 1, boughtAt: now, windowStart: now, reminderId: null }
    const linked = { ...offer, side: 'sell' as const, lotId: 'lot', qty: 6, filled: 2 }
    const result = deriveCapitalPlan({ ...input, holdings: [lot], slots: [linked] })
    assert.equal(result.status, 'ready')
    assert.equal(result.nextActions.reviewInventory, 1)
    assert.equal(result.spendableGp, 1500000)
    assert.equal(deriveCapitalPlan({ ...input, holdings: [lot], slots: [{ ...linked, qty: 4, filled: 2 }, { ...linked, id: 'second', qty: 6, filled: 1 }] }).status, 'ready')
    assert.equal(deriveCapitalPlan({ ...input, holdings: [lot], slots: [{ ...linked, qty: 4 }, { ...linked, id: 'second', qty: 7 }] }).status, 'reconcile')
    assert.ok(deriveCapitalPlan({ ...input, holdings: [lot], slots: [{ ...linked, qty: 11 }] }).reasons.includes('linked-quantity-exceeds-lot'))
    assert.ok(deriveCapitalPlan({ ...input, holdings: [lot], slots: [linked, { ...linked, id: 'second' }] }).reasons.includes('conflicting-linked-slots'))
    assert.ok(deriveCapitalPlan({ ...input, holdings: [lot], slots: [{ ...linked, itemId: 2 }] }).reasons.includes('linked-item-mismatch'))
  })

  it('requires reconciliation for conflicting links and excessive occupied slots', () => {
    const linked = { ...offer, side: 'sell' as const, lotId: 'missing' }
    const result = deriveCapitalPlan({ ...input, slots: [linked] })
    assert.ok(result.reasons.includes('missing-linked-lot'))
    assert.equal(result.planBudget, null)
    assert.ok(deriveCapitalPlan({ ...input, slots: [offer, offer, offer, offer] }).reasons.includes('too-many-occupied-slots'))
  })
})
