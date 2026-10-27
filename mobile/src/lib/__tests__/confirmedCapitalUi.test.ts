/// <reference types="node" />
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { advanceActivity, capitalSnapshot, parseGp } from '../../components/confirmedCapital/activity.ts'
import { deriveCapitalPlan } from '../confirmedCapital.ts'
import { createSlot, type Slot } from '../slots/slots.ts'
import type { Flip, Lot } from '../pnl/journal.ts'

const settings = { budget: 1000000, membersItems: true, maxSellHours: 2 }
const slot = createSlot({ itemId: 1, name: 'Item', icon: null, side: 'buy', qty: 10, price: 100 }, 'offer', 1000)!
const lot: Lot = { id: 'lot', itemId: 1, name: 'Item', icon: null, qty: 10, buyPrice: 100, boughtAt: 1000, windowStart: 1000, reminderId: null }
const sale: Flip = { id: 'sale', lotId: 'lot', itemId: 1, name: 'Item', icon: null, qty: 1, buyPrice: 100, sellPrice: 200, tax: 0, profit: 100, boughtAt: 1000, soldAt: 2000 }
const input = { slots: [slot], holdings: [lot], sales: [sale] }
const baseline = capitalSnapshot(input, settings, '')

describe('screen-local confirmed capital', () => {
  it('distinguishes unknown, explicit zero and optional reserve; rejects malformed GP', () => {
    assert.equal(parseGp(''), null)
    assert.equal(parseGp('  '), null)
    assert.equal(parseGp('', true), 0)
    assert.equal(parseGp('0'), 0)
    assert.equal(parseGp(' 2000000 '), 2000000)
    for (const value of ['-1', '1.5', '1e6', '2M', '1,000', 'Infinity', '9007199254740992']) assert.equal(parseGp(value), null)
  })

  it('detects offer placement, repricing, fills, downward corrections and closure', () => {
    const variants: Slot[][] = [[], [slot, { ...slot, id: 'new' }], [{ ...slot, price: 101 }], [{ ...slot, qty: 11 }], [{ ...slot, filled: 1, filledValue: 100 }], [{ ...slot, lotId: 'changed' }], [{ ...slot, changes: [...slot.changes, { at: 2000, price: 100, qty: 10, kind: 'updated' }] }]]
    for (const slots of variants) assert.notEqual(capitalSnapshot({ ...input, slots }, settings, ''), baseline)
    const filled = capitalSnapshot({ ...input, slots: [{ ...slot, filled: 2, filledValue: 200 }] }, settings, '')
    assert.notEqual(capitalSnapshot({ ...input, slots: [{ ...slot, filled: 1, filledValue: 100 }] }, settings, ''), filled)
  })

  it('detects manual buys/sales, edits, deleted records, cash settings and reserve', () => {
    for (const change of [
      { holdings: [] }, { holdings: [lot, { ...lot, id: 'new' }] }, { holdings: [{ ...lot, qty: 9 }] },
      { sales: [] }, { sales: [sale, { ...sale, id: 'new' }] }, { sales: [{ ...sale, sellPrice: 201 }] }
    ]) assert.notEqual(capitalSnapshot({ ...input, ...change }, settings, ''), baseline)
    for (const change of [{ budget: null }, { membersItems: false }, { maxSellHours: 4 }]) assert.notEqual(capitalSnapshot(input, { ...settings, ...change }, ''), baseline)
    assert.notEqual(capitalSnapshot(input, settings, '500000'), baseline)
  })

  it('ignores record ordering, cosmetic edits and notification bookkeeping', () => {
    const other = { ...slot, id: 'other' }
    assert.equal(capitalSnapshot({ ...input, slots: [slot, other] }, settings, ''), capitalSnapshot({ ...input, slots: [other, slot] }, settings, ''))
    assert.equal(capitalSnapshot({ slots: [{ ...slot, name: 'New name', lastKind: 'wait', notifiedAt: 3000 }], holdings: [{ ...lot, reminderId: 'reminder' }], sales: [sale] }, settings, ''), baseline)
  })

  it('invalidates immediately while hidden and never revives a declaration after records revert', () => {
    const initial = { snapshot: baseline, revision: 0 }
    assert.equal(advanceActivity(initial, baseline), initial)
    const changed = advanceActivity(initial, capitalSnapshot({ ...input, sales: [] }, settings, ''))
    const reverted = advanceActivity(changed, baseline)
    assert.equal(reverted.revision, 2)
    const declaration = { id: 'cash', amountGp: 2000000, confirmedAt: 3000, activityRevision: initial.revision }
    const planInput = { ...input, declaration, activityRevision: reverted.revision, now: 3000, reserveGp: 500000, slotCount: 8 }
    assert.equal(deriveCapitalPlan(planInput).spendableGp, null)
    const reconfirmed = deriveCapitalPlan({ ...planInput, declaration: { ...declaration, activityRevision: reverted.revision } })
    assert.equal(reconfirmed.spendableGp, 1500000)
    assert.equal(reconfirmed.freeSlots, 7)
  })
})
