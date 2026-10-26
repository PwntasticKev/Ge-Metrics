import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { Market, WikiAverage } from '@ge/engine'
import { assessThinSpike, screenThinSpikes, type SpikeFlag, type SpikeInput } from '../lib/thinSpikes'
import { useAverages } from './useAverages'
import { fetchAverages } from './wiki'

// The wiki rebuilds /5m every five minutes. Not persisted: it is stale by
// the next launch anyway.
const FIVE_MINUTES_MS = 5 * 60_000

export function useFiveMinuteAverages (): Record<string, WikiAverage> | undefined {
  const { data } = useQuery({
    queryKey: ['five-minute'],
    queryFn: () => fetchAverages('5m'),
    refetchInterval: FIVE_MINUTES_MS,
    staleTime: FIVE_MINUTES_MS / 2
  })
  return data
}

type Averages = Record<string, WikiAverage> | undefined

export function spikeInput (id: number, h1: Averages, h24: Averages, m5: Averages): SpikeInput {
  const key = String(id)
  return { h1: h1?.[key], h24: h24?.[key], m5: m5?.[key] }
}

/** The thin-volume spike flag for one item, or null. Cheap enough for list rows. */
export function useSpikeFlag (id: number): SpikeFlag | null {
  const { h1, h24 } = useAverages()
  const m5 = useFiveMinuteAverages()
  return useMemo(() => assessThinSpike(spikeInput(id, h1, h24, m5)), [id, h1, h24, m5])
}

/** Every flagged item in the market. */
export function useSpikeFlags (market: Market | null): Map<number, SpikeFlag> | null {
  const { h1, h24 } = useAverages()
  const m5 = useFiveMinuteAverages()
  return useMemo(() => {
    if (!market || !h1 || !h24) return null
    return screenThinSpikes(market.all().map(i => i.id), id => spikeInput(id, h1, h24, m5))
  }, [market, h1, h24, m5])
}
