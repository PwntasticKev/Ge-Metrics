import { useMemo } from 'react'
import { F2P_SLOTS, geTax, MEMBERS_SLOTS, planCashStack, rankDips, rankOvernightFlips, rankQuickFlips, type BuyPick, type Market, type WikiAverage } from '@ge/engine'
import { useThrottledSeries } from '../api/useScanner'
import { spikeInput, useFiveMinuteAverages } from '../api/useThinSpikes'
import { useSettings } from '../state/settings'
import type { TimeseriesPoint } from './analytics/types'
import { fillAwarePicks, pickFromOffer, type OfferPick, type PickContext, type PickLists } from './pickFill'
import { assessThinSpike } from './thinSpikes'

export type PickMode = 'quick' | 'overnight' | 'dips' | 'plan'

const MAX_PICKS = 100
/**
 * Rows refined with their 1h history (one request each, under the scanner's
 * throttle). Enough for the first screen, so the rows a trader sees match
 * the item sheet; rows further down stay estimates.
 */
export const REFINE_TOP = 10

type Averages = Record<string, WikiAverage> | undefined

function rankFor (mode: PickMode, market: Market, h1: Record<string, WikiAverage>, h24: Record<string, WikiAverage>, budget: number | null): BuyPick[] {
  const rank = mode === 'overnight' ? rankOvernightFlips : mode === 'dips' ? rankDips : rankQuickFlips
  return rank(market, { h1, h24, budget })
}

function contextOf (market: Market, h1: Averages, h24: Averages, budget: number | null): PickContext {
  return {
    h1,
    h24,
    itemOf: id => {
      const item = market.get(id)
      return item ? { id, high: item.high, low: item.low, limit: item.limit } : null
    },
    tax: geTax,
    budget
  }
}

/** The cash plan over the fill-sized picks; each planned row's offer is resized to its share. */
function planOf (picks: readonly OfferPick[], budget: number | null, members: boolean): OfferPick[] {
  if (!budget) return []
  const plan = planCashStack(picks, { cash: budget, slots: members ? MEMBERS_SLOTS : F2P_SLOTS }) as OfferPick[]
  return plan.map(p => pickFromOffer(p, p.offer, p.maxQty))
}

/** Ids worth a history request: the top of the list (and the plan's rows). */
function refineIds (lists: PickLists, mode: PickMode, budget: number | null, members: boolean): number[] {
  const top = lists.picks.slice(0, REFINE_TOP).map(p => p.id)
  if (mode !== 'plan') return top
  return [...new Set([...planOf(lists.picks, budget, members).map(p => p.id), ...top])]
}

/**
 * Picks for one Buy now list, as canonical offers (lib/offer) sized to what
 * fills within the list's horizon, plus the ones too slow to fill. The first
 * pass is bulk-only; the top REFINE_TOP rows are then refined with their 1h
 * history (shared with the sheet's chart, so opening a row costs nothing)
 * and update in place. The cash plan splits cash across the same offers.
 */
export function usePickLists (market: Market | null, h1: Averages, h24: Averages, mode: PickMode): PickLists | null {
  const { settings } = useSettings()
  const m5 = useFiveMinuteAverages()
  const { budget, membersItems, maxSellHours } = settings

  const ranked = useMemo(() => {
    if (!market || !h1 || !h24) return null
    return rankFor(mode, market, h1, h24, budget)
      .filter(p => membersItems || !p.members)
      // A jump on thin volume is likely a pump; don't send buyers into it.
      .filter(p => assessThinSpike(spikeInput(p.id, h1, h24, m5))?.kind !== 'pump')
  }, [market, h1, h24, m5, mode, budget, membersItems])

  const ctx = useMemo(() => (market ? contextOf(market, h1, h24, budget) : null), [market, h1, h24, budget])
  const estimate = useMemo(() => (ranked && ctx ? fillAwarePicks(ranked, ctx, { mode, maxSellHours }) : null), [ranked, ctx, mode, maxSellHours])
  const ids = useMemo(() => (estimate ? refineIds(estimate, mode, budget, membersItems) : []), [estimate, mode, budget, membersItems])
  const series = useThrottledSeries(ids, '1h', ids.length > 0)

  return useMemo(() => {
    if (!ranked || !ctx || !estimate) return null
    const byId = new Map<number, readonly TimeseriesPoint[]>()
    ids.forEach((id, i) => { const s = series[i]; if (s?.length) byId.set(id, s) })
    const lists = byId.size ? fillAwarePicks(ranked, { ...ctx, seriesOf: id => byId.get(id) }, { mode, maxSellHours }) : estimate
    if (mode !== 'plan') return { picks: lists.picks.slice(0, MAX_PICKS), slow: lists.slow.slice(0, MAX_PICKS) }
    return { picks: planOf(lists.picks, budget, membersItems), slow: [] }
  }, [ranked, ctx, estimate, ids, series, mode, maxSellHours, budget, membersItems])
}

export function usePicks (market: Market | null, h1: Averages, h24: Averages, mode: PickMode): OfferPick[] | null {
  return usePickLists(market, h1, h24, mode)?.picks ?? null
}

export function planTotals (plan: readonly BuyPick[]): { cost: number; profit: number } {
  return plan.reduce((t, p) => ({ cost: t.cost + p.cost, profit: t.profit + p.potential }), { cost: 0, profit: 0 })
}
