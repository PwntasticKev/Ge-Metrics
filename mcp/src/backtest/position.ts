// One GE slot's life: a buy offer that fills against real hourly flow, then a
// sell offer at the strategy's ask, and a dump at the instant-sell price if it
// is still holding at max hold. Each step returns a new position (never
// mutates) plus the cash it released. Fills are hourly; a fill inside an hour
// is dated to the middle of that hour.

import { geTax } from '@ge/engine'
import type { AveragePrice } from '../wiki/types.js'
import { buyCapacity, sellCapacity } from './fills.js'
import { HOUR_SEC } from './history.js'
import type { Pick } from './strategies/types.js'

export type Outcome = 'unfilled' | 'sold' | 'dumped'

export interface Position {
  readonly pick: Pick
  readonly placedAt: number
  readonly phase: 'buying' | 'selling'
  readonly bought: number
  readonly cost: number
  readonly sold: number
  readonly dumped: number
  readonly proceeds: number
  /** Fractional fill capacity carried between hours. */
  readonly credit: number
  readonly buyDoneAt: number | null
  readonly fullyBought: boolean
}

export interface Trade {
  readonly id: number
  readonly name: string
  readonly placedAt: number
  readonly closedAt: number
  readonly buyAt: number
  readonly sellAt: number
  readonly ordered: number
  readonly bought: number
  readonly sold: number
  readonly dumped: number
  readonly cost: number
  readonly proceeds: number
  readonly profit: number
  readonly predicted: Pick['predicted']
  /** Hours until the buy completed (null unless it fully filled). */
  readonly buyHours: number | null
  readonly holdHours: number
  readonly fullyBought: boolean
  readonly outcome: Outcome
}

export interface Rules {
  readonly participation: number
  readonly buyTimeoutHours: number
  readonly maxHoldHours: number
}

export interface Market {
  /** The hour starting at `ts` as it actually traded. */
  hour (ts: number): AveragePrice | undefined
  /** Most recent instant-sell price at or before the hour ending ts + 1h. */
  lastLow (ts: number): number | null
}

export interface StepResult {
  readonly position: Position | null
  readonly cash: number
  /** Units bought this hour (counts against the 4h buy limit). */
  readonly boughtNow: number
  readonly trade: Trade | null
}

const MID = HOUR_SEC / 2
const net = (price: number, id: number) => price - geTax(price, id)

export const openPosition = (pick: Pick, placedAt: number): Position => ({
  pick, placedAt, phase: 'buying', bought: 0, cost: 0, sold: 0, dumped: 0, proceeds: 0, credit: 0, buyDoneAt: null, fullyBought: false
})

export function closeTrade (p: Position, closedAt: number, outcome: Outcome): Trade {
  return {
    id: p.pick.id,
    name: p.pick.name,
    placedAt: p.placedAt,
    closedAt,
    buyAt: p.pick.buyAt,
    sellAt: p.pick.sellAt,
    ordered: p.pick.qty,
    bought: p.bought,
    sold: p.sold,
    dumped: p.dumped,
    cost: p.cost,
    proceeds: p.proceeds,
    profit: p.proceeds - p.cost,
    predicted: p.pick.predicted,
    buyHours: p.fullyBought && p.buyDoneAt !== null ? (p.buyDoneAt - p.placedAt) / HOUR_SEC : null,
    holdHours: (closedAt - p.placedAt) / HOUR_SEC,
    fullyBought: p.fullyBought,
    outcome
  }
}

function stepBuy (p: Position, w: number, m: Market, rules: Rules, limitLeft: number): StepResult {
  const { pick } = p
  const credit = p.credit + buyCapacity(m.hour(w), pick.buyAt, rules.participation)
  const take = Math.max(0, Math.min(pick.qty - p.bought, Math.floor(credit), limitLeft))
  const next: Position = { ...p, bought: p.bought + take, cost: p.cost + take * pick.buyAt, credit: Math.min(credit - take, 1) }
  if (next.bought >= pick.qty) {
    return { position: { ...next, phase: 'selling', credit: 0, buyDoneAt: w + MID, fullyBought: true }, cash: 0, boughtNow: take, trade: null }
  }
  if (w + HOUR_SEC - p.placedAt < rules.buyTimeoutHours * HOUR_SEC) return { position: next, cash: 0, boughtNow: take, trade: null }
  // Buy timed out: cancel the rest (its reserved cash comes back) and sell what we have.
  const refund = (pick.qty - next.bought) * pick.buyAt
  if (next.bought === 0) return { position: null, cash: refund, boughtNow: take, trade: closeTrade(next, w + HOUR_SEC, 'unfilled') }
  return { position: { ...next, phase: 'selling', credit: 0, buyDoneAt: w + HOUR_SEC }, cash: refund, boughtNow: take, trade: null }
}

function stepSell (p: Position, w: number, m: Market, rules: Rules): StepResult {
  const { pick } = p
  const a = m.hour(w)
  const credit = p.credit + sellCapacity(a, pick.sellAt, rules.participation)
  const take = Math.max(0, Math.min(p.bought - p.sold, Math.floor(credit)))
  const gained = take * net(pick.sellAt, pick.id)
  const next: Position = { ...p, sold: p.sold + take, proceeds: p.proceeds + gained, credit: Math.min(credit - take, 1) }
  if (next.sold >= next.bought) return { position: null, cash: gained, boughtNow: 0, trade: closeTrade(next, w + MID, 'sold') }
  if (w + HOUR_SEC - p.placedAt < rules.maxHoldHours * HOUR_SEC) return { position: next, cash: gained, boughtNow: 0, trade: null }
  // Max hold reached: dump the rest at the instant-sell price.
  const rest = next.bought - next.sold
  const dumpPrice = a?.avgLowPrice ?? m.lastLow(w) ?? pick.buyAt
  const dumpCash = rest * net(dumpPrice, pick.id)
  const dumped: Position = { ...next, dumped: rest, proceeds: next.proceeds + dumpCash }
  return { position: null, cash: gained + dumpCash, boughtNow: 0, trade: closeTrade(dumped, w + HOUR_SEC, 'dumped') }
}

/** Advance one position through the hour starting at w (the sell starts the hour after the buy completes). */
export function stepPosition (p: Position, w: number, m: Market, rules: Rules, limitLeft: number): StepResult {
  if (p.phase === 'buying') return stepBuy(p, w, m, rules, limitLeft)
  if (p.buyDoneAt !== null && w < p.buyDoneAt) return { position: p, cash: 0, boughtNow: 0, trade: null }
  return stepSell(p, w, m, rules)
}

/** What the position is worth if dumped now (instant-sell after tax), plus cash still reserved for its buy. */
export function markValue (p: Position, w: number, m: Market): number {
  const held = p.bought - p.sold
  const low = m.lastLow(w) ?? p.pick.buyAt
  const reserved = p.phase === 'buying' ? (p.pick.qty - p.bought) * p.pick.buyAt : 0
  return held * net(low, p.pick.id) + reserved
}
