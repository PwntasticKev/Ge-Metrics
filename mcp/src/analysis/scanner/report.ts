// Compact JSON rows for the scanner tools. Pure: series are fetched by the
// tool layer and passed in by item id.

import type { AveragePrice, IdMap, MappingEntry, TimeseriesPoint } from '../../wiki/types.js'
import { pct, round } from '../format.js'
import type { Breadth } from './breadth.js'
import type { Move } from './marketMoves.js'
import { type SpreadRow, type TaxFn, spreadHistory } from './spreadScan.js'
import { type SpikeFlag, assessThinSpike, hourlyCheck, tradesOf } from './thinSpikes.js'
import { type Reversion, type Trend, reversionCheck, trendFit } from './trendScan.js'

export type SeriesById = ReadonlyMap<number, readonly TimeseriesPoint[]>

const avgRound = (v: number | null | undefined) => (v === null || v === undefined ? null : Math.round(v))

export interface SpikeScanInput {
  readonly mapping: readonly MappingEntry[]
  readonly h1: IdMap<AveragePrice>
  readonly h24: IdMap<AveragePrice>
  readonly m5: IdMap<AveragePrice>
}

export interface FlaggedItem { readonly entry: MappingEntry; readonly flag: SpikeFlag }

/** Every thin-volume pump or dump, biggest move first. */
export function flagSpikes ({ mapping, h1, h24, m5 }: SpikeScanInput): FlaggedItem[] {
  return mapping
    .flatMap(entry => {
      const flag = assessThinSpike({ h1: h1.get(entry.id), h24: h24.get(entry.id), m5: m5.get(entry.id) })
      return flag ? [{ entry, flag }] : []
    })
    .sort((a, b) => Math.abs(b.flag.change) - Math.abs(a.flag.change))
}

export function spikeRow ({ entry, flag }: FlaggedItem, input: SpikeScanInput, series: readonly TimeseriesPoint[] | undefined) {
  const hour = input.h1.get(entry.id)
  const day = input.h24.get(entry.id)
  const check = series ? hourlyCheck(series) : undefined
  return {
    id: entry.id,
    name: entry.name,
    kind: flag.kind,
    trigger: flag.trigger,
    changePct: pct(flag.change),
    volumeVsUsualPct: pct(flag.volumeRatio),
    hourAvg: { high: avgRound(hour?.avgHighPrice), low: avgRound(hour?.avgLowPrice), trades: hour ? tradesOf(hour) : null },
    dayAvg: { high: avgRound(day?.avgHighPrice), low: avgRound(day?.avgLowPrice), trades: day ? tradesOf(day) : null },
    limit: entry.limit,
    // Last hour vs the week's hourly moves; undefined when not checked.
    hourly: check === undefined ? undefined : check && { z: round(check.z, 2), changePct: pct(check.change), volumeVsMedianPct: pct(check.volumeRatio), confirmed: check.confirmed }
  }
}

/** Hide checked rows whose margin is normal for the item (robust z under this). */
export const HIDE_BELOW_Z = 2

export function marginRow (row: SpreadRow, series: readonly TimeseriesPoint[] | undefined, tax: TaxFn) {
  const history = series ? spreadHistory(series, row.live, row.item.id, tax) : undefined
  return {
    id: row.item.id,
    name: row.item.name,
    buyAt: row.carefulBuy,
    sellAt: row.carefulSell,
    marginAfterTax: Math.round(row.live),
    rawLiveMargin: Math.round(row.rawLive),
    dayNormMargin: Math.round(row.dayNorm),
    hourMargin: avgRound(row.hourMargin),
    multipleOfNorm: round(row.multiple, 1),
    limit: row.item.limit,
    profitPerLimit: row.profitPerLimit === null ? null : Math.round(row.profitPerLimit),
    dayTrades: row.dayTrades,
    week: history === undefined ? undefined : history && { normMargin: Math.round(history.norm), z: round(history.z, 2), multiple: round(history.multiple, 1), hours: history.hours, unusual: history.unusual }
  }
}

export const keepMarginRow = (row: ReturnType<typeof marginRow>) => !row.week || row.week.z >= HIDE_BELOW_Z

const moveFields = (m: Move) => ({ now: Math.round(m.now), change24hPct: pct(m.change24h), change7dPct: pct(m.change7d), dayValueTradedGp: Math.round(m.valueTraded) })

export function trendRows (candidates: readonly Move[], series: SeriesById, nameOf: (id: number) => string) {
  return candidates
    .map(m => ({ m, trend: series.has(m.id) ? trendFit(series.get(m.id) ?? []) : null }))
    .filter((r): r is { m: Move; trend: Trend } => r.trend !== null && r.trend.steady)
    .sort((a, b) => Math.abs(b.trend.daily) - Math.abs(a.trend.daily))
    .map(({ m, trend }) => ({
      id: m.id, name: nameOf(m.id), ...moveFields(m),
      fit: { dailyPct: pct(trend.daily), weekPct: pct(trend.week), r2: round(trend.r2, 3), points: trend.points }
    }))
}

export function reversionRows (candidates: readonly Move[], series: SeriesById, nameOf: (id: number) => string) {
  return candidates
    .map(m => ({ m, rev: series.has(m.id) ? reversionCheck(series.get(m.id) ?? [], m.now, m.dayTrades) : null }))
    .filter((r): r is { m: Move; rev: Reversion } => r.rev !== null && r.rev.candidate)
    .sort((a, b) => a.rev.z - b.rev.z)
    .map(({ m, rev }) => ({
      id: m.id, name: nameOf(m.id), ...moveFields(m),
      mean30d: Math.round(rev.mean), gapPct: pct(rev.gap), z: round(rev.z, 2), baselineDriftPct: pct(rev.drift),
      volumeVsUsualPct: pct(rev.volumeRatio)
    }))
}

export function breadthReport (b: Breadth, nameOf: (id: number) => string) {
  const mover = (m: Move) => ({ id: m.id, name: nameOf(m.id), ...moveFields(m) })
  const share = (n: number) => (b.counted ? pct(n / b.counted) : null)
  return {
    mood: b.mood,
    liquidItems: b.counted,
    up: b.up,
    down: b.down,
    flat: b.flat,
    upPct: share(b.up),
    downPct: share(b.down),
    index: { size: b.indexSize, change24hPct: pct(b.index24h), change7dPct: pct(b.index7d) },
    gainers: b.gainers.map(mover),
    losers: b.losers.map(mover),
    howToRead: 'Liquid items (240+ trades/day) compared hour-on-hour vs 24h and 7d ago, using mids only when both sides traded (5%+ each). Index = top 100 items by gp traded, value-weighted. risk-on = index up 0.5%+ and more risers than fallers; risk-off = the reverse; otherwise mixed. Flat = within 1%.'
  }
}
