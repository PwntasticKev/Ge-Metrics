// Markdown tables for the regime-gate study across several periods. Pure:
// takes the per-period JSON dumps written by regime/main.ts.

import type { GateRow, GateStats, SignalRow } from './study.js'

export interface PeriodDump {
  readonly label: string
  readonly firstDecision: number
  readonly endT: number
  readonly rows: readonly GateRow[]
  readonly signals: readonly SignalRow[]
  readonly folds: readonly { readonly test: { readonly start: number } }[]
  readonly updates: readonly { readonly date: string; readonly title: string; readonly items: number; readonly keyword: boolean }[]
}

export const WF_GATES = ['none', 'breadth', 'update', 'volatility', 'equity', 'market', 'all', 'any'] as const
/** A gate "robustly helps" a family when it is >= the ungated default in every period and costs the best period at most this share. */
export const MAX_GOOD_PERIOD_COST = 0.1

export const fmtM = (v: number): string => (Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : `${Math.round(v / 1e3)}k`)
const signed = (v: number) => `${v >= 0 ? '+' : ''}${fmtM(v)}`
const pct = (x: number | null) => (x === null ? '' : `${Math.round(x * 100)}%`)
const day = (t: number) => new Date(t * 1000).toISOString().slice(0, 10)

const rowOf = (p: PeriodDump, family: string, gate: string): GateRow | undefined =>
  p.rows.find(r => r.family === family && r.gate === gate && (gate === 'none' ? r.mode === 'baseline' : r.mode !== 'baseline'))

export const families = (periods: readonly PeriodDump[]): string[] => [...new Set(periods.flatMap(p => p.rows.map(r => r.family)))]

export interface Verdict {
  readonly family: string
  readonly gate: string
  readonly deltas: readonly number[]
  readonly robust: boolean
}

export function verdicts (periods: readonly PeriodDump[]): Verdict[] {
  return families(periods).flatMap(family => WF_GATES.filter(g => g !== 'none').map(gate => {
    const deltas = periods.map(p => (rowOf(p, family, gate)?.stats.profit ?? 0) - (rowOf(p, family, 'none')?.stats.profit ?? 0))
    const bases = periods.map(p => rowOf(p, family, 'none')?.stats.profit ?? 0)
    const best = Math.max(...bases)
    const robust = deltas.every(d => d >= 0) && deltas.some(d => d > 0) &&
      deltas.every((d, k) => bases[k] !== best || best <= 0 || d >= -MAX_GOOD_PERIOD_COST * best)
    return { family, gate, deltas, robust }
  }))
}

function statCells (s: GateStats, base: GateStats): string {
  return `${fmtM(s.profit)} | ${signed(s.profit - base.profit)} | ${s.foldsPositive}/${s.tests.length} | ${fmtM(s.worst)} | ${pct(s.maxDrawdownPct)} | ${pct(s.tradingShare)} | ${pct(s.lossPct)} | ${fmtM(s.realized)}`
}

export function familyTable (periods: readonly PeriodDump[], family: string): string {
  const head = '| Gate (walk-forward) | Period | OOS profit | vs none | Windows > 0 | Worst window | Max DD | Trading | Losing picks | Realized |\n|---|---|---:|---:|---:|---:|---:|---:|---:|---:|'
  const lines = WF_GATES.flatMap(gate => periods.flatMap(p => {
    const r = rowOf(p, family, gate)
    const base = rowOf(p, family, 'none')
    return r && base ? [`| ${gate} | ${p.label} | ${statCells(r.stats, base.stats)} |`] : []
  }))
  return `**${family}**\n\n${head}\n${lines.join('\n')}`
}

export function summaryTable (periods: readonly PeriodDump[]): string {
  const v = verdicts(periods)
  const head = `| Family | Gate | ${periods.map(p => `${p.label} vs none`).join(' | ')} | Total | Robust |\n|---|---|${periods.map(() => '---:').join('|')}|---:|---|`
  const lines = v.map(x => `| ${x.family} | ${x.gate} | ${x.deltas.map(signed).join(' | ')} | ${signed(x.deltas.reduce((s, d) => s + d, 0))} | ${x.robust ? 'yes' : 'no'} |`)
  return `${head}\n${lines.join('\n')}`
}

/** Fixed (never re-tuned) configs that beat the ungated default in every period, best worst-case first. */
export function fixedTable (periods: readonly PeriodDump[], family: string, top = 8): string {
  const keys = [...new Set(periods.flatMap(p => p.rows.filter(r => r.family === family && r.mode === 'fixed').map(r => r.gate)))]
  const scored = keys.map(gate => {
    const cells = periods.map(p => {
      const r = p.rows.find(x => x.family === family && x.mode === 'fixed' && x.gate === gate)
      const base = rowOf(p, family, 'none')
      return r && base ? { d: r.stats.profit - base.stats.profit, s: r.stats } : null
    })
    return { gate, cells, minDelta: Math.min(...cells.map(c => c?.d ?? -Infinity)) }
  }).sort((a, b) => b.minDelta - a.minDelta).slice(0, top)
  const head = `| Fixed gate | ${periods.map(p => `${p.label} vs none | trading`).join(' | ')} |\n|---|${periods.map(() => '---:|---:').join('|')}|`
  const lines = scored.map(x => `| ${x.gate} | ${x.cells.map(c => (c ? `${signed(c.d)} | ${pct(c.s.tradingShare)}` : ' | ')).join(' | ')} |`)
  return `**${family}** (top ${top} by worst period; chosen with hindsight across periods)\n\n${head}\n${lines.join('\n')}`
}

export function choiceTable (periods: readonly PeriodDump[], family: string): string {
  const lines = periods.flatMap(p => WF_GATES.filter(g => g !== 'none').map(gate => {
    const r = rowOf(p, family, gate)
    const counts = new Map<string, number>()
    for (const k of r?.chosen ?? []) counts.set(k, (counts.get(k) ?? 0) + 1)
    const top = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => `${k} ${n}`).join('; ')
    return `| ${p.label} | ${gate} | ${top} |`
  }))
  return `**${family}**\n\n| Period | Gate | Most chosen per fold (count of folds) |\n|---|---|---|\n${lines.join('\n')}`
}

export function signalTable (periods: readonly PeriodDump[]): string {
  const lines = periods.map(p => {
    const testStart = p.folds[0]?.test.start ?? p.firstDecision
    const s = p.signals.filter(x => x.t >= testStart)
    const share = (f: (x: SignalRow) => boolean) => pct(s.length ? s.filter(f).length / s.length : null)
    const majors = p.updates.filter(u => u.keyword).map(u => `${u.date} ${u.title}`).join('; ')
    return `| ${p.label} | ${day(p.firstDecision)} to ${day(p.endT)} | ${share(x => x.mood === 'risk-off')} | ${share(x => (x.index7d ?? 0) <= -0.05)} | ${share(x => (x.volRatio ?? 0) > 1.5)} | ${majors} |`
  })
  return `| Period | Dates | Risk-off | Index 7d <= -5% | Vol > 1.5x median | Keyword-major updates |\n|---|---|---:|---:|---:|---|\n${lines.join('\n')}`
}
