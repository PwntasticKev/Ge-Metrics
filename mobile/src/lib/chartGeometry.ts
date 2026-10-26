// Pixel geometry for the item price chart: sell (high) and buy (low) lines,
// stacked volume bars, min/max points and the range's change. Pure, so the
// chart component only draws strings and the math is testable with node.

export interface SeriesPoint {
  /** Period start, ms. */
  time: number
  high: number | null
  low: number | null
  highVolume: number
  lowVolume: number
}

export interface Extreme {
  index: number
  value: number
  x: number
  y: number
}

export interface ChartGeometry {
  width: number
  priceHeight: number
  volumeHeight: number
  start: number
  end: number
  highPath: string
  lowPath: string
  /** Bars for volume traded at the high (sell) and low (buy) price, as one path each. */
  highVolumePath: string
  lowVolumePath: string
  xs: number[]
  min: Extreme
  max: Extreme
  /** Mid price change from the first to the last point. */
  change: number | null
  xOf: (time: number) => number
  yOf: (price: number) => number
}

export interface ChartSize {
  width: number
  priceHeight: number
  volumeHeight: number
  /** Room above the max and below the min for their labels. */
  pad: number
}

const BAR_GAP_RATIO = 0.25
const MIN_BAR_WIDTH = 0.6

export function midOf (p: Pick<SeriesPoint, 'high' | 'low'>): number | null {
  if (p.high !== null && p.low !== null) return (p.high + p.low) / 2
  return p.high ?? p.low
}

export function relativeChange (from: number | null, to: number | null): number | null {
  return from && to ? (to - from) / from : null
}

function linePath (points: readonly SeriesPoint[], key: 'high' | 'low', xs: readonly number[], yOf: (v: number) => number): string {
  const parts: string[] = []
  points.forEach((p, i) => {
    const v = p[key]
    if (v === null) return
    parts.push(`${parts.length ? 'L' : 'M'}${xs[i].toFixed(1)},${yOf(v).toFixed(1)}`)
  })
  return parts.join('')
}

function extremes (points: readonly SeriesPoint[]): { min: { index: number; value: number }; max: { index: number; value: number } } | null {
  let min: { index: number; value: number } | null = null
  let max: { index: number; value: number } | null = null
  points.forEach((p, index) => {
    for (const value of [p.high, p.low]) {
      if (value === null) continue
      if (!min || value < min.value) min = { index, value }
      if (!max || value > max.value) max = { index, value }
    }
  })
  return min && max ? { min, max } : null
}

function volumePaths (points: readonly SeriesPoint[], xs: readonly number[], barWidth: number, size: ChartSize): { high: string; low: string } {
  const top = size.priceHeight
  const bottom = top + size.volumeHeight
  const most = Math.max(1, ...points.map(p => p.highVolume + p.lowVolume))
  let high = ''
  let low = ''
  points.forEach((p, i) => {
    const total = p.highVolume + p.lowVolume
    if (!total) return
    const x = (xs[i] - barWidth / 2).toFixed(1)
    const w = barWidth.toFixed(1)
    const lowH = (p.lowVolume / most) * size.volumeHeight
    const highH = (p.highVolume / most) * size.volumeHeight
    if (lowH > 0) low += `M${x},${(bottom - lowH).toFixed(1)}h${w}v${lowH.toFixed(1)}h-${w}Z`
    if (highH > 0) high += `M${x},${(bottom - lowH - highH).toFixed(1)}h${w}v${highH.toFixed(1)}h-${w}Z`
  })
  return { high, low }
}

/** Null when there are fewer than two prices to draw. */
export function buildChart (points: readonly SeriesPoint[], size: ChartSize): ChartGeometry | null {
  const range = extremes(points)
  if (!range || points.length < 2 || size.width <= 0) return null
  const start = points[0].time
  const end = points[points.length - 1].time
  const span = Math.max(1, end - start)
  const xOf = (time: number) => ((time - start) / span) * size.width
  const plotHeight = size.priceHeight - size.pad * 2
  const priceSpan = range.max.value - range.min.value || 1
  const yOf = (price: number) => size.pad + (1 - (price - range.min.value) / priceSpan) * plotHeight
  const xs = points.map(p => xOf(p.time))
  const slot = size.width / points.length
  const barWidth = Math.max(MIN_BAR_WIDTH, slot * (1 - BAR_GAP_RATIO))
  const volume = volumePaths(points, xs, barWidth, size)
  const firstMid = points.map(midOf).find(v => v !== null) ?? null
  const lastMid = [...points].reverse().map(midOf).find(v => v !== null) ?? null
  const extreme = (e: { index: number; value: number }): Extreme => ({ ...e, x: xs[e.index], y: yOf(e.value) })
  return {
    width: size.width,
    priceHeight: size.priceHeight,
    volumeHeight: size.volumeHeight,
    start,
    end,
    highPath: linePath(points, 'high', xs, yOf),
    lowPath: linePath(points, 'low', xs, yOf),
    highVolumePath: volume.high,
    lowVolumePath: volume.low,
    xs,
    min: extreme(range.min),
    max: extreme(range.max),
    change: relativeChange(firstMid, lastMid),
    xOf,
    yOf
  }
}

/** Index of the point closest to `x` (xs ascending). */
export function nearestIndex (xs: readonly number[], x: number): number {
  if (!xs.length) return -1
  let lo = 0
  let hi = xs.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (xs[mid] <= x) lo = mid
    else hi = mid
  }
  return Math.abs(xs[hi] - x) < Math.abs(xs[lo] - x) ? hi : lo
}

/** Index of the item whose x is closest to `x`, if within `maxDistance`. */
export function nearestWithin (xs: readonly number[], x: number, maxDistance: number): number {
  let best = -1
  xs.forEach((value, i) => {
    const d = Math.abs(value - x)
    if (d <= maxDistance && (best < 0 || d < Math.abs(xs[best] - x))) best = i
  })
  return best
}
