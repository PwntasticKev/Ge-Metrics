// Full snapshot of one item: live quote, rolling averages, alching.

import { geTax } from '@ge/engine'
import type { AveragePrice, LatestPrice, MappingEntry } from '../wiki/types.js'
import { isoTime, round } from './format.js'
import { quote } from './quote.js'

export const NATURE_RUNE_ID = 561

export interface ItemDetailInput {
  readonly entry: MappingEntry
  readonly latest: LatestPrice | undefined
  readonly averages: { readonly '5m'?: AveragePrice; readonly '1h'?: AveragePrice; readonly '24h'?: AveragePrice }
  readonly dailyVolume: number | null
  readonly natureRunePrice: number | null
  readonly nowSec: number
}

const window = (avg: AveragePrice | undefined) =>
  avg
    ? {
      avgHigh: avg.avgHighPrice === null ? null : Math.round(avg.avgHighPrice),
      avgLow: avg.avgLowPrice === null ? null : Math.round(avg.avgLowPrice),
      highVolume: avg.highPriceVolume,
      lowVolume: avg.lowPriceVolume
    }
    : null

const ageMin = (nowSec: number, t: number | null) => (t === null ? null : round((nowSec - t) / 60, 1))

export function itemDetail ({ entry, latest, averages, dailyVolume, natureRunePrice, nowSec }: ItemDetailInput) {
  const q = quote(entry.id, latest)
  const limit = entry.limit
  // High alch: buy at the insta-buy price (what you'd actually pay fast) plus a nature rune.
  const alchCost = latest?.high ?? null
  const highAlchProfit = entry.highalch !== null && alchCost !== null && natureRunePrice !== null
    ? entry.highalch - alchCost - natureRunePrice
    : null

  return {
    id: entry.id,
    name: entry.name,
    examine: entry.examine,
    members: entry.members,
    wiki: `https://oldschool.runescape.wiki/w/Special:Lookup?type=item&id=${entry.id}`,
    latest: {
      instaBuy: latest?.high ?? null,
      instaBuyAt: isoTime(latest?.highTime ?? null),
      instaBuyAgeMin: ageMin(nowSec, latest?.highTime ?? null),
      instaSell: latest?.low ?? null,
      instaSellAt: isoTime(latest?.lowTime ?? null),
      instaSellAgeMin: ageMin(nowSec, latest?.lowTime ?? null)
    },
    averages: { '5m': window(averages['5m']), '1h': window(averages['1h']), '24h': window(averages['24h']) },
    dailyVolume,
    flip: {
      buyAt: q.buyAt,
      sellAt: q.sellAt,
      tax: q.tax,
      taxExempt: q.sellAt !== null && q.sellAt >= 50 && geTax(q.sellAt, entry.id) === 0,
      marginAfterTax: q.margin,
      roiPct: q.roiPct,
      limit,
      profitPerLimit: q.margin !== null && limit !== null ? q.margin * limit : null
    },
    alch: {
      highalch: entry.highalch,
      lowalch: entry.lowalch,
      natureRunePrice,
      highAlchProfit
    }
  }
}
