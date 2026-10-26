// Cached access to the OSRS Wiki real-time prices API.

import { createMarketFromWiki, type Market } from '@ge/engine'
import { TtlCache } from '../cache.js'
import { HISTORY_CONCURRENCY, HISTORY_GAP_MS, PRICES_BASE_URL, TTL } from '../config.js'
import { type FetchLike, getJson } from './http.js'
import { type Limiter, createLimiter } from './limiter.js'
import { parseAverages, parseLatest, parseMapping, parseTimeseries, parseVolumes } from './parse.js'
import type { AveragePrice, AverageWindow, IdMap, LatestPrice, MappingEntry, Timestep, TimeseriesPoint } from './types.js'

export interface PriceSource {
  mapping (): Promise<readonly MappingEntry[]>
  latest (): Promise<IdMap<LatestPrice>>
  averages (window: AverageWindow): Promise<IdMap<AveragePrice>>
  volumes (): Promise<IdMap<number>>
  timeseries (id: number, timestep: Timestep): Promise<readonly TimeseriesPoint[]>
  /** The /1h or /24h snapshot for the period starting at `timestamp` (unix seconds, period-aligned). */
  averagesAt (window: SnapshotWindow, timestamp: number): Promise<IdMap<AveragePrice>>
  market (): Promise<Market>
}

export type SnapshotWindow = '1h' | '24h'
const SNAPSHOT_SECONDS: Readonly<Record<SnapshotWindow, number>> = { '1h': 3600, '24h': 86_400 }

const toRecord = <T>(map: IdMap<T>): Record<string, T> => Object.fromEntries([...map].map(([id, v]) => [String(id), v]))

export interface PriceSourceOptions {
  readonly fetchImpl?: FetchLike
  readonly cache?: TtlCache
  // Throttles per-item and historical requests (cache hits skip it).
  readonly limiter?: Limiter
}

export function createPriceSource ({
  fetchImpl = fetch,
  cache = new TtlCache(),
  limiter = createLimiter({ concurrency: HISTORY_CONCURRENCY, gapMs: HISTORY_GAP_MS })
}: PriceSourceOptions = {}): PriceSource {
  const get = (path: string) => getJson(`${PRICES_BASE_URL}${path}`, fetchImpl)
  const throttled = (path: string) => limiter(() => get(path))

  const source: PriceSource = {
    mapping: () => cache.get('mapping', TTL.mapping, async () => parseMapping(await get('/mapping'))),
    latest: () => cache.get('latest', TTL.latest, async () => parseLatest(await get('/latest'))),
    averages: window => cache.get(`avg:${window}`, TTL[window], async () => parseAverages(await get(`/${window}`), `/${window}`)),
    volumes: () => cache.get('volumes', TTL.volumes, async () => parseVolumes(await get('/volumes'))),
    timeseries: (id, timestep) =>
      cache.get(`ts:${timestep}:${id}`, TTL.timeseries[timestep], async () =>
        parseTimeseries(await throttled(`/timeseries?timestep=${timestep}&id=${id}`))),
    averagesAt: (window, timestamp) => {
      const step = SNAPSHOT_SECONDS[window]
      const aligned = Math.floor(timestamp / step) * step
      return cache.get(`avg:${window}@${aligned}`, TTL.snapshot, async () =>
        parseAverages(await throttled(`/${window}?timestamp=${aligned}`), `/${window}`))
    },
    // The engine's market snapshot is rebuilt whenever latest prices refresh.
    market: () => cache.get('market', TTL.latest, async () => {
      const [mapping, latest, volumes] = await Promise.all([source.mapping(), source.latest(), source.volumes()])
      return createMarketFromWiki({
        mapping: mapping.map(m => ({ ...m, icon: m.icon ?? undefined, limit: m.limit ?? undefined, highalch: m.highalch ?? undefined })),
        latest: toRecord(latest),
        volumes: toRecord(volumes)
      })
    })
  }
  return source
}
