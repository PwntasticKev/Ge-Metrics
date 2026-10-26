import { useMemo } from 'react'
import { F2P_SLOTS, MEMBERS_SLOTS, planCashStack, rankOvernightFlips, rankQuickFlips, type BuyPick, type Market, type WikiAverage } from '@ge/engine'
import { useSettings } from '../state/settings'

export type PickMode = 'quick' | 'overnight' | 'plan'

const MAX_PICKS = 100

export function usePicks (market: Market | null, h1: Record<string, WikiAverage> | undefined, h24: Record<string, WikiAverage> | undefined, mode: PickMode): BuyPick[] | null {
  const { settings } = useSettings()
  return useMemo(() => {
    if (!market || !h1 || !h24) return null
    const rank = mode === 'overnight' ? rankOvernightFlips : rankQuickFlips
    const picks = rank(market, { h1, h24, budget: settings.budget })
      .filter(p => settings.membersItems || !p.members)
    if (mode !== 'plan') return picks.slice(0, MAX_PICKS)
    if (!settings.budget) return []
    return planCashStack(picks, { cash: settings.budget, slots: settings.membersItems ? MEMBERS_SLOTS : F2P_SLOTS })
  }, [market, h1, h24, mode, settings.budget, settings.membersItems])
}

export function planTotals (plan: readonly BuyPick[]): { cost: number; profit: number } {
  return plan.reduce((t, p) => ({ cost: t.cost + p.cost, profit: t.profit + p.potential }), { cost: 0, profit: 0 })
}
