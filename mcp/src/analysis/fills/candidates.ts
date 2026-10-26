// A flip candidate at prices it can actually trade at, with the market flow
// that decides how fast it fills. Built cheaply from the bulk /1h and /24h
// averages for every item, then refined from the item's own 1h series for the
// short list worth a throttled request.

import type { AveragePrice, IdMap, LatestPrice, MappingEntry, TimeseriesPoint } from '../../wiki/types.js'
import { type MarketFlow, flowFromAverages, flowFromSeries } from '../timing/fillTime.js'
import { ASSUMED_BUY_LIMIT, type FillMetrics, cycleUnits, fillMetrics } from './metrics.js'
import { type PriceBasis, realisticFromAverages, realisticFromSeries } from './realistic.js'

export type TaxFn = (sellPrice: number, itemId: number) => number

export interface BulkPrices {
  readonly latest: IdMap<LatestPrice>
  readonly h1: IdMap<AveragePrice>
  readonly h24: IdMap<AveragePrice>
}

export interface Candidate {
  readonly entry: MappingEntry
  readonly buyAt: number
  readonly sellAt: number
  readonly profitEach: number
  readonly flow: MarketFlow
  readonly basis: PriceBasis
}

const withPrices = (entry: MappingEntry, buyAt: number, sellAt: number, flow: MarketFlow, basis: PriceBasis, tax: TaxFn): Candidate =>
  ({ entry, buyAt, sellAt, profitEach: sellAt - buyAt - tax(sellAt, entry.id), flow, basis })

/** From bulk averages; null when either side lacks enough recent trades. */
export function bulkCandidate (entry: MappingEntry, bulk: BulkPrices, tax: TaxFn): Candidate | null {
  const h1 = bulk.h1.get(entry.id)
  const h24 = bulk.h24.get(entry.id)
  const prices = realisticFromAverages({ h1, h24, latest: bulk.latest.get(entry.id) })
  const flow = flowFromAverages(h1, h24)
  if (!prices || !flow) return null
  return withPrices(entry, prices.buyAt, prices.sellAt, flow, prices.basis, tax)
}

export interface RefineOptions {
  /**
   * Cap the series ask at the bulk ask (last qualifying hour / day, and the
   * live high). The series median lags a falling market; a 14-day backtest
   * showed asks set above the last hour's high mostly never filled and were
   * dumped at a loss. Default true; false only to reproduce the old behaviour.
   */
  readonly capSellAtRecent?: boolean
}

/**
 * Replace bulk prices and flow with the item's 24h hourly view. Where the
 * series has too few qualifying hours to price, its volume still sets the flow.
 */
export function refineCandidate (c: Candidate, series: readonly TimeseriesPoint[] | undefined, tax: TaxFn, o: RefineOptions = {}): Candidate {
  if (!series?.length) return c
  const flow = flowFromSeries(series)
  if (!flow) return c
  const prices = realisticFromSeries(series)
  if (!prices) return { ...c, flow }
  const sellAt = o.capSellAtRecent === false ? prices.sellAt : Math.min(prices.sellAt, c.sellAt)
  return withPrices(c.entry, prices.buyAt, sellAt, flow, prices.basis, tax)
}

export interface AssessOptions {
  readonly budget?: number
  readonly maxFillHours: number
}

export function assess (c: Candidate, o: AssessOptions): FillMetrics {
  return fillMetrics({
    flow: c.flow,
    buyAt: c.buyAt,
    sellAt: c.sellAt,
    profitEach: c.profitEach,
    units: cycleUnits(c.entry.limit, c.buyAt, o.budget),
    limit: c.entry.limit ?? ASSUMED_BUY_LIMIT,
    maxFillHours: o.maxFillHours
  })
}
