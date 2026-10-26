// Geometry for the daily profit chart: bars above a zero line for winning
// days, below it for losing days, plus a cumulative line on its own scale.

import type { DayBar } from './summary.ts'

export interface BarRect { x: number, y: number, width: number, height: number, loss: boolean }

export interface ProfitChartGeometry {
  bars: BarRect[]
  zeroY: number
  /** SVG path of the running total. */
  linePath: string
  lineEnd: { x: number, y: number } | null
}

const GAP_SHARE = 0.25
/** A day that made or lost anything still gets a visible sliver. */
const MIN_BAR = 1.5

export function profitChartGeometry (days: readonly DayBar[], width: number, height: number, pad = 4): ProfitChartGeometry {
  const n = days.length
  if (!n || width <= 0 || height <= 0) return { bars: [], zeroY: height / 2, linePath: '', lineEnd: null }
  const top = pad
  const bottom = height - pad
  const span = (lo: number, hi: number) => (hi - lo || 1)

  const hi = Math.max(0, ...days.map(d => d.profit))
  const lo = Math.min(0, ...days.map(d => d.profit))
  const yOf = (v: number) => bottom - ((v - lo) / span(lo, hi)) * (bottom - top)
  const zeroY = yOf(0)

  const slot = width / n
  const barWidth = Math.max(1, slot * (1 - GAP_SHARE))
  const bars = days.map((d, i) => {
    const y = yOf(d.profit)
    const raw = Math.abs(y - zeroY)
    const h = d.profit === 0 ? 0 : Math.max(MIN_BAR, raw)
    return { x: i * slot + (slot - barWidth) / 2, y: d.profit >= 0 ? zeroY - h : zeroY, width: barWidth, height: h, loss: d.profit < 0 }
  })

  const cHi = Math.max(0, ...days.map(d => d.cumulative))
  const cLo = Math.min(0, ...days.map(d => d.cumulative))
  const cy = (v: number) => bottom - ((v - cLo) / span(cLo, cHi)) * (bottom - top)
  const points = days.map((d, i) => ({ x: i * slot + slot / 2, y: cy(d.cumulative) }))
  const linePath = points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('')
  return { bars, zeroY, linePath, lineEnd: points[points.length - 1] }
}
