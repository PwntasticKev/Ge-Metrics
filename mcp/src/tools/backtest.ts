import type { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { ToolInputError } from '../analysis/resolve.js'
import { BACKTEST_CACHE_DIR, HISTORY_CONCURRENCY, HISTORY_GAP_MS } from '../config.js'
import { type SnapshotStore, createDiskSnapshotStore } from '../backtest/diskCache.js'
import { biases, summaryJson } from '../backtest/report.js'
import { BacktestBudgetError, loadHistory, runBacktest, timeline } from '../backtest/run.js'
import { DEFAULT_RULES } from '../backtest/simulate.js'
import { STRATEGY_KEYS, selectStrategies } from '../backtest/strategies/index.js'
import { createLimiter } from '../wiki/limiter.js'
import type { ToolDeps } from './deps.js'
import { guarded } from './result.js'
import { READ_ONLY } from './schemas.js'

/** Uncached snapshots one call may fetch (~1-2 min at the polite rate); the rest must come from the disk cache. */
export const MAX_NEW_REQUESTS = 250
const MAX_DAYS = 14
const MAX_CASH = 1e13
const GROUPS = ['all', 'app', 'plan_flips', 'top_flips', 'find_dips', 'margin_scan'] as const

let defaultStore: SnapshotStore | null = null
const storeOf = (deps: ToolDeps): SnapshotStore =>
  deps.snapshots ?? (defaultStore ??= createDiskSnapshotStore({ dir: BACKTEST_CACHE_DIR, limiter: createLimiter({ concurrency: HISTORY_CONCURRENCY, gapMs: HISTORY_GAP_MS }) }))

export function registerBacktestTools (server: McpServer, deps: ToolDeps): void {
  const input = z.object({
    strategy: z.string().trim().default('all').refine(s => (GROUPS as readonly string[]).includes(s) || STRATEGY_KEYS.includes(s), {
      message: `Use one of: ${[...GROUPS, ...STRATEGY_KEYS].join(', ')}`
    }).describe(`Strategy group (${GROUPS.join(', ')}) or one variant key (${STRATEGY_KEYS.join(', ')})`),
    days: z.number().min(0.5).max(MAX_DAYS).default(3).describe(`Days of decisions to replay (max ${MAX_DAYS})`),
    cash: z.number().positive().max(MAX_CASH).default(50_000_000).describe('Starting cash stack in gp'),
    slots: z.number().int().min(1).max(8).default(8).describe('GE slots'),
    decision_every_hours: z.number().int().min(1).max(24).default(4).describe('Hours between strategy runs (free slots are refilled then)'),
    max_hold_hours: z.number().min(2).max(72).default(DEFAULT_RULES.maxHoldHours).describe('Dump anything unsold this long after the buy was placed, at the instant-sell price'),
    buy_timeout_hours: z.number().min(1).max(48).default(DEFAULT_RULES.buyTimeoutHours).describe('Cancel an incomplete buy after this long and sell what was bought'),
    participation: z.number().min(0.05).max(1).default(DEFAULT_RULES.participation).describe('Share of an hour\'s qualifying instant-sell/buy volume a resting offer gets (queue position)')
  })
  server.registerTool('backtest', {
    title: 'Backtest flip strategies',
    description: `Replays flip strategies on real history: every decision_every_hours the strategy sees only data that existed then (closed /1h and /5m wiki snapshots; no lookahead), picks one item per free slot with its predicted profit and fill time, and offers fill against what actually traded afterwards (a buy fills only in hours whose average instant-sell price reached the bid, for a share of that volume; sells mirror it), with cash, slots, 4h buy limits, GE tax, a buy timeout and a max hold dump. Returns per strategy: expected vs realized profit, buy fill rate, share sold at the ask, % of picks that lost, margin overestimate, on-time %, realized/predicted fill time, GP/hour (total and per slot) and max drawdown, plus bias call-outs. Snapshots are cached on disk; a call fetches at most ${MAX_NEW_REQUESTS} new ones (run \`npm run backtest\` in mcp/ to warm the cache for 14 days).`,
    inputSchema: input,
    annotations: READ_ONLY
  }, guarded('backtest', async (a: z.infer<typeof input>) => {
    const strategies = selectStrategies(a.strategy)
    const config = {
      days: a.days, cash: a.cash, slots: a.slots, decisionEveryHours: a.decision_every_hours,
      rules: { maxHoldHours: a.max_hold_hours, buyTimeoutHours: a.buy_timeout_hours, participation: a.participation }
    }
    const t = timeline(config, strategies, deps.now())
    const store = storeOf(deps)
    let history
    try {
      history = await loadHistory(store, t, { maxNewRequests: MAX_NEW_REQUESTS })
    } catch (error) {
      if (error instanceof BacktestBudgetError) {
        throw new ToolInputError(`${error.message} Use fewer days or a narrower strategy (margin_scan needs 7 days of extra history), or warm the cache with \`npm run backtest\` in mcp/.`)
      }
      throw error
    }
    const run = runBacktest(history, await deps.prices.mapping(), strategies, t, config)
    return {
      window: { firstDecision: t.decisions[0] ?? null, lastDecision: t.decisions[t.decisions.length - 1] ?? null, decisions: t.decisions.length, simulatedUntil: t.endT },
      setup: { cash: a.cash, slots: a.slots, ...DEFAULT_RULES, ...config.rules },
      strategies: [...run.summaries].sort((x, y) => y.realizedProfit - x.realizedProfit).map(summaryJson),
      biases: biases(run.summaries),
      howToRead: 'expectedProfit = what the strategy predicted for the quantities placed; realizedProfit after tax incl. dumps. marginOverestimate = 1 - realized / predicted profit on units actually bought. fillTimeRatio = median realized / predicted cycle hours for picks bought and sold at the ask. Fills are hourly, so short predicted cycles look slower than they are by up to ~1h.'
    }
  }))
}
