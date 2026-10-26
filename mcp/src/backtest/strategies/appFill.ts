// The app's fill-aware Buy now lists (PR #26, now on master),
// replayed with the app's own code: the engine rankers, thin-pump filter and
// planCashStack as in app.ts, plus mobile/src/lib/pickFill.ts, fillAware.ts
// and analytics/fillTime.ts vendored unchanged under ../vendor/mobile-fill.
//
// For the walk-forward grid, the three knobs PR #26 tuned in-sample are
// parameters here: the horizon each list must buy and sell within (4h quick
// and dips, 8h overnight), the slowest sell to show (setting, default 1h) and
// the 10K/day volume floor. The horizon and sell limit are arguments of the
// app's fillAwarePicks; the floor is a module constant there, so
// fillAwarePicksWith repeats its loop with the floor as a parameter (same
// vendored helpers). A test asserts both agree at the app's defaults, and at
// the defaults the vendored function itself is called.

import { type BuyPick, type WikiAverage, planCashStack, rankDips, rankOvernightFlips, rankQuickFlips } from '@ge/engine'
import { flowFromAverages, slotRate } from '../vendor/mobile-fill/analytics/fillTime.js'
import { DEFAULT_MAX_SELL_HOURS, MIN_DAY_TRADES, dayTrades, fillableQty } from '../vendor/mobile-fill/fillAware.js'
import { PICK_HORIZON_HOURS, fillAwarePicks } from '../vendor/mobile-fill/pickFill.js'
import { pickRates } from '../vendor/mobile-fill/pickTiming.js'
import { type AppMode, pumpIds } from './app.js'
import type { DecideInput, Pick, Strategy } from './types.js'

const RANKERS = { quick: rankQuickFlips, overnight: rankOvernightFlips, dips: rankDips } as const

export interface AppFillParams {
  readonly mode: AppMode
  /** Hours to buy and then sell (app: 4 quick and dips, 8 overnight). */
  readonly horizonHours: number
  /** Slowest sell to show (app setting, default 1h). */
  readonly maxSellHours: number
  /** Items trading fewer than this a day (both sides) are left out (app: 10K). */
  readonly minDayTrades: number
}

export const APP_DEFAULTS: Readonly<Record<AppMode, AppFillParams>> = Object.freeze({
  quick: { mode: 'quick', horizonHours: PICK_HORIZON_HOURS.quick, maxSellHours: DEFAULT_MAX_SELL_HOURS, minDayTrades: MIN_DAY_TRADES },
  overnight: { mode: 'overnight', horizonHours: PICK_HORIZON_HOURS.overnight, maxSellHours: DEFAULT_MAX_SELL_HOURS, minDayTrades: MIN_DAY_TRADES },
  dips: { mode: 'dips', horizonHours: PICK_HORIZON_HOURS.dips, maxSellHours: DEFAULT_MAX_SELL_HOURS, minDayTrades: MIN_DAY_TRADES }
})

type Averages = Record<string, WikiAverage>

const isAppDefault = (p: AppFillParams): boolean => {
  const d = APP_DEFAULTS[p.mode]
  return p.horizonHours === d.horizonHours && p.maxSellHours === d.maxSellHours && p.minDayTrades === d.minDayTrades
}

const resize = (pick: BuyPick, qty: number): BuyPick =>
  Object.freeze({ ...pick, maxQty: qty, potential: pick.profit * qty, cost: pick.buyAt * qty })

/** fillAwarePicks (vendored pickFill.ts) with the volume floor as a parameter; kept picks only. */
export function fillAwarePicksWith (picks: readonly BuyPick[], h1: Averages, h24: Averages, p: Omit<AppFillParams, 'mode'>): BuyPick[] {
  const kept: BuyPick[] = []
  for (const pick of picks) {
    if (dayTrades(h24[pick.id]) < p.minDayTrades) continue
    const flow = flowFromAverages(h1[pick.id], h24[pick.id])
    if (!flow) continue
    const rate = slotRate(flow, { buyAt: pick.buyAt, sellAt: pick.sellAt, profitEach: pick.profit, qty: pick.maxQty, limit: null })
    const qty = fillableQty(rate, p.horizonHours, Math.min(p.horizonHours, p.maxSellHours))
    if (qty >= 1) kept.push(qty < pick.maxQty ? resize(pick, qty) : pick)
  }
  return kept.sort((a, b) => b.potential - a.potential)
}

const toRecord = <T>(map: ReadonlyMap<number, T>): Record<string, T> => Object.fromEntries([...map].map(([id, v]) => [String(id), v]))

export const appFillKey = (p: AppFillParams): string => `app-${p.mode}-fill-h${p.horizonHours}-s${p.maxSellHours}-v${p.minDayTrades}`

export function appFillStrategy (p: AppFillParams): Strategy {
  return {
    key: appFillKey(p),
    label: `App Buy now: ${p.mode}, fill-aware (horizon ${p.horizonHours}h, sell <= ${p.maxSellHours}h, ${p.minDayTrades}/day)`,
    lookbackHours: 24,
    decide ({ view, cash, slots, exclude }: DecideInput): Pick[] {
      const pumps = pumpIds(view)
      const h1 = toRecord(view.h1)
      const h24 = toRecord(view.h24)
      const ranked = RANKERS[p.mode](view.market(), { h1, h24, budget: cash }).filter(x => !pumps.has(x.id) && !exclude.has(x.id))
      const kept = isAppDefault(p)
        ? fillAwarePicks(ranked, h1, h24, { horizon: p.horizonHours, maxSellHours: p.maxSellHours }).picks
        : fillAwarePicksWith(ranked, h1, h24, p)
      const plan: BuyPick[] = planCashStack(kept, { cash, slots })
      const rates = pickRates(plan, h1, h24)
      return plan.map(x => ({
        id: x.id,
        name: x.name,
        buyAt: x.buyAt,
        sellAt: x.sellAt,
        qty: x.maxQty,
        limit: view.mappingById.get(x.id)?.limit ?? x.maxQty,
        predicted: { profit: x.potential, buyHours: rates.get(x.id)?.buyHours ?? null, sellHours: rates.get(x.id)?.sellHours ?? null }
      }))
    }
  }
}
