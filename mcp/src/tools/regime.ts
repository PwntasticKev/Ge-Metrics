// market_regime: trade / caution / stand aside right now, with the reasons.
// Same gate logic as the backtest (analysis/regime/gates.ts) on live data:
// market_breadth's mood, and big game updates from the update dataset (plus
// any upcoming release the caller names; the dataset only has published posts).
//
// Evidence (reports/regime-gates.md): standing aside around big releases
// robustly helped the app's quick "Buy now" list in all three 60-day periods
// tested. It did NOT robustly help plan_flips / top_flips (2h fill-aware picks):
// the gates that cut their Oct-Dec 2025 loss cost up to 23M of Aug-Oct
// 2026 profit. So those tools only report the regime unless asked to apply it.

import type { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { isoDate } from '../analysis/format.js'
import { type GateRule, type RegimeDecision, type ScheduledUpdate, decideRegime, ruleKey } from '../analysis/regime/gates.js'
import { UPDATE_LIVE_HOUR_UTC, scheduleFrom } from '../analysis/regime/schedule.js'
import { marketBreadth } from '../analysis/scanner/breadth.js'
import type { ToolDeps } from './deps.js'
import { guarded } from './result.js'
import { loadMoves } from './scanner.js'
import { READ_ONLY } from './schemas.js'

/**
 * Stand aside from 1 day before to 7 days after a big release; half size when
 * risk-off. Fixed config from the study (reports/regime-gates.md): on the app's
 * quick list it took Aug-Oct 2026 54.5M -> 66.0M, Apr-Jun -7.0M -> +0.1M,
 * Oct-Dec 2025 -30.4M -> -9.1M (picked after seeing all three periods; the
 * walk-forward version of the same idea is in the report).
 */
export const LIVE_REGIME_RULES: readonly GateRule[] = Object.freeze([
  { kind: 'update', beforeDays: 1, afterDays: 7, minItems: null, size: 0 },
  { kind: 'risk-off', size: 0.5 }
])

const LOOKBACK_DAYS = 7
const UPDATE_LIST_LIMIT = 50
const DAY_SEC = 86_400
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')

export const upcomingSchema = z.array(z.object({
  date: isoDateSchema.describe('Release date (YYYY-MM-DD, UTC)'),
  title: z.string().trim().min(1).max(120).describe('What is releasing, e.g. "Sailing launch"')
})).max(5).optional()
  .describe('Big releases announced but not out yet (the update feed only has published posts). Each counts as a major update.')

export const applyRegimeSchema = z.boolean().default(false)
  .describe('Apply the market regime (stand aside / half size). Off by default: in backtests the gate cut plan_flips/top_flips losses in a bad period but cost more in good ones.')

export type Upcoming = NonNullable<z.infer<typeof upcomingSchema>>

export interface RegimeReport {
  readonly state: RegimeDecision['state']
  /** Multiplier for new position sizes (1 full, 0.5 half, 0 none). */
  readonly size: number
  readonly reasons: readonly string[]
  readonly rules: readonly string[]
  readonly signals: {
    readonly mood: string | null
    readonly index24hPct: number | null
    readonly index7dPct: number | null
    readonly lastMajorUpdate: { date: string; title: string } | null
    readonly nextMajorUpdate: { date: string; title: string } | null
  }
  readonly warnings: readonly string[]
}

const pct = (x: number | null) => (x === null ? null : Math.round(x * 10_000) / 100)
const brief = (u: ScheduledUpdate | undefined) => (u ? { date: u.date, title: u.title } : null)

function upcomingSchedule (upcoming: Upcoming): ScheduledUpdate[] {
  return upcoming.map(u => ({ at: Date.parse(`${u.date}T${String(UPDATE_LIVE_HOUR_UTC).padStart(2, '0')}:00:00Z`) / 1000, date: u.date, title: u.title, items: 0, keyword: true }))
}

async function scheduleNear (deps: ToolDeps, nowSec: number): Promise<{ schedule: ScheduledUpdate[]; warning?: string }> {
  try {
    const r = await deps.updates.list({ since: isoDate(nowSec - LOOKBACK_DAYS * DAY_SEC), category: 'game', limit: UPDATE_LIST_LIMIT })
    return { schedule: scheduleFrom(r.updates) }
  } catch (error) {
    console.error('[ge-metrics-mcp] market_regime: update feed failed:', error)
    return { schedule: [], warning: 'Game update feed unavailable: the update gate only used upcoming releases you passed.' }
  }
}

export async function liveRegime (deps: ToolDeps, upcoming: Upcoming = [], rules: readonly GateRule[] = LIVE_REGIME_RULES): Promise<RegimeReport> {
  const t = deps.now()
  const [moves, near] = await Promise.all([loadMoves(deps.prices, t), scheduleNear(deps, t)])
  const breadth = marketBreadth(moves, 0)
  const updates = [...near.schedule, ...upcomingSchedule(upcoming)].sort((a, b) => a.at - b.at)
  const decision = decideRegime(rules, {
    t,
    mood: breadth.counted > 0 ? breadth.mood : null,
    index24h: breadth.index24h,
    index7d: breadth.index7d,
    vol24h: null,
    volMedian: null,
    volRatio: null,
    updates
  })
  const majors = updates.filter(u => u.keyword)
  return {
    state: decision.state,
    size: decision.size,
    reasons: decision.reasons,
    rules: rules.map(ruleKey),
    signals: {
      mood: breadth.counted > 0 ? breadth.mood : null,
      index24hPct: pct(breadth.index24h),
      index7dPct: pct(breadth.index7d),
      lastMajorUpdate: brief([...majors].reverse().find(u => u.at <= t)),
      nextMajorUpdate: brief(majors.find(u => u.at > t))
    },
    warnings: near.warning ? [near.warning] : []
  }
}

export function registerRegimeTools (server: McpServer, deps: ToolDeps): void {
  const input = z.object({ upcoming: upcomingSchema })
  server.registerTool('market_regime', {
    title: 'Market regime',
    description: 'Should you open new quick flips right now? Returns state trade / caution / stand-aside, a size multiplier and the reasons. Rules: stand aside from 1 day before to 7 days after a big game release (launch / "out today" / seasonal event posts; pass announced releases in `upcoming`), and half size when market_breadth reads risk-off. Backtested on three 60-day periods (reports/regime-gates.md): this robustly helped short "buy now" style flips; it did not help plan_flips / top_flips, which only apply it on request (apply_regime).',
    inputSchema: input,
    annotations: READ_ONLY
  }, guarded('market_regime', async (a: z.infer<typeof input>) => ({
    ...(await liveRegime(deps, a.upcoming ?? [])),
    howToRead: 'stand-aside = open no new quick flips (let open offers finish); caution = size new positions by `size`; trade = normal. Holding through big releases is where quick flips lost most in backtests.'
  })))
}
