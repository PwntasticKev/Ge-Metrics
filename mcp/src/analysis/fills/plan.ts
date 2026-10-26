// plan_flips: split a cash stack across GE slots for the most profit that
// should actually fill within max_fill_hours. Every slot runs in parallel over
// that horizon, so the most total profit inside it is also the most GP/hour.
//
// Each candidate's quantity is capped by its buy limit (one cycle per slot),
// by what fills within the horizon at its realistic prices, and by the cash
// left. Greedy with one-step lookahead: each slot takes the pick that, plus a
// greedy fill of the remaining slots, makes the most in total.

import { buyFillRate, sellFillRate } from '../timing/fillTime.js'
import { round } from '../format.js'
import type { Candidate } from './candidates.js'
import { ASSUMED_BUY_LIMIT, type FillMetrics, fillMetrics, qtyWithinHours } from './metrics.js'

export interface PlanOptions {
  readonly cash: number
  readonly slots: number
  readonly maxFillHours: number
}

interface Sized {
  readonly c: Candidate
  /** Most units: buy limit and what fills within the horizon. */
  readonly cap: number
}

export interface PlannedSlot {
  readonly candidate: Candidate
  readonly qty: number
  readonly cost: number
  readonly metrics: FillMetrics
}

const limitOf = (c: Candidate) => c.entry.limit ?? ASSUMED_BUY_LIMIT

function sized (c: Candidate, maxFillHours: number): Sized {
  const within = qtyWithinHours(buyFillRate(c.flow, c.buyAt), sellFillRate(c.flow, c.sellAt), maxFillHours)
  return { c, cap: Math.min(limitOf(c), within) }
}

const qtyFor = (s: Sized, cash: number) => Math.max(0, Math.min(s.cap, Math.floor(cash / s.c.buyAt)))
const valueOf = (s: Sized, cash: number) => s.c.profitEach * qtyFor(s, cash)

function best (pool: readonly Sized[], cash: number): Sized | null {
  return pool.reduce<Sized | null>((top, s) => (valueOf(s, cash) > (top ? valueOf(top, cash) : 0) ? s : top), null)
}

/** Profit from filling `slots` greedily: the most valuable affordable pick each time. */
function greedyTotal (pool: readonly Sized[], cash: number, slots: number): number {
  if (slots <= 0) return 0
  const pick = best(pool, cash)
  if (!pick) return 0
  return valueOf(pick, cash) + greedyTotal(pool.filter(s => s !== pick), cash - pick.c.buyAt * qtyFor(pick, cash), slots - 1)
}

function choose (pool: readonly Sized[], cash: number, slots: number): Sized | null {
  let top: { s: Sized; total: number } | null = null
  for (const s of pool) {
    const qty = qtyFor(s, cash)
    if (qty <= 0 || s.c.profitEach <= 0) continue
    const total = valueOf(s, cash) + greedyTotal(pool.filter(o => o !== s), cash - s.c.buyAt * qty, slots - 1)
    if (!top || total > top.total) top = { s, total }
  }
  return top?.s ?? null
}

function slotOf (s: Sized, qty: number, maxFillHours: number): PlannedSlot {
  const metrics = fillMetrics({
    flow: s.c.flow, buyAt: s.c.buyAt, sellAt: s.c.sellAt, profitEach: s.c.profitEach, units: qty, limit: limitOf(s.c), maxFillHours
  })
  return { candidate: s.c, qty, cost: s.c.buyAt * qty, metrics }
}

export function planFlips (candidates: readonly Candidate[], o: PlanOptions): PlannedSlot[] {
  const pool0 = candidates
    .filter(c => c.buyAt > 0 && c.profitEach > 0)
    .map(c => sized(c, o.maxFillHours))
    .filter(s => s.cap > 0)
  const plan: PlannedSlot[] = []
  let pool = pool0
  let cash = o.cash
  while (plan.length < o.slots) {
    const pick = choose(pool, cash, o.slots - plan.length)
    if (!pick) break
    const qty = qtyFor(pick, cash)
    plan.push(slotOf(pick, qty, o.maxFillHours))
    cash -= pick.c.buyAt * qty
    pool = pool.filter(s => s !== pick)
  }
  return plan
}

export function planJson (plan: readonly PlannedSlot[], o: PlanOptions) {
  const cost = plan.reduce((sum, p) => sum + p.cost, 0)
  const profit = plan.reduce((sum, p) => sum + p.metrics.realisticProfitPerLimit, 0)
  const longest = plan.reduce((h, p) => Math.max(h, (p.metrics.expectedFillHours.buy ?? 0) + (p.metrics.expectedFillHours.sell ?? 0)), 0)
  return {
    cash: o.cash,
    slots: o.slots,
    maxFillHours: o.maxFillHours,
    totals: {
      slotsUsed: plan.length,
      cost,
      cashLeft: o.cash - cost,
      expectedProfit: profit,
      roiPct: cost > 0 ? round((profit / cost) * 100) : null,
      longestSlotHours: round(longest, 2),
      gpPerHour: Math.round(profit / Math.max(longest, 1))
    },
    slotsPlan: plan.map((p, i) => ({
      slot: i + 1,
      id: p.candidate.entry.id,
      name: p.candidate.entry.name,
      buyAt: p.candidate.buyAt,
      sellAt: p.candidate.sellAt,
      qty: p.qty,
      limit: p.candidate.entry.limit,
      cost: p.cost,
      taxEach: p.candidate.sellAt - p.candidate.buyAt - p.candidate.profitEach,
      profitEach: p.candidate.profitEach,
      expectedProfit: p.metrics.realisticProfitPerLimit,
      roiPct: p.cost > 0 ? round((p.metrics.realisticProfitPerLimit / p.cost) * 100) : null,
      expectedFillHours: p.metrics.expectedFillHours,
      expectedHours: round((p.metrics.expectedFillHours.buy ?? 0) + (p.metrics.expectedFillHours.sell ?? 0), 2),
      gpPerHourPerSlot: p.metrics.gpPerHourPerSlot,
      priceBasis: p.candidate.basis
    }))
  }
}

/** Profit a candidate could add to a plan on its own: for pre-ranking the pool. */
export const planValue = (c: Candidate, cash: number, maxFillHours: number): number =>
  c.profitEach > 0 && c.buyAt > 0 ? valueOf(sized(c, maxFillHours), cash) : 0
