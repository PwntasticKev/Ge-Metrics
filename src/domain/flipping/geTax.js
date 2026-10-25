// Grand Exchange sales tax: 2% of the sell price per item, rounded down,
// capped at 5M per item. Items sold under 50 gp are exempt, as are the items
// on the wiki's exemption list (bonds, teleport tablets, low-level food...).

import taxExempt from './data/taxExempt.js'

export const GE_TAX_RATE = 0.02
export const GE_TAX_CAP = 5_000_000
export const GE_TAX_MIN_PRICE = 50
export const GE_TAX_EXEMPT_IDS = new Set(taxExempt)

export function geTax (sellPrice, itemId) {
  if (!Number.isFinite(sellPrice) || sellPrice < GE_TAX_MIN_PRICE) return 0
  if (GE_TAX_EXEMPT_IDS.has(itemId)) return 0
  return Math.min(Math.floor(sellPrice * GE_TAX_RATE), GE_TAX_CAP)
}
