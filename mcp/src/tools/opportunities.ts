import type { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { DEFAULT_DIP_OPTIONS, findDips } from '../analysis/dips.js'
import { PROCESSING_METHOD_KEYS, processing, setArbitrage, topFlips } from '../analysis/flips.js'
import { ToolInputError } from '../analysis/resolve.js'
import type { ToolDeps } from './deps.js'
import { guarded } from './result.js'
import { READ_ONLY, budget, flipSort, includeDemoted, includeStale, limit, maxFillHours, maxFillHoursWithDefault } from './schemas.js'
import { loadFillData, tax } from './fillData.js'
import { seriesFor } from './series.js'
import { bulkRows, flipRowJson, rankRows, refineRows } from '../analysis/fills/flipRows.js'
import { demotedSummary } from '../analysis/fills/metrics.js'
import { dipFill, scanFillJson } from '../analysis/fills/scanFills.js'

// Rows per listing re-priced from their own hourly series (throttled requests).
const REFINE_MAX = 15
const REFINE_EXTRA = 5

// 60-day walk-forward (reports/walk-forward-2026-10-26.md): the training
// windows picked a floor of 5k+ a day in 25 of 26 folds; 10k alone beat 1k
// on 22 of 26 unseen test windows (+79M vs +21M). A 2h horizon alone beat 8h
// on 22 of 26 (losing picks 5% vs 12%) and was the most chosen.
export const TOP_MIN_VOLUME = 10_000
export const TOP_MAX_FILL_HOURS = 2

const TAX_NOTE = 'All profits are after the 2% GE tax (capped at 5M/item; items under 50gp and the official exemption list are untaxed).'

export function registerOpportunityTools (server: McpServer, { prices }: ToolDeps): void {
  const flipsInput = z.object({
    min_volume: z.number().int().min(0).default(TOP_MIN_VOLUME).describe(`Minimum daily GE volume (default ${TOP_MIN_VOLUME}: in backtests thinner items were often dumped at a loss)`),
    max_price: z.number().int().positive().optional().describe('Maximum buy price per item in gp'),
    budget,
    sort: z.enum(['gp_per_hour', 'profit', 'roi', 'profit_per_limit']).default('gp_per_hour')
      .describe('gp_per_hour (recommended) = profit of one buy-limit cycle / hours to buy and sell it at fillable prices (a full limit counts as 4h+); profit = gp per item after tax; roi = profit / cost; profit_per_limit = profit x one buy limit (budget capped). All on fillable prices.'),
    max_fill_hours: maxFillHoursWithDefault(TOP_MAX_FILL_HOURS),
    include_demoted: includeDemoted,
    members: z.boolean().default(true).describe('Include members items'),
    include_stale: includeStale,
    limit: limit(100, 20)
  })
  server.registerTool('top_flips', {
    title: 'Top item flips',
    description: `Best single-item flips, fill-aware. Prices are what actually traded recently with enough volume per side (5+ trades in the last hour or 24+ in the day; never a single print): buy at the highest qualifying low, sell at the lowest qualifying high. The top ${REFINE_MAX} are re-priced from their own 24h hourly series (median of qualifying hours). Each row: buyAt, sellAt, qty (one buy limit, budget capped), expectedFillHours {buy, sell}, gpPerHourPerSlot, realisticProfitPerLimit, and the raw live prices under "live". Rows whose buy or sell would take longer than max_fill_hours, thin-volume pumps and items without per-side volume are demoted (dropped unless include_demoted; summarised under "demoted"). ${TAX_NOTE} Live spreads over 25% ROI are excluded.`,
    inputSchema: flipsInput,
    annotations: READ_ONLY
  }, guarded('top_flips', async (a: z.infer<typeof flipsInput>) => {
    const [market, data] = await Promise.all([prices.market(), loadFillData(prices)])
    const live = topFlips(market, {
      minVolume: a.min_volume, maxPrice: a.max_price, budget: a.budget, sort: a.sort === 'gp_per_hour' ? 'profit_per_limit' : a.sort,
      limit: Number.MAX_SAFE_INTEGER, includeMembers: a.members, includeStale: a.include_stale
    })
    const ctx = { ...data, tax, budget: a.budget, maxFillHours: a.max_fill_hours }
    const first = rankRows(bulkRows(live, ctx), a.sort)
    const refineCount = Math.min(a.limit + REFINE_EXTRA, REFINE_MAX)
    const series = await seriesFor(prices, first.slice(0, refineCount).map(r => r.live.id), '1h')
    const ranked = rankRows(refineRows(first, series, ctx), a.sort)
    const flips = (a.include_demoted ? ranked : ranked.filter(r => !r.demotedReason)).slice(0, a.limit).map(flipRowJson)
    return {
      sort: a.sort,
      maxFillHours: a.max_fill_hours,
      count: flips.length,
      flips,
      demoted: demotedSummary(ranked.map(r => ({ id: r.live.id, name: r.live.name, demotedReason: r.demotedReason })))
    }
  }))

  const setInput = z.object({ sort: flipSort, budget, include_stale: includeStale, limit: limit(50, 15) })
  server.registerTool('set_arbitrage', {
    title: 'Set arbitrage',
    description: `Price gaps between GE item sets (armour sets etc., exchanged free at the GE clerk) or crafted combinations (godswords, spirit shields...) and their parts. direction "combine" = buy parts, make the set, sell it; "split" = buy the set, unpack, sell the parts. setsPer4h respects every part's buy limit and volume. ${TAX_NOTE}`,
    inputSchema: setInput,
    annotations: READ_ONLY
  }, guarded('set_arbitrage', async (a: z.infer<typeof setInput>) => {
    const sets = setArbitrage(await prices.market(), { sort: a.sort, limit: a.limit, budget: a.budget, includeStale: a.include_stale })
    return { sort: a.sort, count: sets.length, sets }
  }))

  const processInput = z.object({
    method: z.string().optional().describe(`Only this method. One of: ${PROCESSING_METHOD_KEYS.join(', ')}`),
    sort: z.enum(['per_hour', 'profit', 'roi', 'profit_per_limit']).default('profit_per_limit')
      .describe('per_hour = gp/hour at the wiki rate (capped by buy limits); others as in top_flips'),
    budget,
    include_stale: includeStale,
    limit: limit(50, 15)
  })
  server.registerTool('processing_methods', {
    title: 'Processing methods',
    description: `Buy inputs on the GE, process them (sawmill, plank make, enchanting, tanning, stringing, gem cutting, decanting, herb cleaning, unfinished potions, Sailing methods...), sell the outputs. Profit per action, per 4h (buy-limit and volume capped) and per hour where the wiki gives a rate. ${TAX_NOTE}`,
    inputSchema: processInput,
    annotations: READ_ONLY
  }, guarded('processing_methods', async (a: z.infer<typeof processInput>) => {
    if (a.method && !PROCESSING_METHOD_KEYS.includes(a.method)) {
      throw new ToolInputError(`Unknown method "${a.method}". Use one of: ${PROCESSING_METHOD_KEYS.join(', ')}`)
    }
    const methods = processing(await prices.market(), { method: a.method, sort: a.sort, limit: a.limit, budget: a.budget, includeStale: a.include_stale })
    return { sort: a.sort, count: methods.length, methods }
  }))

  const dipsInput = z.object({
    min_drop_pct: z.number().min(1).max(50).default(DEFAULT_DIP_OPTIONS.minDrop * 100)
      .describe('How far (%) the last hour\'s average low must sit under the 24h average low'),
    max_drop_pct: z.number().min(5).max(95).default(DEFAULT_DIP_OPTIONS.maxDrop * 100)
      .describe('Ignore drops bigger than this % (usually a single fluke trade)'),
    max_high_drop_pct: z.number().min(0).max(20).default(DEFAULT_DIP_OPTIONS.maxHighDrop * 100)
      .describe('Max % the last hour\'s average high may fall vs the 24h average high ("highs hold")'),
    min_daily_volume: z.number().int().min(0).default(DEFAULT_DIP_OPTIONS.minDailyVolume).describe('Minimum 24h traded volume'),
    min_price: z.number().int().min(1).default(DEFAULT_DIP_OPTIONS.minPrice).describe('Minimum 24h average low price in gp'),
    sort: z.enum(['potential', 'drop']).default(DEFAULT_DIP_OPTIONS.sort)
      .describe('potential = profitIfRecovers x min(buy limit, last hour\'s dumped volume); drop = largest % drop'),
    max_fill_hours: maxFillHours,
    include_demoted: includeDemoted,
    limit: limit(50, DEFAULT_DIP_OPTIONS.limit)
  })
  server.registerTool('find_dips', {
    title: 'Find dips',
    description: `Liquid items whose last-hour average instant-sell price is 5%+ (configurable) under their 24h average low while the instant-buy side holds near its 24h average (not falling more than 2%, not spiking): typical dump/panic selling. profitIfRecovers = sell at the 24h average high after tax, buying at the dipped 1h low. Fill-aware: "fill" runs the fill model on one buy limit at the dipped buy and the exit capped at the typical fillable high (the top ${REFINE_MAX} from their 24h hourly series), with expectedFillHours, gpPerHourPerSlot and realisticProfitPerLimit; dips that won't fill within max_fill_hours are demoted (dropped unless include_demoted).`,
    inputSchema: dipsInput,
    annotations: READ_ONLY
  }, guarded('find_dips', async (a: z.infer<typeof dipsInput>) => {
    const [mapping, hour, day, latest] = await Promise.all([prices.mapping(), prices.averages('1h'), prices.averages('24h'), prices.latest()])
    const dips = findDips({ mapping, hour, day, latest }, {
      minDrop: a.min_drop_pct / 100,
      maxDrop: a.max_drop_pct / 100,
      maxHighDrop: a.max_high_drop_pct / 100,
      minDailyVolume: a.min_daily_volume,
      minPrice: a.min_price,
      limit: Math.max(a.limit * 3, REFINE_MAX),
      sort: a.sort
    })
    const byId = new Map(mapping.map(m => [m.id, m]))
    const series = await seriesFor(prices, dips.slice(0, REFINE_MAX).map(d => d.id), '1h')
    const rows = dips.flatMap(d => {
      const item = byId.get(d.id)
      if (!item) return []
      const market = { item, h1: hour.get(d.id), h24: day.get(d.id), latest: latest.get(d.id), series: series.get(d.id) }
      return [{ ...d, ...scanFillJson(dipFill(market, { buyAt: d.hourAvgLow, sellAt: d.dayAvgHigh }, tax, a.max_fill_hours)) }]
    })
    const fillableFirst = [...rows].sort((x, y) => Number(x.demoted) - Number(y.demoted))
    const shown = (a.include_demoted ? fillableFirst : fillableFirst.filter(r => !r.demoted)).slice(0, a.limit)
    return { maxFillHours: a.max_fill_hours, count: shown.length, dips: shown, demoted: demotedSummary(fillableFirst) }
  }))
}
