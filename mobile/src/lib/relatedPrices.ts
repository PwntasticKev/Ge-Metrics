import type { TimeseriesPoint } from './analytics/types.ts'

export type RelatedGroupId = 'ranarr' | 'hide' | 'crystalkey'
export type PriceSide = 'high' | 'low'
type Leg = { readonly id: number; readonly name: string; readonly quantity: number }

export const RELATED_PRICE_GROUPS = {
  ranarr: { inputs: [{ id: 207, name: 'Grimy ranarr', quantity: 1 }], output: { id: 257, name: 'Clean ranarr', quantity: 1 }, ratioUnits: 'clean ranarr / grimy ranarr' },
  hide: { inputs: [{ id: 1753, name: 'Green dragonhide', quantity: 1 }], output: { id: 1745, name: 'Green dragon leather', quantity: 1 }, ratioUnits: 'green dragon leather / green dragonhide' },
  crystalkey: { inputs: [{ id: 987, name: 'Loop half', quantity: 1 }, { id: 985, name: 'Tooth half', quantity: 1 }], output: { id: 989, name: 'Crystal key', quantity: 1 }, ratioUnits: 'crystal key / (loop half + tooth half)' }
} as const

export interface RelatedSeries { id: number; points: readonly TimeseriesPoint[] }
export interface RelatedObservation {
  id: number
  rawGP: number | null
  /** Selected-side item count; null when that observation is unusable. */
  volume: number | null
  indexed: number | null
}
export interface RelatedBucket {
  timestamp: number
  legs: RelatedObservation[]
  matched: boolean
  /** Sum(quantity × selected-side price), GP per recipe input basket. */
  inputBasketGP: number | null
  inputBasketIndexed: number | null
  /** Descriptive output GP / input-basket GP; excludes costs and tax. */
  ratio: number | null
}
export interface RelatedPrices {
  group: RelatedGroupId
  side: PriceSide
  legs: readonly Leg[]
  ratioUnits: string
  baselineTimestamp: number | null
  buckets: RelatedBucket[]
  coverage: { total: number; matched: number; fraction: number | null; perLeg: { id: number; valid: number }[] }
}

const positive = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0
const finite = (n: number): number | null => Number.isFinite(n) ? n : null
const indexed = (value: number | null, baseline: number | null) => value !== null && baseline !== null ? finite((value / baseline) * 100) : null

/** Pure, bounded transform of supplied Wiki buckets (UTC seconds). No fetching,
 * interpolation, nearest-time matching, side substitution, or inferred buckets.
 * Invalid prices/volumes are gaps; malformed identity/time structure is rejected.
 */
export function buildRelatedPrices (group: RelatedGroupId, side: PriceSide, series: readonly RelatedSeries[]): RelatedPrices {
  if (!Object.hasOwn(RELATED_PRICE_GROUPS, group)) throw new Error('Unknown related-price group')
  if (side !== 'high' && side !== 'low') throw new Error('Select high or low')
  const preset = RELATED_PRICE_GROUPS[group]
  const legs: Leg[] = [...preset.inputs, preset.output].map(leg => ({ ...leg }))
  const ids = new Set(legs.map(leg => leg.id))
  if (ids.size !== legs.length || legs.some(leg => !Number.isSafeInteger(leg.quantity) || leg.quantity <= 0)) throw new Error('Invalid recipe quantities or ids')
  const data = new Map<number, Map<number, TimeseriesPoint>>()
  const timestamps = new Set<number>()
  for (const entry of series) {
    if (!ids.has(entry.id) || data.has(entry.id)) throw new Error('Unexpected or duplicate item id')
    const rows = new Map<number, TimeseriesPoint>()
    for (const point of entry.points) {
      if (!Number.isSafeInteger(point.timestamp) || point.timestamp < 0 || rows.has(point.timestamp)) throw new Error('Invalid or duplicate timestamp')
      rows.set(point.timestamp, point)
      timestamps.add(point.timestamp)
    }
    data.set(entry.id, rows)
  }
  const buckets: RelatedBucket[] = [...timestamps].sort((a, b) => a - b).map(timestamp => {
    const observations = legs.map(({ id }) => {
      const row = data.get(id)?.get(timestamp)
      const price = side === 'high' ? row?.avgHighPrice : row?.avgLowPrice
      const volume = side === 'high' ? row?.highPriceVolume : row?.lowPriceVolume
      const valid = positive(price) && positive(volume)
      return { id, rawGP: valid ? price : null, volume: valid ? volume : null, indexed: null }
    })
    const inputs = observations.slice(0, preset.inputs.length)
    const inputBasketGP = inputs.every(p => p.rawGP !== null)
      ? finite(inputs.reduce((sum, p, i) => sum + p.rawGP! * legs[i].quantity, 0)) : null
    const output = observations[observations.length - 1].rawGP
    return {
      timestamp, legs: observations, matched: observations.every(p => p.rawGP !== null) && positive(inputBasketGP),
      inputBasketGP, inputBasketIndexed: null,
      ratio: output !== null && positive(inputBasketGP) ? finite(output * preset.output.quantity / inputBasketGP) : null
    }
  })
  const baseline = buckets.find(bucket => bucket.matched)
  for (const bucket of buckets) {
    bucket.legs.forEach((leg, i) => { leg.indexed = indexed(leg.rawGP, baseline?.legs[i].rawGP ?? null) })
    bucket.inputBasketIndexed = indexed(bucket.inputBasketGP, baseline?.inputBasketGP ?? null)
  }
  const matched = buckets.filter(bucket => bucket.matched).length
  return {
    group, side, legs, ratioUnits: preset.ratioUnits, baselineTimestamp: baseline?.timestamp ?? null, buckets,
    coverage: { total: buckets.length, matched, fraction: buckets.length ? matched / buckets.length : null,
      perLeg: legs.map(({ id }, i) => ({ id, valid: buckets.filter(bucket => bucket.legs[i].rawGP !== null).length })) }
  }
}

/** Exact endpoints, including explicit absent timestamps and per-leg gaps.
 * Changes require both endpoints; they never search for a nearby valid trade. */
export function compareRelatedTimestamps (prices: RelatedPrices, fromTimestamp: number, toTimestamp: number) {
  if (![fromTimestamp, toTimestamp].every(t => Number.isSafeInteger(t) && t >= 0)) throw new Error('Invalid selection timestamp')
  const from = prices.buckets.find(bucket => bucket.timestamp === fromTimestamp) ?? null
  const to = prices.buckets.find(bucket => bucket.timestamp === toTimestamp) ?? null
  return {
    fromTimestamp, toTimestamp, from, to,
    missingEndpoints: [from === null ? 'from' : null, to === null ? 'to' : null].filter((v): v is 'from' | 'to' => v !== null),
    legs: prices.legs.map(({ id }, i) => {
      const start = from?.legs[i] ?? null
      const end = to?.legs[i] ?? null
      return { id, from: start, to: end, changePercent: start?.rawGP != null && end?.rawGP != null ? finite((end.rawGP / start.rawGP - 1) * 100) : null }
    }),
    inputBasketChangePercent: from?.inputBasketGP != null && to?.inputBasketGP != null ? finite((to.inputBasketGP / from.inputBasketGP - 1) * 100) : null
  }
}
