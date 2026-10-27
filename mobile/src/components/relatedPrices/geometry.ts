import type { RelatedPrices } from '../../lib/relatedPrices.ts'

/** Each discontinuity starts a new SVG subpath; never bridge missing buckets. */
export function indexedPath (prices: RelatedPrices, leg: number, x: (t: number) => number, y: (v: number) => number): string {
  let previous: number | null = null
  return prices.buckets.map(bucket => {
    const value = bucket.legs[leg].indexed
    if (value === null) { previous = null; return '' }
    const command = previous !== null && bucket.timestamp - previous === 3600 ? 'L' : 'M'
    previous = bucket.timestamp
    return `${command}${x(bucket.timestamp)},${y(value)}`
  }).join(' ')
}

/** Refresh can expire a selected bucket; use explicit window edges, never nearest trades. */
export function reconcileSelection (timestamps: readonly number[], selection: { from: number; to: number } | null) {
  if (!timestamps.length) return null
  const valid = new Set(timestamps)
  const from = selection && valid.has(selection.from) ? selection.from : timestamps[0]
  const to = selection && valid.has(selection.to) ? selection.to : timestamps[timestamps.length - 1]
  return { from, to, reset: selection !== null && (from !== selection.from || to !== selection.to) }
}
