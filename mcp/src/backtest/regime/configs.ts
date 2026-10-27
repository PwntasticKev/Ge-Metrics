// The gate candidates tried in the regime study, by group. Each group's
// threshold is chosen per fold on the training window only; "off" is always a
// candidate (listed first, so a gate that never fired in training loses the
// tie to trading as usual).

import { type GateRule, ruleKey } from '../../analysis/regime/gates.js'

export type GateGroup = 'breadth' | 'update' | 'volatility' | 'equity'
export const GATE_GROUPS: readonly GateGroup[] = ['breadth', 'update', 'volatility', 'equity']

export interface GateConfig {
  readonly key: string
  readonly group: GateGroup | 'off' | 'combined'
  readonly rules: readonly GateRule[]
}

export const OFF: GateConfig = Object.freeze({ key: 'off', group: 'off', rules: [] })

const config = (group: GateGroup, rules: readonly GateRule[]): GateConfig =>
  Object.freeze({ key: rules.map(ruleKey).join(' + '), group, rules })

const one = (group: GateGroup) => (rule: GateRule): GateConfig => config(group, [rule])

const BREADTH: GateRule[] = [
  { kind: 'risk-off', size: 0 },
  { kind: 'risk-off', size: 0.5 },
  { kind: 'index-drop', window: '24h', below: 0.01, size: 0 },
  { kind: 'index-drop', window: '24h', below: 0.02, size: 0 },
  { kind: 'index-drop', window: '7d', below: 0.02, size: 0 },
  { kind: 'index-drop', window: '7d', below: 0.05, size: 0 }
]

const UPDATE_WINDOWS: readonly [number, number][] = [[0, 1], [0, 3], [1, 1], [1, 3], [2, 2], [3, 3], [1, 7], [3, 7]]
const UPDATE: GateRule[] = UPDATE_WINDOWS.flatMap(([beforeDays, afterDays]) => [null, 20].map((minItems): GateRule => ({ kind: 'update', beforeDays, afterDays, minItems, size: 0 })))

const VOLATILITY: GateRule[] = [
  { kind: 'volatility', above: 1.25, size: 0 },
  { kind: 'volatility', above: 1.5, size: 0 },
  { kind: 'volatility', above: 2, size: 0 },
  { kind: 'volatility', above: 3, size: 0 },
  { kind: 'volatility', above: 1.5, size: 0.5 }
]

const EQUITY: GateRule[] = [
  { kind: 'loss-streak', losses: 2, pauseHours: 24, size: 0 },
  { kind: 'loss-streak', losses: 3, pauseHours: 24, size: 0 },
  { kind: 'loss-streak', losses: 4, pauseHours: 24, size: 0 },
  { kind: 'loss-streak', losses: 3, pauseHours: 12, size: 0 },
  { kind: 'recent-pnl', hours: 24, size: 0 },
  { kind: 'recent-pnl', hours: 48, size: 0 }
]

export const GATE_CANDIDATES: Readonly<Record<GateGroup, readonly GateConfig[]>> = Object.freeze({
  breadth: BREADTH.map(one('breadth')),
  update: UPDATE.map(one('update')),
  volatility: VOLATILITY.map(one('volatility')),
  equity: EQUITY.map(one('equity'))
})

/** Several groups' choices OR'ed together (smallest size wins). */
export function combine (configs: readonly GateConfig[]): GateConfig {
  const rules = configs.flatMap(c => c.rules)
  return rules.length ? Object.freeze({ key: rules.map(ruleKey).join(' + '), group: 'combined', rules }) : OFF
}

/**
 * Fixed candidates for a live default, written down after the first three-period
 * run (so their numbers are hindsight across periods, not walk-forward): stand
 * aside around keyword-major updates (+-2 days, or 1 day before to 7 after),
 * half size when risk-off, optionally also standing aside when index volatility
 * is over 3x its median.
 */
export const PROPOSED: readonly GateConfig[] = [
  { key: 'proposed: update +-2d kw + risk-off x0.5', group: 'combined', rules: [{ kind: 'update', beforeDays: 2, afterDays: 2, minItems: null, size: 0 }, { kind: 'risk-off', size: 0.5 }] },
  { key: 'proposed: update +-2d kw + risk-off x0.5 + vol>3x', group: 'combined', rules: [{ kind: 'update', beforeDays: 2, afterDays: 2, minItems: null, size: 0 }, { kind: 'risk-off', size: 0.5 }, { kind: 'volatility', above: 3, size: 0 }] },
  { key: 'proposed: update -1d/+7d kw + risk-off x0.5', group: 'combined', rules: [{ kind: 'update', beforeDays: 1, afterDays: 7, minItems: null, size: 0 }, { kind: 'risk-off', size: 0.5 }] }
]
