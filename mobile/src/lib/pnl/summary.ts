// Totals over the flip journal: periods, daily bars, best and worst flips,
// per-item leaderboard. Days are local calendar days (DST-safe).

import type { Flip } from './journal.ts'
import { flipCost, holdHours } from './metrics.ts'

export type Period = 'today' | '7d' | '30d' | 'all'
export const PERIODS: readonly Period[] = ['today', '7d', '30d', 'all']

/** Local midnight `daysBack` calendar days before the day of `now`. */
export function localDayStart (now: number, daysBack = 0): number {
  const d = new Date(now)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysBack).getTime()
}

/** First moment counted in a period; "7d" is today and the 6 days before. */
export function periodStart (period: Period, now: number): number {
  if (period === 'today') return localDayStart(now)
  if (period === '7d') return localDayStart(now, 6)
  if (period === '30d') return localDayStart(now, 29)
  return -Infinity
}

export interface Totals {
  profit: number
  flips: number
  wins: number
  /** Profit over cost, for flips whose buy price is known. */
  roi: number | null
  taxPaid: number
  /** Items sold. */
  qty: number
}

export function totals (flips: readonly Flip[]): Totals {
  let profit = 0
  let wins = 0
  let taxPaid = 0
  let qty = 0
  let pricedProfit = 0
  let cost = 0
  for (const f of flips) {
    profit += f.profit
    qty += f.qty
    if (f.profit > 0) wins++
    taxPaid += f.tax ?? 0
    const c = flipCost(f)
    if (c !== null) {
      cost += c
      pricedProfit += f.profit
    }
  }
  return { profit, flips: flips.length, wins, roi: cost > 0 ? pricedProfit / cost : null, taxPaid, qty }
}

export const inPeriod = (flips: readonly Flip[], period: Period, now: number) => {
  const from = periodStart(period, now)
  return flips.filter(f => f.soldAt >= from)
}

export function periodTotals (flips: readonly Flip[], now: number): Record<Period, Totals> {
  return {
    today: totals(inPeriod(flips, 'today', now)),
    '7d': totals(inPeriod(flips, '7d', now)),
    '30d': totals(inPeriod(flips, '30d', now)),
    all: totals(flips)
  }
}

export interface DayBar {
  /** Local midnight. */
  dayStart: number
  profit: number
  flips: number
  /** Running total from the first bar through this one. */
  cumulative: number
}

/** One bar per local day, oldest first, ending today. Empty days are zero. */
export function dailyBars (flips: readonly Flip[], days: number, now: number): DayBar[] {
  const starts = Array.from({ length: days }, (_, i) => localDayStart(now, days - 1 - i))
  const byDay = new Map<number, { profit: number; flips: number }>()
  for (const f of flips) {
    if (f.soldAt < starts[0]) continue
    const key = localDayStart(f.soldAt)
    const prev = byDay.get(key) ?? { profit: 0, flips: 0 }
    byDay.set(key, { profit: prev.profit + f.profit, flips: prev.flips + 1 })
  }
  let running = 0
  return starts.map(dayStart => {
    const day = byDay.get(dayStart) ?? { profit: 0, flips: 0 }
    running += day.profit
    return { dayStart, ...day, cumulative: running }
  })
}

export interface Extremes {
  best: Flip | null
  /** The biggest loss, or the smallest win when nothing lost. */
  worst: Flip | null
}

export function bestAndWorst (flips: readonly Flip[]): Extremes {
  if (!flips.length) return { best: null, worst: null }
  let best = flips[0]
  let worst = flips[0]
  for (const f of flips) {
    if (f.profit > best.profit) best = f
    if (f.profit < worst.profit) worst = f
  }
  return { best, worst: flips.length > 1 ? worst : null }
}

export interface ItemRecord {
  itemId: number
  name: string
  icon: string | null
  profit: number
  flips: number
  wins: number
  winRate: number
  /** Average profit per flip: the item's expectancy. */
  avgProfit: number
  /** Average hold over flips with a known buy time. */
  avgHoldHours: number | null
  taxPaid: number
}

/** Per-item results, highest total profit first. */
export function itemLeaderboard (flips: readonly Flip[]): ItemRecord[] {
  const groups = new Map<number, Flip[]>()
  // Built locally; nothing outside sees these arrays until they're summarized.
  for (const f of flips) {
    const group = groups.get(f.itemId)
    if (group) group.push(f)
    else groups.set(f.itemId, [f])
  }
  return [...groups.values()].map(group => {
    const t = totals(group)
    const holds = group.map(holdHours).filter((h): h is number => h !== null)
    return {
      itemId: group[0].itemId,
      name: group[0].name,
      icon: group.find(f => f.icon)?.icon ?? null,
      profit: t.profit,
      flips: t.flips,
      wins: t.wins,
      winRate: t.wins / t.flips,
      avgProfit: t.profit / t.flips,
      avgHoldHours: holds.length ? holds.reduce((s, h) => s + h, 0) / holds.length : null,
      taxPaid: t.taxPaid
    }
  }).sort((a, b) => b.profit - a.profit)
}
