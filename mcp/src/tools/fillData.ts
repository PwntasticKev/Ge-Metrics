// Bulk data every fill-aware listing needs: realistic prices come from the
// /1h and /24h averages (plus /latest), pumps from the /5m prints.

import { geTax } from '@ge/engine'
import type { BulkPrices } from '../analysis/fills/candidates.js'
import { flagSpikes } from '../analysis/scanner/report.js'
import type { PriceSource } from '../wiki/prices.js'
import type { MappingEntry } from '../wiki/types.js'

export const tax = (price: number, id: number): number => geTax(price, id)

export interface FillData {
  readonly mapping: readonly MappingEntry[]
  readonly mappingById: ReadonlyMap<number, MappingEntry>
  readonly bulk: BulkPrices
  /** Items in a thin-volume pump right now. */
  readonly pumps: ReadonlySet<number>
}

export async function loadFillData (prices: PriceSource): Promise<FillData> {
  const [mapping, latest, h1, h24, m5] = await Promise.all([
    prices.mapping(), prices.latest(), prices.averages('1h'), prices.averages('24h'), prices.averages('5m')
  ])
  const pumps = new Set(flagSpikes({ mapping, h1, h24, m5 }).filter(f => f.flag.kind === 'pump').map(f => f.entry.id))
  return { mapping, mappingById: new Map(mapping.map(m => [m.id, m])), bulk: { latest, h1, h24 }, pumps }
}
