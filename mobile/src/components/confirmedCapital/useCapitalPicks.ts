// Screen-local adapter of usePickLists: same engine and refinement, with explicit funding bounds.
// Kept here because the shared hook has no budget/slot override; other modes retain that hook.
import { useEffect, useMemo, useState } from 'react'
import { geTax, planCashStack, rankQuickFlips, type BuyPick, type Market, type WikiAverage } from '@ge/engine'
import { useThrottledSeries } from '../../api/useScanner'
import { spikeInput, useFiveMinuteAverages } from '../../api/useThinSpikes'
import { useSettings } from '../../state/settings'
import type { TimeseriesPoint } from '../../lib/analytics/types'
import { fillAwarePicks, pickFromOffer, type OfferPick, type PickContext, type PickLists } from '../../lib/pickFill'
import { assessThinSpike } from '../../lib/thinSpikes'

const MODE = 'plan' as const
/**
 * Rows refined with their 1h history (one request each, under the scanner's
 * throttle). Enough for the first screen, so the rows a trader sees match
 * the item sheet; rows further down stay estimates.
 */
const REFINE_TOP = 10
/**
 * Refining drops rows whose margin was a bulk-average artefact, so ask for a
 * spare batch up front, then follow new arrivals at the top, up to this many
 * requests in all.
 */
const FIRST_REFINE = REFINE_TOP * 2
const MAX_REFINED = REFINE_TOP * 4

type Averages = Record<string, WikiAverage> | undefined

function rankFor ( market: Market, h1: Record<string, WikiAverage>, h24: Record<string, WikiAverage>, budget: number | null): BuyPick[] {
  return rankQuickFlips(market, { h1, h24, budget })
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
function planOf (picks: readonly OfferPick[], budget: number | null, slots: number): OfferPick[] {
  if (!budget || slots <= 0) return []
  const plan = planCashStack(picks, { cash: budget, slots }) as OfferPick[]
  return plan.map(p => pickFromOffer(p, p.offer, p.maxQty))
}

/** Ids worth a history request: the top of the list (and the plan's rows). */
function refineIds (lists: PickLists, budget: number | null, slots: number): number[] {
  const top = lists.picks.slice(0, FIRST_REFINE).map(p => p.id)
  return [...new Set([...planOf(lists.picks, budget, slots).map(p => p.id), ...top])]
}

/**
 * Picks for one Buy now list, as canonical offers (lib/offer) sized to what
 * fills within the list's horizon, plus the ones too slow to fill. The first
 * pass is bulk-only; the top REFINE_TOP rows are then refined with their 1h
 * history (shared with the sheet's chart, so opening a row costs nothing)
 * and update in place. The cash plan splits cash across the same offers.
 */
export function useCapitalPicks (market: Market | null, h1: Averages, h24: Averages, budget: number | null, slots: number): PickLists | null {
  const { settings } = useSettings()
  const m5 = useFiveMinuteAverages()
  const { membersItems, maxSellHours } = settings

  const ranked = useMemo(() => {
    if (!market || !h1 || !h24) return null
    return rankFor(market, h1, h24, budget)
      .filter(p => membersItems || !p.members)
      // A jump on thin volume is likely a pump; don't send buyers into it.
      .filter(p => assessThinSpike(spikeInput(p.id, h1, h24, m5))?.kind !== 'pump')
  }, [market, h1, h24, m5, budget, membersItems])

  const ctx = useMemo(() => (market ? contextOf(market, h1, h24, budget) : null), [market, h1, h24, budget])
  const estimate = useMemo(() => (ranked && ctx ? fillAwarePicks(ranked, ctx, { mode: MODE, maxSellHours }) : null), [ranked, ctx, maxSellHours])
  // Rows that moved into the top after others were refined; reset with each new estimate.
  const [followed, setFollowed] = useState<{ from: PickLists | null; ids: readonly number[] }>({ from: null, ids: [] })
  const ids = useMemo(() => {
    const first = estimate && budget && slots > 0 ? refineIds(estimate, budget, slots) : []
    const extra = followed.from === estimate ? followed.ids : []
    return [...new Set([...first, ...extra])].slice(0, MAX_REFINED)
  }, [estimate, budget, slots, followed])
  const series = useThrottledSeries(ids, '1h', ids.length > 0)

  const lists = useMemo(() => {
    if (!ranked || !ctx || !estimate) return null
    const byId = new Map<number, readonly TimeseriesPoint[]>()
    ids.forEach((id, i) => { const s = series[i]; if (s?.length) byId.set(id, s) })
    const lists = byId.size ? fillAwarePicks(ranked, { ...ctx, seriesOf: id => byId.get(id) }, { mode: MODE, maxSellHours }) : estimate
    return { picks: planOf(lists.picks, budget, slots), slow: [] }
  }, [ranked, ctx, estimate, ids, series, maxSellHours, budget, slots])

  // Keep what the trader sees refined: request history for top rows still on estimates.
  useEffect(() => {
    if (!lists || !estimate) return
    const asked = new Set(ids)
    const missing = lists.picks.slice(0, REFINE_TOP).filter(p => !p.offer.refined && !asked.has(p.id)).map(p => p.id)
    if (!missing.length || ids.length >= MAX_REFINED) return
    // Derived from loaded data, bounded by MAX_REFINED, so it settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFollowed(prev => ({ from: estimate, ids: [...(prev.from === estimate ? prev.ids : []), ...missing] }))
  }, [lists, estimate, ids])

  return lists
}
