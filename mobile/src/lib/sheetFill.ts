// The item sheet's realistic flip: the canonical offer (lib/offer) for one
// item over the Next 4 hours window, so the sheet, Buy now, Plan, the scanner
// and the share card agree. Bulk-only until the item's 1h series loads, then
// refined. The engine's instant prices (live low and high) stay alongside as
// the secondary numbers. Pure; tax is passed in.
import type { TimeseriesPoint } from './analytics/types.ts'
import { realisticOffer, type OfferItem, type RealisticOffer, type TaxOfItem } from './offer.ts'
import { PICK_HORIZON_HOURS } from './pickFill.ts'
import type { SideAverages } from './scanMath.ts'

/** Hours a sheet's offers have to buy and sell: the same as Next 4 hours (2h, see pickFill). */
export const SHEET_HORIZON_HOURS = PICK_HORIZON_HOURS.quick

export type { TaxOfItem }
export type SheetFill = RealisticOffer

export interface SheetFillInput {
  item: OfferItem
  hour: SideAverages | undefined
  day: SideAverages | undefined
  /** The item's 1h series once loaded. */
  series?: readonly TimeseriesPoint[]
  /** Settings: slowest sell to show, and cash per 4h (null = no limit). */
  maxSellHours: number
  budget: number | null
  tax: TaxOfItem
  horizon?: number
}

/** Null when a side hasn't traded enough to name a realistic price. */
export function sheetFill (input: SheetFillInput): SheetFill | null {
  return realisticOffer({ ...input, horizon: input.horizon ?? SHEET_HORIZON_HOURS })
}
