// How much of an hour's real flow a resting GE offer gets. The wiki splits each
// hour by side: lowPriceVolume = items instant-sold into buy offers,
// highPriceVolume = items instant-bought from sell offers, with their average
// prices. A buy offer at `bid` can only fill in an hour whose average
// instant-sell price was at or under the bid, and then only a share of it:
// other offers at the same price queue ahead (base participation), while a bid
// above the hour's average low gets first pick of more of the flow, up to all
// of it at the hour's average high. Sells mirror this on the high side.

import { clamp } from '../analysis/stats.js'
import type { AveragePrice } from '../wiki/types.js'

/** Share of qualifying volume an offer at the typical price gets. */
export const DEFAULT_PARTICIPATION = 0.25

function share (base: number, outbid: number, spread: number): number {
  const position = spread > 0 ? clamp(outbid / spread, 0, 1) : 0
  return base + (1 - base) * position
}

/** Items a buy offer at `bid` could take from this hour (fractional; the caller floors). */
export function buyCapacity (a: AveragePrice | undefined, bid: number, base: number): number {
  if (!a || a.avgLowPrice === null || a.lowPriceVolume <= 0 || a.avgLowPrice > bid) return 0
  const high = a.avgHighPrice ?? a.avgLowPrice
  return a.lowPriceVolume * share(base, bid - a.avgLowPrice, high - a.avgLowPrice)
}

/** Items a sell offer at `ask` could sell into this hour. */
export function sellCapacity (a: AveragePrice | undefined, ask: number, base: number): number {
  if (!a || a.avgHighPrice === null || a.highPriceVolume <= 0 || a.avgHighPrice < ask) return 0
  const low = a.avgLowPrice ?? a.avgHighPrice
  return a.highPriceVolume * share(base, a.avgHighPrice - ask, a.avgHighPrice - low)
}
