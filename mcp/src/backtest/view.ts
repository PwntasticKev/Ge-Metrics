// What a strategy could see at decision time t, rebuilt from closed windows
// only. Every read goes through a guard that throws LookaheadError for a
// window that hadn't closed by t, so a strategy can't peek at the future even
// by accident (tests assert this).
//
// - h1: the last closed /1h window [t-1h, t).
// - h24: the 24 closed hours before t, volume-weighted (what /24h reports).
// - m5: the last closed /5m window.
// - latest: per side, the most recent closed 5m window that traded (up to
//   LATEST_5M_WINDOWS back), else the most recent hour (up to LATEST_HOURS).
//   /latest reports a single last trade; a 5m average is the closest
//   historical stand-in.
// - series(id, hours): the item's closed hourly points, like /timeseries 1h.

import { type Market, createMarketFromWiki } from '@ge/engine'
import type { AveragePrice, IdMap, LatestPrice, MappingEntry, TimeseriesPoint } from '../wiki/types.js'
import { FIVE_MIN_SEC, HOUR_SEC, type History, type Snapshot } from './history.js'

export const LATEST_5M_WINDOWS = 4
export const LATEST_HOURS = 6
export const DAY_HOURS = 24

export class LookaheadError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'LookaheadError'
  }
}

export interface MarketView {
  readonly t: number
  readonly mapping: readonly MappingEntry[]
  readonly mappingById: ReadonlyMap<number, MappingEntry>
  readonly latest: IdMap<LatestPrice>
  readonly h1: Snapshot
  readonly h24: Snapshot
  readonly m5: Snapshot
  readonly volumes: IdMap<number>
  /** Engine market at t (live prices = `latest`, daily volume from h24). */
  market (): Market
  /** The item's closed hourly points over the last `hours` before t, oldest first. */
  series (id: number, hours: number): readonly TimeseriesPoint[]
}

/** History restricted to windows that had closed by t. */
export function guardHistory (history: History, t: number): History {
  return {
    hour: ts => {
      if (ts + HOUR_SEC > t) throw new LookaheadError(`read 1h window ${ts} at decision time ${t}`)
      return history.hour(ts)
    },
    fiveMin: ts => {
      if (ts + FIVE_MIN_SEC > t) throw new LookaheadError(`read 5m window ${ts} at decision time ${t}`)
      return history.fiveMin(ts)
    }
  }
}

interface Acc { hiSum: number; hiVol: number; loSum: number; loVol: number }

/** Volume-weighted merge of hourly snapshots, as the /24h endpoint reports. */
export function mergeSnapshots (snaps: readonly Snapshot[]): Snapshot {
  const acc = new Map<number, Acc>()
  for (const snap of snaps) {
    for (const [id, a] of snap) {
      const prev = acc.get(id) ?? { hiSum: 0, hiVol: 0, loSum: 0, loVol: 0 }
      const hasHi = a.avgHighPrice !== null && a.highPriceVolume > 0
      const hasLo = a.avgLowPrice !== null && a.lowPriceVolume > 0
      acc.set(id, {
        hiSum: prev.hiSum + (hasHi ? (a.avgHighPrice as number) * a.highPriceVolume : 0),
        hiVol: prev.hiVol + (hasHi ? a.highPriceVolume : 0),
        loSum: prev.loSum + (hasLo ? (a.avgLowPrice as number) * a.lowPriceVolume : 0),
        loVol: prev.loVol + (hasLo ? a.lowPriceVolume : 0)
      })
    }
  }
  return new Map([...acc].map(([id, a]) => [id, Object.freeze({
    avgHighPrice: a.hiVol > 0 ? Math.round(a.hiSum / a.hiVol) : null,
    highPriceVolume: a.hiVol,
    avgLowPrice: a.loVol > 0 ? Math.round(a.loSum / a.loVol) : null,
    lowPriceVolume: a.loVol
  })]))
}

interface Side { readonly price: number; readonly time: number }

function latestSide (windows: readonly { snap: Snapshot; time: number }[], id: number, pick: (a: AveragePrice) => number | null): Side | null {
  for (const w of windows) {
    const a = w.snap.get(id)
    const price = a ? pick(a) : null
    if (price !== null && price > 0) return { price: Math.round(price), time: w.time }
  }
  return null
}

function buildLatest (h: History, t: number, ids: Iterable<number>): IdMap<LatestPrice> {
  // Most recent first; a window's trades are dated to its middle.
  const windows = [
    ...Array.from({ length: LATEST_5M_WINDOWS }, (_, i) => t - (i + 1) * FIVE_MIN_SEC).map(ts => ({ snap: h.fiveMin(ts), time: ts + FIVE_MIN_SEC / 2 })),
    ...Array.from({ length: LATEST_HOURS }, (_, i) => t - (i + 1) * HOUR_SEC).map(ts => ({ snap: h.hour(ts), time: ts + HOUR_SEC / 2 }))
  ]
  const out = new Map<number, LatestPrice>()
  for (const id of ids) {
    const high = latestSide(windows, id, a => a.avgHighPrice)
    const low = latestSide(windows, id, a => a.avgLowPrice)
    if (high || low) out.set(id, Object.freeze({ high: high?.price ?? null, highTime: high?.time ?? null, low: low?.price ?? null, lowTime: low?.time ?? null }))
  }
  return out
}

const toRecord = <T>(map: IdMap<T>): Record<string, T> => Object.fromEntries([...map].map(([id, v]) => [String(id), v]))

export function viewAt (history: History, t: number, mapping: readonly MappingEntry[]): MarketView {
  if (t % HOUR_SEC !== 0) throw new Error(`decision time ${t} must be hour-aligned`)
  const h = guardHistory(history, t)
  const hourSnaps = Array.from({ length: DAY_HOURS }, (_, i) => h.hour(t - (i + 1) * HOUR_SEC))
  const h24 = mergeSnapshots(hourSnaps)
  const volumes = new Map([...h24].map(([id, a]) => [id, a.highPriceVolume + a.lowPriceVolume]))
  const latest = buildLatest(h, t, mapping.map(m => m.id))
  let market: Market | null = null
  return {
    t,
    mapping,
    mappingById: new Map(mapping.map(m => [m.id, m])),
    latest,
    h1: hourSnaps[0] as Snapshot,
    h24,
    m5: h.fiveMin(t - FIVE_MIN_SEC),
    volumes,
    market: () => {
      market ??= createMarketFromWiki({
        mapping: mapping.map(m => ({ ...m, icon: m.icon ?? undefined, limit: m.limit ?? undefined, highalch: m.highalch ?? undefined })),
        latest: toRecord(latest),
        volumes: toRecord(volumes)
      }, { nowSec: t })
      return market
    },
    series: (id, hours) => Array.from({ length: hours }, (_, i) => t - (hours - i) * HOUR_SEC).flatMap(ts => {
      const a = h.hour(ts).get(id)
      return a ? [Object.freeze({ timestamp: ts, ...a })] : []
    })
  }
}
