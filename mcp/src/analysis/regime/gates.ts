// Regime gates: rules that say when NOT to open new flips. Each rule reads a
// snapshot of market signals taken at decision time t (built from data that
// had closed by t) and either passes or asks to shrink new positions (size
// 0..1; 0 = stand aside). Pure: the backtest (backtest/regime) and the live
// MCP tools (tools/regime.ts) feed it the same signals.

import type { Mood } from '../scanner/breadth.js'

const HOUR_SEC = 3_600
const DAY_SEC = 86_400

export type RegimeState = 'trade' | 'caution' | 'stand-aside'

/** A game update (category game) on the release schedule. */
export interface ScheduledUpdate {
  /** Unix seconds when the update is treated as live. */
  readonly at: number
  readonly date: string
  readonly title: string
  /** Items the update post mentions. */
  readonly items: number
  /** Title reads like a big release (launch / out today / seasonal event). */
  readonly keyword: boolean
}

/** A closed trade of the strategy being gated, dated when its result was known. */
export interface ClosedTrade {
  readonly knownAt: number
  readonly profit: number
}

export interface RegimeSignals {
  readonly t: number
  /** market_breadth mood at t (null when it couldn't be read). */
  readonly mood: Mood | null
  /** Value-weighted change of the 100 most traded items over 24h and 7d. */
  readonly index24h: number | null
  readonly index7d: number | null
  /** Realized volatility of that index's hourly returns over the last 24h. */
  readonly vol24h: number | null
  /** Median of the same 24h volatility over the trailing week. */
  readonly volMedian: number | null
  /** vol24h / volMedian. */
  readonly volRatio: number | null
  readonly updates: readonly ScheduledUpdate[]
  /** The strategy's own closed trades known by t (only for the equity-curve rules). */
  readonly trades?: readonly ClosedTrade[]
}

export type GateRule =
  | { readonly kind: 'risk-off'; readonly size: number }
  | { readonly kind: 'index-drop'; readonly window: '24h' | '7d'; readonly below: number; readonly size: number }
  | { readonly kind: 'volatility'; readonly above: number; readonly size: number }
  | { readonly kind: 'update'; readonly beforeDays: number; readonly afterDays: number; readonly minItems: number | null; readonly size: number }
  | { readonly kind: 'loss-streak'; readonly losses: number; readonly pauseHours: number; readonly size: number }
  | { readonly kind: 'recent-pnl'; readonly hours: number; readonly size: number }

export interface GateHit {
  readonly rule: GateRule
  readonly size: number
  readonly reason: string
}

export interface RegimeDecision {
  /** Multiplier for new position sizes: 1 = full, 0 = open nothing. */
  readonly size: number
  readonly state: RegimeState
  readonly reasons: readonly string[]
  readonly hits: readonly GateHit[]
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`
const days = (sec: number) => `${(sec / DAY_SEC).toFixed(1)}d`

/** Big releases: launch posts, "out today", seasonal events. Keeps weekly fix-up posts out. */
export const MAJOR_UPDATE_TITLE = /\b(out today|launch(?:es|ed)?|live today|is out|release[sd]?|christmas|halloween|easter|birthday|deadman|leagues? [ivx]+:)/i

export function isMajor (u: ScheduledUpdate, minItems: number | null): boolean {
  return u.keyword || (minItems !== null && u.items >= minItems)
}

/** The major update whose window [at - before, at + after) contains t, nearest first. */
export function updateInWindow (updates: readonly ScheduledUpdate[], t: number, beforeDays: number, afterDays: number, minItems: number | null): ScheduledUpdate | null {
  const near = updates
    .filter(u => isMajor(u, minItems) && t >= u.at - beforeDays * DAY_SEC && t < u.at + afterDays * DAY_SEC)
    .sort((a, b) => Math.abs(a.at - t) - Math.abs(b.at - t))
  return near[0] ?? null
}

/** Last time (<= t) the run of consecutive losing trades reached `losses`, or null. */
export function lastStreakAt (trades: readonly ClosedTrade[], t: number, losses: number): number | null {
  const known = trades.filter(x => x.knownAt <= t).sort((a, b) => a.knownAt - b.knownAt)
  let run = 0
  let hitAt: number | null = null
  for (const x of known) {
    run = x.profit < 0 ? run + 1 : 0
    if (run >= losses) hitAt = x.knownAt
  }
  return hitAt
}

export function recentPnl (trades: readonly ClosedTrade[], t: number, hours: number): { pnl: number; count: number } {
  const recent = trades.filter(x => x.knownAt <= t && x.knownAt > t - hours * HOUR_SEC)
  return { pnl: recent.reduce((s, x) => s + x.profit, 0), count: recent.length }
}

function hit (rule: GateRule, reason: string): GateHit {
  return { rule, size: rule.size, reason }
}

/** The rule's verdict at s.t, or null when it doesn't fire (or its signal is missing). */
export function evaluateRule (rule: GateRule, s: RegimeSignals): GateHit | null {
  switch (rule.kind) {
    case 'risk-off':
      return s.mood === 'risk-off' ? hit(rule, `market is risk-off (index ${s.index24h === null ? 'n/a' : pct(s.index24h)} over 24h, more items down than up)`) : null
    case 'index-drop': {
      const change = rule.window === '24h' ? s.index24h : s.index7d
      return change !== null && change <= -rule.below ? hit(rule, `top-100 index ${pct(change)} over ${rule.window} (gate: -${pct(rule.below)})`) : null
    }
    case 'volatility':
      return s.volRatio !== null && s.volRatio > rule.above ? hit(rule, `index volatility ${s.volRatio.toFixed(2)}x its trailing-week median (gate: ${rule.above}x)`) : null
    case 'update': {
      const u = updateInWindow(s.updates, s.t, rule.beforeDays, rule.afterDays, rule.minItems)
      if (!u) return null
      const when = u.at > s.t ? `in ${days(u.at - s.t)}` : `${days(s.t - u.at)} ago`
      return hit(rule, `big game update "${u.title}" (${u.date}, ${when})`)
    }
    case 'loss-streak': {
      const at = lastStreakAt(s.trades ?? [], s.t, rule.losses)
      return at !== null && s.t - at < rule.pauseHours * HOUR_SEC ? hit(rule, `${rule.losses}+ losing flips in a row ${days(s.t - at)} ago (pause ${rule.pauseHours}h)`) : null
    }
    case 'recent-pnl': {
      const r = recentPnl(s.trades ?? [], s.t, rule.hours)
      return r.count > 0 && r.pnl < 0 ? hit(rule, `flips closed in the last ${rule.hours}h lost ${Math.round(-r.pnl).toLocaleString('en-US')} gp`) : null
    }
  }
}

export const stateOf = (size: number): RegimeState => (size <= 0 ? 'stand-aside' : size < 1 ? 'caution' : 'trade')

/** Every rule that fires; the smallest size wins. */
export function decideRegime (rules: readonly GateRule[], s: RegimeSignals): RegimeDecision {
  const hits = rules.map(r => evaluateRule(r, s)).filter((h): h is GateHit => h !== null)
  const size = Math.max(0, Math.min(1, ...hits.map(h => h.size)))
  return { size, state: stateOf(size), reasons: hits.map(h => h.reason), hits }
}

/** Short stable id for a rule (report rows, cache keys). */
export function ruleKey (r: GateRule): string {
  const sz = r.size === 0 ? '' : ` x${r.size}`
  switch (r.kind) {
    case 'risk-off': return `risk-off${sz}`
    case 'index-drop': return `index${r.window}<-${pct(r.below)}${sz}`
    case 'volatility': return `vol>${r.above}x${sz}`
    case 'update': return `update -${r.beforeDays}d/+${r.afterDays}d${r.minItems === null ? ' kw' : ` kw|${r.minItems}+items`}${sz}`
    case 'loss-streak': return `${r.losses} losses->${r.pauseHours}h${sz}`
    case 'recent-pnl': return `pnl${r.hours}h<0${sz}`
  }
}
