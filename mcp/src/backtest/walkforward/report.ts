// Markdown for a walk-forward run.

import type { FamilyReport, OosStats } from './evaluate.js'
import type { Family } from './grid.js'
import type { SensitivityRow, WalkForwardConfig, WalkForwardResult } from './run.js'

const gp = (n: number) => {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(0)}k`
  return `${sign}${Math.round(abs)}`
}
const pct = (v: number | null, digits = 0) => (v === null ? 'n/a' : `${(v * 100).toFixed(digits)}%`)
const day = (t: number) => new Date(t * 1000).toISOString().slice(5, 10)
const iso = (t: number) => new Date(t * 1000).toISOString().replace(':00.000Z', 'Z').replace('T', ' ')

/** A variant's knobs, e.g. "max_fill_hours=8 min_volume=10000 ask_cap=true". */
export function paramsOf (family: Family, key: string): string {
  const p = family.variants.find(v => v.strategy.key === key)?.params ?? {}
  return Object.entries(p).map(([k, v]) => `${k}=${v}`).join(' ')
}

/** Rule fixed before the run: change a default only if OOS clearly and consistently prefers another. */
export const CONSISTENT = { minFoldWinShare: 0.6, minModalShare: 0.5 } as const

export function verdict (r: FamilyReport): { change: boolean; why: string } {
  if (r.consensusKey === r.family.defaultKey) return { change: false, why: 'the folds most often chose the shipped default for every knob' }
  const changed = r.choices.filter(c => c.modal !== String(c.defaultValue))
  const weak = changed.filter(c => c.modalShare < CONSISTENT.minModalShare)
  const winShare = r.consensusWins / Math.max(1, r.folds.length)
  const better = r.consensus.profit > r.baseline.profit
  const wfBetter = r.wf.profit > r.baseline.profit
  const change = better && wfBetter && winShare >= CONSISTENT.minFoldWinShare && !weak.length
  const reasons = [
    `re-tuning each fold ${wfBetter ? 'beat' : 'did not beat'} the default OOS (${gp(r.wf.profit)} vs ${gp(r.baseline.profit)})`,
    `consensus ${better ? 'beat' : 'did not beat'} the default OOS (${gp(r.consensus.profit)} vs ${gp(r.baseline.profit)})`,
    `won ${r.consensusWins}/${r.folds.length} test windows (need ${pct(CONSISTENT.minFoldWinShare)})`,
    ...changed.map(c => `${c.param}=${c.modal} chosen in ${pct(c.modalShare)} of folds`)
  ]
  return { change, why: reasons.join('; ') }
}

const statCells = (s: OosStats) => `${gp(s.profit)} | ${gp(s.perDay)} | ${s.foldsPositive}/${s.folds} | ${pct(s.lossPct)} | ${pct(s.maxDrawdownPct, 1)}`

function headline (reports: readonly FamilyReport[]): string {
  const rows = reports.flatMap(r => [
    `| ${r.family.name} | walk-forward (re-tuned each fold) | ${statCells(r.wf)} |`,
    `| | shipped default: ${paramsOf(r.family, r.family.defaultKey)} | ${statCells(r.baseline)} |`,
    ...(r.consensusKey !== r.family.defaultKey ? [`| | consensus: ${paramsOf(r.family, r.consensusKey)} (beat default in ${r.consensusWins}/${r.folds.length}) | ${statCells(r.consensus)} |`] : []),
    `| | hindsight best per window (not tradable) | ${gp(r.folds.reduce((s, f) => s + f.hindsightTestProfit, 0))} | | | | |`
  ])
  return ['| Strategy | Parameters | OOS profit | per day | Windows > 0 | Losing picks | Max DD |', '|---|---|---:|---:|---:|---:|---:|', ...rows].join('\n')
}

function stability (reports: readonly FamilyReport[]): string {
  const rows = reports.flatMap(r => r.choices.map(c => {
    const counts = [...c.counts].sort((a, b) => b[1] - a[1]).map(([v, n]) => `${v}${v === String(c.defaultValue) ? '*' : ''}: ${n}`).join(', ')
    return `| ${r.family.name} | ${c.param} | ${c.defaultValue} | ${counts} | ${pct(c.modalShare)} |`
  }))
  const ranks = reports.map(r => {
    const sorted = r.folds.map(f => f.defaultTrainRank).sort((a, b) => a - b)
    const med = sorted[Math.floor(sorted.length / 2)] ?? 0
    return `- ${r.family.name}: shipped default ranked median ${med} of ${r.family.variants.length} on the training windows (best ${sorted[0] ?? 0}, worst ${sorted[sorted.length - 1] ?? 0}).`
  })
  return ['| Strategy | Knob | Default | Folds choosing each value (* = default) | Top share |', '|---|---|---|---|---:|', ...rows, '', ...ranks].join('\n')
}

function foldTable (r: FamilyReport): string {
  const rows = r.folds.map(o => `| ${o.fold.index + 1} | ${day(o.fold.test.start)} to ${day(o.fold.test.end)} | ${paramsOf(r.family, o.chosenKey)} | ${gp(o.trainProfit)} | ${gp(o.testProfit)} | ${gp(o.defaultTestProfit)} | ${gp(o.hindsightTestProfit)} |`)
  return [`**${r.family.name}**`, '', '| Fold | Test window | Chosen on train | Train profit | Test profit | Default test | Hindsight best |', '|---:|---|---|---:|---:|---:|---:|', ...rows].join('\n')
}

function regimes (reports: readonly FamilyReport[]): string {
  const rows = reports.flatMap(r => r.regimes.map(g => `| ${r.family.name} | ${g.mood} | ${g.decisions} | ${g.wf.picks} | ${gp(g.wf.profit)} | ${pct(g.wf.lossPct)} | ${g.baseline.picks} | ${gp(g.baseline.profit)} | ${pct(g.baseline.lossPct)} |`))
  return ['| Strategy | Mood at decision | Decisions | WF picks | WF realized | WF losing | Default picks | Default realized | Default losing |', '|---|---|---:|---:|---:|---:|---:|---:|---:|', ...rows].join('\n')
}

function marginalTable (r: FamilyReport): string {
  const def = r.baseline.profit
  const rows = r.marginals.map(m => `| ${m.anchor} | ${m.param} | ${m.value}${m.key === r.family.defaultKey ? ' (default)' : m.key === r.consensusKey ? ' (consensus)' : ''} | ${gp(m.profit)} | ${m.profit >= def ? '+' : ''}${gp(m.profit - def)} | ${m.winsVsDefault}/${r.folds.length} | ${pct(m.lossPct)} |`)
  return [`**${r.family.name}**`, '', '| Others at | Knob | Value | OOS profit | vs default | Windows beating default | Losing picks |', '|---|---|---|---:|---:|---:|---:|', ...rows].join('\n')
}

function shareTable (w: WalkForwardResult): string {
  const rows = w.shareReruns.flatMap(run => run.reports.map(r => `| ${r.family.name} | ${Math.round(run.participation * 100)}% | ${gp(r.wf.profit)} (${r.wf.foldsPositive}/${r.wf.folds} up) | ${gp(r.baseline.profit)} (${r.baseline.foldsPositive}/${r.baseline.folds} up) | ${paramsOf(r.family, r.consensusKey)} | ${r.consensusWins}/${r.folds.length} | ${verdict(r).change ? 'change' : 'keep'} |`))
  return ['| Strategy | Queue share | WF OOS | Default OOS | Consensus | Consensus beat default | Rule says |', '|---|---:|---:|---:|---|---:|---|', ...rows].join('\n')
}

function sensitivityTable (rows: readonly SensitivityRow[]): string {
  const settings = [...new Set(rows.map(r => r.setting))]
  const keys = [...new Map(rows.map(r => [`${r.family}|${r.which}`, r])).values()]
  const cell = (r: SensitivityRow | undefined) => (r ? `${gp(r.oos.profit)} (${pct(r.oos.lossPct)} lose, ${r.oos.foldsPositive}/${r.oos.folds} up)` : 'n/a')
  const body = keys.map(k => `| ${k.family} | ${k.which} | ${settings.map(s => cell(rows.find(r => r.family === k.family && r.which === k.which && r.setting === s))).join(' | ')} |`)
  return [`| Strategy | Variant | ${settings.join(' | ')} |`, `|---|---|${settings.map(() => '---:').join('|')}|`, ...body].join('\n')
}

export interface WfReportInput {
  readonly config: WalkForwardConfig
  readonly result: WalkForwardResult
  readonly generatedAt: number
  readonly firstDecision: number
  readonly lastDecision: number
  readonly endT: number
  readonly historyNote: string
  readonly notes?: readonly string[]
}

export function walkForwardReport (i: WfReportInput): string {
  const { result: w, config: c } = i
  const moodCounts = ['risk-on', 'mixed', 'risk-off'].map(m => `${[...w.moods.values()].filter(x => x === m).length} ${m}`).join(', ')
  const verdicts = w.reports.map(r => {
    const v = verdict(r)
    return `- **${r.family.name}**: ${v.change ? 'CHANGE' : 'keep'} (${paramsOf(r.family, v.change ? r.consensusKey : r.family.defaultKey)}). ${v.why}.`
  })
  return [
    '# GE Metrics walk-forward validation',
    '',
    `Generated ${iso(i.generatedAt)} by \`npm run backtest -- --walk-forward\` (mcp/src/backtest/walkforward). Same simulator, fill model and no-lookahead views as the 14-day backtest (reports/backtest-2026-10-26.md).`,
    '',
    '## Setup',
    '',
    `- History: ${i.historyNote}`,
    `- ${c.days} days of decisions every ${c.decisionEveryHours ?? 4}h, ${iso(i.firstDecision)} to ${iso(i.lastDecision)}; simulation runs to ${iso(i.endT)}. Stack ${gp(c.cash)}, ${c.slots} slots, 8h buy timeout, dump after 24h, 25% queue share unless stated.`,
    `- ${w.variantsRun} variants (grid below), each run once over the whole period. ${w.folds.length} folds: train ${c.trainDays}d, then test the next ${c.testDays}d, step ${c.stepDays}d. Test windows don't overlap and together cover ${w.folds.length * c.testDays} days.`,
    '- Per fold, the variant with the most profit on the training window (equity change: cash + holdings marked at the instant-sell price; ties to lower drawdown) trades the test window. The training score uses only hours that closed before the test starts (tested: rewriting everything after the split changes no choice).',
    '- OOS = test windows only. Losing picks = OOS picks that bought anything and lost money after tax. Max DD = worst peak-to-trough of the OOS equity chained across test windows.',
    '- Consensus = every knob at the value the folds chose most often. It is picked with all folds\' training data, so its OOS line is slightly optimistic; the walk-forward line is the clean number.',
    `- Decision-time market mood (market_breadth logic): ${moodCounts}.`,
    '',
    '## Out-of-sample results',
    '',
    headline(w.reports),
    '',
    '## Are the defaults robust?',
    '',
    `Rule: change a default only if re-tuning every fold beats it OOS, the consensus variant beats it OOS in total and wins at least ${pct(CONSISTENT.minFoldWinShare)} of test windows, and each changed knob was the folds' top choice at least ${pct(CONSISTENT.minModalShare)} of the time.`,
    '',
    ...verdicts,
    '',
    '## One knob at a time',
    '',
    'Each knob moved alone, the others held at the shipped default and then at the consensus, scored on the same test windows (fixed parameters, not re-tuned).',
    '',
    ...w.reports.flatMap(r => [marginalTable(r), '']),
    '## Parameter stability across folds',
    '',
    stability(w.reports),
    '',
    '## Regime split (risk-on vs risk-off decisions)',
    '',
    'Realized profit of OOS picks grouped by the market mood at the decision that placed them.',
    '',
    regimes(w.reports),
    '',
    '## Sensitivity: queue share and dump-after hours',
    '',
    'OOS profit over the same test windows for the shipped default and the consensus variant, re-simulated with a different simulator queue share or max hold (parameters not re-tuned).',
    '',
    sensitivityTable(w.sensitivity),
    ...(w.shareReruns.length ? ['', 'The whole walk-forward re-run (grid re-tuned per fold) under other queue shares:', '', shareTable(w)] : []),
    ...(i.notes?.length ? ['', '## Notes', '', ...i.notes.map(n => `- ${n}`)] : []),
    '',
    '## Folds',
    '',
    ...w.reports.flatMap(r => [foldTable(r), '']),
    '## Grid',
    '',
    ...w.reports.map(r => {
      const keys = Object.keys(r.family.variants[0]?.params ?? {})
      const values = keys.map(k => `${k} {${[...new Set(r.family.variants.map(v => String(v.params[k])))].join(', ')}}`)
      return `- ${r.family.name} (${r.family.variants.length}): ${values.join(' x ')}`
    }),
    ''
  ].join('\n')
}
