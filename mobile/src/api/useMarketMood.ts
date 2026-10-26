import { useMemo } from 'react'
import type { Market } from '@ge/engine'
import { marketBreadth, type Mood } from '../lib/breadth'
import { liquidMoves } from '../lib/marketMoves'
import { useNow } from '../lib/useNow'
import { useAverages } from './useAverages'
import { useHourSnapshot } from './useScanner'

/**
 * The scanner's market mood (breadth plus the value-weighted index over 24h)
 * for screens outside the scanner. Shares the same-hour-yesterday snapshot
 * with the scanner, so it costs one /1h request per hour at most. Null
 * until that snapshot loads.
 */
export function useMarketMood (market: Market | null): Mood | null {
  const { h1, h24 } = useAverages()
  const now = useNow(5 * 60_000)
  const dayAgo = useHourSnapshot(24, now)
  return useMemo(() => {
    if (!market || !h1 || !h24 || !dayAgo) return null
    const moves = liquidMoves(market.all().map(i => i.id), { hour: h1, day: h24, hourDayAgo: dayAgo, hourWeekAgo: undefined })
    return marketBreadth(moves).mood
  }, [market, h1, h24, dayAgo])
}
