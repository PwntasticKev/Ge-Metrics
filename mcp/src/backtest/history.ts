// Historical bulk snapshots held in memory for a backtest. A /1h snapshot at
// `ts` covers trades in [ts, ts + 1h) and is only known once that hour is
// over; a /5m snapshot likewise for [ts, ts + 5m). History is a plain lookup:
// the no-lookahead rule lives in view.ts, which only reads windows that had
// closed by the decision time.

import type { AveragePrice, IdMap } from '../wiki/types.js'

export const HOUR_SEC = 3_600
export const FIVE_MIN_SEC = 300

export type Snapshot = IdMap<AveragePrice>
export type SnapshotWindow = '1h' | '5m'
export const WINDOW_SEC: Readonly<Record<SnapshotWindow, number>> = { '1h': HOUR_SEC, '5m': FIVE_MIN_SEC }

const EMPTY: Snapshot = new Map()

export interface History {
  /** The /1h snapshot starting at `ts` (empty when nothing traded or it wasn't loaded). */
  hour (ts: number): Snapshot
  /** The /5m snapshot starting at `ts`. */
  fiveMin (ts: number): Snapshot
}

export function createHistory (hours: ReadonlyMap<number, Snapshot>, fiveMins: ReadonlyMap<number, Snapshot> = new Map()): History {
  return {
    hour: ts => hours.get(ts) ?? EMPTY,
    fiveMin: ts => fiveMins.get(ts) ?? EMPTY
  }
}

export const alignDown = (ts: number, step: number): number => Math.floor(ts / step) * step

/** Window starts from `from` up to and including `to`, `step` apart. */
export function windowStarts (from: number, to: number, step: number): number[] {
  const out: number[] = []
  for (let ts = alignDown(from, step); ts <= to; ts += step) out.push(ts)
  return out
}
