// Portfolio simulator: one strategy, a cash stack and N GE slots, walked hour
// by hour. At each decision time the strategy sees only the MarketView at t
// (closed windows) and fills free slots; then every open offer fills against
// what the market actually traded in the following hours. Respects cash
// (buy offers reserve their cost), slots, one slot per item, 4h buy limits
// (rolling from each purchase), GE tax via the engine and a max hold.

import { BUY_LIMIT_HOURS } from '../analysis/timing/fillTime.js'
import { DEFAULT_PARTICIPATION } from './fills.js'
import { HOUR_SEC, type History } from './history.js'
import { type Market, type Position, type Rules, type Trade, closeTrade, markValue, openPosition, stepPosition } from './position.js'
import { type Pick, type Strategy, scaleQty } from './strategies/types.js'
import type { MarketView } from './view.js'

export interface SimOptions {
  readonly cash: number
  readonly slots: number
  /** Hour-aligned decision times, ascending. */
  readonly decisions: readonly number[]
  /** First hour not simulated (all windows before it must be in history). */
  readonly endT: number
  readonly rules?: Partial<Rules>
}

export const DEFAULT_RULES: Rules = Object.freeze({ participation: DEFAULT_PARTICIPATION, buyTimeoutHours: 8, maxHoldHours: 24 })

export interface EquityPoint { readonly t: number; readonly value: number }

export interface SimResult {
  readonly key: string
  readonly label: string
  readonly cash: number
  readonly slots: number
  readonly rules: Rules
  readonly startT: number
  readonly endT: number
  readonly decisions: number
  readonly trades: readonly Trade[]
  readonly equity: readonly EquityPoint[]
}

interface Purchase { readonly ts: number; readonly qty: number }
type Ledger = ReadonlyMap<number, readonly Purchase[]>

const LAST_LOW_LOOKBACK_HOURS = 24

/** The simulator's view of real trading: an item's hour, and its last instant-sell price. */
function itemMarket (history: History, id: number): Market {
  return {
    hour: ts => history.hour(ts).get(id),
    lastLow: ts => {
      for (let i = 0; i < LAST_LOW_LOOKBACK_HOURS; i++) {
        const low = history.hour(ts - i * HOUR_SEC).get(id)?.avgLowPrice
        if (low) return low
      }
      return null
    }
  }
}

function limitLeft (ledger: Ledger, id: number, limit: number, w: number): number {
  const recent = (ledger.get(id) ?? []).filter(p => p.ts > w - BUY_LIMIT_HOURS * HOUR_SEC)
  return Math.max(0, limit - recent.reduce((s, p) => s + p.qty, 0))
}

interface State {
  readonly cash: number
  readonly open: readonly Position[]
  readonly ledger: Ledger
  readonly trades: readonly Trade[]
}

function place (s: State, picks: readonly Pick[], w: number): State {
  return picks.reduce<State>((acc, pick) => {
    const qty = Math.min(pick.qty, limitLeft(acc.ledger, pick.id, pick.limit, w), Math.floor(acc.cash / pick.buyAt))
    if (qty <= 0 || acc.open.some(p => p.pick.id === pick.id)) return acc
    const sized = scaleQty(pick, qty)
    return { ...acc, cash: acc.cash - qty * pick.buyAt, open: [...acc.open, openPosition(sized, w)] }
  }, s)
}

function decide (s: State, strategy: Strategy, view: MarketView, slots: number): State {
  const free = slots - s.open.length
  if (free <= 0 || s.cash <= 0) return s
  const exclude = new Set(s.open.map(p => p.pick.id))
  const picks = strategy.decide({ view, cash: s.cash, slots: free, exclude }).filter(p => p.buyAt > 0 && p.qty > 0).slice(0, free)
  return place(s, picks, view.t)
}

function advance (s: State, w: number, history: History, rules: Rules): State {
  return s.open.reduce<State>((acc, p) => {
    const left = limitLeft(acc.ledger, p.pick.id, p.pick.limit, w)
    const r = stepPosition(p, w, itemMarket(history, p.pick.id), rules, left)
    const ledger = r.boughtNow > 0 ? new Map(acc.ledger).set(p.pick.id, [...(acc.ledger.get(p.pick.id) ?? []), { ts: w, qty: r.boughtNow }]) : acc.ledger
    return {
      cash: acc.cash + r.cash,
      open: r.position ? [...acc.open, r.position] : acc.open,
      ledger,
      trades: r.trade ? [...acc.trades, r.trade] : acc.trades
    }
  }, { ...s, open: [] })
}

const equityOf = (s: State, w: number, history: History): number =>
  s.cash + s.open.reduce((sum, p) => sum + markValue(p, w, itemMarket(history, p.pick.id)), 0)

/** Force-close anything still open at the end (marked at the instant-sell price). */
function closeOut (s: State, endT: number, history: History): State {
  const trades = s.open.map(p => {
    const value = markValue(p, endT - HOUR_SEC, itemMarket(history, p.pick.id))
    const reserved = p.phase === 'buying' ? (p.pick.qty - p.bought) * p.pick.buyAt : 0
    const held = p.bought - p.sold
    return closeTrade({ ...p, dumped: held, proceeds: p.proceeds + value - reserved }, endT, p.bought === 0 ? 'unfilled' : 'dumped')
  })
  return { ...s, cash: equityOf(s, endT - HOUR_SEC, history), open: [], trades: [...s.trades, ...trades] }
}

export function simulate (strategy: Strategy, history: History, viewAt: (t: number) => MarketView, o: SimOptions): SimResult {
  const rules: Rules = { ...DEFAULT_RULES, ...o.rules }
  const decisions = new Set(o.decisions)
  const startT = o.decisions[0] ?? o.endT
  let state: State = { cash: o.cash, open: [], ledger: new Map(), trades: [] }
  const equity: EquityPoint[] = [{ t: startT, value: o.cash }]
  for (let w = startT; w < o.endT; w += HOUR_SEC) {
    if (decisions.has(w)) state = decide(state, strategy, viewAt(w), o.slots)
    state = advance(state, w, history, rules)
    equity.push({ t: w + HOUR_SEC, value: equityOf(state, w, history) })
  }
  state = closeOut(state, o.endT, history)
  return { key: strategy.key, label: strategy.label, cash: o.cash, slots: o.slots, rules, startT, endT: o.endT, decisions: o.decisions.length, trades: state.trades, equity }
}
