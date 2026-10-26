// Small statistics helpers for the market scanner. Pure; no imports.

/** Average buy/sell prices and item counts for one window (wiki /5m, /1h, /24h shape). */
export interface SideAverages {
  avgHighPrice: number | null
  avgLowPrice: number | null
  highPriceVolume: number
  lowPriceVolume: number
}

export type Averages = Readonly<Record<string, SideAverages>>

/** Items traded on both sides. */
export const tradesOf = (a: SideAverages): number => a.highPriceVolume + a.lowPriceVolume

/** Midpoint of the average buy and sell price; null unless both sides traded. */
export function midOf (a: SideAverages | undefined | null): number | null {
  if (!a || !a.avgHighPrice || !a.avgLowPrice) return null
  return (a.avgHighPrice + a.avgLowPrice) / 2
}

/** Each side must carry at least this share of a window's trades for its mid to count. */
export const MIN_SIDE_SHARE = 0.05

/**
 * Mid price only when both sides traded in proportion: an hour of 2,000
 * instant-buys and 9 lowball sells has a meaningless average low.
 */
export function balancedMid (a: SideAverages | undefined | null, minShare = MIN_SIDE_SHARE): number | null {
  if (!a) return null
  const floor = Math.max(1, tradesOf(a) * minShare)
  if (a.highPriceVolume < floor || a.lowPriceVolume < floor) return null
  return midOf(a)
}

/** to / from - 1, or null when either is missing. */
export function changeRatio (from: number | null, to: number | null): number | null {
  return from && to ? to / from - 1 : null
}

export function mean (values: readonly number[]): number {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : NaN
}

export function median (values: readonly number[]): number {
  if (!values.length) return NaN
  const sorted = [...values].sort((a, b) => a - b)
  const m = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2
}

/** Population standard deviation. */
export function stdDev (values: readonly number[]): number {
  const m = mean(values)
  return Math.sqrt(mean(values.map(v => (v - m) ** 2)))
}

/** Median absolute deviation scaled to match a standard deviation on normal data. */
export function robustSigma (values: readonly number[]): number {
  const m = median(values)
  return 1.4826 * median(values.map(v => Math.abs(v - m)))
}

export interface LineFit {
  slope: number
  intercept: number
  /** Share of the variance the line explains, 0 to 1. */
  r2: number
}

/** Least-squares line through (x, y); null with fewer than 3 points or no spread in x. */
export function fitLine (xs: readonly number[], ys: readonly number[]): LineFit | null {
  const n = Math.min(xs.length, ys.length)
  if (n < 3) return null
  const mx = mean(xs.slice(0, n))
  const my = mean(ys.slice(0, n))
  let sxx = 0
  let sxy = 0
  let syy = 0
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - mx) ** 2
    sxy += (xs[i] - mx) * (ys[i] - my)
    syy += (ys[i] - my) ** 2
  }
  if (sxx === 0) return null
  const slope = sxy / sxx
  const r2 = syy === 0 ? 1 : (sxy * sxy) / (sxx * syy)
  return { slope, intercept: my - slope * mx, r2 }
}
