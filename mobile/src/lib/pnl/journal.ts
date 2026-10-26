// The flip journal: buys you still hold (lots) and completed flips, as plain
// data with validation. No React or Expo imports, so it runs under `node --test`.

/** GE tax for one item of `itemId` sold at `price`. Injected so this stays engine-free. */
export type ItemTaxOf = (price: number, itemId: number) => number

/** Something bought and still held. Partial sells shrink `qty`. */
export interface Lot {
  id: string
  itemId: number
  name: string
  icon: string | null
  qty: number
  buyPrice: number
  boughtAt: number
  /** Start of the buy-limit window this purchase counts against. */
  windowStart: number
  reminderId: string | null
}

/**
 * A completed (possibly partial) flip. Records saved before the journal
 * existed only kept qty, profit and sell time, so their prices are null.
 */
export interface Flip {
  id: string
  /** The lot this sale came out of; several partial sells share one. */
  lotId: string | null
  itemId: number
  name: string
  icon: string | null
  qty: number
  buyPrice: number | null
  sellPrice: number | null
  /** Total GE tax paid on this sale, or null when unknown (old records). */
  tax: number | null
  /** Realized profit after tax, whole flip. */
  profit: number
  boughtAt: number | null
  soldAt: number
}

/** Highest price or quantity the GE allows (max int). */
export const MAX_GE_INT = 2_147_483_647

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
export const isGeInt = (v: unknown): v is number => Number.isInteger(v) && (v as number) > 0 && (v as number) <= MAX_GE_INT
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0
const isGp = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const optString = (v: unknown) => (typeof v === 'string' ? v : null)

/** GE tax for `qty` items sold at `sellPrice` each: the tax is charged per item. */
export function saleTax (sellPrice: number, qty: number, itemId: number, taxOf: ItemTaxOf): number {
  return taxOf(sellPrice, itemId) * qty
}

/** Profit after tax for `qty` items: what you got, minus tax, minus what you paid. */
export function flipProfit (buyPrice: number, sellPrice: number, qty: number, tax: number): number {
  return (sellPrice - buyPrice) * qty - tax
}

export interface RealizeResult {
  flip: Flip
  /** The lot with the sold amount taken out, or null when it's all sold. */
  remaining: Lot | null
}

/**
 * Sells `qty` of a lot at `sellPrice` each. Selling more than you hold sells
 * what you hold; returns null on a bad price or amount.
 */
export function realize (lot: Lot, sellPrice: number, qty: number, soldAt: number, taxOf: ItemTaxOf, id: string): RealizeResult | null {
  if (!isGeInt(sellPrice) || !isGeInt(qty)) return null
  const sold = Math.min(qty, lot.qty)
  const tax = saleTax(sellPrice, sold, lot.itemId, taxOf)
  const flip: Flip = {
    id,
    lotId: lot.id,
    itemId: lot.itemId,
    name: lot.name,
    icon: lot.icon,
    qty: sold,
    buyPrice: lot.buyPrice,
    sellPrice,
    tax,
    profit: flipProfit(lot.buyPrice, sellPrice, sold, tax),
    boughtAt: lot.boughtAt,
    soldAt
  }
  const remaining = sold < lot.qty ? { ...lot, qty: lot.qty - sold } : null
  return { flip, remaining }
}

export function toLot (v: unknown): Lot | null {
  if (!isObject(v) || typeof v.id !== 'string' || !isGeInt(v.itemId) || typeof v.name !== 'string' ||
    !isGeInt(v.qty) || !isGeInt(v.buyPrice) || !isTime(v.boughtAt)) return null
  return {
    id: v.id,
    itemId: v.itemId,
    name: v.name,
    icon: optString(v.icon),
    qty: v.qty,
    buyPrice: v.buyPrice,
    boughtAt: v.boughtAt,
    windowStart: isTime(v.windowStart) ? v.windowStart : v.boughtAt,
    reminderId: optString(v.reminderId)
  }
}

/**
 * Reads a stored flip. Accepts the journal shape and the older sale shape
 * (`{ itemId, name, qty, profit, soldAt }`); `fallbackId` names old records,
 * which had no id.
 */
export function toFlip (v: unknown, fallbackId: string): Flip | null {
  if (!isObject(v) || !isGeInt(v.itemId) || typeof v.name !== 'string' || !isGeInt(v.qty) ||
    !isGp(v.profit) || !isTime(v.soldAt)) return null
  const buyPrice = isGeInt(v.buyPrice) ? v.buyPrice : null
  const sellPrice = isGeInt(v.sellPrice) ? v.sellPrice : null
  const tax = isGp(v.tax) && v.tax >= 0 ? v.tax : null
  return {
    id: typeof v.id === 'string' && v.id ? v.id : fallbackId,
    lotId: optString(v.lotId),
    itemId: v.itemId,
    name: v.name,
    icon: optString(v.icon),
    qty: v.qty,
    buyPrice,
    sellPrice,
    tax,
    // A complete record's profit is recomputed so it can't drift from its prices.
    profit: buyPrice !== null && sellPrice !== null && tax !== null ? flipProfit(buyPrice, sellPrice, v.qty, tax) : v.profit,
    boughtAt: isTime(v.boughtAt) ? v.boughtAt : null,
    soldAt: v.soldAt
  }
}

export interface Journal {
  lots: Lot[]
  /** Newest sale first. */
  flips: Flip[]
}

/** Stored flips kept on the phone; the oldest drop off past this. */
export const MAX_FLIPS = 10_000

export const byNewest = (a: Flip, b: Flip) => b.soldAt - a.soldAt

/**
 * Stored data, any version, to a journal. Version 1 kept `holdings` and
 * `sales` (no prices); every valid record is kept, bad ones are skipped.
 */
export function parseJournal (raw: unknown): Journal {
  if (!isObject(raw)) return { lots: [], flips: [] }
  const lotsRaw = Array.isArray(raw.lots) ? raw.lots : Array.isArray(raw.holdings) ? raw.holdings : []
  const flipsRaw = Array.isArray(raw.flips) ? raw.flips : Array.isArray(raw.sales) ? raw.sales : []
  const lots = lotsRaw.map(toLot).filter((x): x is Lot => x !== null)
  const flips = flipsRaw
    .map((f, i) => toFlip(f, `legacy-${isObject(f) && isTime(f.soldAt) ? f.soldAt : 0}-${i}`))
    .filter((x): x is Flip => x !== null)
  return { lots, flips: [...flips].sort(byNewest).slice(0, MAX_FLIPS) }
}

export interface MergeResult {
  journal: Journal
  addedLots: number
  addedFlips: number
  skipped: number
}

const firstById = <T extends { id: string }>(items: readonly T[], taken: Set<string>): T[] =>
  items.filter(item => {
    if (taken.has(item.id)) return false
    taken.add(item.id)
    return true
  })

/**
 * Adds records whose id isn't already there, so a restore never duplicates.
 * A lot already sold here (some flip came out of it) isn't brought back as open.
 */
export function mergeJournal (base: Journal, extra: Journal): MergeResult {
  const lotIds = new Set([...base.lots.map(l => l.id), ...base.flips.flatMap(f => (f.lotId ? [f.lotId] : []))])
  const newLots = firstById(extra.lots, lotIds)
  const newFlips = firstById(extra.flips, new Set(base.flips.map(f => f.id)))
  return {
    journal: {
      lots: [...base.lots, ...newLots],
      flips: [...base.flips, ...newFlips].sort(byNewest).slice(0, MAX_FLIPS)
    },
    addedLots: newLots.length,
    addedFlips: newFlips.length,
    skipped: extra.lots.length - newLots.length + extra.flips.length - newFlips.length
  }
}

/**
 * Removes a lot. Lots bought in the same buy-limit window share one reminder,
 * stored on the first lot; when that lot goes while others in the window are
 * still open, the reminder moves to one of them instead of being cancelled.
 * Returns the reminder to cancel, if nothing is left to carry it.
 */
export function dropLot (lots: readonly Lot[], id: string): { lots: Lot[]; cancel: string | null } {
  const lot = lots.find(h => h.id === id)
  const rest = lots.filter(h => h.id !== id)
  if (!lot?.reminderId) return { lots: rest, cancel: null }
  const heir = rest.find(h => h.itemId === lot.itemId && h.windowStart === lot.windowStart)
  if (!heir) return { lots: rest, cancel: lot.reminderId }
  return { lots: rest.map(h => (h === heir ? { ...h, reminderId: h.reminderId ?? lot.reminderId } : h)), cancel: null }
}
