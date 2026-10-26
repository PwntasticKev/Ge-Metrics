// Per-item history for a short list, through the price source's throttle.
// A failed series is logged and skipped so one bad item can't sink a scan.

import type { PriceSource } from '../wiki/prices.js'
import type { Timestep, TimeseriesPoint } from '../wiki/types.js'

export type SeriesMap = ReadonlyMap<number, readonly TimeseriesPoint[]>

export async function seriesFor (prices: PriceSource, ids: readonly number[], step: Timestep): Promise<SeriesMap> {
  const settled = await Promise.allSettled(ids.map(async id => [id, await prices.timeseries(id, step)] as const))
  const failed = settled.filter(s => s.status === 'rejected')
  if (failed.length) console.error(`[ge-metrics-mcp] ${failed.length}/${ids.length} ${step} series failed; scanning without them`)
  return new Map(settled.flatMap(s => (s.status === 'fulfilled' ? [s.value] : [])))
}
