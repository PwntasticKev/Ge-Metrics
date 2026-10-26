// Markdown report and compact JSON for backtest summaries, plus automatic
// bias call-outs (predicted vs realized).

import type { Summary } from './metrics.js'
import type { BacktestConfig, Timeline } from './run.js'
import { DEFAULT_RULES } from './simulate.js'

const gp = (n: number) => {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}k`
  return `${sign}${Math.round(abs)}`
}
const pct = (v: number | null, digits = 0) => (v === null ? 'n/a' : `${(v * 100).toFixed(digits)}%`)
const num = (v: number | null, digits = 1) => (v === null ? 'n/a' : v.toFixed(digits))
const iso = (t: number) => new Date(t * 1000).toISOString().replace(':00.000Z', 'Z').replace('T', ' ')

export function resultsTable (summaries: readonly Summary[]): string {
  const header = '| Strategy | Picks | Expected | Realized | Real/Exp | Buy fill | Sold at ask | Lost | Margin overest. | On time | Fill time x | GP/h | GP/h per slot | Max DD |'
  const sep = '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|'
  const rows = [...summaries].sort((a, b) => b.realizedProfit - a.realizedProfit).map(s => `| ${s.label} | ${s.picks} | ${gp(s.expectedProfit)} | ${gp(s.realizedProfit)} | ${pct(s.realizedRatio)} | ${pct(s.buyFillRate)} | ${pct(s.sellAtAskRate)} | ${pct(s.lossPct)} | ${pct(s.marginOverestimate)} | ${pct(s.onTimePct)} | ${num(s.fillTimeRatio)} | ${gp(s.gpPerHour)} | ${gp(s.gpPerSlotHour)} | ${pct(s.maxDrawdownPct, 1)} |`)
  return [header, sep, ...rows].join('\n')
}

const BIAS = { overestimate: 0.25, slowFill: 1.5, lowFill: 0.6, lossy: 0.25, lowOnTime: 0.5 }

/** Plain-language call-outs where predictions and reality disagree systematically. */
export function biases (summaries: readonly Summary[]): string[] {
  return summaries.flatMap(s => {
    const out: string[] = []
    if (s.marginOverestimate !== null && s.marginOverestimate > BIAS.overestimate) out.push(`${s.label}: margins on bought units overestimated by ${pct(s.marginOverestimate)} (realized ${gp(s.realizedProfit)} vs ${gp(s.expectedProfit)} expected).`)
    if (s.fillTimeRatio !== null && s.fillTimeRatio > BIAS.slowFill) out.push(`${s.label}: completed cycles took ${num(s.fillTimeRatio)}x the predicted fill time (median).`)
    if (s.onTimePct !== null && s.onTimePct < BIAS.lowOnTime) out.push(`${s.label}: only ${pct(s.onTimePct)} of picks bought and sold within the predicted time.`)
    if (s.buyFillRate !== null && s.buyFillRate < BIAS.lowFill) out.push(`${s.label}: only ${pct(s.buyFillRate)} of ordered units were bought before the buy timeout.`)
    if (s.lossPct !== null && s.lossPct > BIAS.lossy) out.push(`${s.label}: ${pct(s.lossPct)} of filled picks lost money.`)
    return out
  })
}

export interface ReportInput {
  readonly title?: string
  readonly config: BacktestConfig
  readonly timeline: Timeline
  readonly summaries: readonly Summary[]
  readonly generatedAt: number
  readonly notes?: readonly string[]
  readonly extraSections?: readonly string[]
}

export function markdownReport (r: ReportInput): string {
  const rules = { ...DEFAULT_RULES, ...r.config.rules }
  const first = r.timeline.decisions[0] ?? r.timeline.endT
  const last = r.timeline.decisions[r.timeline.decisions.length - 1] ?? r.timeline.endT
  const found = biases(r.summaries)
  return [
    `# ${r.title ?? 'GE Metrics strategy backtest'}`,
    '',
    `Generated ${iso(r.generatedAt)} by \`npm run backtest\` (mcp/src/backtest). Data: OSRS Wiki /1h and /5m historical snapshots.`,
    '',
    '## Setup',
    '',
    `- ${r.timeline.decisions.length} decisions every ${r.config.decisionEveryHours ?? 4}h from ${iso(first)} to ${iso(last)} (UTC); simulation runs to ${iso(r.timeline.endT)}.`,
    `- Stack ${gp(r.config.cash)} gp, ${r.config.slots} GE slots, one item per slot, cash reserved while a buy offer is open, 4h buy limits, GE tax from the engine (exemptions, 5M cap).`,
    `- Fills: hourly. A buy fills only in hours whose average instant-sell price was <= the bid, taking ${pct(rules.participation)} of that hour's instant-sell volume (more if the bid sat above the hour's average, up to all of it at the average high). Sells mirror this on instant-buys at the ask. The sell starts the hour after the buy completes.`,
    `- A buy not complete after ${rules.buyTimeoutHours}h is cancelled and what was bought goes to the sell. Anything unsold ${rules.maxHoldHours}h after the buy was placed is dumped at that hour's average instant-sell price.`,
    '- No lookahead: at decision time t the strategy sees only windows that closed by t (enforced by a guard that throws; tested). "Latest" prices come from the last closed 5m windows.',
    '',
    '## Results',
    '',
    resultsTable(r.summaries),
    '',
    'Columns: Expected = profit the strategy predicted for the quantities actually placed; Realized = after tax, incl. dumps; Buy fill = units bought / ordered; Sold at ask = units sold at the strategy\'s sell price / bought; Lost = filled picks that lost money; Margin overest. = 1 - realized / predicted profit on the units actually bought; On time = picks bought and sold within predicted hours + 1h; Fill time x = median realized / predicted cycle hours (completed picks); GP/h per slot = realized / (hours x slots); Max DD = worst peak-to-trough of cash + holdings marked at the instant-sell price.',
    '',
    '## Systematic biases',
    '',
    ...(found.length ? found.map(b => `- ${b}`) : ['- None above the thresholds.']),
    ...(r.extraSections ?? []).flatMap(s => ['', s]),
    ...(r.notes?.length ? ['', '## Notes', '', ...r.notes.map(n => `- ${n}`)] : []),
    ''
  ].join('\n')
}

export function summaryJson (s: Summary) {
  const r2 = (v: number | null) => (v === null ? null : Math.round(v * 1000) / 1000)
  return {
    key: s.key,
    label: s.label,
    picks: s.picks,
    expectedProfit: s.expectedProfit,
    realizedProfit: s.realizedProfit,
    realizedVsExpected: r2(s.realizedRatio),
    buyFillRate: r2(s.buyFillRate),
    sellAtAskRate: r2(s.sellAtAskRate),
    unfilledPicksPct: r2(s.unfilledPct),
    lossPct: r2(s.lossPct),
    marginOverestimate: r2(s.marginOverestimate),
    onTimePct: r2(s.onTimePct),
    fillTimeRatio: r2(s.fillTimeRatio),
    medianPredictedHours: r2(s.medianPredictedHours),
    medianHoldHours: r2(s.medianHoldHours),
    gpPerHour: s.gpPerHour,
    gpPerSlotHour: s.gpPerSlotHour,
    gpPerBusySlotHour: s.gpPerBusySlotHour,
    maxDrawdown: s.maxDrawdown,
    maxDrawdownPct: r2(s.maxDrawdownPct),
    roiPct: r2(s.roiPct)
  }
}
