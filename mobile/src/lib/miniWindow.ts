import { geTax, type BuyPick, type Market, type MarketItem, type WikiAverage } from '@ge/engine'
import type { TickerPayload, TickerRow } from '../../modules/pip-ticker'
import type { Holding } from '../state/flips'
import { stripUncharged } from './format'
import type { WatchEntry } from '../state/watchlist'

// Builds the rows for the Picture in Picture mini window. The math matches
// TickerRow.repriced in modules/pip-ticker/ios/TickerModels.swift, which
// re-prices the same rows natively while the app is in the background.

export type MiniSource = 'watchlist' | 'picks' | 'holdings'
export const MINI_SOURCES: readonly MiniSource[] = ['watchlist', 'picks', 'holdings']
export const MAX_MINI_ROWS = 5

const TITLES: Record<MiniSource, string> = {
  watchlist: 'Watchlist',
  picks: 'Buy now',
  holdings: 'Bought'
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

export function holdingRow (holding: Holding, item: MarketItem | null): TickerRow | null {
  const sell = item?.high ?? null
  if (sell === null) return null
  const perItem = sell - geTax(sell, holding.itemId) - holding.buyPrice
  return {
    id: holding.itemId,
    name: stripUncharged(holding.name),
    kind: 'holding',
    buy: holding.buyPrice,
    sell,
    margin: perItem * holding.qty,
    change: holding.buyPrice > 0 ? perItem / holding.buyPrice : null,
    qty: holding.qty,
    taxExempt: isTaxExempt(holding.itemId),
    base: null
  }
}

export interface MiniInputs {
  market: Market | null
  h24: Record<string, WikiAverage> | undefined
  entries: readonly WatchEntry[]
  picks: readonly BuyPick[] | null
  holdings: readonly Holding[]
}

function sourceIds (source: MiniSource, inputs: MiniInputs): number[] {
  if (source === 'watchlist') return inputs.entries.flatMap(e => (e.kind === 'item' ? [e.id] : []))
  return (inputs.picks ?? []).map(p => p.id)
}

export function miniRows (source: MiniSource, inputs: MiniInputs): TickerRow[] {
  const { market, h24 } = inputs
  if (!market) return []
  if (source === 'holdings') {
    return inputs.holdings
      .map(h => holdingRow(h, market.get(h.itemId)))
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
