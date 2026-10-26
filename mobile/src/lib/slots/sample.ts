// Sample slots for screenshots and trying the screen, only offered in builds
// made with EXPO_PUBLIC_SAMPLE_SLOTS=1. Built from live items that have a
// real margin, each priced so it shows a different piece of advice.

import { createSlot, setFilled, type Slot } from './slots.ts'

const MINUTE = 60_000
/** Each sample offer is worth about this much. */
const OFFER_GP = 3_000_000
const MAX_QTY = 30_000

export interface SampleItem {
  itemId: number
  name: string
  icon: string | null
  /** Live instant-sell and instant-buy prices. */
  low: number
  high: number
}

interface SampleSpec {
  side: 'buy' | 'sell'
  filledShare: number
  ageMin: number
  price: (low: number, high: number) => number
  withCost?: boolean
}

const SPECS: readonly SampleSpec[] = [
  // In the market, partly filled.
  { side: 'buy', filledShare: 0.4, ageMin: 40, price: low => low },
  // Under every recent trade: raise.
  { side: 'buy', filledShare: 0, ageMin: 70, price: low => Math.floor(low * 0.995) },
  // Ask over the market: lower or hold.
  { side: 'sell', filledShare: 0.15, ageMin: 95, price: (_, high) => Math.ceil(high * 1.03), withCost: true },
  // Up for too long: relist.
  { side: 'buy', filledShare: 0.4, ageMin: 290, price: low => low },
  // Bid over what it sells for after tax: cancel.
  { side: 'buy', filledShare: 0, ageMin: 25, price: (_, high) => high + 1 }
]

/** `items` should be liquid items with a margin after tax, best first. */
export function sampleSlots (now: number, items: readonly SampleItem[], newId: () => string): Slot[] {
  return SPECS.flatMap((spec, i) => {
    const item = items[i]
    if (!item) return []
    const qty = Math.max(1, Math.min(MAX_QTY, Math.round(OFFER_GP / item.low)))
    const slot = createSlot({
      itemId: item.itemId,
      name: item.name,
      icon: item.icon,
      side: spec.side,
      price: spec.price(item.low, item.high),
      qty,
      costBasis: spec.withCost ? item.low : null,
      lotId: spec.side === 'buy' ? newId() : null
    }, newId(), now - spec.ageMin * MINUTE)
    return slot ? [setFilled(slot, Math.round(qty * spec.filledShare)).slot] : []
  })
}
