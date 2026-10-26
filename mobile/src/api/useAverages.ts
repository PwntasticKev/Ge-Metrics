import { useQuery } from '@tanstack/react-query'
import type { WikiAverage } from '@ge/engine'
import { fetchAverages } from './wiki'

// The wiki rebuilds /1h every few minutes and /24h less often.
const HOUR_REFRESH_MS = 5 * 60_000
const DAY_REFRESH_MS = 15 * 60_000

export interface AveragesState {
  h1: Record<string, WikiAverage> | undefined
  h24: Record<string, WikiAverage> | undefined
  isLoading: boolean
  isRefreshing: boolean
  error: Error | null
  refresh: () => void
}

export function useAverages (): AveragesState {
  const h1 = useQuery({ queryKey: ['averages', '1h'], queryFn: () => fetchAverages('1h'), refetchInterval: HOUR_REFRESH_MS, staleTime: HOUR_REFRESH_MS / 2 })
  const h24 = useQuery({ queryKey: ['averages', '24h'], queryFn: () => fetchAverages('24h'), refetchInterval: DAY_REFRESH_MS, staleTime: DAY_REFRESH_MS / 2 })
  return {
    h1: h1.data,
    h24: h24.data,
    isLoading: h1.isLoading || h24.isLoading,
    isRefreshing: h1.isRefetching || h24.isRefetching,
    // A failed background refresh keeps the older averages, which are still
    // fine for ranking; only report errors when there's nothing to show.
    error: ((!h1.data && h1.error) || (!h24.data && h24.error) || null) as Error | null,
    refresh: () => {
      h1.refetch()
      h24.refetch()
    }
  }
}
