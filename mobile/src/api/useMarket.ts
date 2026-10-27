import { useMemo, useSyncExternalStore } from 'react'
import { AppState } from 'react-native'
import { createMarketClock, withMarketTime } from './marketClock'
import { useQuery } from '@tanstack/react-query'
import { createMarketFromWiki, type Market } from '@ge/engine'
import { PERSISTED_GC_TIME_MS } from './queryCache'
import { fetchLatest, fetchMapping, fetchVolumes } from './wiki'

const PRICE_REFRESH_MS = 60_000
const marketClock = createMarketClock({
  now: Date.now,
  isActive: () => AppState.currentState === 'active',
  start: tick => {
    const timer = setInterval(tick, PRICE_REFRESH_MS)
    return () => clearInterval(timer)
  },
  listen: resync => {
    const change = AppState.addEventListener('change', resync)
    const focus = AppState.addEventListener('focus', resync)
    return () => { change.remove(); focus.remove() }
  }
})
const MAPPING_STALE_MS = 6 * 60 * 60 * 1000

export interface MarketState {
  market: Market | null
  isLoading: boolean
  error: Error | null
  updatedAt: number | null
  refresh: () => void
  isRefreshing: boolean
}

export function useMarket (): MarketState {
  const mapping = useQuery({ queryKey: ['mapping'], queryFn: fetchMapping, staleTime: MAPPING_STALE_MS, gcTime: PERSISTED_GC_TIME_MS })
  const latest = useQuery({ queryKey: ['latest'], queryFn: fetchLatest, refetchInterval: PRICE_REFRESH_MS, staleTime: PRICE_REFRESH_MS / 2, gcTime: PERSISTED_GC_TIME_MS })
  const volumes = useQuery({ queryKey: ['volumes'], queryFn: fetchVolumes, refetchInterval: PRICE_REFRESH_MS * 5, staleTime: PRICE_REFRESH_MS, gcTime: PERSISTED_GC_TIME_MS })

  const nowSec = useSyncExternalStore(marketClock.subscribe, marketClock.getSnapshot)
  const baseMarket = useMemo(() => {
    if (!mapping.data || !latest.data) return null
    return createMarketFromWiki(
      { mapping: mapping.data, latest: latest.data, volumes: volumes.data },
      { nowSec: 0 }
    )
  }, [mapping.data, latest.data, volumes.data])
  const market = useMemo(() => baseMarket ? withMarketTime(baseMarket, nowSec) : null, [baseMarket, nowSec])

  return {
    market,
    isLoading: !market && (mapping.isLoading || latest.isLoading),
    error: (mapping.error ?? latest.error ?? null) as Error | null,
    updatedAt: latest.dataUpdatedAt || null,
    isRefreshing: latest.isRefetching,
    refresh: () => {
      latest.refetch()
      volumes.refetch()
    }
  }
}
