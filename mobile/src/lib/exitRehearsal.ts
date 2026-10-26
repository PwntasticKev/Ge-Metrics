// Quote checks, not fills. Each decision sees only 24 preceding CLOSED
// hours; UTC-aligned, non-overlapping windows avoid recounting one move.
import type { TimeseriesPoint } from './analytics/types.ts'
import { median } from './analytics/stats.ts'
import { pricesFromAverages, pricesFromSeries, windowCounts } from './fillAware.ts'
import type { TaxOfItem } from './offer.ts'
import type { SideAverages } from './scanMath.ts'

export type ExitHorizon = 2 | 4 | 8
export const MIN_EXIT_EXAMPLES = 12
const HOUR = 3600
const LOOKBACK = 24
const positive = (n: number | null): n is number => n !== null && Number.isFinite(n) && n > 0

export interface ExitExample {
  decision: number
  buyAt: number
  sellAt: number
  /** After-tax instant-exit return; null without sufficient trades. */
  exitReturn: number | null
  /** Whether the final hour's high average still supported the target. */
  targetQuoted: boolean | null
}

export interface ExitReport {
  examples: readonly ExitExample[]
  matched: number
  exitChecked: number
  positiveExits: number
  targetChecked: number
  targetQuoted: number
  medianReturn: number | null
  worstReturn: number | null
  firstDecision: number | null
  lastDecision: number | null
}

/** Volume-weighted trailing-day prices, ignoring prices without trades. */
function dayAverage (rows: readonly TimeseriesPoint[]): SideAverages {
  const side = (high: boolean) => {
    let value = 0
    let volume = 0
    for (const p of rows) {
      const price = high ? p.avgHighPrice : p.avgLowPrice
      const count = high ? p.highPriceVolume : p.lowPriceVolume
      if (positive(price) && count > 0) { value += price * count; volume += count }
    }
    return { price: volume ? value / volume : null, volume }
  }
  const high = side(true)
  const low = side(false)
  return { avgHighPrice: high.price, avgLowPrice: low.price, highPriceVolume: high.volume, lowPriceVolume: low.volume }
}

interface RehearsalInput {
  series: readonly TimeseriesPoint[]
  itemId: number
  /** Today's realistic quote, not a single latest trade. */
  buyAt: number
  sellAt: number
  horizon: ExitHorizon
  nowSec: number
  tax: TaxOfItem
}

export function exitRehearsal ({ series, itemId, buyAt, sellAt, horizon, nowSec, tax }: RehearsalInput): ExitReport {
  const todayReturn = (sellAt - tax(sellAt, itemId) - buyAt) / buyAt
  const empty: ExitReport = { examples: [], matched: 0, exitChecked: 0, positiveExits: 0, targetChecked: 0, targetQuoted: 0, medianReturn: null, worstReturn: null, firstDecision: null, lastDecision: null }
  if (!positive(buyAt) || !positive(sellAt) || !Number.isFinite(todayReturn) || todayReturn <= 0) return empty
  // Ambiguous duplicates do not invent volume or double-count examples.
  const rows = new Map<number, TimeseriesPoint>()
  const duplicates = new Set<number>()
  for (const row of series) {
    if (!Number.isInteger(row.timestamp) || row.timestamp % HOUR || row.timestamp + HOUR > nowSec) continue
    if (rows.has(row.timestamp)) duplicates.add(row.timestamp)
    rows.set(row.timestamp, row)
  }
  for (const t of duplicates) rows.delete(t)
  const times = [...rows.keys()].sort((a, b) => a - b)
  const examples: ExitExample[] = []
  let firstDecision: number | null = null
  let lastDecision: number | null = null
  for (const t of times) {
    const decision = t + HOUR
    if (decision % (horizon * HOUR) || decision + horizon * HOUR > nowSec) continue
    const history: TimeseriesPoint[] = []
    for (let h = LOOKBACK; h > 0; h--) {
      const p = rows.get(decision - h * HOUR)
      if (p) history.push(p)
    }
    if (history.length !== LOOKBACK) continue
    firstDecision ??= decision
    lastDecision = decision
    const hour = history[history.length - 1]
    const day = dayAverage(history)
    const live = { high: hour.avgHighPrice, low: hour.avgLowPrice }
    const recent = pricesFromAverages(live, hour, day)
    const quote = pricesFromSeries(live, history, recent ?? undefined)
    if (!quote) continue
    const roi = (quote.sellAt - tax(quote.sellAt, itemId) - quote.buyAt) / quote.buyAt
    // Fixed matching rule, visible in the UI. No future outcome selection.
    if (roi < todayReturn * 0.5 || roi > todayReturn * 2) continue
    const end = rows.get(decision + (horizon - 1) * HOUR)
    const lowKnown = end && positive(end.avgLowPrice) && windowCounts(end.lowPriceVolume, day.lowPriceVolume / LOOKBACK)
    const highKnown = end && positive(end.avgHighPrice) && windowCounts(end.highPriceVolume, day.highPriceVolume / LOOKBACK)
    examples.push({
      decision, ...quote,
      exitReturn: lowKnown ? (end.avgLowPrice! - tax(end.avgLowPrice!, itemId) - quote.buyAt) / quote.buyAt : null,
      targetQuoted: highKnown ? end.avgHighPrice! >= quote.sellAt : null
    })
  }
  const exits = examples.flatMap(e => e.exitReturn === null ? [] : [e.exitReturn])
  const targets = examples.filter(e => e.targetQuoted !== null)
  return {
    examples, matched: examples.length, exitChecked: exits.length, positiveExits: exits.filter(x => x > 0).length,
    targetChecked: targets.length, targetQuoted: targets.filter(x => x.targetQuoted).length,
    medianReturn: median(exits), worstReturn: exits.length ? Math.min(...exits) : null,
    firstDecision, lastDecision
  }
}

/** Smallest whole-GP sale recovering entry under the engine's GE tax. */
export function breakEvenSale (buyAt: number, itemId: number, tax: TaxOfItem): number {
  let low = Math.ceil(buyAt)
  let high = Math.ceil(buyAt * 2)
  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    if (mid - tax(mid, itemId) >= buyAt) high = mid
    else low = mid + 1
  }
  return low
}
