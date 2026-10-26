// Fill-aware numbers for one flip: how long the buy and the sell should take
// at the given prices, what a GE slot earns per hour, and whether the flip is
// fillable within the trader's patience (max_fill_hours). Rows that aren't get
// demoted with a plain-language reason instead of being handed out as margins.

import { type MarketFlow, buyFillRate, hoursFor, sellFillRate, slotGpPerHour } from '../timing/fillTime.js'
import { round } from '../format.js'

export const DEFAULT_MAX_FILL_HOURS = 8
/** Same fallback the engine uses for items the wiki has no buy limit for. */
export const ASSUMED_BUY_LIMIT = 8

export interface FillInput {
  readonly flow: MarketFlow
  readonly buyAt: number
  readonly sellAt: number
  /** Margin per item after tax at buyAt/sellAt. */
  readonly profitEach: number
  /** Items per cycle: one buy limit, capped by cash when known. */
  readonly units: number
  readonly limit: number | null
  readonly maxFillHours: number
}

export interface FillMetrics {
  readonly buyAt: number
  readonly sellAt: number
  readonly marginAfterTax: number
  readonly units: number
  readonly expectedFillHours: { readonly buy: number | null; readonly sell: number | null }
  readonly gpPerHourPerSlot: number
  /** Margin x units at these prices: what one buy-limit cycle should really make. */
  readonly realisticProfitPerLimit: number
  /** Most items whose buy and sell both fill within maxFillHours. */
  readonly qtyWithinMaxHours: number
  readonly fillable: boolean
  readonly demotedReason: string | null
}

const finiteHours = (h: number): number | null => (Number.isFinite(h) ? round(h, 2) : null)
const fmtHours = (h: number) => (Number.isFinite(h) ? `${round(h, 1)}h` : 'never')
const gp = (n: number) => Math.round(n).toLocaleString('en-US')

/** Largest quantity whose buy then sell both fill within `hours`. */
export function qtyWithinHours (buyRate: number, sellRate: number, hours: number): number {
  if (buyRate <= 0 || sellRate <= 0 || hours <= 0) return 0
  return Math.floor(hours / (1 / buyRate + 1 / sellRate))
}

function demotion (i: FillInput, buyHours: number, sellHours: number, within: number): string | null {
  if (i.profitEach <= 0) return `No margin after tax at fillable prices (buy ${gp(i.buyAt)}, sell ${gp(i.sellAt)}).`
  if (sellHours > i.maxFillHours) {
    return `Sell at ${gp(i.sellAt)} needs ~${fmtHours(sellHours)} for ${gp(i.units)} (24h typical high ${gp(i.flow.typicalHigh)}, ~${round(i.flow.instantBuysPerHour, 1)} instant-buys/h); only ~${gp(within)} fill within ${i.maxFillHours}h.`
  }
  if (buyHours > i.maxFillHours) {
    return `Buy at ${gp(i.buyAt)} needs ~${fmtHours(buyHours)} for ${gp(i.units)} (24h typical low ${gp(i.flow.typicalLow)}, ~${round(i.flow.instantSellsPerHour, 1)} instant-sells/h); only ~${gp(within)} fill within ${i.maxFillHours}h.`
  }
  return null
}

export function fillMetrics (i: FillInput): FillMetrics {
  const units = Math.max(0, Math.floor(i.units))
  const buyRate = buyFillRate(i.flow, i.buyAt)
  const sellRate = sellFillRate(i.flow, i.sellAt)
  const buyHours = hoursFor(units, buyRate)
  const sellHours = hoursFor(units, sellRate)
  const profit = i.profitEach * units
  const within = qtyWithinHours(buyRate, sellRate, i.maxFillHours)
  const demotedReason = units > 0 ? demotion(i, buyHours, sellHours, within) : 'Cash or buy limit allows no items.'
  return {
    buyAt: i.buyAt,
    sellAt: i.sellAt,
    marginAfterTax: Math.round(i.profitEach),
    units,
    expectedFillHours: { buy: finiteHours(buyHours), sell: finiteHours(sellHours) },
    gpPerHourPerSlot: Math.round(Math.max(0, slotGpPerHour(profit, buyHours + sellHours, units, i.limit))),
    realisticProfitPerLimit: Math.round(profit),
    qtyWithinMaxHours: within,
    fillable: demotedReason === null,
    demotedReason
  }
}

/** Units for one cycle: the buy limit (or the assumed one), capped by what the cash buys. */
export function cycleUnits (limit: number | null, buyAt: number, budget?: number): number {
  const cap = limit ?? ASSUMED_BUY_LIMIT
  return budget === undefined || buyAt <= 0 ? cap : Math.min(cap, Math.floor(budget / buyAt))
}

/** Fillable rows first (by key, best first), demoted rows after; never mutates the input. */
export function rankFillable<T> (rows: readonly T[], metricsOf: (row: T) => FillMetrics | null, key: (row: T) => number): T[] {
  const fillable = (r: T) => metricsOf(r)?.fillable === true
  return [...rows].sort((a, b) => Number(fillable(b)) - Number(fillable(a)) || key(b) - key(a))
}

export interface DemotedSummary {
  readonly count: number
  readonly examples: readonly { readonly id: number; readonly name: string; readonly reason: string }[]
}

const EXAMPLES = 3

/** Count of demoted rows plus a few explained examples, so dropped rows aren't silent. */
export function demotedSummary (rows: readonly { readonly id: number; readonly name: string; readonly demotedReason: string | null }[]): DemotedSummary {
  const demoted = rows.filter(r => r.demotedReason !== null)
  return {
    count: demoted.length,
    examples: demoted.slice(0, EXAMPLES).map(r => ({ id: r.id, name: r.name, reason: r.demotedReason as string }))
  }
}
