// Buy offer fills land on the Bought list as they happen: one lot per buy
// slot, grown (or shrunk, when a fill is corrected) by each change. Pure.

import type { Lot } from '../pnl/journal.ts'

export interface SlotFill {
  /** The lot this slot fills; created on the first fill. */
  lotId: string
  itemId: number
  name: string
  icon: string | null
  /** Change in the filled amount. */
  delta: number
  /** Price each the change went through at. */
  price: number
}

export interface FillApplied {
  lots: Lot[]
  /** Set when the lot was created by this fill (it may need a buy-limit reminder). */
  created: Lot | null
  /** Set when a correction emptied the lot (its reminder may need cancelling). */
  removed: Lot | null
}

/**
 * Applies one fill to the lots. Adding grows the slot's lot at a
 * quantity-weighted buy price; taking away shrinks it at the same rate and
 * drops it at zero. `windowStart` is the buy-limit window to use for a new lot.
 */
export function applySlotFill (lots: readonly Lot[], fill: SlotFill, now: number, windowStart: number): FillApplied {
  const lot = lots.find(l => l.id === fill.lotId)
  if (!fill.delta) return { lots: [...lots], created: null, removed: null }
  if (!lot) {
    if (fill.delta < 0) return { lots: [...lots], created: null, removed: null }
    const created: Lot = {
      id: fill.lotId,
      itemId: fill.itemId,
      name: fill.name,
      icon: fill.icon,
      qty: fill.delta,
      buyPrice: fill.price,
      boughtAt: now,
      windowStart,
      reminderId: null
    }
    return { lots: [created, ...lots], created, removed: null }
  }
  const qty = lot.qty + fill.delta
  if (qty <= 0) return { lots: lots.filter(l => l.id !== lot.id), created: null, removed: lot }
  const cost = lot.qty * lot.buyPrice + fill.delta * fill.price
  const buyPrice = Math.max(1, Math.round(cost / qty))
  return { lots: lots.map(l => (l.id === lot.id ? { ...l, qty, buyPrice } : l)), created: null, removed: null }
}
