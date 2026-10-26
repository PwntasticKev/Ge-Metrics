// When in the day (or week) is an item cheapest to buy and dearest to sell?
//
// Each price is compared with the median of the same side over the window
// around it (24h for hours, 7 days for weekdays). That removes the trend, so a
// rising week can't make late hours look expensive. Prices are then grouped by
// slot (hour of day or weekday) and by period (the day, or the week), and each
// slot is measured against the other slots of the same period.
//
// A slot only counts as a pattern when it beat its period on most periods: a
// one-sided sign test across days (or weeks), corrected for having picked the
// best of 24 (or 7) slots. Thin hours are left out, because a cheap average
// from a handful of trades is noise you can't fill into.

import { clamp, median, signTestP } from './stats.ts'
import type { TimeseriesPoint } from './types.ts'

export type Confidence = 'high' | 'medium' | 'low'

export interface SlotStats {
  /** UTC hour (0 to 23) or UTC weekday (0 Sunday to 6 Saturday). */
  slot: number
  /** Instant-sell prices in this slot vs the rest of the same day (or week): median ratio, -0.01 = 1% cheaper. */
  lowDev: number | null
  /** Same for instant-buy prices. */
  highDev: number | null
  /** Median items traded (both sides) in this slot per day. */
  volume: number
  /** Days (or weeks) with a price in this slot. */
  periods: number
}

export interface TimingCall {
  slot: number
  /** How much better than the rest of the period, as a ratio (0.008 = 0.8%). Positive. */
  edge: number
  /** The edge in GP per item at the period's median price. */
  edgeGp: number
  /** Share of periods this slot beat the rest of its period, ties left out. */
  beatRate: number
  /** Periods compared, ties left out. */
  periods: number
  /** Chance of a beat rate this good from noise, after picking the best slot. */
  pValue: number
  confidence: Confidence
}

export interface TimeProfile {
  slots: SlotStats[]
  /** Cheapest slot to buy in (lowest instant-sell prices). */
  buy: TimingCall | null
  /** Dearest slot to sell in (highest instant-buy prices). */
  sell: TimingCall | null
  /** Period medians of the low and high price. */
  refLow: number | null
  refHigh: number | null
  /** Distinct days (or weeks) that contributed. */
  periods: number
}

export interface ProfileOptions {
  slots: number
  slotOf: (timestampSec: number) => number
  /** Slots are compared with each other within one period: a day, or a week. */
  periodOf: (timestampSec: number) => number
  /** Width of the centred window used as each price's baseline. */
  windowSec: number
  stepSec: number
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
const isNumber = (v: number | null | undefined): v is number => typeof v === 'number'

/** Each point's price relative to the median of its side over the centred window (both ends included). */
function deviations (points: readonly TimeseriesPoint[], side: Side, opts: ProfileOptions): (number | null)[] {
  const half = opts.windowSec / 2
  const needed = Math.ceil((opts.windowSec / opts.stepSec) * MIN_WINDOW_COVERAGE)
  let lo = 0
  let hi = 0
  return points.map(point => {
    while (lo < points.length && points[lo].timestamp < point.timestamp - half) lo++
    while (hi < points.length && points[hi].timestamp <= point.timestamp + half) hi++
    const price = priceOf(point, side)
    if (price === null) return null
    const window: number[] = []
    for (let i = lo; i < hi; i++) {
      const v = priceOf(points[i], side)
      if (v !== null) window.push(v)
    }
    const base = window.length >= needed ? median(window) : null
    return base ? price / base - 1 : null
  })
}

interface Cell { low: number | null; high: number | null; volume: number }
/** slot -> period -> cell */
type Grid = Map<number, Map<number, Cell>>

function buildGrid (points: readonly TimeseriesPoint[], opts: ProfileOptions): Grid {
  const lowDev = deviations(points, 'low', opts)
  const highDev = deviations(points, 'high', opts)
  const raw = new Map<number, Map<number, { low: number[]; high: number[]; volume: number }>>()
  points.forEach((p, i) => {
    const slot = opts.slotOf(p.timestamp)
    const period = opts.periodOf(p.timestamp)
    const bySlot = raw.get(slot) ?? new Map()
    raw.set(slot, bySlot)
    const cell = bySlot.get(period) ?? { low: [], high: [], volume: 0 }
    bySlot.set(period, cell)
    if (lowDev[i] !== null) cell.low.push(lowDev[i] as number)
    if (highDev[i] !== null) cell.high.push(highDev[i] as number)
    cell.volume += p.lowPriceVolume + p.highPriceVolume
  })
  // Centre each period on its own median across slots, so whatever the
  // baseline missed (a jump, a skewed window) cancels out within the period.
  const grid: Grid = new Map()
  const periodMedian = (side: Side, period: number) => median([...raw.values()].map(bySlot => bySlot.get(period)).map(c => (c ? median(c[side]) : null)).filter(isNumber))
  const centre = new Map<number, { low: number | null; high: number | null }>()
  for (const [slot, bySlot] of raw) {
    const out = new Map<number, Cell>()
    for (const [period, c] of bySlot) {
      if (!centre.has(period)) centre.set(period, { low: periodMedian('low', period), high: periodMedian('high', period) })
      const mid = centre.get(period)!
      const rel = (values: number[], m: number | null) => {
        const v = median(values)
        return v !== null && m !== null ? v - m : null
      }
      out.set(period, { low: rel(c.low, mid.low), high: rel(c.high, mid.high), volume: c.volume })
    }
    grid.set(slot, out)
  }
  return grid
}

function callFor (side: Side, slots: SlotStats[], grid: Grid, ref: number | null): TimingCall | null {
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
  // Prices are whole GP: an edge under 1 GP is not something you can bid.
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

/** Both sides together: GP per item gained by buying and selling at the best slots. */
export function combinedEdgeGp (profile: TimeProfile): number {
  return (profile.buy?.edgeGp ?? 0) + (profile.sell?.edgeGp ?? 0)
}
