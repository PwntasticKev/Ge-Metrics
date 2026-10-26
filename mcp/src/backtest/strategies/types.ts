// A strategy turns what was visible at decision time into buy orders: one item
// per free GE slot, with the profit and fill time it predicted. The simulator
// then checks those predictions against what the market actually did.

import type { MarketView } from '../view.js'

export interface Prediction {
  /** Profit after tax the strategy expects for `qty` units. */
  readonly profit: number
  /** Expected hours for the buy and the sell to fill (null when the strategy doesn't say). */
  readonly buyHours: number | null
  readonly sellHours: number | null
}

export interface Pick {
  readonly id: number
  readonly name: string
  readonly buyAt: number
  readonly sellAt: number
  readonly qty: number
  readonly limit: number
  readonly predicted: Prediction
}

export interface DecideInput {
  readonly view: MarketView
  /** Cash not tied up in open offers or held items. */
  readonly cash: number
  /** Free GE slots. */
  readonly slots: number
  /** Items already held or being bought (one slot per item). */
  readonly exclude: ReadonlySet<number>
}

export interface Strategy {
  readonly key: string
  readonly label: string
  /** Hours of hourly history before t the strategy reads (the loader fetches these). */
  readonly lookbackHours: number
  decide (input: DecideInput): readonly Pick[]
}

/** Cash-capped allocation of ranked picks: best first, one slot each. */
export function allocateInOrder (ranked: readonly Pick[], cash: number, slots: number, exclude: ReadonlySet<number>): Pick[] {
  const out: Pick[] = []
  let left = cash
  for (const p of ranked) {
    if (out.length >= slots) break
    if (exclude.has(p.id) || p.buyAt <= 0 || out.some(o => o.id === p.id)) continue
    const qty = Math.min(p.qty, Math.floor(left / p.buyAt))
    if (qty <= 0) continue
    out.push(scaleQty(p, qty))
    left -= qty * p.buyAt
  }
  return out
}

/** The same pick at a smaller quantity; predicted profit and fill hours scale with it. */
export function scaleQty (p: Pick, qty: number): Pick {
  if (qty === p.qty) return p
  const ratio = p.qty > 0 ? qty / p.qty : 0
  const hours = (h: number | null) => (h === null ? null : h * ratio)
  return {
    ...p,
    qty,
    predicted: { profit: Math.round(p.predicted.profit * ratio), buyHours: hours(p.predicted.buyHours), sellHours: hours(p.predicted.sellHours) }
  }
}
