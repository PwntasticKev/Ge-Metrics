import type { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { priceHistory } from '../analysis/history.js'
import { NATURE_RUNE_ID, itemDetail } from '../analysis/item.js'
import { resolveItem } from '../analysis/resolve.js'
import { searchItems } from '../analysis/search.js'
import { TIMESTEPS } from '../wiki/types.js'
import type { ToolDeps } from './deps.js'
import { guarded } from './result.js'
import { READ_ONLY, itemRef, limit } from './schemas.js'

export function registerMarketTools (server: McpServer, { prices, now }: ToolDeps): void {
  const searchInput = z.object({
    query: z.string().trim().min(1).max(100).describe('Part of an item name, e.g. "godsword" or "ranarr"'),
    limit: limit(50, 10)
  })
  server.registerTool('search_items', {
    title: 'Search items',
    description: 'Find Grand Exchange items by name. Returns id, live buy/sell prices (buyAt = instant-sell price you can buy at, sellAt = instant-buy price you can sell at), margin after 2% GE tax, ROI %, 4h buy limit and daily volume. Use the id with the other tools.',
    inputSchema: searchInput,
    annotations: READ_ONLY
  }, guarded('search_items', async ({ query, limit }: z.infer<typeof searchInput>) => {
    const [mapping, latest, volumes] = await Promise.all([prices.mapping(), prices.latest(), prices.volumes()])
    const results = searchItems({ mapping, latest, volumes, query, limit })
    return { query, count: results.length, results }
  }))

  const itemInput = z.object({ item: itemRef })
  server.registerTool('get_item', {
    title: 'Item details',
    description: 'Everything about one item: latest instant buy/sell with trade age, 5m/1h/24h average prices and volumes, high/low alch values and high-alch profit (incl. nature rune), buy limit, GE tax (and exemption), margin after tax, ROI and profit per buy limit.',
    inputSchema: itemInput,
    annotations: READ_ONLY
  }, guarded('get_item', async ({ item }: z.infer<typeof itemInput>) => {
    const [mapping, latest, volumes, m5, h1, d1] = await Promise.all([
      prices.mapping(), prices.latest(), prices.volumes(), prices.averages('5m'), prices.averages('1h'), prices.averages('24h')
    ])
    const entry = resolveItem(mapping, item)
    return itemDetail({
      entry,
      latest: latest.get(entry.id),
      averages: { '5m': m5.get(entry.id), '1h': h1.get(entry.id), '24h': d1.get(entry.id) },
      dailyVolume: volumes.get(entry.id) ?? null,
      natureRunePrice: latest.get(NATURE_RUNE_ID)?.high ?? null,
      nowSec: now()
    })
  }))

  const historyInput = z.object({
    item: itemRef,
    timestep: z.enum(TIMESTEPS as [string, ...string[]]).default('1h')
      .describe('Bucket size: 5m (~30h of history), 1h (~15 days), 6h (~3 months), 24h (~1 year)'),
    points: z.number().int().min(2).max(365).default(48).describe('Most recent buckets to return (2-365)')
  })
  server.registerTool('price_history', {
    title: 'Price history',
    description: 'Historical average high/low prices and volume for one item, plus stats over the returned window: min/max/mean mid price, first->last % change, volatility (std-dev of step % changes), average spread % and volume. Series rows are [unixSeconds, avgHigh, avgLow, volume].',
    inputSchema: historyInput,
    annotations: READ_ONLY
  }, guarded('price_history', async ({ item, timestep, points }: z.infer<typeof historyInput>) => {
    const entry = resolveItem(await prices.mapping(), item)
    const step = timestep as (typeof TIMESTEPS)[number]
    const series = await prices.timeseries(entry.id, step)
    return { id: entry.id, name: entry.name, ...priceHistory(series, step, points) }
  }))
}
