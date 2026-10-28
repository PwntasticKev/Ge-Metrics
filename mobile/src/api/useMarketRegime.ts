import { useMemo } from 'react'
import type { Market } from '@ge/engine'
import { decideRegime, type Regime } from '../lib/regime'
import { useNow } from '../lib/useNow'
import { useSettings } from '../state/settings'
import { useGameUpdates } from './gameUpdates'
import { useMarketMood } from './useMarketMood'

const NO_UPDATES: never[] = []

/**
 * Trade / caution / stand aside for Buy now's quick lists, from the
 * scanner's market mood and big releases in the game-update feed (lib/regime).
 * Without the feed (offline, first load) only the risk-off rule applies.
 */
export function useMarketRegime (market: Market | null): Regime {
  const mood = useMarketMood(market)
  const updates = useGameUpdates()
  const { settings } = useSettings()
  const now = useNow(5 * 60_000)
  if (updates.error) console.warn('[regime] game updates unavailable, release gate off', updates.error)
  return useMemo(
    () => decideRegime({ now, mood, updates: updates.data ?? NO_UPDATES, updateGate: settings.regimeGate }),
    [now, mood, updates.data, settings.regimeGate]
  )
}
