import { useMemo } from 'react'
import { buildRecipes, craftedRecipes, rankItemFlips, rankSetFlips, type ItemFlip, type Market, type SetFlip, type SortMetric } from '@ge/engine'
import { useSettings } from '../state/settings'

export const RECIPES = buildRecipes(craftedRecipes)

export type SetKind = 'all' | 'ge-set' | 'combine'

// Items list is capped: thousands of rows is slow and nobody scrolls that far.
const MAX_ITEM_ROWS = 300

export function useRankedSets (market: Market | null, sortBy: SortMetric, kind: SetKind, query = ''): SetFlip[] {
  const { settings } = useSettings()
  return useMemo(() => {
    if (!market) return []
    return rankSetFlips(RECIPES, market, { sortBy, includeSuspicious: !settings.hideFlukes })
      .filter(f => kind === 'all' || f.kind === kind)
      .filter(f => !settings.hideStale || !f.stale)
      .filter(f => settings.membersItems || !market.get(f.setId)?.members)
      .filter(f => !query.trim() || f.name.toLowerCase().includes(query.trim().toLowerCase()))
  }, [market, sortBy, kind, query, settings.hideFlukes, settings.hideStale, settings.membersItems])
}

export function useRankedItems (market: Market | null, sortBy: SortMetric, query: string): { flips: ItemFlip[]; total: number } {
  const { settings } = useSettings()
  return useMemo(() => {
    if (!market) return { flips: [], total: 0 }
    const q = query.trim().toLowerCase()
    const all = rankItemFlips(market, { sortBy, includeSuspicious: !settings.hideFlukes })
      .filter(f => !settings.hideStale || !f.stale)
      .filter(f => settings.membersItems || !f.members)
      .filter(f => !q || f.name.toLowerCase().includes(q))
    return { flips: all.slice(0, MAX_ITEM_ROWS), total: all.length }
  }, [market, sortBy, query, settings.hideFlukes, settings.hideStale, settings.membersItems])
}
