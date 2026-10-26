// @ts-nocheck -- vendored unchanged from master@c0b4f42 mobile/src/lib/pickTiming.ts (PR #26); only this line added. Do not edit: re-copy instead.
import type { BuyPick, WikiAverage } from '@ge/engine'
import { flowFromAverages, slotRate, type SlotRate } from './analytics/fillTime.ts'

export type PickSort = 'profit' | 'rate'

/**
 * GP per hour per GE slot for each pick, from the wiki's /1h and /24h
 * averages (no per-item downloads). Picks are already sized to what fills and
 * to one buy limit, so the pick's amount is the cycle.
 */
export function pickRates (picks: readonly BuyPick[], h1: Record<string, WikiAverage> | undefined, h24: Record<string, WikiAverage> | undefined): Map<number, SlotRate> {
  const rates = new Map<number, SlotRate>()
  for (const pick of picks) {
    const flow = flowFromAverages(h1?.[pick.id], h24?.[pick.id])
    if (!flow) continue
    rates.set(pick.id, slotRate(flow, { buyAt: pick.buyAt, sellAt: pick.sellAt, profitEach: pick.profit, qty: pick.maxQty, limit: null }))
  }
  return rates
}

/** Fastest earners first; picks without a rate go last in their old order. */
export function sortByRate<T extends { id: number }> (picks: readonly T[], rates: ReadonlyMap<number, SlotRate>): T[] {
  return [...picks].sort((a, b) => (rates.get(b.id)?.gpPerHour ?? -1) - (rates.get(a.id)?.gpPerHour ?? -1))
}
