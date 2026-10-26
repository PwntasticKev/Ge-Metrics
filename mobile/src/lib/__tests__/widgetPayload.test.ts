/// <reference types="node" />
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildWidgetPayload, groupHoldings, MAX_WIDGET_ITEMS, MAX_WIDGET_PICKS, payloadContentKey, WIDGET_PAYLOAD_VERSION, type PayloadInput } from '../widget/payload.ts'

const BOND = 13190
const names: Record<number, string> = { 4151: 'Abyssal whip', 13190: 'Old school bond', 11802: 'Armadyl godsword' }
const nameOf = (id: number) => names[id] ?? null
const isTaxExempt = (id: number) => id === BOND

const pick = (id: number, profit = 1000) => ({ id, name: `Item ${id}`, buyAt: 100_000, sellAt: 100_000 + profit + 2000, profit })

const base = (over: Partial<PayloadInput> = {}): PayloadInput => ({
  picks: [], watchlistIds: [], lots: [], nameOf, isTaxExempt, now: 1_700_000_000_000, ...over
})

describe('buildWidgetPayload', () => {
  it('maps picks to targets and caps the count', () => {
    const picks = Array.from({ length: 9 }, (_, i) => pick(i + 1, 1000 - i))
    const p = buildWidgetPayload(base({ picks }))
    assert.equal(p.v, WIDGET_PAYLOAD_VERSION)
    assert.equal(p.picks.length, MAX_WIDGET_PICKS)
    assert.deepEqual(p.picks[0], { id: 1, name: 'Item 1', buy: 100_000, sell: 103_000, profit: 1000, noTax: false })
  })

  it('treats missing picks (still loading) as none', () => {
    assert.deepEqual(buildWidgetPayload(base({ picks: null })).picks, [])
  })

  it('names watchlist items, drops unknown ids and flags tax-exempt items', () => {
    const p = buildWidgetPayload(base({ watchlistIds: [4151, 999_999, BOND] }))
    assert.deepEqual(p.watchlist, [
      { id: 4151, name: 'Abyssal whip', noTax: false },
      { id: BOND, name: 'Old school bond', noTax: true }
    ])
  })

  it('caps the watchlist', () => {
    const ids = Array.from({ length: 20 }, () => 4151)
    assert.equal(buildWidgetPayload(base({ watchlistIds: ids })).watchlist.length, MAX_WIDGET_ITEMS)
  })
})

describe('groupHoldings', () => {
  it('sums lots per item with a quantity-weighted buy price, newest item first', () => {
    const lots = [
      { itemId: 4151, name: 'Abyssal whip', qty: 2, buyPrice: 1_000_000 },
      { itemId: 11802, name: 'Armadyl godsword', qty: 1, buyPrice: 9_000_000 },
      { itemId: 4151, name: 'Abyssal whip', qty: 1, buyPrice: 1_300_000 }
    ]
    assert.deepEqual(groupHoldings(lots, isTaxExempt), [
      { id: 4151, name: 'Abyssal whip', noTax: false, qty: 3, buyPrice: 1_100_000 },
      { id: 11802, name: 'Armadyl godsword', noTax: false, qty: 1, buyPrice: 9_000_000 }
    ])
  })

  it('skips empty lots', () => {
    assert.deepEqual(groupHoldings([{ itemId: 4151, name: 'Abyssal whip', qty: 0, buyPrice: 5 }], isTaxExempt), [])
  })
})

describe('payloadContentKey', () => {
  it('ignores the write time', () => {
    const a = buildWidgetPayload(base({ watchlistIds: [4151], now: 1 }))
    const b = buildWidgetPayload(base({ watchlistIds: [4151], now: 2 }))
    assert.equal(payloadContentKey(a), payloadContentKey(b))
    const c = buildWidgetPayload(base({ watchlistIds: [BOND], now: 2 }))
    assert.notEqual(payloadContentKey(a), payloadContentKey(c))
  })
})
