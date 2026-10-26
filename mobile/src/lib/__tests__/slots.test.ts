/// <reference types="node" />
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { SlotAdvice } from '../slots/advice.ts'
import { applySlotFill } from '../slots/fills.ts'
import { SLOT_COOLDOWN_MS, slotNotices } from '../slots/notify.ts'
import { averageFillPrice, createSlot, EMPTY_SLOTS, freeSlots, MAX_CHANGES, parseSlots, setFilled, stepTargets, updateOffer, withoutSlot, withSlot, type Slot } from '../slots/slots.ts'
import type { Lot } from '../pnl/journal.ts'

const NOW = 1_800_000_000_000
const base = { itemId: 4151, name: 'Abyssal whip', icon: 'Abyssal whip.png', side: 'buy' as const, price: 1_000_000, qty: 8 }
const slot = (over: Partial<Slot> = {}): Slot => ({ ...createSlot(base, 's1', NOW)!, ...over })

describe('slots', () => {
  it('creates a slot with a placed change, and rejects bad amounts', () => {
    const s = createSlot({ ...base, target: 1_100_000 }, 's1', NOW)!
    assert.equal(s.filled, 0)
    assert.equal(s.target, 1_100_000)
    assert.deepEqual(s.changes, [{ at: NOW, price: 1_000_000, qty: 8, kind: 'placed' }])
    assert.equal(createSlot({ ...base, price: 0 }, 's', NOW), null)
    assert.equal(createSlot({ ...base, qty: 1.5 }, 's', NOW), null)
  })

  it('clamps fills and reports the change', () => {
    const { slot: s, delta } = setFilled(slot(), 3)
    assert.equal(s.filled, 3)
    assert.equal(delta, 3)
    assert.equal(s.filledValue, 3_000_000)
    assert.equal(setFilled(s, 99).slot.filled, 8)
    assert.equal(setFilled(s, -4).slot.filled, 0)
    assert.equal(setFilled(s, -4).slot.filledValue, 0)
    assert.equal(setFilled(s, 3).delta, 0)
  })

  it('averages fill prices across a re-price', () => {
    const first = setFilled(slot(), 2).slot
    const repriced = updateOffer(first, 1_100_000, 8, NOW + 1)!
    const more = setFilled(repriced, 4).slot
    assert.equal(averageFillPrice(more), 1_050_000)
  })

  it('offers -1, +1, a quarter and full steps', () => {
    assert.deepEqual(stepTargets({ qty: 100, filled: 10 }), { minus: 9, plus: 11, quarter: 35, full: 100 })
    assert.deepEqual(stepTargets({ qty: 2, filled: 0 }), { minus: 0, plus: 1, quarter: 1, full: 2 })
  })

  it('records an offer update, resets staleness and advice, and keeps the history capped', () => {
    let s = slot({ lastKind: 'raise' })
    s = updateOffer(s, 1_010_000, 8, NOW + 5)!
    assert.equal(s.updatedAt, NOW + 5)
    assert.equal(s.lastKind, null)
    assert.equal(s.changes.at(-1)?.kind, 'updated')
    for (let i = 0; i < 30; i++) s = updateOffer(s, 1_020_000 + i, 8, NOW + 10 + i)!
    assert.equal(s.changes.length, MAX_CHANGES)
  })

  it('refuses an update below what already filled, and returns the same slot when nothing changed', () => {
    const s = setFilled(slot(), 5).slot
    assert.equal(updateOffer(s, 1_000_000, 4, NOW), null)
    assert.equal(updateOffer(s, 1_000_000, 8, NOW), s)
  })

  it('adds, replaces and removes slots, and counts free ones', () => {
    const s = slot()
    let state = withSlot(EMPTY_SLOTS, s)
    assert.equal(freeSlots(state, true), 7)
    assert.equal(freeSlots(state, false), 2)
    state = withSlot(state, { ...s, price: 5 })
    assert.equal(state.slots.length, 1)
    assert.equal(state.slots[0].price, 5)
    assert.equal(withoutSlot(state, s.id).slots.length, 0)
  })

  it('parses saved data, skipping bad and duplicate records', () => {
    const good = slot({ filled: 2, filledValue: 2_000_000 })
    const parsed = parseSlots({ notify: true, slots: [good, { id: 'x' }, good, { ...good, id: 's2', filled: 99 }] })
    assert.equal(parsed.notify, true)
    assert.equal(parsed.slots.length, 2)
    assert.equal(parsed.slots[1].filled, 8)
    assert.deepEqual(parseSlots('nope'), EMPTY_SLOTS)
  })
})

describe('slot fills to the Bought list', () => {
  const fill = { lotId: 'lot-1', itemId: 4151, name: 'Abyssal whip', icon: null, delta: 2, price: 1_000_000 }

  it('creates the slot lot on the first fill', () => {
    const r = applySlotFill([], fill, NOW, NOW - 10)
    assert.equal(r.lots.length, 1)
    assert.equal(r.created?.qty, 2)
    assert.equal(r.created?.windowStart, NOW - 10)
  })

  it('grows the lot at a weighted price and shrinks it on a correction', () => {
    const lots = applySlotFill([], fill, NOW, NOW).lots
    const grown = applySlotFill(lots, { ...fill, delta: 2, price: 1_100_000 }, NOW, NOW).lots
    assert.equal(grown[0].qty, 4)
    assert.equal(grown[0].buyPrice, 1_050_000)
    const shrunk = applySlotFill(grown, { ...fill, delta: -1, price: 1_100_000 }, NOW, NOW).lots
    assert.equal(shrunk[0].qty, 3)
    const gone = applySlotFill(shrunk, { ...fill, delta: -3 }, NOW, NOW)
    assert.equal(gone.lots.length, 0)
    assert.equal(gone.removed?.id, 'lot-1')
  })

  it('ignores a correction for a lot that was already sold', () => {
    const other: Lot = { id: 'o', itemId: 1, name: 'x', icon: null, qty: 1, buyPrice: 1, boughtAt: NOW, windowStart: NOW, reminderId: null }
    assert.deepEqual(applySlotFill([other], { ...fill, delta: -1 }, NOW, NOW).lots, [other])
  })
})

describe('slot notifications', () => {
  const act = (kind: SlotAdvice['kind'], action = true): SlotAdvice =>
    ({ kind, action, headline: 'Behind market', detail: 'Raise to 1,000.', price: 1000, delta: 10, profit: 1, etaHours: 1 })

  it('notifies when advice turns into an action, once', () => {
    const first = slotNotices([slot()], () => act('raise'), NOW)
    assert.equal(first.notices.length, 1)
    assert.equal(first.notices[0].title, 'Abyssal whip buy: behind market')
    assert.equal(first.slots[0].lastKind, 'raise')
    const again = slotNotices(first.slots, () => act('raise'), NOW + 1)
    assert.equal(again.notices.length, 0)
  })

  it('respects the cooldown, then notifies if the change stuck', () => {
    const first = slotNotices([slot()], () => act('raise'), NOW).slots
    const cooling = slotNotices(first, () => act('cancel'), NOW + 60_000)
    assert.equal(cooling.notices.length, 0)
    assert.equal(cooling.slots[0].lastKind, 'raise')
    const later = slotNotices(cooling.slots, () => act('cancel'), NOW + SLOT_COOLDOWN_MS)
    assert.equal(later.notices.length, 1)
  })

  it('resets on non-action advice and ignores unknown', () => {
    const first = slotNotices([slot()], () => act('raise'), NOW).slots
    const filling = slotNotices(first, () => act('filling', false), NOW + 1).slots
    assert.equal(filling[0].lastKind, 'filling')
    const unknown = slotNotices(filling, () => act('unknown', false), NOW + 2).slots
    assert.equal(unknown[0], filling[0])
    assert.equal(slotNotices([slot()], () => null, NOW).notices.length, 0)
  })
})
