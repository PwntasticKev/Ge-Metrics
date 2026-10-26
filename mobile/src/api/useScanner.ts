import { useQueries, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { WikiAverage } from '@ge/engine'
import { marketBreadth, type Breadth } from '../lib/breadth'
import { createLimiter } from '../lib/limiter'
import { hourStartAgo, liquidMoves, type Move } from '../lib/marketMoves'
import type { SpikeFlag } from '../lib/thinSpikes'
import { useNow } from '../lib/useNow'
import { useAverages } from './useAverages'
import { useMarket, type MarketState } from './useMarket'
import { useSpikeFlags } from './useThinSpikes'
import { fetchHourAveragesAt, fetchTimeseries, type PricePoint } from './wiki'

// Bulk data for the market scanner: the app's usual /latest, /5m, /1h and
// /24h, plus two past /1h snapshots (same hour yesterday and a week ago).
// Past hours never change, so each is fetched once and kept for the session.
const HOUR_MS = 3_600_000
const SNAPSHOT_GC_MS = 2 * HOUR_MS
const SERIES_STALE_MS = 10 * 60_000
// Per-item history for a top-N list: two requests at a time, 300 ms apart.
const seriesLimiter = createLimiter(2, 300)

export function useHourSnapshot (hoursAgo: number, now: number): Record<string, WikiAverage> | undefined {
  const timestamp = hourStartAgo(now, hoursAgo)
  const { data } = useQuery({
    queryKey: ['hour-averages', timestamp],
    queryFn: () => fetchHourAveragesAt(timestamp),
    staleTime: Infinity,
    gcTime: SNAPSHOT_GC_MS
  })
  return data
}

export interface ScannerData {
  prices: MarketState
  h1: Record<string, WikiAverage> | undefined
  h24: Record<string, WikiAverage> | undefined
  flags: Map<number, SpikeFlag> | null
  moves: Move[] | null
  breadth: Breadth | null
  /** Combined loading / error / refresh state for list screens. */
  state: MarketState
}

export function useScannerData (): ScannerData {
  const prices = useMarket()
  const averages = useAverages()
  const flags = useSpikeFlags(prices.market)
  // Ticks each 5 minutes, so the snapshots follow the hour /1h reports.
  const now = useNow(5 * 60_000)
  const dayAgo = useHourSnapshot(24, now)
  const weekAgo = useHourSnapshot(24 * 7, now)
  const { h1, h24 } = averages

  const moves = useMemo(() => {
    if (!prices.market || !h1 || !h24) return null
    return liquidMoves(prices.market.all().map(i => i.id), { hour: h1, day: h24, hourDayAgo: dayAgo, hourWeekAgo: weekAgo })
  }, [prices.market, h1, h24, dayAgo, weekAgo])
  const breadth = useMemo(() => (moves && dayAgo ? marketBreadth(moves) : null), [moves, dayAgo])

  const state: MarketState = {
    ...prices,
    market: flags ? prices.market : null,
    isLoading: prices.isLoading || (!flags && averages.isLoading),
    error: prices.error ?? averages.error,
    isRefreshing: prices.isRefreshing || averages.isRefreshing,
    refresh: () => {
      prices.refresh()
      averages.refresh()
    }
  }
  return { prices, h1, h24, flags, moves, breadth, state }
}

/**
 * Price history for a list of items, throttled. Shares the query key with the
 * row sparklines and item sheet charts, so opening a row costs nothing extra.
 */
export function useThrottledSeries (ids: readonly number[], timestep: '1h' | '6h', enabled: boolean): (PricePoint[] | undefined)[] {
  return useQueries({
    queries: ids.map(id => ({
      queryKey: ['timeseries', id, timestep],
      queryFn: () => seriesLimiter(() => fetchTimeseries(id, timestep)),
      staleTime: SERIES_STALE_MS,
      enabled
    })),
    combine: results => results.map(r => r.data)
  })
}
