// What the app shares with the iOS home screen widget through the App Group.
// The widget fetches live prices itself; this only says which items to show
// and the app's targets for them. Keep the shape in sync with
// targets/widget/SharedData.swift (WidgetPayload).

import type { AdviceKind } from '../slots/advice.ts'
import type { OfferSide } from '../slots/slots.ts'

export const WIDGET_APP_GROUP = 'group.com.gemetrics.app'
export const WIDGET_STORAGE_KEY = 'widget.v1'
export const WIDGET_PAYLOAD_VERSION = 1

/** Enough for the medium widget (3 rows) with spares if some have no live price. */
export const MAX_WIDGET_PICKS = 5
export const MAX_WIDGET_ITEMS = 8
/** Members have 8 GE slots. */
export const MAX_WIDGET_SLOTS = 8

export interface WidgetPick {
  id: number
  name: string
  /** Target buy price per item. */
  buy: number
  /** Target sell price per item. */
  sell: number
  /** Margin per item after GE tax at the targets. */
  profit: number
  /** True when selling this item pays no GE tax (exempt list). */
  noTax: boolean
}

export interface WidgetItem {
  id: number
  name: string
  noTax: boolean
}

export interface WidgetHolding extends WidgetItem {
  qty: number
  /** Average buy price per item across the open lots. */
  buyPrice: number
}

/** One GE offer from My GE slots, with the advice the app last computed. */
export interface WidgetSlot {
  /** Slot id, for the deep link back to that slot. */
  id: string
  itemId: number
  name: string
  side: OfferSide
  /** Price each, as typed into the GE. */
  price: number
  qty: number
  filled: number
  /** When the offer was placed or last changed (ms); the widget re-checks staleness from it. */
  updatedAt: number
  /** "filling", "raise", ... (lib/slots/advice); "unknown" before prices load. */
  advice: AdviceKind
  /** Needs the player to do something at the GE. */
  action: boolean
  /** Suggested new price each, when the advice has one. */
  suggested: number | null
}

export interface WidgetPayload {
  v: number
  /** When the app wrote this (ms since epoch). */
  at: number
  picks: WidgetPick[]
  watchlist: WidgetItem[]
  holdings: WidgetHolding[]
  slots: WidgetSlot[]
}

export interface PickInput {
  readonly id: number
  readonly name: string
  readonly buyAt: number
  readonly sellAt: number
  readonly profit: number
}

export interface LotInput {
  readonly itemId: number
  readonly name: string
  readonly qty: number
  readonly buyPrice: number
}

export interface SlotInput {
  readonly id: string
  readonly itemId: number
  readonly name: string
  readonly side: OfferSide
  readonly price: number
  readonly qty: number
  readonly filled: number
  readonly updatedAt: number
}

export interface AdviceInput {
  readonly kind: AdviceKind
  readonly action: boolean
  readonly price: number | null
}

export interface PayloadInput {
  picks: readonly PickInput[] | null
  /** Starred item ids, in the order they were starred. */
  watchlistIds: readonly number[]
  lots: readonly LotInput[]
  /** Open GE offers, in slot order (optional: older callers have none). */
  slots?: readonly SlotInput[]
  /** Advice per slot id; a slot without one is "unknown". */
  adviceOf?: (slotId: string) => AdviceInput | null
  nameOf: (id: number) => string | null
  isTaxExempt: (id: number) => boolean
  now: number
}

const toPick = (p: PickInput, isTaxExempt: (id: number) => boolean): WidgetPick => ({
  id: p.id, name: p.name, buy: p.buyAt, sell: p.sellAt, profit: p.profit, noTax: isTaxExempt(p.id)
})

/** One row per item: quantities summed, buy price weighted by quantity. Newest item first. */
export function groupHoldings (lots: readonly LotInput[], isTaxExempt: (id: number) => boolean): WidgetHolding[] {
  const order: number[] = []
  const totals = new Map<number, { name: string; qty: number; cost: number }>()
  for (const lot of lots) {
    if (!(lot.qty > 0)) continue
    const prev = totals.get(lot.itemId)
    if (!prev) order.push(lot.itemId)
    totals.set(lot.itemId, {
      name: prev?.name ?? lot.name,
      qty: (prev?.qty ?? 0) + lot.qty,
      cost: (prev?.cost ?? 0) + lot.qty * lot.buyPrice
    })
  }
  return order.map(id => {
    const t = totals.get(id)!
    return { id, name: t.name, noTax: isTaxExempt(id), qty: t.qty, buyPrice: Math.round(t.cost / t.qty) }
  })
}

export function toWidgetSlot (slot: SlotInput, advice: AdviceInput | null): WidgetSlot {
  return {
    id: slot.id,
    itemId: slot.itemId,
    name: slot.name,
    side: slot.side,
    price: slot.price,
    qty: slot.qty,
    filled: slot.filled,
    updatedAt: slot.updatedAt,
    advice: advice?.kind ?? 'unknown',
    action: advice?.action ?? false,
    suggested: advice?.price ?? null
  }
}

export function buildWidgetPayload (input: PayloadInput): WidgetPayload {
  const { picks, watchlistIds, lots, slots = [], adviceOf = () => null, nameOf, isTaxExempt, now } = input
  const watchlist = watchlistIds.flatMap(id => {
    const name = nameOf(id)
    return name ? [{ id, name, noTax: isTaxExempt(id) }] : []
  })
  return {
    v: WIDGET_PAYLOAD_VERSION,
    at: now,
    picks: (picks ?? []).slice(0, MAX_WIDGET_PICKS).map(p => toPick(p, isTaxExempt)),
    watchlist: watchlist.slice(0, MAX_WIDGET_ITEMS),
    holdings: groupHoldings(lots, isTaxExempt).slice(0, MAX_WIDGET_ITEMS),
    slots: slots.slice(0, MAX_WIDGET_SLOTS).map(slot => toWidgetSlot(slot, adviceOf(slot.id)))
  }
}

/** Same content, ignoring when it was written: used to skip redundant writes. */
export const payloadContentKey = (p: WidgetPayload): string =>
  JSON.stringify({ picks: p.picks, watchlist: p.watchlist, holdings: p.holdings, slots: p.slots })
