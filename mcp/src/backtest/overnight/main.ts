// `npm run backtest -- --overnight`: place-once overnight backtest. Loads the
// nights' /1h and /5m snapshots (disk cache first), runs the grid at each
// evening hour and writes mcp/reports/overnight-place-once-YYYY-MM-DD.md plus
// a JSON dump of per-night results in the cache.

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { BACKTEST_CACHE_DIR, BACKTEST_REPORTS_DIR, HISTORY_CONCURRENCY, HISTORY_GAP_MS } from '../../config.js'
import { createLimiter } from '../../wiki/limiter.js'
import { createDiskSnapshotStore } from '../diskCache.js'
import { DEFAULT_PARTICIPATION } from '../fills.js'
import { loadHistory } from '../run.js'
import { type EveningRun, overnightReport, summaryTable } from './report.js'
import { OVERNIGHT_DEFAULTS, type Variant, asTimeline, decide, nightPlan, runGrid } from './run.js'

export interface OvernightArgs {
  readonly days: number
  readonly evenings: readonly number[]
  readonly nightHours: number
  readonly nightHourVariants: readonly number[]
  readonly slots: number
  readonly nowSec: number
  readonly out?: string
}

const log = (msg: string) => console.error(`[overnight] ${msg}`)

export function gridVariants (nightHourVariants: readonly number[]): Variant[] {
  const d = OVERNIGHT_DEFAULTS
  return d.sizingHours.flatMap(sizingHours => d.sellCaps.flatMap(maxSellHours => d.budgets.flatMap(budget =>
    nightHourVariants.map(nightHours => ({ params: { sizingHours, maxSellHours }, budget, nightHours })))))
}

export async function overnightMain (a: OvernightArgs): Promise<void> {
  const hoursAll = [...new Set([a.nightHours, ...a.nightHourVariants])].sort((x, y) => x - y)
  const variants = gridVariants(hoursAll)
  const store = createDiskSnapshotStore({ dir: BACKTEST_CACHE_DIR, limiter: createLimiter({ concurrency: HISTORY_CONCURRENCY, gapMs: HISTORY_GAP_MS }) })
  const mapping = await store.mapping()
  const evenings: EveningRun[] = []
  for (const eveningHourUtc of a.evenings) {
    const plan = nightPlan({ days: a.days, eveningHourUtc, maxNightHours: Math.max(...hoursAll), nowSec: a.nowSec })
    const t = asTimeline(plan)
    log(`${String(eveningHourUtc).padStart(2, '0')}:00 UTC: ${plan.nights.length} nights, ${variants.length} variants, loading ${t.hourWindows.length} 1h + ${t.fiveMinWindows.length} 5m snapshots`)
    const history = await loadHistory(store, t, { onProgress: (done, total) => { if (done % 250 === 0 || done === total) log(`loaded ${done}/${total}`) } })
    const runs = runGrid({ history, mapping, nights: plan.nights, variants, slots: a.slots, log: msg => { if (/night (1|\d*0)\//.test(msg)) log(msg) } })
    const e: EveningRun = { eveningHourUtc, nights: plan.nights, runs, decision: decide(runs, a.nightHours, OVERNIGHT_DEFAULTS.budgets) }
    console.error(summaryTable(e, OVERNIGHT_DEFAULTS.budgets, a.nightHours))
    log(`decision: ${e.decision.change ? 'change' : 'keep'} (${e.decision.reason})`)
    evenings.push(e)
  }
  const report = overnightReport({
    generatedAt: a.nowSec,
    slots: a.slots,
    nightHours: a.nightHours,
    nightHourVariants: hoursAll,
    budgets: OVERNIGHT_DEFAULTS.budgets,
    participation: DEFAULT_PARTICIPATION,
    evenings
  })
  const date = new Date(a.nowSec * 1000).toISOString().slice(0, 10)
  const out = a.out ?? join(BACKTEST_REPORTS_DIR, `overnight-place-once-${date}.md`)
  await mkdir(BACKTEST_REPORTS_DIR, { recursive: true })
  await writeFile(out, report)
  const dump = evenings.map(e => ({ eveningHourUtc: e.eveningHourUtc, decision: e.decision, runs: e.runs.map(r => ({ variant: r.variant, nights: r.nights.map(({ trades, ...n }) => ({ ...n, trades: trades.length })) })) }))
  await writeFile(join(BACKTEST_CACHE_DIR, `overnight-place-once-${date}.json`), JSON.stringify(dump))
  log(`wrote ${out}`)
}
