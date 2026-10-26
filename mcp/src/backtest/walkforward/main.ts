// `npm run backtest -- --walk-forward`: loads ~60 days of /1h and /5m
// snapshots (disk cache first), runs the grid and writes
// mcp/reports/walk-forward-YYYY-MM-DD.md plus a JSON dump in the cache.

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { BACKTEST_CACHE_DIR, BACKTEST_REPORTS_DIR, HISTORY_CONCURRENCY, HISTORY_GAP_MS } from '../../config.js'
import { createLimiter } from '../../wiki/limiter.js'
import { createDiskSnapshotStore } from '../diskCache.js'
import { loadHistory } from '../run.js'
import { FULL_GRID, type GridSpec, families } from './grid.js'
import { paramsOf, walkForwardReport } from './report.js'
import { PARTICIPATION_LEVELS, type WalkForwardConfig, walkForward, walkForwardTimeline } from './run.js'
import { DEFAULT_RULES } from '../simulate.js'

const RERUN_SHARES = PARTICIPATION_LEVELS.filter(p => p !== DEFAULT_RULES.participation)

/** Tiny grid for a quick end-to-end check (`--grid smoke`). */
export const SMOKE_GRID: GridSpec = Object.freeze({
  fillHours: [2, 8],
  minVolumes: [1_000, 10_000],
  askCap: [true],
  appHorizons: { quick: [4], dips: [4], overnight: [8] },
  appMaxSell: [1, 2],
  appFloors: [10_000]
})

export interface WalkForwardArgs {
  readonly config: WalkForwardConfig
  readonly nowSec: number
  readonly grid: 'full' | 'smoke'
  readonly out?: string
  readonly historyNote: string
}

const log = (msg: string) => console.error(`[walk-forward] ${msg}`)

export async function walkForwardMain (a: WalkForwardArgs): Promise<void> {
  const fams = families(a.grid === 'smoke' ? SMOKE_GRID : FULL_GRID)
  const strategies = fams.flatMap(f => f.variants.map(v => v.strategy))
  const t = walkForwardTimeline(a.config, strategies, a.nowSec)
  const store = createDiskSnapshotStore({ dir: BACKTEST_CACHE_DIR, limiter: createLimiter({ concurrency: HISTORY_CONCURRENCY, gapMs: HISTORY_GAP_MS }) })
  log(`${strategies.length} variants, ${t.decisions.length} decisions, loading ${t.hourWindows.length} 1h + ${t.fiveMinWindows.length} 5m snapshots`)
  const [mapping, history] = await Promise.all([
    store.mapping(),
    loadHistory(store, t, { onProgress: (done, total) => { if (done % 250 === 0 || done === total) log(`loaded ${done}/${total}`) } })
  ])
  const result = walkForward(fams, { history, mapping, timeline: t, config: a.config, log }, { rerunShares: RERUN_SHARES })
  const report = walkForwardReport({
    config: a.config,
    result,
    generatedAt: a.nowSec,
    firstDecision: t.decisions[0] ?? t.endT,
    lastDecision: t.decisions[t.decisions.length - 1] ?? t.endT,
    endT: t.endT,
    historyNote: a.historyNote
  })
  const date = new Date(a.nowSec * 1000).toISOString().slice(0, 10)
  const out = a.out ?? join(BACKTEST_REPORTS_DIR, `walk-forward-${date}.md`)
  await mkdir(BACKTEST_REPORTS_DIR, { recursive: true })
  await writeFile(out, report)
  const dump = result.reports.map(r => ({
    family: r.family.name,
    defaultKey: r.family.defaultKey,
    consensusKey: r.consensusKey,
    wf: r.wf,
    baseline: r.baseline,
    consensus: r.consensus,
    consensusWins: r.consensusWins,
    folds: r.folds.map(o => ({ ...o, chosen: paramsOf(r.family, o.chosenKey) })),
    fixed: r.fixed.map(v => ({ ...v, params: paramsOf(r.family, v.key) }))
  }))
  const body = JSON.stringify({ config: a.config, firstDecision: t.decisions[0], lastDecision: t.decisions[t.decisions.length - 1], endT: t.endT, dump, sensitivity: result.sensitivity }, null, 1)
  await writeFile(join(BACKTEST_CACHE_DIR, 'last-walk-forward.json'), body)
  // Kept per end date so runs over different periods can be compared later.
  await writeFile(join(BACKTEST_CACHE_DIR, `walk-forward-${date}.json`), body)
  log(`wrote ${out}`)
}
