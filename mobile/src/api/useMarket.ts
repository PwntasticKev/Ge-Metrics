import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createMarketFromWiki, type Market } from '@ge/engine'
import { fetchLatest, fetchMapping, fetchVolumes } from './wiki'

const PRICE_REFRESH_MS = 60_000
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
  const mapping = useQuery({ queryKey: ['mapping'], queryFn: fetchMapping, staleTime: MAPPING_STALE_MS })
  const latest = useQuery({ queryKey: ['latest'], queryFn: fetchLatest, refetchInterval: PRICE_REFRESH_MS, staleTime: PRICE_REFRESH_MS / 2 })
  const volumes = useQuery({ queryKey: ['volumes'], queryFn: fetchVolumes, refetchInterval: PRICE_REFRESH_MS * 5, staleTime: PRICE_REFRESH_MS })

  const market = useMemo(() => {
    if (!mapping.data || !latest.data) return null
    return createMarketFromWiki(
      { mapping: mapping.data, latest: latest.data, volumes: volumes.data },
      { nowSec: Math.floor(latest.dataUpdatedAt / 1000) }
    )
  }, [mapping.data, latest.data, volumes.data, latest.dataUpdatedAt])

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
