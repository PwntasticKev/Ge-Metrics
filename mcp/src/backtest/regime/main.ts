// `npm run backtest -- --regime-gates --now <ISO>`: the regime-gate study for
// the 60 days before --now (same folds and simulator as the walk-forward).
// Writes .cache/backtest/regime-gates-YYYY-MM-DD.json; `--regime-report`
// turns several of those into reports/regime-gates.md.

import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { scheduleFrom } from '../../analysis/regime/schedule.js'
import { BACKTEST_CACHE_DIR, GAME_UPDATES_FILE, HISTORY_CONCURRENCY, HISTORY_GAP_MS } from '../../config.js'
import { parseDataset } from '../../updates/parse.js'
import { createLimiter } from '../../wiki/limiter.js'
import { createDiskSnapshotStore } from '../diskCache.js'
import { loadHistory } from '../run.js'
import { APP_DEFAULTS, appFillStrategy } from '../strategies/appFill.js'
import { planFlipsStrategy, topFlipsStrategy } from '../strategies/mcp.js'
import { MCP_DEFAULTS } from '../walkforward/grid.js'
import { type WalkForwardConfig, foldsFor, walkForwardTimeline } from '../walkforward/run.js'
import { type GateFamily, runGateStudy } from './study.js'

// What ships now: MCP defaults, and the app's lists as on master
// (mobile/src/lib/pickFill.ts, fillAware.ts: quick 2h, overnight 8h, dips 4h; sell <= 0.5h; 10K/day).
const APP_SELL_HOURS = 0.5
const APP_HORIZONS = { quick: 2, overnight: 8, dips: 4 } as const

export const GATE_FAMILIES: readonly GateFamily[] = [
  { name: 'plan_flips', base: planFlipsStrategy(MCP_DEFAULTS.plan_flips) },
  { name: 'top_flips', base: topFlipsStrategy(MCP_DEFAULTS.top_flips) },
  ...(['quick', 'overnight', 'dips'] as const).map(mode => ({
    name: `app ${mode}`,
    base: appFillStrategy({ ...APP_DEFAULTS[mode], horizonHours: APP_HORIZONS[mode], maxSellHours: APP_SELL_HOURS })
  }))
]

const log = (msg: string) => console.error(`[regime] ${msg}`)

export async function regimeGatesMain (config: WalkForwardConfig, nowSec: number, updatesFile = GAME_UPDATES_FILE): Promise<void> {
  const schedule = scheduleFrom(parseDataset(JSON.parse(await readFile(updatesFile, 'utf8'))))
  const t = walkForwardTimeline(config, GATE_FAMILIES.map(f => f.base), nowSec)
  const store = createDiskSnapshotStore({ dir: BACKTEST_CACHE_DIR, limiter: createLimiter({ concurrency: HISTORY_CONCURRENCY, gapMs: HISTORY_GAP_MS }) })
  log(`${GATE_FAMILIES.length} families, ${t.decisions.length} decisions, ${schedule.length} game updates; loading ${t.hourWindows.length} 1h + ${t.fiveMinWindows.length} 5m snapshots`)
  const [mapping, history] = await Promise.all([
    store.mapping(),
    loadHistory(store, t, { onProgress: (done, total) => { if (done % 500 === 0 || done === total) log(`loaded ${done}/${total}`) } })
  ])
  const folds = foldsFor(config, t)
  const study = runGateStudy({ families: GATE_FAMILIES, history, mapping, timeline: t, config, folds, schedule, log })
  const date = new Date(nowSec * 1000).toISOString().slice(0, 10)
  const out = join(BACKTEST_CACHE_DIR, `regime-gates-${date}.json`)
  const majors = schedule.filter(u => u.at >= (t.decisions[0] ?? 0) && u.at <= t.endT)
  await writeFile(out, JSON.stringify({ config, nowSec, firstDecision: t.decisions[0], endT: t.endT, folds, updates: majors, ...study }))
  log(`wrote ${out}`)
}
