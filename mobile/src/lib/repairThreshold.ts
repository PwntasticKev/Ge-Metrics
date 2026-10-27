import type { Market } from '@ge/engine'
import { compareRepair, repairDefinition } from './repairComparison.ts'

type Comparison = ReturnType<typeof compareRepair>
interface QuoteContext {
  quotes: Comparison['quotes']
  missingSides: Comparison['missingSides']
}

export type RepairSmithingThresholdResult =
  | (QuoteContext & { status: 'qualifies', minLevel: number, marginAtLevel: number, marginPrevious: number })
  | (QuoteContext & { status: 'already-level-1', minLevel: 1, marginAtLevel: number, marginPrevious: null })
  | (QuoteContext & { status: 'none-through-99', minLevel: null, marginAt99: number })
  | (QuoteContext & { status: 'unknown-quotes', minLevel: null })
  | { status: 'invalid', reason: string }

/** Minimum whole unboosted Smithing level for nonnegative stand margin on the
 * verified Dharok 4902 -> 4722 pair. Assumes a purchased broken input and one
 * per-item repair fee. This fixed-price threshold is not a recommendation or an
 * executable offer: even qualifying quotes may be stale or of unknown age.
 * No boosts, throughput, remaining limits or additional fees are assumed.
 */
export function repairSmithingThreshold (rawMarket: Market, options: {
  staleAfterSec?: number
} = {}): RepairSmithingThresholdResult {
  try {
    // Capture both legs once so every level uses the same observations. A zero
    // observation means unknown, never a free input or guaranteed zero proceeds.
    const items = [repairDefinition.inputId, repairDefinition.outputId].map(id => {
      const item = rawMarket.get(id)
      if (!item) return null
      return { ...item,
        high: id === repairDefinition.inputId && item.high === 0 ? null : item.high,
        low: id === repairDefinition.outputId && item.low === 0 ? null : item.low }
    })
    const market: Market = { nowSec: rawMarket.nowSec,
      get: id => items.find(item => item?.id === id) ?? null,
      all: () => items.filter(item => item !== null) }
    let previous: number | null = null
    for (let level = 1; level <= 99; level++) {
      // Only freshness settings are forwarded; callers cannot override sale tax.
      const comparison = compareRepair(market, level, 1, { staleAfterSec: options.staleAfterSec })
      const context = { quotes: comparison.quotes, missingSides: comparison.missingSides }
      const margin = comparison.stand.perItem?.profit
      if (margin === undefined) return { ...context, status: 'unknown-quotes', minLevel: null }
      if (margin >= 0) {
        if (level === 1) return { ...context, status: 'already-level-1', minLevel: 1, marginAtLevel: margin, marginPrevious: null }
        return { ...context, status: 'qualifies', minLevel: level, marginAtLevel: margin, marginPrevious: previous! }
      }
      if (level === 99) return { ...context, status: 'none-through-99', minLevel: null, marginAt99: margin }
      previous = margin
    }
    // The bounded scan always returns at or before level 99.
    throw new RangeError('No Smithing levels evaluated')
  } catch (error) {
    if (error instanceof RangeError) return { status: 'invalid', reason: error.message }
    throw error
  }
}
