// Price series + summary statistics from /timeseries points.

import type { Timestep, TimeseriesPoint } from '../wiki/types.js'
import { change, isoTime, mid, pct, round } from './format.js'

export interface SeriesStats {
  readonly points: number
  readonly from: string | null
  readonly to: string | null
  readonly min: number | null
  readonly max: number | null
  readonly mean: number | null
  readonly first: number | null
  readonly last: number | null
  readonly changePct: number | null
  // Standard deviation of step-to-step % changes of the mid price.
  readonly volatilityPct: number | null
  readonly avgSpreadPct: number | null
  readonly totalVolume: number
  readonly avgVolumePerStep: number | null
}

const midOf = (p: TimeseriesPoint) => mid(p.avgHighPrice, p.avgLowPrice)

function stdev (values: readonly number[]): number | null {
  if (values.length < 2) return null
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1))
}

export function seriesStats (points: readonly TimeseriesPoint[]): SeriesStats {
  const mids = points.map(midOf).filter((v): v is number => v !== null)
  const returns = mids.slice(1).map((v, i) => v / (mids[i] as number) - 1)
  const spreads = points.flatMap(p =>
    p.avgHighPrice !== null && p.avgLowPrice !== null && p.avgLowPrice > 0 ? [p.avgHighPrice / p.avgLowPrice - 1] : [])
  const totalVolume = points.reduce((s, p) => s + p.highPriceVolume + p.lowPriceVolume, 0)
  const first = mids[0] ?? null
  const last = mids.at(-1) ?? null
  const sd = stdev(returns)

  return {
    points: points.length,
    from: isoTime(points[0]?.timestamp ?? null),
    to: isoTime(points.at(-1)?.timestamp ?? null),
    min: mids.length ? Math.round(Math.min(...mids)) : null,
    max: mids.length ? Math.round(Math.max(...mids)) : null,
    mean: mids.length ? Math.round(mids.reduce((s, v) => s + v, 0) / mids.length) : null,
    first: first === null ? null : Math.round(first),
    last: last === null ? null : Math.round(last),
    changePct: change(first, last),
    volatilityPct: sd === null ? null : pct(sd),
    avgSpreadPct: spreads.length ? pct(spreads.reduce((s, v) => s + v, 0) / spreads.length) : null,
    totalVolume,
    avgVolumePerStep: points.length ? round(totalVolume / points.length, 1) : null
  }
}

export function priceHistory (points: readonly TimeseriesPoint[], timestep: Timestep, maxPoints: number) {
  const recent = points.slice(-maxPoints)
  return {
    timestep,
    stats: seriesStats(recent),
    // Compact rows: [unix seconds, avgHigh, avgLow, volume].
    columns: ['t', 'high', 'low', 'volume'],
    series: recent.map(p => [
      p.timestamp,
      p.avgHighPrice === null ? null : Math.round(p.avgHighPrice),
      p.avgLowPrice === null ? null : Math.round(p.avgLowPrice),
      p.highPriceVolume + p.lowPriceVolume
    ])
  }
}
