// "My GE slots": the offers you have up in the Grand Exchange, mirrored on the
// phone. Plain data and pure updates (no React or Expo), so it runs under
// `node --test`. Storage lives in state/slots.ts.

export type OfferSide = 'buy' | 'sell'

/** Members get 8 GE slots, free-to-play 3. */
export const MEMBERS_SLOT_COUNT = 8
export const F2P_SLOT_COUNT = 3
/** Changes kept per slot. */
export const MAX_CHANGES = 20
const MAX_GE_INT = 2_147_483_647

export interface OfferChange {
  readonly at: number
  readonly price: number
  readonly qty: number
  readonly kind: 'placed' | 'updated'
}

export interface Slot {
  readonly id: string
  readonly itemId: number
  readonly name: string
  readonly icon: string | null
  readonly side: OfferSide
  /** Price each, as typed into the GE. */
  readonly price: number
  readonly qty: number
  /** How many have gone through so far, as entered by the player. */
  readonly filled: number
  /** Sum of price x amount over the fills, so a re-priced offer still averages right. */
  readonly filledValue: number
  readonly placedAt: number
  /** Last time the offer was placed or changed; staleness counts from here. */
  readonly updatedAt: number
  /**
   * Buy: the Bought lot that receives this offer's fills.
   * Sell: the Bought lot being sold, when it came from one.
   */
  readonly lotId: string | null
  /** Sell: what each item cost, when known. */
  readonly costBasis: number | null
  /** Buy: the sell price the pick planned on, when known. */
  readonly target: number | null
  readonly changes: readonly OfferChange[]
  /** Advice kind the player last saw (or was notified about). */
  readonly lastKind: string | null
  readonly notifiedAt: number | null
}

export interface SlotsState {
  readonly slots: readonly Slot[]
  /** Local notification when a slot needs action. */
  readonly notify: boolean
}

export const EMPTY_SLOTS: SlotsState = { slots: [], notify: false }

export interface NewSlot {
  itemId: number
  name: string
  icon: string | null
  side: OfferSide
  price: number
  qty: number
  lotId?: string | null
  costBasis?: number | null
  target?: number | null
}

export const isGeAmount = (v: unknown): v is number => Number.isInteger(v) && (v as number) > 0 && (v as number) <= MAX_GE_INT
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0
const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0
const optString = (v: unknown) => (typeof v === 'string' && v ? v : null)
const optAmount = (v: unknown) => (isGeAmount(v) ? v : null)

export const slotCount = (members: boolean): number => (members ? MEMBERS_SLOT_COUNT : F2P_SLOT_COUNT)
export const remaining = (slot: Pick<Slot, 'qty' | 'filled'>): number => Math.max(0, slot.qty - slot.filled)
/** Average price the filled part went through at. */
export const averageFillPrice = (slot: Pick<Slot, 'filled' | 'filledValue' | 'price'>): number =>
  slot.filled > 0 ? Math.round(slot.filledValue / slot.filled) : slot.price

/** A new slot, or null when the price or amount isn't a valid GE amount. */
export function createSlot (input: NewSlot, id: string, now: number): Slot | null {
  if (!isGeAmount(input.itemId) || !isGeAmount(input.price) || !isGeAmount(input.qty)) return null
  return {
    id,
    itemId: input.itemId,
    name: input.name,
    icon: input.icon,
    side: input.side,
    price: input.price,
    qty: input.qty,
    filled: 0,
    filledValue: 0,
    placedAt: now,
    updatedAt: now,
    lotId: input.lotId ?? null,
    costBasis: optAmount(input.costBasis),
    target: optAmount(input.target),
    changes: [{ at: now, price: input.price, qty: input.qty, kind: 'placed' }],
    lastKind: null,
    notifiedAt: null
  }
}

export interface FillResult {
  slot: Slot
  /** Change in the filled amount (negative when corrected down). */
  delta: number
}

/** Sets how many have filled, clamped to 0..qty. */
export function setFilled (slot: Slot, filled: number): FillResult {
  const next = Math.max(0, Math.min(slot.qty, Math.round(Number.isFinite(filled) ? filled : slot.filled)))
  const delta = next - slot.filled
  if (!delta) return { slot, delta: 0 }
  // A correction down takes the most recent price back out.
  const filledValue = next === 0 ? 0 : Math.max(0, slot.filledValue + delta * slot.price)
  return { slot: { ...slot, filled: next, filledValue }, delta }
}

/** Quick steppers: -1, +1, a quarter of the offer, and the rest. */
export function stepTargets (slot: Pick<Slot, 'qty' | 'filled'>): { minus: number; plus: number; quarter: number; full: number } {
  const quarter = Math.max(1, Math.round(slot.qty / 4))
  return {
    minus: Math.max(0, slot.filled - 1),
    plus: Math.min(slot.qty, slot.filled + 1),
    quarter: Math.min(slot.qty, slot.filled + quarter),
    full: slot.qty
  }
}

/**
 * Re-prices an offer (in the GE: abort, collect, place again). What already
 * filled stays filled, so the amount can't drop below it. Null on bad input.
 */
export function updateOffer (slot: Slot, price: number, qty: number, now: number): Slot | null {
  if (!isGeAmount(price) || !isGeAmount(qty) || qty < slot.filled) return null
  if (price === slot.price && qty === slot.qty) return slot
  const change: OfferChange = { at: now, price, qty, kind: 'updated' }
  return {
    ...slot,
    price,
    qty,
    updatedAt: now,
    changes: [...slot.changes, change].slice(-MAX_CHANGES),
    // A fresh offer gets fresh advice.
    lastKind: null
  }
}

export const withSlot = (state: SlotsState, slot: Slot): SlotsState =>
  ({ ...state, slots: state.slots.some(s => s.id === slot.id) ? state.slots.map(s => (s.id === slot.id ? slot : s)) : [...state.slots, slot] })

export const withoutSlot = (state: SlotsState, id: string): SlotsState =>
  ({ ...state, slots: state.slots.filter(s => s.id !== id) })

/** Free slots left, given how many the account has. */
export const freeSlots = (state: SlotsState, members: boolean): number =>
  Math.max(0, slotCount(members) - state.slots.length)

function toChange (v: unknown): OfferChange | null {
  if (!isObject(v) || !isTime(v.at) || !isGeAmount(v.price) || !isGeAmount(v.qty)) return null
  return { at: v.at, price: v.price, qty: v.qty, kind: v.kind === 'updated' ? 'updated' : 'placed' }
}

export function toSlot (v: unknown): Slot | null {
  if (!isObject(v) || typeof v.id !== 'string' || !v.id || !isGeAmount(v.itemId) || typeof v.name !== 'string') return null
  if (v.side !== 'buy' && v.side !== 'sell') return null
  if (!isGeAmount(v.price) || !isGeAmount(v.qty) || !isTime(v.placedAt)) return null
  const filled = isCount(v.filled) ? Math.min(v.filled, v.qty) : 0
  const changes = Array.isArray(v.changes) ? v.changes.map(toChange).filter((c): c is OfferChange => c !== null).slice(-MAX_CHANGES) : []
  return {
    id: v.id,
    itemId: v.itemId,
    name: v.name,
    icon: optString(v.icon),
    side: v.side,
    price: v.price,
    qty: v.qty,
    filled,
    filledValue: typeof v.filledValue === 'number' && Number.isFinite(v.filledValue) && v.filledValue >= 0 ? v.filledValue : filled * v.price,
    placedAt: v.placedAt,
    updatedAt: isTime(v.updatedAt) ? v.updatedAt : v.placedAt,
    lotId: optString(v.lotId),
    costBasis: optAmount(v.costBasis),
    target: optAmount(v.target),
    changes,
    lastKind: optString(v.lastKind),
    notifiedAt: isTime(v.notifiedAt) ? v.notifiedAt : null
  }
}

/** Keeps every valid slot; one bad record doesn't wipe the rest. */
export function parseSlots (raw: unknown): SlotsState {
  if (!isObject(raw)) return EMPTY_SLOTS
  const slots = Array.isArray(raw.slots) ? raw.slots.map(toSlot).filter((s): s is Slot => s !== null) : []
  const unique = slots.filter((s, i) => slots.findIndex(o => o.id === s.id) === i)
  return { slots: unique.slice(0, MEMBERS_SLOT_COUNT), notify: raw.notify === true }
}
