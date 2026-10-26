import type { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { DEFAULT_DIP_OPTIONS, findDips } from '../analysis/dips.js'
import { PROCESSING_METHOD_KEYS, processing, setArbitrage, topFlips } from '../analysis/flips.js'
import { ToolInputError } from '../analysis/resolve.js'
import type { ToolDeps } from './deps.js'
import { guarded } from './result.js'
import { READ_ONLY, budget, flipSort, includeStale, limit } from './schemas.js'

const TAX_NOTE = 'All profits are after the 2% GE tax (capped at 5M/item; items under 50gp and the official exemption list are untaxed).'

export function registerOpportunityTools (server: McpServer, { prices }: ToolDeps): void {
  const flipsInput = z.object({
    min_volume: z.number().int().min(0).default(1000).describe('Minimum daily GE volume (filters illiquid items)'),
    max_price: z.number().int().positive().optional().describe('Maximum buy price per item in gp'),
    budget,
    sort: flipSort,
    members: z.boolean().default(true).describe('Include members items'),
    include_stale: includeStale,
    limit: limit(100, 20)
  })
  server.registerTool('top_flips', {
    title: 'Top item flips',
    description: `Best single-item flips right now: buy at the instant-sell price, sell at the instant-buy price. Buy-limit aware: qtyPer4h = min(4h buy limit, ~1/6 of daily volume, what the budget affords); profitPer4h = margin x qtyPer4h. ${TAX_NOTE} Items with implausible spreads (>25% ROI, usually one-off trades) are excluded.`,
    inputSchema: flipsInput,
    annotations: READ_ONLY
  }, guarded('top_flips', async (a: z.infer<typeof flipsInput>) => {
    const flips = topFlips(await prices.market(), {
      minVolume: a.min_volume, maxPrice: a.max_price, budget: a.budget, sort: a.sort,
      limit: a.limit, includeMembers: a.members, includeStale: a.include_stale
    })
    return { sort: a.sort, count: flips.length, flips }
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
    limit: limit(50, DEFAULT_DIP_OPTIONS.limit)
  })
  server.registerTool('find_dips', {
    title: 'Find dips',
    description: 'Liquid items whose last-hour average instant-sell price is 5%+ (configurable) under their 24h average low while the instant-buy side holds near its 24h average (not falling more than 2%, not spiking): typical dump/panic selling. profitIfRecovers = sell at the 24h average high after tax, buying at the dipped 1h low.',
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
      limit: a.limit,
      sort: a.sort
    })
    return { count: dips.length, dips }
  }))
}
