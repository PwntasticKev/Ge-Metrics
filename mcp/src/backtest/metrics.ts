// Scores a simulated run: what the strategy predicted vs what really happened.

import { median } from '../analysis/stats.js'
import { HOUR_SEC } from './history.js'
import type { Trade } from './position.js'
import type { EquityPoint, SimResult } from './simulate.js'

/** Fills are hourly, so a cycle "on time" gets one hour of slack. */
export const ON_TIME_SLACK_HOURS = 1

export interface Summary {
  readonly key: string
  readonly label: string
  readonly decisions: number
  readonly picks: number
  /** Picks whose buy never filled at all. */
  readonly unfilledPct: number | null
  readonly expectedProfit: number
  readonly realizedProfit: number
  /** realized / expected. */
  readonly realizedRatio: number | null
  /** Units bought / units ordered. */
  readonly buyFillRate: number | null
  /** Units sold at the strategy's ask / units bought (the rest were dumped). */
  readonly sellAtAskRate: number | null
  /** Of picks that bought anything, share that lost money. */
  readonly lossPct: number | null
  /** How much the predicted margin on bought units overstated the realized one (0.3 = 30%). */
  readonly marginOverestimate: number | null
  /** Of picks with a predicted fill time, share fully bought and sold within it (+1h). */
  readonly onTimePct: number | null
  /** Median realized / predicted cycle hours, over picks that completed at the ask. */
  readonly fillTimeRatio: number | null
  readonly medianPredictedHours: number | null
  readonly medianHoldHours: number | null
  readonly gpPerHour: number
  readonly gpPerSlotHour: number
  readonly gpPerBusySlotHour: number | null
  readonly maxDrawdown: number
  readonly maxDrawdownPct: number
  readonly roiPct: number
}

const sum = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0)
const ratio = (a: number, b: number) => (b > 0 ? a / b : null)

export const predictedCycle = (t: Trade): number | null =>
  t.predicted.buyHours === null && t.predicted.sellHours === null ? null : (t.predicted.buyHours ?? 0) + (t.predicted.sellHours ?? 0)

const expectedEach = (t: Trade) => (t.ordered > 0 ? t.predicted.profit / t.ordered : 0)

export function maxDrawdown (equity: readonly EquityPoint[]): { gp: number; pct: number } {
  let peak = -Infinity
  let worst = { gp: 0, pct: 0 }
  for (const p of equity) {
    peak = Math.max(peak, p.value)
    const gp = peak - p.value
    if (gp > worst.gp) worst = { gp, pct: peak > 0 ? gp / peak : 0 }
  }
  return worst
}

function timing (trades: readonly Trade[]) {
  const withPrediction = trades.filter(t => predictedCycle(t) !== null)
  const completed = withPrediction.filter(t => t.fullyBought && t.outcome === 'sold')
  const onTime = completed.filter(t => t.holdHours <= (predictedCycle(t) as number) + ON_TIME_SLACK_HOURS)
  const ratios = completed.map(t => t.holdHours / Math.max(predictedCycle(t) as number, ON_TIME_SLACK_HOURS))
  return {
    onTimePct: ratio(onTime.length, withPrediction.length),
    fillTimeRatio: median(ratios),
    medianPredictedHours: median(withPrediction.map(t => predictedCycle(t) as number))
  }
}

export function summarize (r: SimResult): Summary {
  const { trades } = r
  const traded = trades.filter(t => t.bought > 0)
  const hours = Math.max(1, (r.endT - r.startT) / HOUR_SEC)
  const realized = sum(trades.map(t => t.profit))
  const expectedOnBought = sum(traded.map(t => expectedEach(t) * t.bought))
  const dd = maxDrawdown(r.equity)
  const busy = sum(trades.map(t => t.holdHours))
  return {
    key: r.key,
    label: r.label,
    decisions: r.decisions,
    picks: trades.length,
    unfilledPct: ratio(trades.length - traded.length, trades.length),
    expectedProfit: Math.round(sum(trades.map(t => t.predicted.profit))),
    realizedProfit: Math.round(realized),
    realizedRatio: ratio(realized, sum(trades.map(t => t.predicted.profit))),
    buyFillRate: ratio(sum(trades.map(t => t.bought)), sum(trades.map(t => t.ordered))),
    sellAtAskRate: ratio(sum(traded.map(t => t.sold)), sum(traded.map(t => t.bought))),
    lossPct: ratio(traded.filter(t => t.profit < 0).length, traded.length),
    marginOverestimate: expectedOnBought > 0 ? 1 - sum(traded.map(t => t.profit)) / expectedOnBought : null,
    ...timing(trades),
    medianHoldHours: median(traded.map(t => t.holdHours)),
    gpPerHour: Math.round(realized / hours),
    gpPerSlotHour: Math.round(realized / hours / r.slots),
    gpPerBusySlotHour: busy > 0 ? Math.round(realized / busy) : null,
    maxDrawdown: Math.round(dd.gp),
    maxDrawdownPct: dd.pct,
    roiPct: realized / r.cash
  }
}
