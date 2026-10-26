// Walk-forward folds: tune on a training window, score on the window right
// after it, roll forward. Pure.
//
// Every variant runs once, continuously, over the whole period (as if it had
// been used all along). A window's score is the change in that run's equity
// (cash + holdings marked at the instant-sell price) between the window's
// start and end. An equity point at time T is computed from hours that closed
// by T, so a training score (equity up to test.start) only uses data from
// before the test window: picking the best variant on it can't see the test.
// Tests in test/walkforward.test.ts check this by rewriting everything after
// test.start and asserting the choice doesn't move.

import { HOUR_SEC } from '../history.js'
import { maxDrawdown } from '../metrics.js'
import type { Trade } from '../position.js'
import type { EquityPoint, SimResult } from '../simulate.js'

/** [start, end) in unix seconds. */
export interface Window {
  readonly start: number
  readonly end: number
}

export interface Fold {
  readonly index: number
  readonly train: Window
  readonly test: Window
}

export interface FoldSpec {
  /** First time a training window may start (first decision). */
  readonly start: number
  /** Last time a test window may end. */
  readonly end: number
  readonly trainHours: number
  readonly testHours: number
  readonly stepHours: number
}

export function makeFolds (s: FoldSpec): Fold[] {
  if (s.trainHours <= 0 || s.testHours <= 0 || s.stepHours <= 0) throw new Error('fold train, test and step hours must be positive')
  const folds: Fold[] = []
  for (let t0 = s.start; t0 + (s.trainHours + s.testHours) * HOUR_SEC <= s.end; t0 += s.stepHours * HOUR_SEC) {
    const split = t0 + s.trainHours * HOUR_SEC
    folds.push({ index: folds.length, train: { start: t0, end: split }, test: { start: split, end: split + s.testHours * HOUR_SEC } })
  }
  return folds
}

/** Equity at t: the last point at or before t (a run's first point is its starting cash). */
export function equityAt (equity: readonly EquityPoint[], t: number): number {
  let value = equity[0]?.value ?? 0
  for (const p of equity) {
    if (p.t > t) break
    value = p.value
  }
  return value
}

/** Equity points inside the window, both ends included (only data before `w.end`). */
export const pointsIn = (equity: readonly EquityPoint[], w: Window): EquityPoint[] =>
  equity.filter(p => p.t >= w.start && p.t <= w.end)

export const windowProfit = (equity: readonly EquityPoint[], w: Window): number =>
  equityAt(equity, w.end) - equityAt(equity, w.start)

export const windowDrawdown = (equity: readonly EquityPoint[], w: Window): number =>
  maxDrawdown([{ t: w.start, value: equityAt(equity, w.start) }, ...pointsIn(equity, w)]).pct

/** Trades whose buy was placed inside the window. */
export const tradesPlacedIn = (trades: readonly Trade[], w: Window): Trade[] =>
  trades.filter(t => t.placedAt >= w.start && t.placedAt < w.end)

export interface Scored {
  readonly key: string
  readonly profit: number
  readonly drawdown: number
}

/** Each variant's profit and drawdown over one window. */
export const scoreWindow = (results: readonly SimResult[], w: Window): Scored[] =>
  results.map(r => ({ key: r.key, profit: windowProfit(r.equity, w), drawdown: windowDrawdown(r.equity, w) }))

/** Most profit; ties go to the smaller drawdown, then to the earlier variant. */
export function best (scored: readonly Scored[]): Scored {
  const top = scored.reduce<Scored | null>((b, s) => (!b || s.profit > b.profit || (s.profit === b.profit && s.drawdown < b.drawdown) ? s : b), null)
  if (!top) throw new Error('no variants to choose from')
  return top
}

/** The variant to trade in fold `f`'s test window, chosen on its training window only. */
export const chooseForFold = (results: readonly SimResult[], f: Fold): Scored => best(scoreWindow(results, f.train))

/**
 * Out-of-sample equity: each fold's test-window equity changes of the variant
 * chosen for it, chained in time order from `cash`.
 */
export function stitch (pieces: readonly { readonly result: SimResult; readonly window: Window }[], cash: number): EquityPoint[] {
  const out: EquityPoint[] = []
  let base = cash
  for (const { result, window } of pieces) {
    const start = equityAt(result.equity, window.start)
    if (!out.length) out.push({ t: window.start, value: base })
    for (const p of pointsIn(result.equity, window)) if (p.t > window.start) out.push({ t: p.t, value: base + p.value - start })
    base += windowProfit(result.equity, window)
  }
  return out
}
