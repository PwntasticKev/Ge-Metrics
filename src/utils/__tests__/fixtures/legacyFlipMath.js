// The web's flip math as it shipped before the switch to the shared engine.
import { calculateGETax, getItemSetProfit } from '../../utils.jsx'
import { ITEMS } from './flipFixtures.js'

// Copied verbatim from the original src/pages/AllItems/index.jsx row mapping.
export const legacyAllItemsProfit = item => {
  const highPrice = item.high ? Number(item.high) : 0
  const lowPrice = item.low ? Number(item.low) : 0
  return highPrice && lowPrice ? Math.floor(highPrice - lowPrice - calculateGETax(highPrice)) : 0
}

// getItemSetProfit writes `qty` onto the items it is given, so hand it copies.
export const legacySetRow = (recipe, items = ITEMS) => getItemSetProfit(recipe, items.map(i => ({ ...i })))
