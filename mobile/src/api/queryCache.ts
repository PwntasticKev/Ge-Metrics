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
    defaultOptions: { queries: { retry: 2, refetchOnWindowFocus: true } }
  })
}

export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'gem.query-cache',
  // Writing ~2 MB of JSON blocks the JS thread for a moment, so do it at most
  // twice a minute; prices only refresh once a minute anyway.
  throttleTime: 30_000
})

// Persisted queries must outlive a restart in memory too.
export const PERSISTED_GC_TIME_MS = CACHE_MAX_AGE_MS

export function shouldPersist (query: Query): boolean {
  // Judge age by when the data was fetched, not when the cache was last
  // written, so opening the app offline every day can't keep old prices alive.
  return query.state.status === 'success' &&
    Date.now() - query.state.dataUpdatedAt < CACHE_MAX_AGE_MS &&
    PERSISTED_KEYS.has(String(query.queryKey[0]))
}
