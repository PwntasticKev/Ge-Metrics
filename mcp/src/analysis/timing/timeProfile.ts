// When in the day (or week) is an item cheapest to buy and dearest to sell?
// Ported from the GE Metrics app (mobile/src/lib/analytics/timeProfile.ts).
//
// Each price is compared with the median of the same side over the window
// around it (24h for hours, 7 days for weekdays). That removes the trend, so a
// rising week can't make late hours look expensive. Prices are grouped by slot
// (hour of day or weekday) and period (the day, or the week), and each slot is
// measured against the other slots of the same period.
//
// A slot only counts as a pattern when it beat its period on most periods: a
// one-sided sign test across days (or weeks), corrected for having picked the
// best of 24 (or 7) slots. Thin hours are left out: a cheap average from a
// handful of trades is noise you can't fill into.

import type { TimeseriesPoint } from '../../wiki/types.js'
import { clamp, isNumber, median, signTestP } from '../stats.js'

export type Confidence = 'high' | 'medium' | 'low'

export interface SlotStats {
  /** UTC hour (0-23) or UTC weekday (0 Sunday - 6 Saturday). */
  readonly slot: number
  /** Instant-sell prices in this slot vs the rest of the period: median ratio, -0.01 = 1% cheaper. */
  readonly lowDev: number | null
  /** Same for instant-buy prices. */
  readonly highDev: number | null
  /** Median items traded (both sides) in this slot per period. */
  readonly volume: number
  /** Periods with a price in this slot. */
  readonly periods: number
}

export interface TimingCall {
  readonly slot: number
  /** How much better than the rest of the period, as a ratio (0.008 = 0.8%). */
  readonly edge: number
  /** The edge in gp per item at the window's median price. */
  readonly edgeGp: number
  /** Share of periods this slot beat the rest of its period, ties left out. */
  readonly beatRate: number
  readonly periods: number
  /** Chance of a beat rate this good from noise, after picking the best slot (Bonferroni). */
  readonly pValue: number
  readonly confidence: Confidence
}

export interface TimeProfile {
  readonly slots: readonly SlotStats[]
  /** Cheapest slot to buy in (lowest instant-sell prices). */
  readonly buy: TimingCall | null
  /** Dearest slot to sell in (highest instant-buy prices). */
  readonly sell: TimingCall | null
  readonly refLow: number | null
  readonly refHigh: number | null
  /** Distinct days (or weeks) that contributed. */
  readonly periods: number
}

export interface ProfileOptions {
  readonly slots: number
  readonly slotOf: (timestampSec: number) => number
  readonly periodOf: (timestampSec: number) => number
  /** Width of the centred window used as each price's baseline. */
  readonly windowSec: number
  readonly stepSec: number
}

const DAY_SEC = 86_400
const HOUR_SEC = 3_600
/** A baseline needs at least this share of its window to have prices. */
const MIN_WINDOW_COVERAGE = 0.6
/** Fewer periods than this in a slot and we don't call it. */
export const MIN_PERIODS = 6
/** Slots trading under this share of the typical slot volume can't be called. */
export const THIN_SLOT_SHARE = 0.25
/** Corrected p-values under these are a high / medium confidence pattern. */
export const HIGH_P = 0.02
export const MEDIUM_P = 0.1

type Side = 'low' | 'high'
const priceOf = (p: TimeseriesPoint, side: Side) => (side === 'low' ? p.avgLowPrice : p.avgHighPrice)

/** Each point's price relative to the median of its side over the centred window. */
function deviations (points: readonly TimeseriesPoint[], side: Side, opts: ProfileOptions): (number | null)[] {
  const half = opts.windowSec / 2
  const needed = Math.ceil((opts.windowSec / opts.stepSec) * MIN_WINDOW_COVERAGE)
  let lo = 0
  let hi = 0
  return points.map(point => {
    while (lo < points.length && (points[lo] as TimeseriesPoint).timestamp < point.timestamp - half) lo++
    while (hi < points.length && (points[hi] as TimeseriesPoint).timestamp <= point.timestamp + half) hi++
    const price = priceOf(point, side)
    if (price === null) return null
    const window = points.slice(lo, hi).map(p => priceOf(p, side)).filter(isNumber)
    const base = window.length >= needed ? median(window) : null
    return base ? price / base - 1 : null
  })
}

interface Cell { readonly low: number | null; readonly high: number | null; readonly volume: number }
/** slot -> period -> cell */
type Grid = ReadonlyMap<number, ReadonlyMap<number, Cell>>
interface RawCell { readonly low: number[]; readonly high: number[]; volume: number }

function rawGrid (points: readonly TimeseriesPoint[], opts: ProfileOptions): Map<number, Map<number, RawCell>> {
  const lowDev = deviations(points, 'low', opts)
  const highDev = deviations(points, 'high', opts)
  const raw = new Map<number, Map<number, RawCell>>()
  points.forEach((p, i) => {
    const slot = opts.slotOf(p.timestamp)
    const period = opts.periodOf(p.timestamp)
    const bySlot = raw.get(slot) ?? new Map<number, RawCell>()
    raw.set(slot, bySlot)
    const cell = bySlot.get(period) ?? { low: [], high: [], volume: 0 }
    bySlot.set(period, cell)
    const l = lowDev[i]
    const h = highDev[i]
    if (isNumber(l)) cell.low.push(l)
    if (isNumber(h)) cell.high.push(h)
    cell.volume += p.lowPriceVolume + p.highPriceVolume
  })
  return raw
}

// Centre each period on its own median across slots, so whatever the baseline
// missed (a jump, a skewed window) cancels out within the period.
function buildGrid (points: readonly TimeseriesPoint[], opts: ProfileOptions): Grid {
  const raw = rawGrid(points, opts)
  const periodMedian = (side: Side, period: number) => median(
    [...raw.values()].map(bySlot => bySlot.get(period)).map(c => (c ? median(c[side]) : null)).filter(isNumber))
  const centres = new Map<number, { low: number | null; high: number | null }>()
  const centreOf = (period: number) => {
    const known = centres.get(period)
    if (known) return known
    const made = { low: periodMedian('low', period), high: periodMedian('high', period) }
    centres.set(period, made)
    return made
  }
  const rel = (values: readonly number[], m: number | null) => {
    const v = median(values)
    return v !== null && m !== null ? v - m : null
  }
  return new Map([...raw].map(([slot, bySlot]) => [slot, new Map([...bySlot].map(([period, c]) => {
    const mid = centreOf(period)
    return [period, { low: rel(c.low, mid.low), high: rel(c.high, mid.high), volume: c.volume }]
  }))]))
}

function callFor (side: Side, slots: readonly SlotStats[], grid: Grid, ref: number | null): TimingCall | null {
  const typicalVolume = median(slots.filter(s => s.periods > 0).map(s => s.volume)) ?? 0
  const eligible = slots.filter(s => s.periods >= MIN_PERIODS && s.volume >= typicalVolume * THIN_SLOT_SHARE)
  // Buying wants the most negative low deviation; selling the most positive high.
  const score = (s: SlotStats) => (side === 'low' ? -(s.lowDev ?? Infinity) : (s.highDev ?? -Infinity))
  const best = eligible.reduce<SlotStats | null>((a, s) => (!a || score(s) > score(a) ? s : a), null)
  if (!best || ref === null) return null
  const edge = score(best)
  if (!(edge > 0)) return null

  let wins = 0
  let losses = 0
  for (const cell of grid.get(best.slot)?.values() ?? []) {
    const dev = cell[side]
    if (dev === null || dev === 0) continue
    if (side === 'low' ? dev < 0 : dev > 0) wins++
    else losses++
  }
  const periods = wins + losses
  const pValue = clamp(signTestP(wins, periods) * eligible.length, 0, 1)
  const edgeGp = edge * ref
  // Prices are whole gp: an edge under 1 gp is not something you can bid.
  const confidence: Confidence = periods < MIN_PERIODS || edgeGp < 1 ? 'low' : pValue < HIGH_P ? 'high' : pValue < MEDIUM_P ? 'medium' : 'low'
  return { slot: best.slot, edge, edgeGp, beatRate: periods ? wins / periods : 0, periods, pValue, confidence }
}

export function buildProfile (series: readonly TimeseriesPoint[], opts: ProfileOptions): TimeProfile {
  const points = [...series].sort((a, b) => a.timestamp - b.timestamp)
  const grid = buildGrid(points, opts)
  const contributing = new Set<number>()
  const slots: SlotStats[] = Array.from({ length: opts.slots }, (_, slot) => {
    const cells = [...(grid.get(slot)?.entries() ?? [])].filter(([, c]) => c.low !== null || c.high !== null)
    cells.forEach(([period]) => contributing.add(period))
    return {
      slot,
      lowDev: median(cells.map(([, c]) => c.low).filter(isNumber)),
      highDev: median(cells.map(([, c]) => c.high).filter(isNumber)),
      volume: median(cells.map(([, c]) => c.volume)) ?? 0,
      periods: cells.length
    }
  })
  const refLow = median(points.map(p => p.avgLowPrice).filter(isNumber))
  const refHigh = median(points.map(p => p.avgHighPrice).filter(isNumber))
  return {
    slots,
    buy: callFor('low', slots, grid, refLow),
    sell: callFor('high', slots, grid, refHigh),
    refLow,
    refHigh,
    periods: contributing.size
  }
}

export const utcHourOf = (timestampSec: number): number => Math.floor((((timestampSec % DAY_SEC) + DAY_SEC) % DAY_SEC) / HOUR_SEC)
// 1 Jan 1970 was a Thursday.
export const utcWeekdayOf = (timestampSec: number): number => (Math.floor(timestampSec / DAY_SEC) + 4) % 7
const utcDayOf = (timestampSec: number): number => Math.floor(timestampSec / DAY_SEC)
// Weeks run Sunday to Saturday, like utcWeekdayOf.
const utcWeekOf = (timestampSec: number): number => Math.floor((Math.floor(timestampSec / DAY_SEC) + 4) / 7)

/** Hour-of-day profile from the wiki's 1h series (365 points, about 15 days). */
export function hourOfDayProfile (series: readonly TimeseriesPoint[]): TimeProfile {
  return buildProfile(series, { slots: 24, slotOf: utcHourOf, periodOf: utcDayOf, windowSec: DAY_SEC, stepSec: HOUR_SEC })
}

/** Day-of-week profile from the wiki's 6h series (365 points, about 90 days). */
export function dayOfWeekProfile (series: readonly TimeseriesPoint[]): TimeProfile {
  return buildProfile(series, { slots: 7, slotOf: utcWeekdayOf, periodOf: utcWeekOf, windowSec: 7 * DAY_SEC, stepSec: 6 * HOUR_SEC })
}

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
