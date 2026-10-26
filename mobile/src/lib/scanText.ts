// Row and card wording for the market scanner. Pure.
import type { Breadth, Mood } from './breadth.ts'

export function signedPct (ratio: number | null, digits = 1): string {
  if (ratio === null || !Number.isFinite(ratio)) return '–'
  const pct = (ratio * 100).toFixed(digits)
  return `${ratio >= 0 ? '+' : ''}${pct === `-${(0).toFixed(digits)}` ? (0).toFixed(digits) : pct}%`
}

export function multipleText (m: number): string {
  return m >= 100 ? '99×+' : `${m >= 10 ? Math.round(m) : m.toFixed(1)}×`
}

export const MOOD_LABEL: Record<Mood, string> = {
  'risk-on': 'Risk-on',
  'risk-off': 'Risk-off',
  mixed: 'Mixed'
}

/** "412 up · 288 down · 300 flat" as shares of the counted items. */
export function breadthShares (b: Breadth): { up: number; down: number; flat: number } {
  if (!b.counted) return { up: 0, down: 0, flat: 0 }
  const share = (n: number) => Math.round((n / b.counted) * 100)
  return { up: share(b.up), down: share(b.down), flat: share(b.flat) }
}
