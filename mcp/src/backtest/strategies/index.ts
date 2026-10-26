// Every strategy variant the backtest knows, by key.

import { appStrategy } from './app.js'
import { findDipsStrategy, marginScanStrategy, planFlipsStrategy, topFlipsStrategy } from './mcp.js'
import type { Strategy } from './types.js'

export const DEFAULT_MAX_FILL_HOURS = 8
const FILL_HOURS = [4, 8, 12] as const
const PLAN_MIN_VOLUME = 50
const TOP_MIN_VOLUME = 1000
const HIGH_VOLUME_FLOOR = 1000
const LIQUID_FLOOR = 10_000

export function allStrategies (): Strategy[] {
  return [
    appStrategy('quick'),
    appStrategy('overnight'),
    appStrategy('dips'),
    ...FILL_HOURS.map(h => planFlipsStrategy({ maxFillHours: h, minVolume: PLAN_MIN_VOLUME })),
    planFlipsStrategy({ maxFillHours: DEFAULT_MAX_FILL_HOURS, minVolume: HIGH_VOLUME_FLOOR }),
    planFlipsStrategy({ maxFillHours: DEFAULT_MAX_FILL_HOURS, minVolume: LIQUID_FLOOR }),
    ...FILL_HOURS.map(h => topFlipsStrategy({ maxFillHours: h, minVolume: TOP_MIN_VOLUME })),
    topFlipsStrategy({ maxFillHours: DEFAULT_MAX_FILL_HOURS, minVolume: LIQUID_FLOOR }),
    findDipsStrategy(DEFAULT_MAX_FILL_HOURS),
    // Pre-fix pricing, kept so the report shows the calibration fix's effect.
    planFlipsStrategy({ maxFillHours: DEFAULT_MAX_FILL_HOURS, minVolume: PLAN_MIN_VOLUME, capSellAtRecent: false }),
    topFlipsStrategy({ maxFillHours: DEFAULT_MAX_FILL_HOURS, minVolume: TOP_MIN_VOLUME, capSellAtRecent: false }),
    marginScanStrategy(DEFAULT_MAX_FILL_HOURS)
  ]
}

export const STRATEGY_KEYS: readonly string[] = allStrategies().map(s => s.key)

/** Strategies matching a key, or every one whose key starts with the prefix (e.g. "plan_flips"). */
export function selectStrategies (keyOrPrefix: string): Strategy[] {
  const all = allStrategies()
  const exact = all.filter(s => s.key === keyOrPrefix)
  return exact.length ? exact : all.filter(s => keyOrPrefix === 'all' || s.key.startsWith(keyOrPrefix))
}
