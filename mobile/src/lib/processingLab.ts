import type { Market, ProcessRecipe, WikiAverage } from '@ge/engine'
import { buyFillHours, sellFillHours, flowFromAverages } from './analytics/fillTime.ts'

export interface BatchInput {
  cost: number
  profit: number
  tax: number
  actionsPerHour: number | null
  cash: number
  minutes: number
  limitActions: number | null
}
const positive = (n: number) => Number.isFinite(n) ? Math.max(0, n) : 0

/** One upfront batch, no reinvestment or assumed buy-limit resets. */
export function sizeProcessingBatch (input: BatchInput) {
  const rate = input.actionsPerHour
  const limitUnknown = input.limitActions === null
  if (!rate || !Number.isFinite(rate) || rate < 0) {
    return { actions: null, earnings: null, capital: null, tax: null, activeGpHour: null, bottlenecks: [] as string[], limitUnknown }
  }
  const caps = [
    { name: 'cash', n: input.cost > 0 ? Math.floor(positive(input.cash) / input.cost) : 0 },
    { name: 'active time', n: Math.floor(rate * positive(input.minutes) / 60) },
    { name: 'buy limit', n: input.limitActions === null ? Infinity : Math.floor(positive(input.limitActions)) }
  ]
  const actions = Math.min(...caps.map(c => c.n))
  return {
    actions, earnings: actions * input.profit, capital: actions * input.cost, tax: actions * input.tax,
    activeGpHour: input.profit * rate,
    bottlenecks: caps.filter(c => c.n === actions).map(c => c.name), limitUnknown
  }
}

export type PriceMode = 'instant' | 'patient'
export type Averages = Record<string, WikiAverage> | undefined

export type LabSourceFreshness = 'fresh' | 'stale' | 'unknown'

/** Assess original selected legs only. Average-period timestamp semantics are unverified. */
export function labSourceFreshness (recipe: ProcessRecipe, market: Market, inputs: PriceMode, outputs: PriceMode): LabSourceFreshness {
  const leg = (entries: ProcessRecipe['inputs'], mode: PriceMode, side: 'highTime' | 'lowTime'): LabSourceFreshness[] => entries.map(entry => {
    if (mode === 'patient') return 'unknown'
    const time = market.get(entry.id)?.[side]
    if (time == null || !Number.isFinite(time) || time <= 0 || !Number.isFinite(market.nowSec) || time > market.nowSec) return 'unknown'
    return market.nowSec - time > 6 * 60 * 60 ? 'stale' : 'fresh'
  })
  const sources = [...leg(recipe.inputs, inputs, 'highTime'), ...leg(recipe.outputs, outputs, 'lowTime')]
  return sources.includes('stale') ? 'stale' : sources.includes('unknown') || !sources.length ? 'unknown' : 'fresh'
}

export function showLabSource (freshness: LabSourceFreshness, hideStale: boolean): boolean {
  return !hideStale || freshness === 'fresh'
}

export function labSourceDisclosure (freshness: LabSourceFreshness): string {
  return freshness === 'fresh' ? 'Selected instant sources are within 6h.'
    : freshness === 'stale' ? 'Selected source older than 6h; other source ages may be unknown.'
      : 'Some selected prices have unknown ages.'
}

/** Patient prices use traded daily averages; instant prices are observed quotes, never guaranteed fills. */
export function labMarket (market: Market, inputs: PriceMode, outputs: PriceMode, day: Averages): Market {
  const get = (id: number) => {
    const item = market.get(id)
    if (!item) return null
    const avg = day?.[id]
    return { ...item,
      low: inputs === 'instant' ? item.high : avg && avg.lowPriceVolume > 0 ? avg.avgLowPrice : null,
      high: outputs === 'instant' ? item.low : avg && avg.highPriceVolume > 0 ? avg.avgHighPrice : null,
      lowTime: inputs === 'instant' ? item.highTime : null,
      highTime: outputs === 'instant' ? item.lowTime : null
    }
  }
  return { nowSec: market.nowSec, get, all: () => market.all().flatMap(i => { const item = get(i.id); return item ? [item] : [] }) }
}

export function recipeLimit (recipe: ProcessRecipe, market: Market): number | null {
  const quantities = new Map<number, number>()
  for (const input of recipe.inputs) quantities.set(input.id, (quantities.get(input.id) ?? 0) + input.qty)
  const caps = [...quantities].map(([id, qty]) => {
    const limit = market.get(id)?.limit
    return limit && limit > 0 ? Math.floor(limit / qty) : null
  })
  const known = caps.filter((c): c is number => c !== null)
  return known.length ? Math.min(...known) : null
}

/** Legs may fill concurrently; inputs finish before processing, outputs sell afterwards. */
export function batchWait (recipe: ProcessRecipe, market: Market, actions: number, inputs: PriceMode, outputs: PriceMode, hour: Averages, day: Averages): number | null {
  if (actions === 0) return 0
  const leg = (entries: ProcessRecipe['inputs'], mode: PriceMode, buy: boolean) => {
    if (mode === 'instant') return 0
    const waits = entries.map(e => {
      const flow = flowFromAverages(hour?.[e.id], day?.[e.id])
      const price = buy ? market.get(e.id)?.low : market.get(e.id)?.high
      return flow && price ? (buy ? buyFillHours : sellFillHours)(flow, price, e.qty * actions) : null
    })
    return waits.some(w => w === null) ? null : Math.max(0, ...waits as number[])
  }
  const buy = leg(recipe.inputs, inputs, true)
  const sell = leg(recipe.outputs, outputs, false)
  return buy === null || sell === null ? null : buy + sell
}
