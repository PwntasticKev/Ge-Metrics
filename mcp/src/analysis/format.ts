// Number helpers that keep tool output short and readable for a model.

export const round = (n: number, digits = 2): number => {
  const f = 10 ** digits
  return Math.round(n * f) / f
}

// Ratio -> percentage with 2 decimals; null when not computable.
export const pct = (ratio: number | null | undefined): number | null =>
  ratio === null || ratio === undefined || !Number.isFinite(ratio) ? null : round(ratio * 100)

export const change = (from: number | null, to: number | null): number | null =>
  from === null || to === null || from === 0 ? null : pct(to / from - 1)

// Midpoint of the two sides of the book, or whichever side is known.
export const mid = (high: number | null, low: number | null): number | null => {
  if (high !== null && low !== null) return (high + low) / 2
  return high ?? low
}

export const isoTime = (unixSec: number | null): string | null =>
  unixSec === null ? null : new Date(unixSec * 1000).toISOString()

export const isoDate = (unixSec: number): string => new Date(unixSec * 1000).toISOString().slice(0, 10)
