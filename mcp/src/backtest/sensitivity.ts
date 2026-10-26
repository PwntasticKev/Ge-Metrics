// How much the conclusions depend on the simulator's one free assumption: the
// share of an hour's qualifying volume a resting offer gets.

import type { Summary } from './metrics.js'

const gp = (n: number) => `${(n / 1e6).toFixed(2)}M`

export function sensitivitySection (base: readonly Summary[], variants: Readonly<Record<string, readonly Summary[]>>, baseParticipation: number): string {
  const levels = [...Object.keys(variants).map(Number), baseParticipation].sort((a, b) => a - b)
  const byLevel = (level: number, key: string) =>
    (level === baseParticipation ? base : variants[String(level)] ?? []).find(s => s.key === key)
  const header = `| Strategy | ${levels.map(l => `${Math.round(l * 100)}% participation`).join(' | ')} |`
  const sep = `|---|${levels.map(() => '---:').join('|')}|`
  const rows = [...base].sort((a, b) => b.realizedProfit - a.realizedProfit).map(s =>
    `| ${s.label} | ${levels.map(l => {
      const v = byLevel(l, s.key)
      return v ? `${gp(v.realizedProfit)} (${v.buyFillRate === null ? 'n/a' : Math.round(v.buyFillRate * 100)}% fill)` : 'n/a'
    }).join(' | ')} |`)
  return ['## Sensitivity to queue share', '', 'Realized profit (and buy fill rate) if a resting offer gets a smaller or larger share of each qualifying hour\'s volume.', '', header, sep, ...rows].join('\n')
}
