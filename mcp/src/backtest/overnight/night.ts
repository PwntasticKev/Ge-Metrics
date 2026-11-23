// Place-once overnight: how a player who sets offers and goes to sleep
// trades. At a fixed evening hour T the strategy sees the market (closed
// windows only) and fills the GE slots from a fresh cash stack, once. No
// re-decisions: a slot that finishes in the night stays empty. Offers fill
// against real hourly flow (position.ts / fills.ts, the same fill model as the
// 4h simulator) for `hours`; then unfilled buys are cancelled (cash back) and
// anything bought but unsold is marked at the morning instant-sell price (the
// last hour's average low before waking) minus tax.
//
// Unlike simulate.ts's place(), an order may ask for more than one buy limit:
// the GE accepts it, reserves all the cash, and fills at most one limit per
// rolling 4h (enforced each hour from the purchase ledger), which is what
// overnight sizing (2-3 limits) relies on.

import { HOUR_SEC, type History } from '../history.js'
import { type Position, type Rules, type Trade, closeTrade, markValue, openPosition, stepPosition } from '../position.js'
import { DEFAULT_RULES, type Ledger, itemMarket, limitLeft } from '../simulate.js'
import { type Pick, scaleQty } from '../strategies/types.js'

export interface NightOptions {
  readonly t: number
  readonly hours: number
  readonly cash: number
  readonly participation?: number
}

export interface NightResult {
  readonly t: number
  readonly cash: number
  /** Cash put into buy offers at T. */
  readonly placed: number
  /** Profit the strategy predicted for what it placed. */
  readonly expected: number
  /** Realized after tax, incl. leftovers marked in the morning. */
  readonly profit: number
  readonly ordered: number
  readonly bought: number
  readonly soldAtAsk: number
  /** Units still held at wake-up (marked at the instant-sell price). */
  readonly leftover: number
  readonly trades: readonly Trade[]
}

/** Orders as placed: one slot per item, as many as the cash covers, in pick order. */
export function placeOrders (picks: readonly Pick[], cash: number): Pick[] {
  const out: Pick[] = []
  let left = cash
  for (const p of picks) {
    if (p.buyAt <= 0 || out.some(o => o.id === p.id)) continue
    const qty = Math.min(p.qty, Math.floor(left / p.buyAt))
    if (qty <= 0) continue
    out.push(scaleQty(p, qty))
    left -= qty * p.buyAt
  }
  return out
}

export function simulateNight (picks: readonly Pick[], history: History, o: NightOptions): NightResult {
  const rules: Rules = { ...DEFAULT_RULES, participation: o.participation ?? DEFAULT_RULES.participation, buyTimeoutHours: o.hours, maxHoldHours: Infinity }
  const orders = placeOrders(picks, o.cash)
  const placed = orders.reduce((s, p) => s + p.qty * p.buyAt, 0)
  const end = o.t + o.hours * HOUR_SEC
  let open: readonly Position[] = orders.map(p => openPosition(p, o.t))
  let ledger: Ledger = new Map()
  let trades: readonly Trade[] = []
  for (let w = o.t; w < end; w += HOUR_SEC) {
    const next: Position[] = []
    for (const p of open) {
      const r = stepPosition(p, w, itemMarket(history, p.pick.id), rules, limitLeft(ledger, p.pick.id, p.pick.limit, w))
      if (r.boughtNow > 0) ledger = new Map(ledger).set(p.pick.id, [...(ledger.get(p.pick.id) ?? []), { ts: w, qty: r.boughtNow }])
      if (r.position) next.push(r.position)
      if (r.trade) trades = [...trades, r.trade]
    }
    open = next
  }
  // Wake-up: cancel what's left of any buy, mark what's still held.
  const closed = open.map(p => {
    const value = markValue(p, end - HOUR_SEC, itemMarket(history, p.pick.id))
    const reserved = p.phase === 'buying' ? (p.pick.qty - p.bought) * p.pick.buyAt : 0
    return closeTrade({ ...p, dumped: p.bought - p.sold, proceeds: p.proceeds + value - reserved }, end, p.bought === 0 ? 'unfilled' : 'dumped')
  })
  const all = [...trades, ...closed]
  return {
    t: o.t,
    cash: o.cash,
    placed,
    expected: orders.reduce((s, p) => s + p.predicted.profit, 0),
    profit: all.reduce((s, tr) => s + tr.profit, 0),
    ordered: all.reduce((s, tr) => s + tr.ordered, 0),
    bought: all.reduce((s, tr) => s + tr.bought, 0),
    soldAtAsk: all.reduce((s, tr) => s + tr.sold, 0),
    leftover: all.reduce((s, tr) => s + tr.dumped, 0),
    trades: all
  }
}
