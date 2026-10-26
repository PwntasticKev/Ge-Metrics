// Small robust statistics for the timing analytics. Pure, no React Native.

/** Median of finite numbers; null for an empty list. */
export function median (values: readonly number[]): number | null {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (!sorted.length) return null
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * One-sided sign test: the chance of at least `wins` successes in `trials`
 * fair coin flips. Small values mean the pattern is unlikely to be luck.
 */
export function signTestP (wins: number, trials: number): number {
  if (trials <= 0) return 1
  let p = 0
  // C(n, k) / 2^n summed for k >= wins, built up in log space for stability.
  for (let k = Math.max(0, wins); k <= trials; k++) p += Math.exp(logChoose(trials, k) - trials * Math.LN2)
  return Math.min(1, p)
}

function logChoose (n: number, k: number): number {
  let sum = 0
  for (let i = 1; i <= k; i++) sum += Math.log(n - k + i) - Math.log(i)
  return sum
}

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))
