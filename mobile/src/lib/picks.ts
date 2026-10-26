import { useMemo } from 'react'
import { rankOvernightFlips, rankQuickFlips, type Market, type BuyPick, type WikiAverage } from '@ge/engine'
import { useSettings } from '../state/settings'

export type PickMode = 'quick' | 'overnight'

const MAX_PICKS = 100

export function usePicks (market: Market | null, h1: Record<string, WikiAverage> | undefined, h24: Record<string, WikiAverage> | undefined, mode: PickMode): BuyPick[] | null {
  const { settings } = useSettings()
  return useMemo(() => {
    if (!market || !h1 || !h24) return null
    const rank = mode === 'quick' ? rankQuickFlips : rankOvernightFlips
    return rank(market, { h1, h24, budget: settings.budget })
      .filter(p => settings.membersItems || !p.members)
      .slice(0, MAX_PICKS)
  }, [market, h1, h24, mode, settings.budget, settings.membersItems])
}
