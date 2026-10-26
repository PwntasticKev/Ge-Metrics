import { geTax, type BuyPick, type Market, type MarketItem, type WikiAverage } from '@ge/engine'
import type { TickerPayload, TickerRow } from '../../modules/pip-ticker'
import type { Holding } from '../state/flips'
import { remaining, type Slot } from './slots/slots'
import { stripUncharged } from './format'
import type { WatchEntry } from '../state/watchlist'
import { groupHoldings, type WidgetHolding } from './widget/payload'

// Builds the rows for the Picture in Picture mini window. The math matches
// TickerRow.repriced in modules/pip-ticker/ios/TickerModels.swift, which
// re-prices the same rows natively while the app is in the background.

export type MiniSource = 'watchlist' | 'picks' | 'holdings' | 'slots'
export const MINI_SOURCES: readonly MiniSource[] = ['watchlist', 'picks', 'holdings', 'slots']
export const MAX_MINI_ROWS = 5

const TITLES: Record<MiniSource, string> = {
  watchlist: 'Watchlist',
  picks: 'Buy now',
  holdings: 'Bought',
  slots: 'GE slots'
}

// A price the tax table treats as taxable for any normal item.
const TAX_PROBE_PRICE = 1_000

const isTaxExempt = (id: number) => geTax(TAX_PROBE_PRICE, id) === 0

function dayMid (avg: WikiAverage | undefined): number | null {
  if (!avg || avg.avgHighPrice === null || avg.avgLowPrice === null) return null
  return (avg.avgHighPrice + avg.avgLowPrice) / 2
}

export function flipRow (item: MarketItem, h24?: WikiAverage): TickerRow | null {
  if (item.high === null || item.low === null) return null
  const base = dayMid(h24)
  const mid = (item.high + item.low) / 2
  return {
    id: item.id,
    name: stripUncharged(item.name),
    kind: 'flip',
    buy: item.low,
    sell: item.high,
    margin: item.high - geTax(item.high, item.id) - item.low,
    change: base ? (mid - base) / base : null,
    qty: 1,
    taxExempt: isTaxExempt(item.id),
    base
  }
}

/** One row per item: the journal can hold several open lots of the same item. */
export function holdingRow (holding: WidgetHolding, item: MarketItem | null): TickerRow | null {
  const sell = item?.high ?? null
  if (sell === null) return null
  const perItem = sell - geTax(sell, holding.id) - holding.buyPrice
  return {
    id: holding.id,
    name: stripUncharged(holding.name),
    kind: 'holding',
    buy: holding.buyPrice,
    sell,
    margin: perItem * holding.qty,
    change: holding.buyPrice > 0 ? perItem / holding.buyPrice : null,
    qty: holding.qty,
    taxExempt: holding.noTax,
    base: null
  }
}

export interface MiniInputs {
  market: Market | null
  h24: Record<string, WikiAverage> | undefined
  entries: readonly WatchEntry[]
  picks: readonly BuyPick[] | null
  holdings: readonly Holding[]
  /** Open GE offers; optional so older callers keep working. */
  slots?: readonly Slot[]
}

/**
 * An open offer: a sell with a known cost shows profit on what's left, like
 * a holding; anything else shows the item's live margin.
 */
export function slotRow (slot: Slot, item: MarketItem | null, h24?: WikiAverage): TickerRow | null {
  if (!item) return null
  const left = Math.max(1, remaining(slot))
  const row = slot.side === 'sell' && slot.costBasis
    ? holdingRow({ id: slot.itemId, name: slot.name, noTax: isTaxExempt(slot.itemId), qty: left, buyPrice: slot.costBasis }, item)
    : flipRow(item, h24)
  return row ? { ...row, name: `${slot.side === 'buy' ? 'Buy' : 'Sell'} · ${row.name}` } : null
}

function sourceIds (source: MiniSource, inputs: MiniInputs): number[] {
  if (source === 'watchlist') return inputs.entries.flatMap(e => (e.kind === 'item' ? [e.id] : []))
  return (inputs.picks ?? []).map(p => p.id)
}

export function miniRows (source: MiniSource, inputs: MiniInputs): TickerRow[] {
  const { market, h24 } = inputs
  if (!market) return []
  if (source === 'holdings') {
    // Grouped the same way as the widget's Bought rows (quantity-weighted buy price).
    return groupHoldings(inputs.holdings, isTaxExempt)
      .map(h => holdingRow(h, market.get(h.id)))
      .filter((r): r is TickerRow => r !== null)
      .slice(0, MAX_MINI_ROWS)
  }
  if (source === 'slots') {
    return (inputs.slots ?? [])
      .map(slot => slotRow(slot, market.get(slot.itemId), h24?.[String(slot.itemId)]))
      .filter((r): r is TickerRow => r !== null)
      .slice(0, MAX_MINI_ROWS)
  }
  return sourceIds(source, inputs)
    .map(id => market.get(id))
    .map(item => (item ? flipRow(item, h24?.[String(item.id)]) : null))
    .filter((r): r is TickerRow => r !== null)
    .slice(0, MAX_MINI_ROWS)
}

export function miniPayload (source: MiniSource, rows: TickerRow[], updatedAt: number | null): TickerPayload {
  return { title: TITLES[source], updatedAt: updatedAt ?? 0, rows }
}

export const isMiniSource = (v: unknown): v is MiniSource => MINI_SOURCES.includes(v as MiniSource)
