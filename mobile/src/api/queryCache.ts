import AsyncStorage from '@react-native-async-storage/async-storage'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { QueryClient, type Query } from '@tanstack/react-query'

// Last prices are saved on the phone so a cold start shows the list
// immediately (with its real age), then refreshes in the background.
export const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000
// Bump when a cached response shape changes so old caches are dropped.
export const CACHE_BUSTER = 'v1'
const PERSISTED_KEYS = new Set(['mapping', 'latest', 'volumes', 'averages'])

export function createQueryClient (): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: 2, refetchOnWindowFocus: true, gcTime: CACHE_MAX_AGE_MS } }
  })
}

export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'gem.query-cache',
  // Prices refresh every minute; writing more often buys nothing.
  throttleTime: 5_000
})

export function shouldPersist (query: Query): boolean {
  return query.state.status === 'success' && PERSISTED_KEYS.has(String(query.queryKey[0]))
}
