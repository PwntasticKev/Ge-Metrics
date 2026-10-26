// Game updates / dev blogs for chart markers, as { blogs, updates }.
// With the backend on they come from the gameEvents tRPC endpoint; in static
// mode from public/data/game-updates.json (loaded once, then filtered here).

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { trpc } from '../utils/trpc.jsx'
import { BACKEND_ENABLED } from '../config/features.js'
import { filterUpdatesByDateRange, toChartEvents } from '../domain/gameUpdates/index.js'
import { loadGameUpdates } from '../services/static/gameUpdatesStore.js'

const EMPTY_EVENTS = { blogs: [], updates: [] }

export function useGameEvents ({ startDate, endDate, enabled = true, queryOptions = {} }) {
  const backendQuery = trpc.gameEvents.getByDateRange.useQuery(
    { startDate, endDate },
    { staleTime: 5 * 60 * 1000, ...queryOptions, enabled: BACKEND_ENABLED && enabled }
  )

  const staticQuery = useQuery({
    queryKey: ['staticGameUpdates'],
    queryFn: () => loadGameUpdates(),
    enabled: !BACKEND_ENABLED && enabled,
    staleTime: Infinity,
    retry: 1
  })

  const startMs = startDate instanceof Date ? startDate.getTime() : startDate
  const endMs = endDate instanceof Date ? endDate.getTime() : endDate

  const events = useMemo(() => {
    if (BACKEND_ENABLED) return backendQuery.data?.data ?? EMPTY_EVENTS
    if (!staticQuery.data) return EMPTY_EVENTS
    return toChartEvents(filterUpdatesByDateRange(staticQuery.data, startMs, endMs))
  }, [backendQuery.data, staticQuery.data, startMs, endMs])

  const query = BACKEND_ENABLED ? backendQuery : staticQuery
  return { ...events, status: query.status, error: query.error ?? null }
}
