// Grand Exchange sales tax: 2% of the sell price per item, rounded down,
// capped at 5M per item. Items sold under 50 gp and Old school bonds are exempt.

export const GE_TAX_RATE = 0.02
export const GE_TAX_CAP = 5_000_000
export const GE_TAX_MIN_PRICE = 50
export const GE_TAX_EXEMPT_IDS = new Set([13190]) // Old school bond

export function geTax (sellPrice, itemId) {
  if (!Number.isFinite(sellPrice) || sellPrice < GE_TAX_MIN_PRICE) return 0
  if (GE_TAX_EXEMPT_IDS.has(itemId)) return 0
  return Math.min(Math.floor(sellPrice * GE_TAX_RATE), GE_TAX_CAP)
}
