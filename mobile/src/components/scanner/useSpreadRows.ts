import { geTax } from '@ge/engine'
import { useMemo } from 'react'
import { useScannerData, useThrottledSeries } from '../../api/useScanner'
import type { PricePoint } from '../../api/wiki'
import { estimateSpread, fastFirst, spreadLists, type SpreadCheck, type SpreadLists, type SpreadOptions } from '../../lib/spreadFill'
import { screenSpreads } from '../../lib/spreadScan'
import type { SpreadEntry } from './ScanRows'

// Per-item history is one request each; check the top of the list only.
export const CHECK_SPREADS = 25
// Rows shown in each section.
const MAX_SPREAD_ROWS = 60

const tax = (price: number, id: number) => geTax(price, id)

export interface SpreadRows {
  listed: SpreadEntry[]
  slow: SpreadEntry[]
  dropped: SpreadLists['dropped']
}

/**
 * "Margins opened", fill-aware: screen on the bulk averages, estimate fill
 * times, fetch history for the best rows that can fill, then settle them on
 * prices that actually traded (see lib/spreadFill).
 */
export function useSpreadRows (data: ReturnType<typeof useScannerData>, members: boolean, maxHours: number, budget: number | null, active: boolean): SpreadRows {
  const { prices, h1, h24, flags } = data
  const market = prices.market
  const opts = useMemo<SpreadOptions | null>(() => (h1 && h24 ? { h1, h24, tax, maxSellHours: maxHours, budget } : null), [h1, h24, maxHours, budget])
  const estimates = useMemo<SpreadCheck[]>(() => {
    if (!market || !h1 || !h24 || !flags || !opts) return []
    return screenSpreads({
      items: market.all().filter(i => members || !i.members),
      h1,
      h24,
      nowSec: market.nowSec,
      tax,
      isPump: id => flags.get(id)?.kind === 'pump'
    })
      .map(row => estimateSpread(row, opts))
      .filter((c): c is SpreadCheck => c !== null)
  }, [market, h1, h24, flags, members, opts])
  const checkIds = useMemo(() => fastFirst(estimates).slice(0, CHECK_SPREADS).map(c => c.row.item.id), [estimates])
  const series = useThrottledSeries(checkIds, '1h', active)
  return useMemo(() => {
    const byId = new Map<number, PricePoint[]>()
    checkIds.forEach((id, i) => {
      const s = series[i]
      if (s) byId.set(id, s)
    })
    const requested = new Set(checkIds)
    // Rows not asked for get no history (null), rows still loading stay undefined.
    const marked = estimates.map(c => (requested.has(c.row.item.id) ? c : { ...c, history: null }))
    if (!opts) return { listed: [], slow: [], dropped: { spike: 0, thin: 0, ordinary: 0, small: 0 } }
    const lists = spreadLists(marked, id => byId.get(id), opts)
    const entry = (check: SpreadCheck): SpreadEntry => ({ ...check, dump: flags?.get(check.row.item.id)?.kind === 'dump' })
    return { listed: lists.listed.slice(0, MAX_SPREAD_ROWS).map(entry), slow: lists.slow.slice(0, MAX_SPREAD_ROWS).map(entry), dropped: lists.dropped }
  }, [estimates, checkIds, series, flags, opts])
}
