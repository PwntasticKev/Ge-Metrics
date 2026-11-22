// Markdown for the place-once overnight backtest.

import { gp as formatGp } from '../report.js'
import { overnightKey } from './strategy.js'
import { BASELINE, type Decision, type VariantRun, nightStats, nightsAhead } from './run.js'

const iso = (sec: number) => new Date(sec * 1000).toISOString().slice(0, 16).replace('T', ' ')
const gp = (n: number) => formatGp(Math.round(n))
const pct = (x: number | null) => (x === null ? 'n/a' : `${Math.round(x * 100)}%`)

export interface EveningRun {
  readonly eveningHourUtc: number
  readonly nights: readonly number[]
  readonly runs: readonly VariantRun[]
  readonly decision: Decision
}

export interface ReportInput {
  readonly generatedAt: number
  readonly slots: number
  readonly nightHours: number
  readonly nightHourVariants: readonly number[]
  readonly budgets: readonly number[]
  readonly participation: number
  readonly evenings: readonly EveningRun[]
}

const label = (r: VariantRun) => `sized ${r.variant.params.sizingHours}h, sell <= ${r.variant.params.maxSellHours}h${overnightKey(r.variant.params) === overnightKey(BASELINE) ? ' (today)' : ''}`

function table (e: EveningRun, budget: number, nightHours: number): string {
  const rows = e.runs.filter(r => r.variant.budget === budget && r.variant.nightHours === nightHours)
  const base = rows.find(r => overnightKey(r.variant.params) === overnightKey(BASELINE))
  const head = '| Variant | Per night | Median | Total | Worst night | Nights > 0 | Beat today | Cash placed | Expected/night | Buy fill | Sold at ask |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|'
  const body = rows.map(r => {
    const s = nightStats(r.nights)
    const ahead = base && r !== base ? `${nightsAhead(r.nights, base.nights)}/${s.nights}` : ''
    return `| ${label(r)} | ${gp(s.perNight)} | ${gp(s.median)} | ${gp(s.total)} | ${gp(s.worst)} | ${s.positive}/${s.nights} | ${ahead} | ${gp(s.placedAvg)} | ${gp(s.expectedAvg)} | ${pct(s.buyFill)} | ${pct(s.soldAtAsk)} |`
  })
  return [head, ...body].join('\n')
}

/** One line per variant: realized per night at each budget (the PR table). */
export function summaryTable (e: EveningRun, budgets: readonly number[], nightHours: number): string {
  const keys = [...new Map(e.runs.map(r => [overnightKey(r.variant.params), r])).values()]
  const head = `| Variant | ${budgets.map(b => `${gp(b)}: per night / total / worst`).join(' | ')} |\n|---|${budgets.map(() => '---:').join('|')}|`
  const body = keys.map(k => {
    const cells = budgets.map(b => {
      const r = e.runs.find(x => overnightKey(x.variant.params) === overnightKey(k.variant.params) && x.variant.budget === b && x.variant.nightHours === nightHours)
      if (!r) return 'n/a'
      const s = nightStats(r.nights)
      return `${gp(s.perNight)} / ${gp(s.total)} / ${gp(s.worst)}`
    })
    return `| ${label(k)} | ${cells.join(' | ')} |`
  })
  return [head, ...body].join('\n')
}

export function overnightReport (i: ReportInput): string {
  const primary = i.evenings[0]
  const sections = i.evenings.flatMap(e => {
    const first = e.nights[0] ?? 0
    const last = e.nights[e.nights.length - 1] ?? 0
    return [
      `## Offers placed at ${String(e.eveningHourUtc).padStart(2, '0')}:00 UTC`,
      '',
      `${e.nights.length} nights, ${iso(first)}Z to ${iso(last)}Z. Decision (pre-set rule, ${i.nightHours}h night): **${e.decision.change ? `change to ${overnightKey(e.decision.to)}` : 'keep today\'s model'}**: ${e.decision.reason}.`,
      '',
      summaryTable(e, i.budgets, i.nightHours),
      '',
      ...i.nightHourVariants.flatMap(h => i.budgets.flatMap(b => [`### ${gp(b)} stack, ${h}h night${h === i.nightHours ? '' : ' (sensitivity)'}`, '', table(e, b, h), ''])),
    ]
  })
  return [
    '# GE Metrics overnight backtest: place once, sleep, wake up',
    '',
    `Generated ${iso(i.generatedAt)}Z by \`npm run backtest -- --overnight\` (mcp/src/backtest/overnight). Data: OSRS Wiki /1h and /5m historical snapshots.`,
    '',
    '## Setup',
    '',
    `- Each night a fresh stack (10M, 50M, 200M; no carry-over) and ${i.slots} GE slots. At the evening hour the app's Overnight list is rebuilt from what was visible then (no lookahead): rankOvernightFlips, pumps removed, the app's canonical offer (mobile/src/lib/offer.ts, vendored unchanged) with the top rows refined from their last 24 hourly points, then planCashStack across the slots.`,
    `- Offers are placed **once**. No re-decisions: a slot that finishes in the night stays empty. An order may be for more than one buy limit (the GE reserves the cash and fills at most one limit per rolling 4h).`,
    `- Fills: the same hourly model as the 4h backtests (a share of each hour's flow at or through the price, ${Math.round(i.participation * 100)}% at the typical price). The sell starts the hour after the buy completes.`,
    `- After ${i.nightHours}h asleep, unfilled buy offers are cancelled (cash back) and leftover stock is marked at the morning instant-sell price (the last hour's average low) minus tax. Realized = after tax, incl. those marks.`,
    '- Variants: sizing horizon 8h (2 buy-limit windows, today) or 12h (3), and the slowest sell allowed 0.5h (today), 1h, 2h, 4h, 10h (with 8h sizing, anything above 8h is the same as 8h).',
    '- Beat today = nights this variant made more than today\'s model. Cash placed = average cash put into buy offers at the evening hour (the rest sits idle all night).',
    '',
    ...sections,
    '## Caveats',
    '',
    '- One market path over the nights above, one simulator; fills are hourly and volume-share based. A handful of big leftover marks move totals; compare direction more than exact gp.',
    '- The night length and evening hour rows are sensitivity checks; the decision uses the primary evening and night length only.',
    `- Mapping and buy limits are today's. Pumps are flagged with the MCP scanner's rule (the app's thin-spike rule is close but not identical).`,
    primary ? '' : '- No nights were run.'
  ].join('\n')
}
