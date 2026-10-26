// Turns the timing analytics into compact JSON for agents.

import type { AveragePrice, LatestPrice, MappingEntry, TimeseriesPoint } from '../../wiki/types.js'
import { pct, round } from '../format.js'
import { type SpikeFlag, assessThinSpike } from '../scanner/thinSpikes.js'
import { BUY_LIMIT_HOURS, type MarketFlow, buyFillHours, flowFromSeries, sellFillHours, slotRate } from './fillTime.js'
import { MAX_LIST_WAIT_HOURS, type TaxOf, sellAdvice } from './sellAdvice.js'
import { type TimeProfile, type TimingCall, WEEKDAYS, dayOfWeekProfile, hourOfDayProfile } from './timeProfile.js'

const hours = (h: number): number | null => (Number.isFinite(h) ? round(h, 2) : null)
const clock = (utcHour: number) => `${String(utcHour).padStart(2, '0')}:00 UTC`

function call (c: TimingCall | null, label: (slot: number) => string | number) {
  if (!c) return null
  return {
    when: label(c.slot),
    edgePct: pct(c.edge),
    edgeGp: round(c.edgeGp, 1),
    beatRatePct: pct(c.beatRate),
    periods: c.periods,
    pValue: round(c.pValue, 4),
    confidence: c.confidence
  }
}

function profileTable (p: TimeProfile, label: (slot: number) => string | number) {
  return {
    columns: ['slot', 'lowVsPeriodPct', 'highVsPeriodPct', 'medianVolume', 'periods'],
    rows: p.slots.map(s => [label(s.slot), pct(s.lowDev), pct(s.highDev), Math.round(s.volume), s.periods])
  }
}

export function bestTradeHoursReport (entry: MappingEntry, hourly: readonly TimeseriesPoint[], sixHourly: readonly TimeseriesPoint[]) {
  const byHour = hourOfDayProfile(hourly)
  const byDay = dayOfWeekProfile(sixHourly)
  const weekday = (slot: number) => WEEKDAYS[slot] ?? String(slot)
  return {
    id: entry.id,
    name: entry.name,
    timezone: 'UTC',
    hourOfDay: {
      daysUsed: byHour.periods,
      buyAt: call(byHour.buy, clock),
      sellAt: call(byHour.sell, clock),
      table: profileTable(byHour, clock)
    },
    dayOfWeek: {
      weeksUsed: byDay.periods,
      buyOn: call(byDay.buy, weekday),
      sellOn: call(byDay.sell, weekday),
      table: profileTable(byDay, weekday)
    },
    howToRead: 'Prices are detrended (vs the median of the surrounding 24h / 7d) and compared within each day / week. buyAt = hour with the cheapest instant-sell prices, sellAt = hour with the dearest instant-buy prices. edgePct/edgeGp = how much better than the rest of the day per item. confidence uses a sign test across days, Bonferroni-corrected for picking the best of 24 hours (7 weekdays); thin hours are excluded. Treat "low" as no reliable pattern.'
  }
}

export interface FillInput {
  readonly entry: MappingEntry
  readonly series: readonly TimeseriesPoint[]
  readonly latest: LatestPrice | undefined
  readonly qty: number
  readonly buyPrice?: number
  readonly sellPrice?: number
  readonly taxOf: TaxOf
}

function flowSummary (flow: MarketFlow) {
  return {
    typicalLow: Math.round(flow.typicalLow),
    typicalHigh: Math.round(flow.typicalHigh),
    instantSellsPerHour: round(flow.instantSellsPerHour, 1),
    instantBuysPerHour: round(flow.instantBuysPerHour, 1)
  }
}

export function fillEstimateReport ({ entry, series, latest, qty, buyPrice, sellPrice, taxOf }: FillInput) {
  const flow = flowFromSeries(series)
  const buyAt = buyPrice ?? latest?.low ?? null
  const sellAt = sellPrice ?? latest?.high ?? null
  const base = { id: entry.id, name: entry.name, qty, limit: entry.limit, buyPrice: buyAt, sellPrice: sellAt }
  if (!flow || buyAt === null || sellAt === null) return { ...base, error: 'Not enough recent trades on both sides to estimate fill times.' }
  const profitEach = sellAt - buyAt - taxOf(sellAt)
  const limitWindows = entry.limit ? Math.ceil(qty / entry.limit) : 1
  const buyHours = Math.max(buyFillHours(flow, buyAt, qty), (limitWindows - 1) * BUY_LIMIT_HOURS)
  const sellHours = sellFillHours(flow, sellAt, qty)
  const slot = slotRate(flow, { buyAt, sellAt, profitEach, qty, limit: entry.limit })
  return {
    ...base,
    taxEach: taxOf(sellAt),
    profitEach,
    totalProfit: profitEach * qty,
    market24h: flowSummary(flow),
    buyHours: hours(buyHours),
    sellHours: hours(sellHours),
    totalHours: hours(buyHours + sellHours),
    buyLimitWindows: limitWindows,
    perSlot: { units: slot.units, cycleHours: hours(slot.cycleHours), profit: slot.profit, gpPerHour: Math.round(slot.gpPerHour) },
    willFill: Number.isFinite(buyHours) && Number.isFinite(sellHours),
    note: 'Estimates use the last 24h of per-side volume: buy offers fill from instant-sells, sell offers from instant-buys. At the typical price you get ~25% of that flow (queue); outbidding toward the other side of the spread raises it. Hours above 4 per buy limit are bounded by the 4h limit reset.'
  }
}

export interface SellOrHoldInput {
  readonly entry: MappingEntry
  readonly qty: number
  readonly paid: number
  readonly series: readonly TimeseriesPoint[]
  readonly latest: LatestPrice | undefined
  readonly averages: { readonly '5m'?: AveragePrice; readonly '1h'?: AveragePrice; readonly '24h'?: AveragePrice }
  readonly taxOf: TaxOf
}

/** Lowest sell price whose after-tax proceeds cover what was paid. */
export function breakEvenPrice (paid: number, taxOf: TaxOf): number {
  let lo = Math.max(1, Math.floor(paid))
  let hi = Math.ceil(paid * 1.03) + 2
  while (hi - taxOf(hi) < paid) hi *= 2
  while (lo < hi) {
    const midPrice = Math.floor((lo + hi) / 2)
    if (midPrice - taxOf(midPrice) >= paid) hi = midPrice
    else lo = midPrice + 1
  }
  return lo
}

export function spikeSummary (flag: SpikeFlag | null) {
  if (!flag) return null
  return { kind: flag.kind, trigger: flag.trigger, changePct: pct(flag.change), volumeVsUsualPct: pct(flag.volumeRatio) }
}

export function sellOrHoldReport ({ entry, qty, paid, series, latest, averages, taxOf }: SellOrHoldInput) {
  const flow = flowFromSeries(series)
  const advice = sellAdvice({ qty, instantSell: latest?.low ?? null, instantBuy: latest?.high ?? null, dayHigh: averages['24h']?.avgHighPrice ?? null, flow, taxOf })
  const spike = assessThinSpike({ h1: averages['1h'], h24: averages['24h'], m5: averages['5m'] })
  const best = hourOfDayProfile(series).sell
  const net = (price: number) => price - taxOf(price)
  const pnl = (price: number) => Math.round((net(price) - paid) * qty)
  const base = { id: entry.id, name: entry.name, qty, paidEach: paid, breakEvenPrice: breakEvenPrice(paid, taxOf) }
  if (!advice) return { ...base, error: 'No live instant-sell price or recent trades; cannot advise.' }
  const listPrice = Math.round(advice.listPrice)
  const pumped = spike?.kind === 'pump'
  return {
    ...base,
    verdict: pumped ? 'sell-now' : advice.verdict,
    sellNow: { price: advice.nowPrice, taxEach: taxOf(advice.nowPrice), profitTotal: pnl(advice.nowPrice) },
    list: { price: listPrice, taxEach: taxOf(listPrice), profitTotal: pnl(listPrice), expectedWaitHours: hours(advice.waitHours) },
    extraFromListing: Math.round(advice.extraGp),
    bestSellHour: best && best.confidence !== 'low' ? call(best, clock) : null,
    spike: spikeSummary(spike),
    reason: pumped
      ? 'Price is in a thin-volume pump: sell into it before it snaps back.'
      : advice.verdict === 'list'
        ? `Listing at the 24h typical high should fill in about ${hours(advice.waitHours)}h and earns more after tax.`
        : `Listing would not pay enough or would take over ${MAX_LIST_WAIT_HOURS}h to fill; selling now is better.`
  }
}
