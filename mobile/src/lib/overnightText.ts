// Words for the Overnight list: what its amounts really assume, and how much
// of the cash stack the night can use. Pure.
import { gpShort, heldFor, signed } from './format.ts'

/** Below this share of the stack in use, the header says the rest sits idle. */
export const IDLE_SHARE = 0.95

/** Footer for Overnight: the sizing as the offer model applies it (horizon and sell cap). */
export function overnightFooter (horizonHours: number, maxSellHours: number): string {
  const sell = Math.min(horizonHours, maxSellHours)
  return `Offers at the typical low and high of the last 24 hours, to place once and leave. Amounts are cut so the buy and then the sell fill within ${horizonHours} hours, and so the sell alone fills within ${heldFor(sell)} (your slowest sell setting) at a normal hour's pace: bigger sells rarely finish by morning. That cut, not your cash, usually sets the amount, so with a big stack part of it can sit idle overnight. In a 180-night backtest of placing these once and checking 10 hours later, slower sell limits made less, and nights made about a fifth to two-thirds of the profit shown (less with more cash). Items that moved away from those prices in the last hour, or trade less than once an hour, are left out.`
}

/** "~26M of 50M usable tonight, +650K" when cash sits idle; "Uses 49.5M of 50M tonight, +1.2M" otherwise. */
export function usableTonight (cost: number, profit: number, budget: number): string {
  if (budget > 0 && cost < budget * IDLE_SHARE) return `~${gpShort(cost)} of ${gpShort(budget)} usable tonight, ${signed(profit)}`
  return `Uses ${gpShort(cost)} of ${gpShort(budget)} tonight, ${signed(profit)}`
}
