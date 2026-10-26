/// <reference types="node" />
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { BuyPick } from '@ge/engine'
import type { TimeseriesPoint } from '../analytics/types.ts'
import { ASSUMED_BUY_LIMIT, offerForQty, realisticOffer, startingQty, type OfferInput } from '../offer.ts'
import { fillAwarePicks, PICK_HORIZON_HOURS, type PickContext } from '../pickFill.ts'
import { pickRates } from '../pickTiming.ts'
import { sharePickFromOffer, shareCardText } from '../shareCard.ts'
import { SHEET_HORIZON_HOURS, sheetFill } from '../sheetFill.ts'
import { slotMarket } from '../slots/advice.ts'
import { estimateSpread, SCAN_HORIZON_HOURS, settleSpread } from '../spreadFill.ts'
import { screenSpread, type LiveItem } from '../spreadScan.ts'
import { buildWidgetPayload } from '../widget/payload.ts'

const tax = (sell: number) => (sell >= 50 ? Math.floor(sell * 0.02) : 0)
const NOW = 1_800_000_000
const HOUR = 3_600
const avg = (high: number, low: number, highVol: number, lowVol = highVol) => ({ avgHighPrice: high, avgLowPrice: low, highPriceVolume: highVol, lowPriceVolume: lowVol })

/** 48 hours trading `low` / `high` at `vol` items a side, newest last. */
const series = (high: number, low: number, vol: number): TimeseriesPoint[] =>
  Array.from({ length: 48 }, (_, i) => ({ timestamp: NOW - (48 - i) * HOUR, ...avg(high, low, vol) }))

// Purple sweets-like: cheap, liquid, a big buy limit (PR #34's mismatch).
const ID = 10_476
const live: LiveItem = { id: ID, name: 'Purple sweets', icon: null, limit: 10_000, high: 1_300, low: 1_000, highTime: NOW - 60, lowTime: NOW - 60 }
const h1 = { [ID]: avg(1_300, 1_000, 3_000) }
const h24 = { [ID]: avg(1_100, 1_000, 60_000) }
const settings = { maxSellHours: 0.5, budget: null }
const hourly = series(1_100, 1_000, 2_500).map((p, i, all) => (i >= all.length - 6 ? { ...p, avgHighPrice: 1_300 } : p))

/** The engine's quick pick: its own prices and its own (bigger) amount, as before this change. */
const enginePick: BuyPick = {
  id: ID, name: live.name, icon: null, members: true, buyAt: 1_000, sellAt: 1_300, tax: 26, profit: 274, roi: 0.274,
  maxQty: 5_445, potential: 274 * 5_445, cost: 1_000 * 5_445, dayVolume: 60_000, liveProfit: 274
}

const ctx = (withSeries: boolean): PickContext => ({
  h1,
  h24,
  itemOf: id => (id === ID ? { id, high: live.high, low: live.low, limit: live.limit } : null),
  seriesOf: withSeries ? id => (id === ID ? hourly : undefined) : undefined,
  tax,
  budget: settings.budget
})

const sheetInput = (withSeries: boolean) => ({
  item: { id: ID, high: live.high, low: live.low, limit: live.limit },
  hour: h1[ID],
  day: h24[ID],
  series: withSeries ? hourly : undefined,
  ...settings,
  tax
})

const numbers = (o: { buyAt: number; sellAt: number; qty: number; profit: number; fillHours: number | null }) =>
  [o.buyAt, o.sellAt, o.qty, o.profit, o.fillHours]

describe('one item, same numbers on every surface', () => {
  for (const withSeries of [false, true]) {
    const label = withSeries ? 'refined with history' : 'bulk-only estimate'
    it(`Buy now row equals the item sheet (${label})`, () => {
      const sheet = sheetFill(sheetInput(withSeries))
      assert.ok(sheet && sheet.qty >= 1)
      assert.equal(sheet.refined, withSeries)
      const [row] = fillAwarePicks([enginePick], ctx(withSeries), { mode: 'quick', maxSellHours: settings.maxSellHours }).picks
      assert.ok(row)
      assert.deepEqual(numbers(row.offer), numbers(sheet))
      assert.deepEqual([row.buyAt, row.sellAt, row.maxQty, row.potential, row.profit], [sheet.buyAt, sheet.sellAt, sheet.qty, sheet.profit, sheet.margin])
      // The engine's 5,445 never reaches the row.
      assert.notEqual(row.maxQty, enginePick.maxQty)
      assert.deepEqual(pickRates([row]).get(ID), sheet.rate)
    })
    it(`share cards from the row and the sheet match (${label})`, () => {
      const sheet = sheetFill(sheetInput(withSeries))
      const [row] = fillAwarePicks([enginePick], ctx(withSeries), { mode: 'quick', maxSellHours: settings.maxSellHours }).picks
      assert.ok(sheet && row)
      assert.deepEqual(shareCardText(sharePickFromOffer(row.offer, row, 0)), shareCardText(sharePickFromOffer(sheet, live, 0)))
    })
  }

  it('the scanner quotes the same offer as the sheet, before and after history', () => {
    const row = screenSpread(live, { h1, h24, nowSec: NOW, tax, isPump: () => false })
    assert.ok(row)
    const opts = { h1, h24, tax, ...settings }
    const est = estimateSpread(row, opts)
    assert.ok(est)
    assert.deepEqual(numbers(est.fill.offer), numbers(sheetFill(sheetInput(false))!))
    const settled = settleSpread(row, hourly, opts)
    assert.equal(settled.kind, 'check')
    if (settled.kind === 'check') assert.deepEqual(numbers(settled.check.fill.offer), numbers(sheetFill(sheetInput(true))!))
    assert.equal(SCAN_HORIZON_HOURS, SHEET_HORIZON_HOURS)
    assert.equal(PICK_HORIZON_HOURS.quick, SHEET_HORIZON_HOURS)
  })

  it('GE slot advice asks the same price the bulk offer sells at', () => {
    const market = slotMarket({ high: live.high, low: live.low, highTime: NOW, lowTime: NOW }, h1[ID], h24[ID], null, NOW * 1000)
    const bulk = sheetFill(sheetInput(false))
    assert.equal(market.high.realistic, bulk?.sellAt)
    assert.equal(market.low.realistic, bulk?.buyAt)
  })

  it('the widget carries the row\'s prices and profit each', () => {
    const [row] = fillAwarePicks([enginePick], ctx(true), { mode: 'quick', maxSellHours: settings.maxSellHours }).picks
    const payload = buildWidgetPayload({ picks: [row], watchlistIds: [], lots: [], nameOf: () => null, isTaxExempt: () => false, now: 0 })
    assert.deepEqual(payload.picks[0], { id: ID, name: live.name, buy: row.offer.buyAt, sell: row.offer.sellAt, profit: row.offer.margin, noTax: false })
  })
})

describe('realisticOffer input contract', () => {
  const input = (over: Partial<OfferInput> = {}): OfferInput => ({ ...sheetInput(false), horizon: 2, ...over })
  it('marks bulk-only offers as estimates and series offers as refined', () => {
    assert.equal(realisticOffer(input())?.refined, false)
    assert.equal(realisticOffer(input())?.basis, 'averages')
    assert.equal(realisticOffer(input({ series: hourly }))?.refined, true)
    assert.equal(realisticOffer(input({ series: hourly }))?.basis, 'series')
  })
  it('keeps a strategy quote but sizes it the same way', () => {
    const quoted = realisticOffer(input({ quote: { buyAt: 1_000, sellAt: 1_100 } }))
    assert.equal(quoted?.basis, 'quote')
    assert.deepEqual([quoted?.buyAt, quoted?.sellAt, quoted?.margin], [1_000, 1_100, 78])
  })
  it('starts from buy limits per 4h, cash and the thinner side\'s volume', () => {
    const base = { item: { id: 1, high: 1, low: 1, limit: 100 }, day: avg(1, 1, 2_400, 24_000), budget: null }
    assert.equal(startingQty({ ...base, horizon: 2 }, 10), 100)
    assert.equal(startingQty({ ...base, horizon: 8 }, 10), 200)
    assert.equal(startingQty({ ...base, horizon: 2, budget: 500 }, 10), 50)
    assert.equal(startingQty({ ...base, horizon: 2, item: { ...base.item, limit: 10_000 } }, 10), 400)
    assert.equal(startingQty({ ...base, horizon: 2, item: { ...base.item, limit: null } }, 10), ASSUMED_BUY_LIMIT)
  })
  it('resizes for the cash plan without changing prices', () => {
    const offer = realisticOffer(input())
    assert.ok(offer && offer.qty > 10)
    const less = offerForQty(offer, 10)
    assert.deepEqual([less.buyAt, less.sellAt, less.margin, less.qty, less.profit], [offer.buyAt, offer.sellAt, offer.margin, 10, offer.margin * 10])
    assert.ok((less.fillHours ?? Infinity) < (offer.fillHours ?? 0))
  })
  it('is null without day averages', () => {
    assert.equal(realisticOffer(input({ day: undefined })), null)
  })
})
