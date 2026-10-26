// Words for fill times and slow offers. Pure.
import type { SlotRate } from './analytics/fillTime.ts'
import { MAX_CYCLE_MULTIPLE, type SlowReason } from './fillAware.ts'
import { duration, gpFull, qty } from './format.ts'

/** "Fills in ~2.5h (sell ~1.5h)": buy then sell, for a row's note line. */
export function fillsIn (rate: SlotRate): string {
  return Number.isFinite(rate.cycleHours) ? `Fills in ${duration(rate.cycleHours)} (sell ${duration(rate.sellHours)})` : 'Rarely fills at these prices'
}

/** One line on why an offer is in "Slow to fill". */
export function slowText (reason: SlowReason, maxHours: number): string {
  const what = `${reason.side === 'sell' ? 'Selling' : 'Buying'} ${qty(reason.qty)} at ${gpFull(reason.price)}`
  if (!Number.isFinite(reason.hours)) return `${what} rarely fills: the market hasn't traded at that price with any volume lately.`
  return reason.side === 'sell'
    ? `${what} takes ${duration(reason.hours)}, longer than ${maxHours}h.`
    : `${what} takes ${duration(reason.hours)}; with the sell that's over ${maxHours * MAX_CYCLE_MULTIPLE}h.`
}

/** Short form for a row's meta line. */
export function slowShort (reason: SlowReason): string {
  return `${reason.side === 'sell' ? 'sell' : 'buy'} ${Number.isFinite(reason.hours) ? duration(reason.hours) : 'rarely fills'}`
}

/** Why a Buy now pick can't fill even one item in its window. */
export function pickSlowText (rate: SlotRate, horizonHours: number): string {
  if (!Number.isFinite(rate.cycleHours) || rate.units <= 0) {
    return `${Number.isFinite(rate.sellHours) ? 'The buy' : 'The sell'} rarely fills: the market hasn't traded at that price with any volume lately.`
  }
  const each = (hours: number) => duration(hours / rate.units)
  return `Buying and selling one takes ${each(rate.cycleHours)} (buy ${each(rate.buyHours)}, sell ${each(rate.sellHours)}), longer than the ${horizonHours}h window.`
}

/** Subtle marker for numbers from the bulk averages only (not yet refined with history). */
export const ESTIMATE_MARK = 'est.'

/** "1,495 in 2h", with " · est." while the numbers are bulk-only. */
export function amountCaption (amount: number, window: string, refined: boolean): string {
  return `${qty(amount)} ${window}${refined ? '' : ` · ${ESTIMATE_MARK}`}`
}

