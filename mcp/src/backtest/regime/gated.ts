// A strategy behind a regime gate: at each decision it opens nothing (size 0),
// or decides with only `size` of its free cash. Sizes are precomputed per
// decision time from signals that only read closed data, so the wrapper adds
// no lookahead. Open positions are never touched: the gate only stops new buys.

import { type RegimeSignals, decideRegime } from '../../analysis/regime/gates.js'
import type { ClosedTrade } from '../../analysis/regime/gates.js'
import type { Strategy } from '../strategies/types.js'
import type { GateConfig } from './configs.js'

export function gatedStrategy (base: Strategy, gateKey: string, sizes: ReadonlyMap<number, number>): Strategy {
  return {
    key: `${base.key} | gate ${gateKey}`,
    label: `${base.label} (gate: ${gateKey})`,
    lookbackHours: base.lookbackHours,
    decide: input => {
      const size = sizes.get(input.view.t) ?? 1
      if (size <= 0) return []
      return base.decide(size < 1 ? { ...input, cash: Math.floor(input.cash * size) } : input)
    }
  }
}

/** The gate's size at every decision time (1 = trade, 0 = stand aside). */
export function gateSizes (config: GateConfig, signals: ReadonlyMap<number, RegimeSignals>, trades: readonly ClosedTrade[]): Map<number, number> {
  return new Map([...signals].map(([t, s]) => [t, config.rules.length ? decideRegime(config.rules, { ...s, trades }).size : 1]))
}
