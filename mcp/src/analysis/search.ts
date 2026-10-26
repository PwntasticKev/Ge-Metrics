import type { IdMap, LatestPrice, MappingEntry } from '../wiki/types.js'
import { quote } from './quote.js'
import { matchItems } from './resolve.js'

export interface SearchInput {
  readonly mapping: readonly MappingEntry[]
  readonly latest: IdMap<LatestPrice>
  readonly volumes: IdMap<number>
  readonly query: string
  readonly limit: number
}

export function searchItems ({ mapping, latest, volumes, query, limit }: SearchInput) {
  return matchItems(mapping, query).slice(0, limit).map(entry => {
    const q = quote(entry.id, latest.get(entry.id))
    return {
      id: entry.id,
      name: entry.name,
      buyAt: q.buyAt,
      sellAt: q.sellAt,
      marginAfterTax: q.margin,
      roiPct: q.roiPct,
      limit: entry.limit,
      dailyVolume: volumes.get(entry.id) ?? null,
      members: entry.members
    }
  })
}
