// Parameter grids for the walk-forward: one family per strategy a user can
// run, each with the knobs that were tuned in-sample and its shipped default.

import { TOP_MAX_FILL_HOURS, TOP_MIN_VOLUME } from '../../tools/opportunities.js'
import { PLAN_MAX_FILL_HOURS, PLAN_MIN_VOLUME } from '../../tools/plan.js'
import type { AppMode } from '../strategies/app.js'
import { APP_DEFAULTS, type AppFillParams, appFillStrategy } from '../strategies/appFill.js'
import { type PlanVariant, planFlipsStrategy, topFlipsStrategy } from '../strategies/mcp.js'
import type { Strategy } from '../strategies/types.js'

/** One grid point: the strategy plus its parameters for reporting. */
export interface Variant {
  readonly strategy: Strategy
  readonly params: Readonly<Record<string, number | boolean>>
}

export interface Family {
  readonly name: string
  readonly variants: readonly Variant[]
  /** Key of the variant matching what ships today. */
  readonly defaultKey: string
}

// MCP defaults as shipped (tools/plan.ts, tools/opportunities.ts). The
// 2026-10-26 report was run before this PR changed them, so its "shipped
// default" rows are the old 8h / 10k (plan_flips) and 8h / 1k (top_flips).
export const MCP_DEFAULTS = Object.freeze({
  plan_flips: { maxFillHours: PLAN_MAX_FILL_HOURS, minVolume: PLAN_MIN_VOLUME, capSellAtRecent: true },
  top_flips: { maxFillHours: TOP_MAX_FILL_HOURS, minVolume: TOP_MIN_VOLUME, capSellAtRecent: true }
})

export interface GridSpec {
  readonly fillHours: readonly number[]
  readonly minVolumes: readonly number[]
  readonly askCap: readonly boolean[]
  readonly appHorizons: Readonly<Record<AppMode, readonly number[]>>
  readonly appMaxSell: readonly number[]
  readonly appFloors: readonly number[]
}

export const FULL_GRID: GridSpec = Object.freeze({
  fillHours: [2, 4, 8, 12],
  minVolumes: [1_000, 5_000, 10_000, 25_000, 50_000],
  askCap: [true, false],
  appHorizons: { quick: [2, 4, 8], dips: [2, 4, 8], overnight: [4, 8, 12] },
  appMaxSell: [0.5, 1, 2, 4],
  appFloors: [2_000, 5_000, 10_000, 25_000, 50_000]
})

const cross = <A, B>(as: readonly A[], bs: readonly B[]): [A, B][] => as.flatMap(a => bs.map(b => [a, b] as [A, B]))

function mcpFamily (name: 'plan_flips' | 'top_flips', g: GridSpec): Family {
  const make = name === 'plan_flips' ? planFlipsStrategy : topFlipsStrategy
  const variants = cross(cross(g.fillHours, g.minVolumes), g.askCap).map(([[maxFillHours, minVolume], cap]): Variant => {
    const v: PlanVariant = { maxFillHours, minVolume, capSellAtRecent: cap }
    return { strategy: make(v), params: { max_fill_hours: maxFillHours, min_volume: minVolume, ask_cap: cap } }
  })
  const d = MCP_DEFAULTS[name]
  return { name, variants, defaultKey: make(d).key }
}

function appFamily (mode: AppMode, g: GridSpec): Family {
  const variants = cross(cross(g.appHorizons[mode], g.appMaxSell), g.appFloors).map(([[horizonHours, maxSellHours], minDayTrades]): Variant => {
    const p: AppFillParams = { mode, horizonHours, maxSellHours, minDayTrades }
    return { strategy: appFillStrategy(p), params: { horizon_hours: horizonHours, max_sell_hours: maxSellHours, min_day_trades: minDayTrades } }
  })
  return { name: `app ${mode}`, variants, defaultKey: appFillStrategy(APP_DEFAULTS[mode]).key }
}

export function families (g: GridSpec = FULL_GRID): Family[] {
  const all = [mcpFamily('plan_flips', g), mcpFamily('top_flips', g), appFamily('quick', g), appFamily('overnight', g), appFamily('dips', g)]
  for (const f of all) {
    if (!f.variants.some(v => v.strategy.key === f.defaultKey)) throw new Error(`grid for ${f.name} must include its shipped default ${f.defaultKey}`)
  }
  return all
}
