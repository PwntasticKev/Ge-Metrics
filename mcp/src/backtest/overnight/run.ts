// Place-once overnight runs: which nights, which windows to load, and the
// grid of (sizing horizon x sell cap x budget) scored night by night.

import type { MappingEntry } from '../../wiki/types.js'
import { FIVE_MIN_SEC, HOUR_SEC, type History, alignDown, windowStarts } from '../history.js'
import { PUBLISH_LAG_HOURS, type Timeline } from '../run.js'
import type { Pick, Strategy } from '../strategies/types.js'
import { DAY_HOURS, LATEST_5M_WINDOWS, type MarketView, viewAt } from '../view.js'
import { type NightResult, simulateNight } from './night.js'
import { type OvernightParams, overnightKey, overnightStrategy } from './strategy.js'

const DAY_SEC = DAY_HOURS * HOUR_SEC

export const OVERNIGHT_DEFAULTS = Object.freeze({
  days: 60,
  /** Offers go in at this UTC hour (22:00 UTC: 22:00 UK, 17:00 US Eastern). */
  eveningHourUtc: 22,
  /** Hours asleep: offers not filled by then are cancelled. */
  nightHours: 10,
  slots: 8,
  budgets: [10_000_000, 50_000_000, 200_000_000] as readonly number[],
  sellCaps: [0.5, 1, 2, 4, 10] as readonly number[],
  sizingHours: [8, 12] as readonly number[]
})

/** Today's app: sized for 8h, slowest sell 0.5h. */
export const BASELINE: OvernightParams = Object.freeze({ sizingHours: 8, maxSellHours: 0.5 })

export interface NightPlan {
  /** Evening decision times (hour-aligned, ascending). */
  readonly nights: readonly number[]
  readonly hourWindows: readonly number[]
  readonly fiveMinWindows: readonly number[]
}

/**
 * The last `days` nights whose `maxNightHours` have closed by nowSec, one per
 * UTC day at `eveningHourUtc`, plus the 24h lookback and the 5m windows the
 * evening view reads.
 */
export function nightPlan (o: { days: number; eveningHourUtc: number; maxNightHours: number; nowSec: number }): NightPlan {
  if (!Number.isInteger(o.eveningHourUtc) || o.eveningHourUtc < 0 || o.eveningHourUtc > 23) throw new Error(`evening hour must be 0-23 UTC (got ${o.eveningHourUtc})`)
  const endT = alignDown(o.nowSec, HOUR_SEC) - (PUBLISH_LAG_HOURS - 1) * HOUR_SEC
  const latestStart = endT - o.maxNightHours * HOUR_SEC
  let last = alignDown(latestStart, DAY_SEC) + o.eveningHourUtc * HOUR_SEC
  if (last > latestStart) last -= DAY_SEC
  const count = Math.max(1, Math.round(o.days))
  const nights = Array.from({ length: count }, (_, i) => last - (count - 1 - i) * DAY_SEC)
  const first = nights[0] ?? last
  return {
    nights,
    hourWindows: windowStarts(first - DAY_HOURS * HOUR_SEC, last + o.maxNightHours * HOUR_SEC - HOUR_SEC, HOUR_SEC),
    fiveMinWindows: nights.flatMap(t => Array.from({ length: LATEST_5M_WINDOWS }, (_, i) => t - (i + 1) * FIVE_MIN_SEC))
  }
}

/** As a backtest Timeline, for run.ts's loadHistory. */
export const asTimeline = (p: NightPlan): Timeline => ({
  decisions: p.nights,
  endT: (p.hourWindows[p.hourWindows.length - 1] ?? 0) + HOUR_SEC,
  hourWindows: p.hourWindows,
  fiveMinWindows: p.fiveMinWindows
})

export interface Variant {
  readonly params: OvernightParams
  readonly budget: number
  readonly nightHours: number
}

export const variantKey = (v: Variant): string => `${overnightKey(v.params)}-b${v.budget}-n${v.nightHours}`

export interface VariantRun {
  readonly variant: Variant
  readonly nights: readonly NightResult[]
}

export interface GridInput {
  readonly history: History
  readonly mapping: readonly MappingEntry[]
  readonly nights: readonly number[]
  readonly variants: readonly Variant[]
  readonly slots: number
  readonly participation?: number
  readonly log?: (msg: string) => void
}

/** Every variant over every night; each night starts from a fresh stack (no carry-over). */
export function runGrid (g: GridInput): VariantRun[] {
  const strategies = new Map(g.variants.map(v => [overnightKey(v.params), overnightStrategy(v.params)]))
  const out = new Map<string, NightResult[]>(g.variants.map(v => [variantKey(v), []]))
  g.nights.forEach((t, i) => {
    const view: MarketView = viewAt(g.history, t, g.mapping)
    // Picks depend on params and budget, not on how long the night is.
    const decided = new Map<string, readonly Pick[]>()
    for (const v of g.variants) {
      const pk = `${overnightKey(v.params)}-b${v.budget}`
      if (!decided.has(pk)) decided.set(pk, (strategies.get(overnightKey(v.params)) as Strategy).decide({ view, cash: v.budget, slots: g.slots, exclude: new Set() }).slice(0, g.slots))
      const picks = decided.get(pk) ?? []
      out.get(variantKey(v))?.push(simulateNight(picks, g.history, { t, hours: v.nightHours, cash: v.budget, participation: g.participation }))
    }
    g.log?.(`night ${i + 1}/${g.nights.length} ${new Date(t * 1000).toISOString().slice(0, 13)}Z`)
  })
  return g.variants.map(v => ({ variant: v, nights: out.get(variantKey(v)) ?? [] }))
}

export interface NightStats {
  readonly nights: number
  readonly total: number
  readonly perNight: number
  readonly median: number
  readonly worst: number
  readonly best: number
  readonly positive: number
  readonly placedAvg: number
  readonly expectedAvg: number
  readonly buyFill: number | null
  readonly soldAtAsk: number | null
}

export function nightStats (nights: readonly NightResult[]): NightStats {
  const profits = nights.map(n => n.profit).sort((a, b) => a - b)
  const sum = (f: (n: NightResult) => number) => nights.reduce((s, n) => s + f(n), 0)
  const total = sum(n => n.profit)
  const ordered = sum(n => n.ordered)
  const bought = sum(n => n.bought)
  const mid = Math.floor(profits.length / 2)
  return {
    nights: nights.length,
    total,
    perNight: nights.length ? total / nights.length : 0,
    median: profits.length ? (profits.length % 2 ? profits[mid] as number : ((profits[mid - 1] as number) + (profits[mid] as number)) / 2) : 0,
    worst: profits[0] ?? 0,
    best: profits[profits.length - 1] ?? 0,
    positive: profits.filter(p => p > 0).length,
    placedAvg: nights.length ? sum(n => n.placed) / nights.length : 0,
    expectedAvg: nights.length ? sum(n => n.expected) / nights.length : 0,
    buyFill: ordered ? bought / ordered : null,
    soldAtAsk: bought ? sum(n => n.soldAtAsk) / bought : null
  }
}

/** Nights on which `a` made more than `b` (same nights, same order). */
export function nightsAhead (a: readonly NightResult[], b: readonly NightResult[]): number {
  return a.filter((n, i) => n.profit > (b[i]?.profit ?? Infinity)).length
}

export type Decision = { readonly change: false; readonly reason: string } | { readonly change: true; readonly to: OvernightParams; readonly reason: string }

/**
 * Pre-set rule: switch only to a variant that beats the baseline on total
 * realized profit AND on worst night at every budget, over at least
 * `minNights` nights. Among those, the one with the most total profit summed
 * over budgets.
 */
export function decide (runs: readonly VariantRun[], nightHours: number, budgets: readonly number[], minNights = 30): Decision {
  const at = (p: OvernightParams, b: number) => runs.find(r => overnightKey(r.variant.params) === overnightKey(p) && r.variant.budget === b && r.variant.nightHours === nightHours)
  const base = budgets.map(b => at(BASELINE, b))
  if (base.some(r => !r)) return { change: false, reason: 'baseline not in the grid' }
  const n = base[0]?.nights.length ?? 0
  if (n < minNights) return { change: false, reason: `only ${n} nights (< ${minNights}): too short to decide` }
  const candidates = [...new Map(runs.map(r => [overnightKey(r.variant.params), r.variant.params])).values()]
    .filter(p => overnightKey(p) !== overnightKey(BASELINE))
    .flatMap(p => {
      const rows = budgets.map(b => at(p, b))
      if (rows.some(r => !r)) return []
      const wins = rows.every((r, i) => {
        const s = nightStats(r?.nights ?? [])
        const bs = nightStats(base[i]?.nights ?? [])
        return s.total > bs.total && s.worst > bs.worst
      })
      return wins ? [{ p, total: rows.reduce((s, r) => s + nightStats(r?.nights ?? []).total, 0) }] : []
    })
    .sort((a, b) => b.total - a.total)
  const best = candidates[0]
  if (!best) return { change: false, reason: 'no variant beats the baseline on both total profit and worst night at every budget' }
  return { change: true, to: best.p, reason: `${overnightKey(best.p)} beats the baseline on total profit and worst night at every budget` }
}
