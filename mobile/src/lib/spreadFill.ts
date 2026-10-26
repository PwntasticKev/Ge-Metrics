// "Margins opened", fill-aware. screenSpreads finds margins well above their
// norm; this decides which a trader can actually take:
// 1. estimate: every screened row gets fill times for one buy limit from the
//    bulk /1h and /24h flow. Rows whose sell (or buy) can't fill in time go
//    to "Slow to fill"; the rest are ranked, and the top ones get history.
// 2. settle: with an item's hourly series, prices come from recent hours that
//    traded with volume (pricesFromSeries). If the margin isn't still well
//    above its norm at those prices, it was a spike and the row is dropped.
//    Fill times are redone from the series and slow rows demoted.
// Pure; tax is passed in.
import { flowFromAverages, flowFromSeries } from './analytics/fillTime.ts'
import { checkFill, dayTrades, MIN_DAY_TRADES, pricesFromSeries, type FillCheck, type TradePrices } from './fillAware.ts'
import type { TimeseriesPoint } from './analytics/types.ts'
import type { Averages } from './scanMath.ts'
import { marginAfterTax, normFloor, spreadHistory, SPREAD_MIN_PROFIT_PER_LIMIT, SPREAD_MULTIPLE, type SpreadHistory, type SpreadRow, type TaxFn } from './spreadScan.ts'

/** Hide rows whose 7-day check says the margin is ordinary for them. */
export const SPREAD_HIDE_Z = 2
/** Hours of series behind the fill-time flow. */
export const FLOW_HOURS = 24

export interface SpreadFill extends TradePrices {
  /** Margin per item after tax at these prices. */
  margin: number
  multiple: number
  /** margin × buy limit; null when the limit is unknown. */
  profitPerLimit: number | null
  /** Fill times for one buy limit (one item when unknown). */
  rate: FillCheck
  /** 'series' once the item's hourly history has checked the prices. */
  basis: 'averages' | 'series'
}

export interface SpreadCheck {
  row: SpreadRow
  fill: SpreadFill
  /** 7-day hourly check; undefined while loading, null without enough history. */
  history: SpreadHistory | null | undefined
}

const lotOf = (row: SpreadRow): number => row.item.limit || 1

function fillAt (row: SpreadRow, prices: TradePrices, margin: number, multiple: number, rate: FillCheck, basis: SpreadFill['basis']): SpreadFill {
  return { ...prices, margin, multiple, profitPerLimit: row.item.limit ? margin * row.item.limit : null, rate, basis }
}

/** First pass: fill times from the bulk averages; null for thin items or without flow on both sides. */
export function estimateSpread (row: SpreadRow, h1: Averages, h24: Averages, maxHours: number): SpreadCheck | null {
  const key = String(row.item.id)
  if (dayTrades(h24[key]) < MIN_DAY_TRADES) return null
  const flow = flowFromAverages(h1[key], h24[key])
  if (!flow) return null
  const rate = checkFill(flow, { buyAt: row.buyAt, sellAt: row.sellAt, profitEach: row.live, qty: lotOf(row) }, maxHours)
  return { row, fill: fillAt(row, row, row.live, row.multiple, rate, 'averages'), history: undefined }
}

export type SettleOutcome =
  | { kind: 'check'; check: SpreadCheck }
  /** Not a real margin at traded prices, ordinary for the item, or too small. */
  | { kind: 'drop'; why: 'spike' | 'thin' | 'ordinary' | 'small' }

/** Second pass with the item's hourly series. */
export function settleSpread (row: SpreadRow, series: readonly TimeseriesPoint[], tax: TaxFn, maxHours: number): SettleOutcome {
  const prices = pricesFromSeries(row.item, series, row)
  if (!prices) return { kind: 'drop', why: 'thin' }
  const margin = marginAfterTax(prices.sellAt, prices.buyAt, row.item.id, tax)
  // Same test as the first pass, at traded prices: still well above the day's norm?
  if (margin <= 0 || margin / Math.max(row.dayNorm, normFloor(prices.buyAt)) < SPREAD_MULTIPLE) return { kind: 'drop', why: 'spike' }
  const history = spreadHistory(series, margin, row.item.id, tax)
  if (history && history.z < SPREAD_HIDE_Z) return { kind: 'drop', why: 'ordinary' }
  const multiple = history ? history.multiple : margin / Math.max(row.dayNorm, normFloor(prices.buyAt))
  if (row.item.limit && margin * row.item.limit < SPREAD_MIN_PROFIT_PER_LIMIT) return { kind: 'drop', why: 'small' }
  const flow = flowFromSeries(series, FLOW_HOURS)
  if (!flow) return { kind: 'drop', why: 'thin' }
  const rate = checkFill(flow, { ...prices, profitEach: margin, qty: lotOf(row) }, maxHours)
  return { kind: 'check', check: { row, fill: fillAt(row, prices, margin, multiple, rate, 'series'), history } }
}

const byProfit = (a: SpreadCheck, b: SpreadCheck) =>
  (b.fill.profitPerLimit ?? -1) - (a.fill.profitPerLimit ?? -1) || b.fill.multiple - a.fill.multiple

export interface SpreadLists {
  /** Fill in time; most realistic profit per limit first. */
  listed: SpreadCheck[]
  /** Would take longer than the limit to sell (or buy); slowest last. */
  slow: SpreadCheck[]
  /** Dropped after the history check, by reason. */
  dropped: Record<'spike' | 'thin' | 'ordinary' | 'small', number>
}

/** Rows that fill in time on the first pass, best first: these are worth a history check. */
export function fastFirst (checks: readonly SpreadCheck[]): SpreadCheck[] {
  return checks.filter(c => !c.fill.rate.slow).sort(byProfit)
}

/**
 * Both passes together. `seriesOf` gives an item's hourly series once loaded
 * (undefined while loading or not requested); rows without one keep their
 * first-pass estimate.
 */
export function spreadLists (estimates: readonly SpreadCheck[], seriesOf: (id: number) => readonly TimeseriesPoint[] | undefined, tax: TaxFn, maxHours: number): SpreadLists {
  const dropped = { spike: 0, thin: 0, ordinary: 0, small: 0 }
  const settled: SpreadCheck[] = []
  for (const est of estimates) {
    const series = seriesOf(est.row.item.id)
    if (!series) {
      settled.push(est)
      continue
    }
    const outcome = settleSpread(est.row, series, tax, maxHours)
    if (outcome.kind === 'drop') dropped[outcome.why] += 1
    else settled.push(outcome.check)
  }
  return {
    listed: settled.filter(c => !c.fill.rate.slow).sort(byProfit),
    slow: settled.filter(c => c.fill.rate.slow).sort((a, b) => (a.fill.rate.slow?.hours ?? 0) - (b.fill.rate.slow?.hours ?? 0)),
    dropped
  }
}
