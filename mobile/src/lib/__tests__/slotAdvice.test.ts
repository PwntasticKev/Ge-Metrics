/// <reference types="node" />
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { MarketFlow } from '../analytics/fillTime.ts'
import { slotAdvice, slotMarket, STALE_HOURS, type AdviceInput, type SlotMarket } from '../slots/advice.ts'

const HOUR = 3_600_000
const NOW = 1_800_000_000_000
// 2% tax, like the GE above 50 gp.
const taxOf = (price: number) => Math.floor(price * 0.02)

const flow: MarketFlow = {
  typicalLow: 1000,
  typicalHigh: 1100,
  instantSellsPerHour: 4000,
  instantBuysPerHour: 4000,
  recentLows: [],
  recentHighs: []
}

const market = (low: [number | null, number | null], high: [number | null, number | null], f: MarketFlow | null = flow): SlotMarket =>
  ({ low: { live: low[0], hour: low[1] }, high: { live: high[0], hour: high[1] }, flow: f })

const buy = (over: Partial<AdviceInput['slot']> = {}): AdviceInput['slot'] =>
  ({ side: 'buy', price: 1000, qty: 1000, filled: 0, updatedAt: NOW - HOUR, costBasis: null, target: 1100, ...over })
const sell = (over: Partial<AdviceInput['slot']> = {}): AdviceInput['slot'] =>
  ({ side: 'sell', price: 1100, qty: 1000, filled: 0, updatedAt: NOW - HOUR, costBasis: 1000, target: null, ...over })

const run = (slot: AdviceInput['slot'], m: SlotMarket, now = NOW) => slotAdvice({ slot, market: m, now, taxOf })

describe('slot advice: buy offers', () => {
  it('is filling when the bid is at or above a recent instant-sell price', () => {
    const a = run(buy(), market([1000, 1005], [1100, 1100]))
    assert.equal(a.kind, 'filling')
    assert.equal(a.action, false)
    assert.ok(a.etaHours !== null && Number.isFinite(a.etaHours))
    // (1100 - 22 tax - 1000) x 1000 left
    assert.equal(a.profit, 78_000)
  })

  it('says raise when every recent trade is above the bid, with the extra cost and the profit left', () => {
    const a = run(buy({ price: 990 }), market([1000, 1010], [1100, 1100]))
    assert.equal(a.kind, 'raise')
    assert.equal(a.action, true)
    assert.equal(a.headline, 'Behind market')
    // The cheaper candidate fills within the stale window, so it is chosen.
    assert.equal(a.price, 1000)
    assert.equal(a.delta, 10)
    assert.equal(a.profit, 78_000)
    assert.match(a.detail, /Raise to 1,000 \(\+10 each\), still \+78K profit/)
  })

  it('raises to the higher candidate when the lower one would not fill in time', () => {
    const slow: MarketFlow = { ...flow, instantSellsPerHour: 100 }
    const a = run(buy({ price: 990, qty: 200 }), market([1000, 1010], [1100, 1100], slow))
    assert.equal(a.kind, 'raise')
    assert.equal(a.price, 1010)
  })

  it('cancels when the margin at the bid is gone', () => {
    const a = run(buy({ price: 1000 }), market([990, 995], [1015, 1020]))
    assert.equal(a.kind, 'cancel')
    assert.equal(a.headline, 'Margin gone')
  })

  it('cancels when keeping up with the market leaves nothing after tax', () => {
    const a = run(buy({ price: 1000 }), market([1080, 1085], [1100, 1100]))
    assert.equal(a.kind, 'cancel')
  })

  it('relists after the stale window even when the bid is in the market', () => {
    const a = run(buy({ updatedAt: NOW - (STALE_HOURS + 0.5) * HOUR }), market([1000, 1000], [1100, 1100]))
    assert.equal(a.kind, 'relist')
    assert.equal(a.headline, 'Stale 4h')
    assert.equal(a.price, 1000)
  })

  it('is done when everything filled', () => {
    const a = run(buy({ filled: 1000 }), market([1000, 1000], [1100, 1100]))
    assert.equal(a.kind, 'done')
    assert.equal(a.action, false)
  })

  it('is unknown without any recent instant-sell price', () => {
    assert.equal(run(buy(), market([null, null], [1100, 1100])).kind, 'unknown')
  })

  it('uses the pick target when there is no live sell price', () => {
    const a = run(buy({ target: 1100 }), market([1000, null], [null, null]))
    assert.equal(a.kind, 'filling')
    assert.equal(a.profit, 78_000)
  })

  it('counts only what is left', () => {
    const a = run(buy({ filled: 900 }), market([1000, 1000], [1100, 1100]))
    assert.equal(a.profit, 7_800)
  })
})

describe('slot advice: sell offers', () => {
  it('is filling when the ask is at or under a recent instant-buy price', () => {
    const a = run(sell(), market([1000, 1000], [1100, 1100]))
    assert.equal(a.kind, 'filling')
    assert.equal(a.profit, 78_000)
  })

  it('says the market fell and suggests a lower ask, or hold', () => {
    const a = run(sell({ price: 1100 }), market([1000, 1000], [1060, 1080]))
    assert.equal(a.kind, 'lower')
    assert.equal(a.headline, 'Market fell')
    // Dearest candidate that fills in time.
    assert.equal(a.price, 1080)
    assert.equal(a.delta, -20)
    assert.match(a.detail, /Lower ask to 1,080 \(-20 each\), still \+59K profit, or hold\./)
  })

  it('calls an ask over a flat market "above market"', () => {
    const a = run(sell({ price: 1200 }), market([1000, 1000], [1100, 1100]))
    assert.equal(a.kind, 'lower')
    assert.equal(a.headline, 'Above market')
  })

  it('says how far under cost a lower ask would be, without red-flag wording', () => {
    const a = run(sell({ price: 1100, costBasis: 1100 }), market([1000, 1000], [1050, 1060]))
    assert.equal(a.kind, 'lower')
    assert.match(a.detail, /under cost, or hold/)
  })

  it('relists a stale ask at no more than its price', () => {
    const a = run(sell({ price: 1050, updatedAt: NOW - 5 * HOUR }), market([1000, 1000], [1100, 1100]))
    assert.equal(a.kind, 'relist')
    assert.equal(a.price, 1050)
  })

  it('works without a cost basis', () => {
    const a = run(sell({ costBasis: null }), market([1000, 1000], [1100, 1100]))
    assert.equal(a.kind, 'filling')
    assert.equal(a.profit, null)
  })

  it('is unknown without recent instant-buy prices', () => {
    assert.equal(run(sell(), market([1000, 1000], [null, null])).kind, 'unknown')
  })
})

describe('slotMarket', () => {
  it('drops live prices older than the cut-off', () => {
    const m = slotMarket({ high: 1100, low: 1000, highTime: (NOW - 7 * HOUR) / 1000, lowTime: NOW / 1000 }, { avgHighPrice: 1090, avgLowPrice: null }, null, NOW)
    assert.deepEqual(m.high, { live: null, hour: 1090 })
    assert.deepEqual(m.low, { live: 1000, hour: null })
  })

  it('handles a missing item', () => {
    const m = slotMarket(null, undefined, null, NOW)
    assert.deepEqual(m.low, { live: null, hour: null })
  })
})
