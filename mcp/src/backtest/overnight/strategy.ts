// The app's Overnight list as a sleeping player would use it: the engine's
// rankOvernightFlips, thin-volume pumps removed, each pick turned into the
// app's canonical offer (mobile/src/lib/offer.ts and pickFill.ts, vendored
// unchanged under ../vendor/mobile-offer), the top rows refined with their
// last 24 hourly points as the app does (REFINE_TOP), then the cash split
// across the GE slots with planCashStack.
//
// Two knobs: the hours the offer is sized to buy and sell within (app: 8,
// PICK_HORIZON_HOURS.overnight) and the slowest sell allowed (app setting,
// default 0.5h). At the app's 8h horizon the vendored fillAwarePicks itself is
// called; other horizons repeat its loop with the horizon as a parameter
// (a test asserts both agree at 8h).

import { type BuyPick, type WikiAverage, geTax, planCashStack, rankOvernightFlips } from '@ge/engine'
import { pumpIds } from '../strategies/app.js'
import type { DecideInput, Pick, Strategy } from '../strategies/types.js'
import type { MarketView } from '../view.js'
import type { TimeseriesPoint } from '../vendor/mobile-offer/analytics/types.js'
import { dayTrades, MIN_DAY_TRADES } from '../vendor/mobile-offer/fillAware.js'
import { type OfferItem, type RealisticOffer, realisticOffer } from '../vendor/mobile-offer/offer.js'
import { type OfferPick, PICK_HORIZON_HOURS, type PickContext, fillAwarePicks, pickFromOffer } from '../vendor/mobile-offer/pickFill.js'

export interface OvernightParams {
  /** Hours each offer is sized to buy and then sell within (app: 8). */
  readonly sizingHours: number
  /** Slowest sell allowed (app setting; default 0.5h). */
  readonly maxSellHours: number
}

/** mobile/src/lib/picks.ts: rows refined first, and at most this many in all. */
export const REFINE_TOP = 10
const FIRST_REFINE = REFINE_TOP * 2
const MAX_REFINED = REFINE_TOP * 4
/** The app's series fetch feeds a 24h flow (offer.ts FLOW_HOURS). */
const SERIES_HOURS = 24

const toRecord = <T>(map: ReadonlyMap<number, T>): Record<string, T> => Object.fromEntries([...map].map(([id, v]) => [String(id), v]))

export const overnightKey = (p: OvernightParams): string => `overnight-h${p.sizingHours}-s${p.maxSellHours}`

/** The app's Overnight picks: the vendored fillAwarePicks at its 8h horizon, else the same loop at `sizingHours`. */
export function overnightPicksWith (picks: readonly BuyPick[], ctx: PickContext, p: OvernightParams): OfferPick[] {
  if (p.sizingHours === PICK_HORIZON_HOURS.overnight) return fillAwarePicks(picks, ctx, { mode: 'overnight', maxSellHours: p.maxSellHours }).picks
  return overnightOfferPicks(picks, ctx, p)
}

/** fillAwarePicks (vendored pickFill.ts) with the overnight horizon as a parameter; kept picks only. */
export function overnightOfferPicks (picks: readonly BuyPick[], ctx: PickContext, p: OvernightParams): OfferPick[] {
  const kept: OfferPick[] = []
  for (const pick of picks) {
    if (dayTrades(ctx.h24?.[pick.id]) < MIN_DAY_TRADES) continue
    const item = ctx.itemOf(pick.id)
    if (!item) continue
    const offer: RealisticOffer | null = realisticOffer({
      item,
      hour: ctx.h1?.[pick.id],
      day: ctx.h24?.[pick.id],
      series: ctx.seriesOf?.(pick.id),
      quote: { buyAt: pick.buyAt, sellAt: pick.sellAt },
      horizon: p.sizingHours,
      maxSellHours: p.maxSellHours,
      budget: ctx.budget,
      tax: ctx.tax
    })
    if (!offer || !offer.rate || offer.margin <= 0) continue
    if (offer.qty >= 1) kept.push(pickFromOffer(pick, offer))
  }
  return kept.sort((a, b) => b.potential - a.potential)
}

function contextOf (view: MarketView, budget: number, h1: Record<string, WikiAverage>, h24: Record<string, WikiAverage>): PickContext {
  const market = view.market()
  return {
    h1,
    h24,
    itemOf: (id: number): OfferItem | null => {
      const item = market.get(id)
      return item ? { id, high: item.high, low: item.low, limit: item.limit } : null
    },
    tax: geTax,
    budget
  }
}

/** The app's refine pass: the first FIRST_REFINE rows, then any unrefined row reaching the top, up to MAX_REFINED. */
function refined (ranked: readonly BuyPick[], ctx: PickContext, view: MarketView, p: OvernightParams): OfferPick[] {
  const estimate = overnightPicksWith(ranked, ctx, p)
  const ids = new Set(estimate.slice(0, FIRST_REFINE).map(x => x.id))
  const series = new Map<number, readonly TimeseriesPoint[]>()
  let lists = estimate
  for (;;) {
    for (const id of ids) if (!series.has(id)) series.set(id, view.series(id, SERIES_HOURS))
    lists = ids.size ? overnightPicksWith(ranked, { ...ctx, seriesOf: id => (series.get(id)?.length ? series.get(id) : undefined) }, p) : estimate
    const missing = lists.slice(0, REFINE_TOP).filter(x => !x.offer.refined && !ids.has(x.id)).map(x => x.id)
    if (!missing.length || ids.size >= MAX_REFINED) return lists
    for (const id of missing) if (ids.size < MAX_REFINED) ids.add(id)
  }
}

export function overnightStrategy (p: OvernightParams): Strategy {
  return {
    key: overnightKey(p),
    label: `Overnight (sized for ${p.sizingHours}h, sell <= ${p.maxSellHours}h)`,
    lookbackHours: 24,
    decide ({ view, cash, slots, exclude }: DecideInput): Pick[] {
      const pumps = pumpIds(view)
      const h1 = toRecord(view.h1)
      const h24 = toRecord(view.h24)
      const ctx = contextOf(view, cash, h1, h24)
      const ranked = rankOvernightFlips(view.market(), { h1, h24, budget: cash }).filter(x => !pumps.has(x.id) && !exclude.has(x.id))
      const plan = planCashStack(refined(ranked, ctx, view, p), { cash, slots }) as OfferPick[]
      return plan.map(x => {
        const sized = pickFromOffer(x, x.offer, x.maxQty)
        return {
          id: x.id,
          name: x.name,
          buyAt: sized.buyAt,
          sellAt: sized.sellAt,
          qty: sized.maxQty,
          limit: view.mappingById.get(x.id)?.limit ?? sized.maxQty,
          predicted: { profit: sized.potential, buyHours: sized.offer.rate?.buyHours ?? null, sellHours: sized.offer.rate?.sellHours ?? null }
        }
      })
    }
  }
}
