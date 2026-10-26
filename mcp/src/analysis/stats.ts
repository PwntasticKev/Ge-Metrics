// Small robust statistics shared by the timing, scanner and spike analytics.
// Ported from the GE Metrics app (mobile/src/lib/analytics/stats.ts and
// mobile/src/lib/scanMath.ts). Pure.

/** Median of the finite numbers; null for an empty list. */
export function median (values: readonly number[]): number | null {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  const n = sorted.length
  if (!n) return null
  const hi = sorted[n >> 1] as number
  return n % 2 ? hi : ((sorted[(n >> 1) - 1] as number) + hi) / 2
}

export const mean = (values: readonly number[]): number =>
  values.length ? values.reduce((s, v) => s + v, 0) / values.length : Number.NaN

/** Population standard deviation. */
export function stdDev (values: readonly number[]): number {
  const m = mean(values)
  return Math.sqrt(mean(values.map(v => (v - m) ** 2)))
}

/** Median absolute deviation, scaled to match a standard deviation on normal data. */
export function robustSigma (values: readonly number[]): number {
  const m = median(values)
  if (m === null) return Number.NaN
  return 1.4826 * (median(values.map(v => Math.abs(v - m))) ?? Number.NaN)
}

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

function logChoose (n: number, k: number): number {
  let sum = 0
  for (let i = 1; i <= k; i++) sum += Math.log(n - k + i) - Math.log(i)
  return sum
}

/**
 * One-sided sign test: the chance of at least `wins` successes in `trials`
 * fair coin flips. Small values mean the pattern is unlikely to be luck.
 */
export function signTestP (wins: number, trials: number): number {
  if (trials <= 0) return 1
  let p = 0
  for (let k = Math.max(0, wins); k <= trials; k++) p += Math.exp(logChoose(trials, k) - trials * Math.LN2)
  return Math.min(1, p)
}

export interface LineFit {
  readonly slope: number
  readonly intercept: number
  /** Share of the variance the line explains, 0 to 1. */
  readonly r2: number
}

/** Least-squares line through (x, y); null with fewer than 3 points or no spread in x. */
export function fitLine (xs: readonly number[], ys: readonly number[]): LineFit | null {
  const n = Math.min(xs.length, ys.length)
  if (n < 3) return null
  const x = xs.slice(0, n)
  const y = ys.slice(0, n)
  const mx = mean(x)
  const my = mean(y)
  let sxx = 0
  let sxy = 0
  let syy = 0
  for (let i = 0; i < n; i++) {
    const dx = (x[i] as number) - mx
    const dy = (y[i] as number) - my
    sxx += dx * dx
    sxy += dx * dy
    syy += dy * dy
  }
  if (sxx === 0) return null
  const slope = sxy / sxx
  return { slope, intercept: my - slope * mx, r2: syy === 0 ? 1 : (sxy * sxy) / (sxx * syy) }
}

export const isNumber = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v)
