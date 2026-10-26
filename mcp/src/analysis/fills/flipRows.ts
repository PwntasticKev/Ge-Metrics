// top_flips, fill-aware: every engine row (live prices) gets prices it can
// really trade at, fill times there and GP/hour per slot. Sorting uses those
// realistic numbers; rows that won't fill in time (or are thin-volume pumps)
// are demoted below the fillable ones, or dropped with a summary.

import type { MappingEntry, TimeseriesPoint } from '../../wiki/types.js'
import { pct } from '../format.js'
import { type BulkPrices, type Candidate, type RefineOptions, type TaxFn, assess, bulkCandidate, refineCandidate } from './candidates.js'
import { type FillMetrics, rankFillable } from './metrics.js'

export type FillSort = 'profit' | 'roi' | 'profit_per_limit' | 'gp_per_hour'

/** The engine's live-price row (from analysis/flips topFlips). */
export interface LiveFlipRow {
  readonly id: number
  readonly name: string
  readonly buyAt: number
  readonly sellAt: number
  readonly marginAfterTax: number
  readonly limit: number | null
  readonly dailyVolume: number | null
  readonly priceAgeMin: number | null
}

export interface FlipRowContext {
  readonly mappingById: ReadonlyMap<number, MappingEntry>
  readonly bulk: BulkPrices
  readonly tax: TaxFn
  readonly pumps: ReadonlySet<number>
  readonly budget?: number
  readonly maxFillHours: number
  readonly refine?: RefineOptions
}

export interface FillAwareRow {
  readonly live: LiveFlipRow
  readonly candidate: Candidate | null
  readonly metrics: FillMetrics | null
  readonly demotedReason: string | null
}

const PUMP_REASON = 'Thin-volume pump right now (pump_dump_scan): prices tend to snap back.'
const NO_FLOW_REASON = 'Not enough recent trades on both sides (5+ per side in the last hour or 24+ in the day) to price a fill.'

function toRow (live: LiveFlipRow, candidate: Candidate | null, ctx: FlipRowContext): FillAwareRow {
  const metrics = candidate ? assess(candidate, { budget: ctx.budget, maxFillHours: ctx.maxFillHours }) : null
  const demotedReason = ctx.pumps.has(live.id) ? PUMP_REASON : metrics ? metrics.demotedReason : NO_FLOW_REASON
  return { live, candidate, metrics, demotedReason }
}

export function bulkRows (live: readonly LiveFlipRow[], ctx: FlipRowContext): FillAwareRow[] {
  return live.map(row => {
    const entry = ctx.mappingById.get(row.id)
    return toRow(row, entry ? bulkCandidate(entry, ctx.bulk, ctx.tax) : null, ctx)
  })
}

export function refineRows (rows: readonly FillAwareRow[], series: ReadonlyMap<number, readonly TimeseriesPoint[]>, ctx: FlipRowContext): FillAwareRow[] {
  return rows.map(r => (r.candidate && series.has(r.live.id) ? toRow(r.live, refineCandidate(r.candidate, series.get(r.live.id), ctx.tax, ctx.refine), ctx) : r))
}

const SORT_KEY: Readonly<Record<FillSort, (m: FillMetrics) => number>> = {
  profit: m => m.marginAfterTax,
  roi: m => (m.buyAt > 0 ? m.marginAfterTax / m.buyAt : 0),
  profit_per_limit: m => m.realisticProfitPerLimit,
  gp_per_hour: m => m.gpPerHourPerSlot
}

/** Fillable first by the sort key on realistic numbers, then demoted rows. */
export function rankRows (rows: readonly FillAwareRow[], sort: FillSort): FillAwareRow[] {
  const key = SORT_KEY[sort]
  const ranked = rankFillable(rows, r => (r.metrics && !r.demotedReason ? r.metrics : null), r => (r.metrics ? key(r.metrics) : -Infinity))
  return ranked
}

export function flipRowJson ({ live, candidate, metrics, demotedReason }: FillAwareRow) {
  return {
    id: live.id,
    name: live.name,
    buyAt: metrics?.buyAt ?? null,
    sellAt: metrics?.sellAt ?? null,
    marginAfterTax: metrics?.marginAfterTax ?? null,
    roiPct: metrics && metrics.buyAt > 0 ? pct(metrics.marginAfterTax / metrics.buyAt) : null,
    limit: live.limit,
    dailyVolume: live.dailyVolume,
    qty: metrics?.units ?? null,
    expectedFillHours: metrics?.expectedFillHours ?? null,
    gpPerHourPerSlot: metrics?.gpPerHourPerSlot ?? null,
    realisticProfitPerLimit: metrics?.realisticProfitPerLimit ?? null,
    qtyWithinMaxHours: metrics?.qtyWithinMaxHours ?? null,
    priceBasis: candidate?.basis ?? null,
    live: { buyAt: live.buyAt, sellAt: live.sellAt, marginAfterTax: live.marginAfterTax, priceAgeMin: live.priceAgeMin },
    demoted: demotedReason !== null,
    demotedReason
  }
}
