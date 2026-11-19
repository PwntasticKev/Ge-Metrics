import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { wikiItemsService } from '../../services/wiki/wikiItemsService.js'
import { createMarketFromWiki } from '../../domain/flipping/index.js'

const REFRESH_MS = 60 * 1000

// 24h traded volume per item, from the service's merged /24h + /1h map.
export function dailyVolumes (volumeMap) {
  return Object.fromEntries(Object.entries(volumeMap ?? {}).map(([id, v]) =>
    [id, (v?.highPriceVolume ?? 0) + (v?.lowPriceVolume ?? 0)]
  ))
}

async function loadMarketInputs () {
  const [mapping, latest, volumes] = await Promise.all([
    wikiItemsService.getMapping(),
    wikiItemsService.getLatest(),
    wikiItemsService.getVolumes()
  ])
  return { mapping, latest, volumes: dailyVolumes(volumes), fetchedAt: Date.now() }
}

// Live engine market (prices + buy limits + daily volume), refreshed every minute.
export function useWikiMarket () {
  const query = useQuery({
    queryKey: ['wiki-market'],
    queryFn: loadMarketInputs,
    refetchInterval: REFRESH_MS,
    staleTime: REFRESH_MS / 2
  })
  const market = useMemo(() => (query.data ? createMarketFromWiki(query.data) : null), [query.data])
  return { market, fetchedAt: query.data?.fetchedAt ?? null, isLoading: query.isLoading, error: query.error }
}
