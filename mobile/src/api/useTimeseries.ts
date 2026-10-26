import { useQuery } from '@tanstack/react-query'
import { fetchTimeseries, type PricePoint } from './wiki'

export type Timestep = '5m' | '1h' | '6h' | '24h'

// Per-item history is fetched only when something on screen needs it (an
// expanded row, the item sheet) and shared by key, so the chart, sparkline
// and timing section never download the same series twice. It stays in
// memory, not on disk: one item's series is small but there are thousands.
const SERIES_STALE_MS = 10 * 60_000
const SERIES_GC_MS = 30 * 60_000

export function useTimeseries (itemId: number, timestep: Timestep, enabled = true) {
  return useQuery<PricePoint[]>({
    queryKey: ['timeseries', itemId, timestep],
    queryFn: () => fetchTimeseries(itemId, timestep),
    staleTime: SERIES_STALE_MS,
    gcTime: SERIES_GC_MS,
    enabled
  })
}
