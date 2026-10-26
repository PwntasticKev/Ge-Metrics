// "Margins opened", fill-aware. screenSpreads finds margins well above their
// norm; this decides which a trader can actually take. Prices, amount, fill
// time and profit are the canonical offer (lib/offer) over the Next 4 hours
// window, so a scanner row matches Buy now and the item sheet:
// 1. estimate: every screened row gets its bulk-only offer. Rows that can't
//    buy and sell even one in time go to "Slow to fill"; the rest are
//    ranked, and the top ones get history.
// 2. settle: with an item's hourly series, the offer is refined. If the
//    margin isn't still well above its norm at those prices, it was a spike
//    and the row is dropped.
// Pure; tax is passed in.
import type { TimeseriesPoint } from './analytics/types.ts'
import type { TradePrices } from './fillAware.ts'
import { realisticOffer, type OfferInput, type RealisticOffer } from './offer.ts'
import { PICK_HORIZON_HOURS } from './pickFill.ts'
import type { Averages } from './scanMath.ts'
import { normFloor, spreadHistory, SPREAD_MIN_PROFIT_PER_LIMIT, SPREAD_MULTIPLE, type SpreadHistory, type SpreadRow, type TaxFn } from './spreadScan.ts'

/** Hide rows whose 7-day check says the margin is ordinary for them. */
export const SPREAD_HIDE_Z = 2
/** Hours a scanner offer has to buy and sell: the same as Next 4 hours and the item sheet. */
export const SCAN_HORIZON_HOURS = PICK_HORIZON_HOURS.quick

export interface SpreadFill extends TradePrices {
  /** Margin per item after tax at these prices. */
  margin: number
  multiple: number
  /** margin × buy limit; null when the limit is unknown. */
  profitPerLimit: number | null
  /** The canonical offer: amount, profit and fill times. */
  offer: RealisticOffer
  /** 'series' once the item's hourly history has checked the prices. */
  basis: 'averages' | 'series'
}

export interface SpreadCheck {
  row: SpreadRow
  fill: SpreadFill
  /** 7-day hourly check; undefined while loading, null without enough history. */
  history: SpreadHistory | null | undefined
}

export interface SpreadOptions {
  h1: Averages
  h24: Averages
  tax: TaxFn
  /** Settings: slowest sell to show. */
  maxSellHours: number
  /** Settings: cash per 4h; null = no limit. */
  budget: number | null
}

/** True when not even one buys and sells in time. */
export const isSlow = (check: SpreadCheck): boolean => check.fill.offer.qty < 1

function offerOf (row: SpreadRow, opts: SpreadOptions, series?: readonly TimeseriesPoint[]): RealisticOffer | null {
  const key = String(row.item.id)
  const input: OfferInput = {
    item: row.item,
    hour: opts.h1[key],
    day: opts.h24[key],
    series,
    horizon: SCAN_HORIZON_HOURS,
    maxSellHours: opts.maxSellHours,
    budget: opts.budget,
    tax: opts.tax
  }
  return realisticOffer(input)
}

function fillOf (row: SpreadRow, offer: RealisticOffer, multiple: number): SpreadFill {
  return {
    buyAt: offer.buyAt,
    sellAt: offer.sellAt,
    margin: offer.margin,
    multiple,
    profitPerLimit: row.item.limit ? offer.margin * row.item.limit : null,
    offer,
    basis: offer.basis === 'series' ? 'series' : 'averages'
  }
}

/** First pass: the bulk-only offer; null for thin items, without a positive margin or without flow. */
export function estimateSpread (row: SpreadRow, opts: SpreadOptions): SpreadCheck | null {
  const offer = offerOf(row, opts)
  if (!offer || offer.thin || offer.margin <= 0 || !offer.rate) return null
  return { row, fill: fillOf(row, offer, row.multiple), history: undefined }
}

export type SettleOutcome =
  | { kind: 'check'; check: SpreadCheck }
  /** Not a real margin at traded prices, ordinary for the item, or too small. */
  | { kind: 'drop'; why: 'spike' | 'thin' | 'ordinary' | 'small' }

/** Second pass with the item's hourly series. */
export function settleSpread (row: SpreadRow, series: readonly TimeseriesPoint[], opts: SpreadOptions): SettleOutcome {
  const offer = offerOf(row, opts, series)
  if (!offer || offer.basis !== 'series') return { kind: 'drop', why: 'thin' }
  const { margin } = offer
  // Same test as the first pass, at traded prices: still well above the day's norm?
  if (margin <= 0 || margin / Math.max(row.dayNorm, normFloor(offer.buyAt)) < SPREAD_MULTIPLE) return { kind: 'drop', why: 'spike' }
  const history = spreadHistory(series, margin, row.item.id, opts.tax)
  if (history && history.z < SPREAD_HIDE_Z) return { kind: 'drop', why: 'ordinary' }
  const multiple = history ? history.multiple : margin / Math.max(row.dayNorm, normFloor(offer.buyAt))
  if (row.item.limit && margin * row.item.limit < SPREAD_MIN_PROFIT_PER_LIMIT) return { kind: 'drop', why: 'small' }
  if (!offer.rate) return { kind: 'drop', why: 'thin' }
  return { kind: 'check', check: { row, fill: fillOf(row, offer, multiple), history } }
}

const byProfit = (a: SpreadCheck, b: SpreadCheck) =>
  b.fill.offer.profit - a.fill.offer.profit || b.fill.multiple - a.fill.multiple

const slowHours = (c: SpreadCheck) => c.fill.offer.slow?.hours ?? 0

export interface SpreadLists {
  /** Fill in time; most realistic profit first. */
  listed: SpreadCheck[]
  /** Can't buy and sell even one in time; slowest last. */
  slow: SpreadCheck[]
  /** Dropped after the history check, by reason. */
  dropped: Record<'spike' | 'thin' | 'ordinary' | 'small', number>
}

/** Rows that fill in time on the first pass, best first: these are worth a history check. */
export function fastFirst (checks: readonly SpreadCheck[]): SpreadCheck[] {
  return checks.filter(c => !isSlow(c)).sort(byProfit)
}

/**
 * Both passes together. `seriesOf` gives an item's hourly series once loaded
 * (undefined while loading or not requested); rows without one keep their
 * first-pass estimate.
 */
export function spreadLists (estimates: readonly SpreadCheck[], seriesOf: (id: number) => readonly TimeseriesPoint[] | undefined, opts: SpreadOptions): SpreadLists {
  const dropped = { spike: 0, thin: 0, ordinary: 0, small: 0 }
  const settled: SpreadCheck[] = []
  for (const est of estimates) {
    const series = seriesOf(est.row.item.id)
    if (!series) {
      settled.push(est)
      continue
    }
    const outcome = settleSpread(est.row, series, opts)
    if (outcome.kind === 'drop') dropped[outcome.why] += 1
    else settled.push(outcome.check)
  }
  return {
    listed: settled.filter(c => !isSlow(c)).sort(byProfit),
    slow: settled.filter(isSlow).sort((a, b) => slowHours(a) - slowHours(b)),
    dropped
  }
}
