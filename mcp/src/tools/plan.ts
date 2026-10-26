import type { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { type Candidate, bulkCandidate, refineCandidate } from '../analysis/fills/candidates.js'
import { planFlips, planJson, planValue } from '../analysis/fills/plan.js'
import { topFlips } from '../analysis/flips.js'
import type { ToolDeps } from './deps.js'
import { loadFillData, tax } from './fillData.js'
import { guarded } from './result.js'
import { READ_ONLY, maxFillHoursWithDefault } from './schemas.js'
import { seriesFor } from './series.js'

/** Candidates re-priced from their own hourly series before planning (throttled requests). */
const PLAN_POOL = 24
const MEMBERS_SLOTS = 8
const F2P_SLOTS = 3
const MAX_CASH = 1e13
// Backtest (reports/backtest-2026-10-26.md): items trading under ~10k a day
// were dumped at a loss far more often (33-60% of picks) than liquid ones
// (15%); a 10k floor turned plan_flips from ~break-even to the best variant.
// The 60-day walk-forward (reports/walk-forward-2026-10-26.md) kept 10k
// out of sample (1k and 25k+ both did worse).
export const PLAN_MIN_VOLUME = 10_000
// Walk-forward: a 2h horizon was chosen on 25 of 26 training windows and,
// with everything else as before, beat 8h in all 26 unseen test windows
// (+115M vs +39M over 52 days, losing picks 8% vs 26%). Robust at 10% and
// 50% queue share. Longer horizons add slow sellers that get dumped.
export const PLAN_MAX_FILL_HOURS = 2

export function registerPlanTools (server: McpServer, { prices }: ToolDeps): void {
  const planInput = z.object({
    cash: z.number().positive().max(MAX_CASH).describe('Cash stack in gp to spread across GE slots'),
    slots: z.number().int().min(1).max(MEMBERS_SLOTS).optional().describe('Free GE slots (default 8 for members, 3 for free-to-play)'),
    max_fill_hours: maxFillHoursWithDefault(PLAN_MAX_FILL_HOURS),
    members: z.boolean().default(true).describe('Include members items'),
    min_volume: z.number().int().min(0).default(PLAN_MIN_VOLUME).describe('Minimum daily GE volume per item. Default 10000: backtests (14 days, then a 60-day walk-forward) showed thinner items often never sold at the ask and were dumped at a loss. Lower it only if you will babysit slow, expensive flips.')
  })
  server.registerTool('plan_flips', {
    title: 'Plan flips for a cash stack',
    description: `Start here for "what should I flip with X gp". Picks one item per GE slot to make the most profit that should actually fill within max_fill_hours (default ${PLAN_MAX_FILL_HOURS}h: in a 60-day walk-forward, short cycles re-planned often beat longer ones on every unseen window; all slots run in parallel, so that is also the most GP/hour). Prices are fillable ones (what traded with enough volume per side; the ${PLAN_POOL} best candidates re-priced from their own 24h hourly series); quantity per slot = min(buy limit, what fills within max_fill_hours, cash left). Thin-volume pumps are excluded. Per slot: item, buyAt, sellAt, qty, cost, taxEach, profitEach, expectedProfit (after GE tax), expectedFillHours {buy, sell}, expectedHours, gpPerHourPerSlot. One buy-limit cycle per slot: re-plan after it fills.`,
    inputSchema: planInput,
    annotations: READ_ONLY
  }, guarded('plan_flips', async (a: z.infer<typeof planInput>) => {
    const slots = a.slots ?? (a.members ? MEMBERS_SLOTS : F2P_SLOTS)
    const [market, data] = await Promise.all([prices.market(), loadFillData(prices)])
    const live = topFlips(market, {
      minVolume: a.min_volume, budget: a.cash, sort: 'profit_per_limit', limit: Number.MAX_SAFE_INTEGER, includeMembers: a.members, includeStale: false
    })
    const pool = live
      .filter(f => !data.pumps.has(f.id))
      .flatMap(f => {
        const entry = data.mappingById.get(f.id)
        const c = entry ? bulkCandidate(entry, data.bulk, tax) : null
        return c ? [c] : []
      })
      .map(c => ({ c, value: planValue(c, a.cash, a.max_fill_hours) }))
      .filter(x => x.value > 0)
      .sort((x, y) => y.value - x.value)
      .slice(0, PLAN_POOL)
      .map(x => x.c)
    const series = await seriesFor(prices, pool.map(c => c.entry.id), '1h')
    const refined: Candidate[] = pool.map(c => refineCandidate(c, series.get(c.entry.id), tax))
    const options = { cash: a.cash, slots, maxFillHours: a.max_fill_hours }
    return {
      ...planJson(planFlips(refined, options), options),
      candidatesConsidered: refined.length,
      pumpsExcluded: live.filter(f => data.pumps.has(f.id)).length,
      howToRead: 'Place each buy at buyAt and, once filled, the sell at sellAt. expectedFillHours come from the last 24h of per-side volume and how often each price was reached (buy offers fill from instant-sells, sell offers from instant-buys). Profits are after the 2% GE tax. Verify any slot with fill_estimate (item, qty, buy_price, sell_price) before committing; re-run after fills or the 4h buy-limit reset.'
    }
  }))
}
