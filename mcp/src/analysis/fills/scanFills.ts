// Fill checks for the scanners that quote their own prices (margin_scan,
// find_dips). The quoted trade is run through the fill model; when it won't
// fill in time it is demoted and the trade at typical, fillable prices is
// shown alongside so an agent never acts on a one-off spike.

import type { AveragePrice, LatestPrice, MappingEntry, TimeseriesPoint } from '../../wiki/types.js'
import { type MarketFlow, flowFromAverages, flowFromSeries } from '../timing/fillTime.js'
import type { TaxFn } from './candidates.js'
import { ASSUMED_BUY_LIMIT, type FillMetrics, fillMetrics } from './metrics.js'
import { realisticFromAverages, realisticFromSeries } from './realistic.js'

export interface ItemMarket {
  readonly item: MappingEntry
  readonly h1?: AveragePrice
  readonly h24?: AveragePrice
  readonly latest?: LatestPrice
  readonly series?: readonly TimeseriesPoint[]
}

export interface ScanFill {
  readonly quoted: FillMetrics | null
  /** The same item at typical, fillable prices (only when the quote is demoted). */
  readonly typical: FillMetrics | null
  readonly demotedReason: string | null
}

export const NO_FLOW_REASON = 'Not enough recent per-side volume to estimate fill times.'

function flowOf (m: ItemMarket): MarketFlow | null {
  return (m.series?.length ? flowFromSeries(m.series) : null) ?? flowFromAverages(m.h1, m.h24)
}

function typicalPrices (m: ItemMarket) {
  return (m.series?.length ? realisticFromSeries(m.series) : null) ?? realisticFromAverages(m)
}

interface Quote { readonly buyAt: number; readonly sellAt: number }

function metricsAt (m: ItemMarket, flow: MarketFlow, q: Quote, tax: TaxFn, maxFillHours: number): FillMetrics {
  const limit = m.item.limit ?? ASSUMED_BUY_LIMIT
  return fillMetrics({ flow, buyAt: q.buyAt, sellAt: q.sellAt, profitEach: q.sellAt - q.buyAt - tax(q.sellAt, m.item.id), units: limit, limit, maxFillHours })
}

/** Fill check for a quoted buy/sell (e.g. margin_scan's careful prices). */
export function quoteFill (m: ItemMarket, quote: Quote, tax: TaxFn, maxFillHours: number): ScanFill {
  const flow = flowOf(m)
  if (!flow) return { quoted: null, typical: null, demotedReason: NO_FLOW_REASON }
  const quoted = metricsAt(m, flow, quote, tax, maxFillHours)
  if (quoted.fillable) return { quoted, typical: null, demotedReason: null }
  const prices = typicalPrices(m)
  return { quoted, typical: prices ? metricsAt(m, flow, prices, tax, maxFillHours) : null, demotedReason: quoted.demotedReason }
}

/**
 * Fill check for a dip: buy at the dipped price, sell no higher than what
 * fills (the quoted exit, capped at the typical fillable high).
 */
export function dipFill (m: ItemMarket, quote: Quote, tax: TaxFn, maxFillHours: number): ScanFill {
  const prices = typicalPrices(m)
  const sellAt = prices ? Math.min(quote.sellAt, prices.sellAt) : quote.sellAt
  return quoteFill(m, { buyAt: quote.buyAt, sellAt }, tax, maxFillHours)
}

const brief = (f: FillMetrics | null) => f && {
  buyAt: f.buyAt,
  sellAt: f.sellAt,
  marginAfterTax: f.marginAfterTax,
  qty: f.units,
  expectedFillHours: f.expectedFillHours,
  gpPerHourPerSlot: f.gpPerHourPerSlot,
  realisticProfitPerLimit: f.realisticProfitPerLimit,
  qtyWithinMaxHours: f.qtyWithinMaxHours
}

export function scanFillJson (f: ScanFill) {
  return {
    fill: brief(f.quoted),
    atTypicalPrices: f.typical ? { ...brief(f.typical), fillable: f.typical.fillable } : undefined,
    demoted: f.demotedReason !== null,
    demotedReason: f.demotedReason
  }
}
