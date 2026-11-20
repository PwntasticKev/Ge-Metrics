import { NATURE_RUNE_ID, highAlchRecipes, rankProcessFlips, withBudget, type Market, type ProcessFlip } from '@ge/engine'

export const MAX_ALCH_ROWS = 60

// High alchemy through the shared engine (same numbers as the website):
// item and nature rune bought at the instant-buy price, coins untaxed, ranked
// by GP/hour capped at 1,200 casts an hour, the item's buy limit and volume.
// Recipes depend only on item names/alch values, so build them once per market.
let cache: { market: Market; flips: ProcessFlip[] } | null = null

export function rankHighAlch (market: Market, { budget = null, hideFlukes = true, hideStale = true }: { budget?: number | null; hideFlukes?: boolean; hideStale?: boolean } = {}): { rows: ProcessFlip[]; nature: number | null } {
  const nature = market.get(NATURE_RUNE_ID)?.high ?? null
  if (!nature) return { rows: [], nature }
  if (cache?.market !== market) {
    cache = { market, flips: rankProcessFlips(highAlchRecipes(market.all()), market, { sortBy: 'perHour', buyAt: 'high', includeSuspicious: true }) }
  }
  const rows = withBudget(cache.flips, budget, 'perHour')
    .filter(f => !hideFlukes || !f.suspicious)
    .filter(f => !hideStale || !f.stale)
    .slice(0, MAX_ALCH_ROWS)
  return { rows, nature }
}
