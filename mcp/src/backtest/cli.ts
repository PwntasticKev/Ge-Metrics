// `npm run backtest`: runs every strategy variant over the last N days and
// writes mcp/reports/backtest-YYYY-MM-DD.md. Flags: --days 14 --cash 50000000
// --slots 8 --strategy all --every 4 --out <file> --now <ISO time or unix sec>.
// `--walk-forward` instead tunes on rolling training windows and scores on the
// following unseen ones (walkforward/): --days 60 --train 7 --test 2 --step 2
// --grid full|smoke. Add --prefetch to only fill the snapshot cache.
// `--regime-gates` runs the regime-gate study for the 60 days before --now;
// `--regime-report Label=file.json,...` writes reports/regime-gates.md.

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { BACKTEST_CACHE_DIR, BACKTEST_REPORTS_DIR, HISTORY_CONCURRENCY, HISTORY_GAP_MS } from '../config.js'
import { createLimiter } from '../wiki/limiter.js'
import { createDiskSnapshotStore } from './diskCache.js'
import { type Summary, summarize } from './metrics.js'
import { markdownReport, resultsTable } from './report.js'
import { type BacktestConfig, loadHistory, runBacktest, timeline } from './run.js'
import { DEFAULT_RULES } from './simulate.js'
import { selectStrategies } from './strategies/index.js'
import { sensitivitySection } from './sensitivity.js'
import { diagnosticsSection } from './diagnostics.js'
import { WF_DEFAULTS } from './walkforward/run.js'
import { walkForwardMain } from './walkforward/main.js'
import { regimeGatesMain } from './regime/main.js'
import { regimeReportMain } from './regime/reportMain.js'

const SENSITIVITY_PARTICIPATION = [0.1, 0.5] as const

function positive (name: string, raw: string): number {
  const v = Number(raw)
  if (!Number.isFinite(v) || v <= 0) throw new Error(`--${name} must be a positive number (got "${raw}")`)
  return v
}

function nowFrom (raw: string | undefined): number {
  if (raw === undefined) return Math.floor(Date.now() / 1000)
  const sec = /^\d+$/.test(raw) ? Number(raw) : Math.floor(Date.parse(raw) / 1000)
  if (!Number.isFinite(sec) || sec <= 0) throw new Error(`--now must be an ISO time or unix seconds (got "${raw}")`)
  return sec
}

// The wiki's /1h?timestamp= served full snapshots 2 years back when this was written (probed 2026-10-26).
const HISTORY_NOTE = 'the wiki\'s /1h?timestamp= (and /5m) returned full snapshots (~3,000 items) at every probe back to 730 days ago, so history is not the limit; this run uses the --days before --now (default: the last 60) plus 7 days of lookback.'

async function main (): Promise<void> {
  const { values } = parseArgs({
    options: {
      days: { type: 'string' },
      now: { type: 'string' },
      'walk-forward': { type: 'boolean', default: false },
      prefetch: { type: 'boolean', default: false },
      'regime-gates': { type: 'boolean', default: false },
      'regime-report': { type: 'string' },
      train: { type: 'string', default: String(WF_DEFAULTS.trainDays) },
      test: { type: 'string', default: String(WF_DEFAULTS.testDays) },
      step: { type: 'string', default: String(WF_DEFAULTS.stepDays) },
      grid: { type: 'string', default: 'full' },
      cash: { type: 'string', default: '50000000' },
      slots: { type: 'string', default: '8' },
      every: { type: 'string', default: '4' },
      strategy: { type: 'string', default: 'all' },
      out: { type: 'string' }
    }
  })
  const nowSec = nowFrom(values.now)
  if (values['regime-report']) return regimeReportMain(values['regime-report'], values.out)
  if (values['regime-gates']) {
    return regimeGatesMain({
      days: positive('days', values.days ?? String(WF_DEFAULTS.days)),
      cash: positive('cash', values.cash),
      slots: Math.min(8, Math.floor(positive('slots', values.slots))),
      decisionEveryHours: Math.floor(positive('every', values.every)),
      trainDays: positive('train', values.train),
      testDays: positive('test', values.test),
      stepDays: positive('step', values.step)
    }, nowSec)
  }
  if (values['walk-forward']) {
    if (values.grid !== 'full' && values.grid !== 'smoke') throw new Error(`--grid must be full or smoke (got "${values.grid}")`)
    return walkForwardMain({
      config: {
        days: positive('days', values.days ?? String(WF_DEFAULTS.days)),
        cash: positive('cash', values.cash),
        slots: Math.min(8, Math.floor(positive('slots', values.slots))),
        decisionEveryHours: Math.floor(positive('every', values.every)),
        trainDays: positive('train', values.train),
        testDays: positive('test', values.test),
        stepDays: positive('step', values.step)
      },
      nowSec,
      grid: values.grid,
      out: values.out,
      historyNote: HISTORY_NOTE,
      prefetchOnly: values.prefetch
    })
  }
  const config: BacktestConfig = {
    days: positive('days', values.days ?? '14'),
    cash: positive('cash', values.cash),
    slots: Math.min(8, Math.floor(positive('slots', values.slots))),
    decisionEveryHours: Math.floor(positive('every', values.every))
  }
  const strategies = selectStrategies(values.strategy)
  if (!strategies.length) throw new Error(`No strategy matches "${values.strategy}"`)
  const store = createDiskSnapshotStore({ dir: BACKTEST_CACHE_DIR, limiter: createLimiter({ concurrency: HISTORY_CONCURRENCY, gapMs: HISTORY_GAP_MS }) })
  const t = timeline(config, strategies, nowSec)
  console.error(`[backtest] ${strategies.length} strategies, ${t.decisions.length} decisions, loading ${t.hourWindows.length} 1h + ${t.fiveMinWindows.length} 5m snapshots (cache: ${BACKTEST_CACHE_DIR})`)
  const [mapping, history] = await Promise.all([
    store.mapping(),
    loadHistory(store, t, { onProgress: (done, total) => { if (done % 50 === 0 || done === total) console.error(`[backtest] loaded ${done}/${total}`) } })
  ])
  const run = runBacktest(history, mapping, strategies, t, config)
  console.error(resultsTable(run.summaries))
  const variants: Record<string, readonly Summary[]> = Object.fromEntries(SENSITIVITY_PARTICIPATION.map(p => [String(p), runBacktest(history, mapping, strategies, t, { ...config, rules: { participation: p } }).results.map(summarize)]))
  const report = markdownReport({
    config,
    timeline: t,
    summaries: run.summaries,
    generatedAt: nowSec,
    extraSections: [
      diagnosticsSection(run.results, history, k => /^(plan|top)_flips/.test(k) && !k.endsWith('-uncapped'), 'plan_flips and top_flips variants (pooled)'),
      diagnosticsSection(run.results, history, k => k.endsWith('-uncapped'), 'pre-fix variants (series ask not capped)'),
      sensitivitySection(run.summaries, variants, DEFAULT_RULES.participation)
    ]
  })
  const date = new Date(nowSec * 1000).toISOString().slice(0, 10)
  const out = values.out ?? join(BACKTEST_REPORTS_DIR, `backtest-${date}.md`)
  await mkdir(BACKTEST_REPORTS_DIR, { recursive: true })
  await writeFile(out, report)
  await writeFile(join(BACKTEST_CACHE_DIR, 'last-run.json'), JSON.stringify({ config, timeline: { ...t, hourWindows: t.hourWindows.length, fiveMinWindows: t.fiveMinWindows.length }, results: run.results }, null, 1))
  console.error(`[backtest] wrote ${out}`)
}

main().catch(error => {
  console.error('[backtest] failed:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
