import { useMemo } from 'react'
import { buildRecipes, computeItemFlip, craftedRecipes, rankItemFlips, rankSetFlips, withBudget, type ItemFlip, type Market, type SetFlip, type SortMetric } from '@ge/engine'
import { useSettings } from '../state/settings'

export const RECIPES = buildRecipes(craftedRecipes)

export type SetKind = 'all' | 'ge-set' | 'combine'

// Items list is capped: thousands of rows is slow and nobody scrolls that far.
const MAX_ITEM_ROWS = 300

export function useRankedSets (market: Market | null, sortBy: SortMetric, kind: SetKind, query = ''): SetFlip[] {
  const { settings } = useSettings()
  return useMemo(() => {
    if (!market) return []
    return withBudget(rankSetFlips(RECIPES, market, { sortBy, includeSuspicious: !settings.hideFlukes }), settings.budget, sortBy)
      .filter(f => kind === 'all' || f.kind === kind)
      .filter(f => !settings.hideStale || !f.stale)
      .filter(f => settings.membersItems || !market.get(f.setId)?.members)
      .filter(f => !query.trim() || f.name.toLowerCase().includes(query.trim().toLowerCase()))
  }, [market, sortBy, kind, query, settings.hideFlukes, settings.hideStale, settings.membersItems, settings.budget])
}

export function useRankedItems (market: Market | null, sortBy: SortMetric, query: string): { flips: ItemFlip[]; total: number } {
  const { settings } = useSettings()
  return useMemo(() => {
    if (!market) return { flips: [], total: 0 }
    const q = query.trim().toLowerCase()
    // Searching is a price lookup: show every match, losing or not, and
    // ignore the browse filters so an item you hold is never hidden.
    if (q) {
      const matches = market.all()
        .filter(item => item.name.toLowerCase().includes(q))
        .map(item => computeItemFlip(item, { nowSec: market.nowSec }))
        .filter((f): f is ItemFlip => f !== null)
        .sort((a, b) => (b[sortBy] ?? -Infinity) - (a[sortBy] ?? -Infinity))
      return { flips: matches.slice(0, MAX_ITEM_ROWS), total: matches.length }
    }
    const all = withBudget(rankItemFlips(market, { sortBy, includeSuspicious: !settings.hideFlukes }), settings.budget, sortBy)
      .filter(f => !settings.hideStale || !f.stale)
      .filter(f => settings.membersItems || !f.members)
      .filter(f => !q || f.name.toLowerCase().includes(q))
    return { flips: all.slice(0, MAX_ITEM_ROWS), total: all.length }
  }, [market, sortBy, query, settings.hideFlukes, settings.hideStale, settings.membersItems, settings.budget])
}
