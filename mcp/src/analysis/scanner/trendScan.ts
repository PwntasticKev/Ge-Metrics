// "Trending" and "Below mean". A cheap screen over the bulk snapshots picks
// candidates; each candidate's 6-hour series (90 days) then gives a 7-day
// log-price trend line with its fit, or the distance below the 30-day mean.
// Ported from mobile/src/lib/trendScan.ts.

import type { TimeseriesPoint } from '../../wiki/types.js'
import { fitLine, mean, stdDev } from '../stats.js'
import { type Move, midOf } from './marketMoves.js'
import { tradesOf } from './thinSpikes.js'

/** Only items with at least this much traded a day (gp) are worth a slot. */
export const SCAN_MIN_VALUE = 10_000_000
/** Trending candidates: moved at least this much over 7 days. */
export const TREND_SCREEN_MOVE = 0.04
/** Below-mean candidates: down at least this much over 24h or 7d. */
export const DIP_SCREEN_MOVE = 0.05
/** A trend is steady when the line explains at least this much of the moves... */
export const TREND_MIN_R2 = 0.7
/** ...and it climbs or falls at least this much a day. */
export const TREND_MIN_DAILY = 0.005
/** Below mean: at least this far under the 30-day mean... */
export const REVERSION_MIN_GAP = 0.08
/** ...and this many standard deviations... */
export const REVERSION_MAX_Z = -2
/** ...on at least this share of a normal day's trades... */
export const REVERSION_MIN_VOLUME = 0.5
/** ...after a range-bound month: the baseline's own trend moved less than this. */
export const REVERSION_MAX_DRIFT = 0.15
/** The last days are the drop being measured; the baseline stops before them. */
const DROP_DAYS = 2
const DAY_SEC = 86_400
const STEPS_PER_DAY = 4
const TREND_DAYS = 7
const MEAN_DAYS = 30

export type TrendDirection = 'up' | 'down' | 'both'

/** Liquid items that moved most over 7 days in the wanted direction. */
export function trendCandidates (moves: readonly Move[], limit: number, direction: TrendDirection = 'both'): Move[] {
  return moves
    .filter(m => m.valueTraded >= SCAN_MIN_VALUE && m.change7d !== null && Math.abs(m.change7d) >= TREND_SCREEN_MOVE)
    .filter(m => direction === 'both' || (direction === 'up' ? (m.change7d ?? 0) > 0 : (m.change7d ?? 0) < 0))
    .sort((a, b) => Math.abs(b.change7d ?? 0) - Math.abs(a.change7d ?? 0))
    .slice(0, limit)
}

const worstDrop = (m: Move) => Math.min(m.change24h ?? 0, m.change7d ?? 0)

/** Liquid items down most over 24h or 7d. */
export function dipCandidates (moves: readonly Move[], limit: number): Move[] {
  return moves
    .filter(m => m.valueTraded >= SCAN_MIN_VALUE && worstDrop(m) <= -DIP_SCREEN_MOVE)
    .sort((a, b) => worstDrop(a) - worstDrop(b))
    .slice(0, limit)
}

function pointsSince (series: readonly TimeseriesPoint[], days: number): TimeseriesPoint[] {
  const last = series.at(-1)
  return last ? series.filter(p => p.timestamp > last.timestamp - days * DAY_SEC) : []
}

const timedMids = (points: readonly TimeseriesPoint[]) => points
  .map(p => ({ t: p.timestamp / DAY_SEC, mid: midOf(p) }))
  .filter((p): p is { t: number; mid: number } => p.mid !== null)

export interface Trend {
  /** Fitted change per day (compounded). */
  readonly daily: number
  /** Fitted change over 7 days. */
  readonly week: number
  readonly r2: number
  readonly points: number
  readonly steady: boolean
}

/** A log-price line through the last 7 days of a 6h series; null with under 5 days of points. */
export function trendFit (series: readonly TimeseriesPoint[]): Trend | null {
  const pts = timedMids(pointsSince(series, TREND_DAYS))
  const t0 = pts[0]?.t ?? 0
  if (pts.length < 5 * STEPS_PER_DAY) return null
  const fit = fitLine(pts.map(p => p.t - t0), pts.map(p => Math.log(p.mid)))
  if (!fit) return null
  const daily = Math.exp(fit.slope) - 1
  return {
    daily,
    week: Math.exp(fit.slope * TREND_DAYS) - 1,
    r2: fit.r2,
    points: pts.length,
    steady: fit.r2 >= TREND_MIN_R2 && Math.abs(daily) >= TREND_MIN_DAILY
  }
}

export interface Reversion {
  /** Mean mid over the 30 days before the last 2. */
  readonly mean: number
  /** Fitted change across that baseline; big drifts are trends, not dips. */
  readonly drift: number
  readonly gap: number
  readonly z: number
  /** Last 24h trades against the 30-day average day. */
  readonly volumeRatio: number | null
  readonly candidate: boolean
}

/** Where `now` sits against the 30 days before the last 2 of a 6h series; null with under 20 days of points. */
export function reversionCheck (series: readonly TimeseriesPoint[], now: number, dayTrades: number): Reversion | null {
  const window = pointsSince(series, MEAN_DAYS)
  const cutoff = (window.at(-1)?.timestamp ?? 0) - DROP_DAYS * DAY_SEC
  const baseline = timedMids(window.filter(p => p.timestamp <= cutoff))
  if (baseline.length < 20 * STEPS_PER_DAY) return null
  const mids = baseline.map(p => p.mid)
  const avg = mean(mids)
  const sd = stdDev(mids)
  const t0 = (baseline[0] as { t: number }).t
  const fit = fitLine(baseline.map(p => p.t - t0), mids.map(m => Math.log(m)))
  const span = (baseline.at(-1) as { t: number }).t - t0
  const drift = fit ? Math.exp(fit.slope * span) - 1 : 0
  const gap = now / avg - 1
  const z = sd > 0 ? (now - avg) / sd : 0
  const typicalDay = window.reduce((s, p) => s + tradesOf(p), 0) / (window.length / STEPS_PER_DAY)
  const volumeRatio = typicalDay > 0 ? dayTrades / typicalDay : null
  return {
    mean: avg,
    drift,
    gap,
    z,
    volumeRatio,
    candidate: gap <= -REVERSION_MIN_GAP && z <= REVERSION_MAX_Z && Math.abs(drift) <= REVERSION_MAX_DRIFT &&
      volumeRatio !== null && volumeRatio >= REVERSION_MIN_VOLUME
  }
}
