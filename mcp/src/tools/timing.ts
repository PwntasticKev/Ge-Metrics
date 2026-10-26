import type { McpServer } from '@modelcontextprotocol/server'
import { geTax } from '@ge/engine'
import { z } from 'zod'
import { resolveItem } from '../analysis/resolve.js'
import { bestTradeHoursReport, fillEstimateReport, sellOrHoldReport } from '../analysis/timing/report.js'
import type { ToolDeps } from './deps.js'
import { guarded } from './result.js'
import { READ_ONLY, itemRef } from './schemas.js'

const MAX_QTY = 100_000_000
const MAX_PRICE = 2_147_483_647
const qty = z.number().int().min(1).max(MAX_QTY)
const price = z.number().int().min(1).max(MAX_PRICE)

export function registerTimingTools (server: McpServer, { prices }: ToolDeps): void {
  const hoursInput = z.object({ item: itemRef })
  server.registerTool('best_trade_hours', {
    title: 'Best trade hours',
    description: 'When in the day (UTC) and week an item is cheapest to buy and dearest to sell. Detrended hour-of-day profile from ~15 days of hourly prices and weekday profile from ~90 days of 6h prices, each with a confidence that guards against noise (sign test across days, corrected for picking the best of 24 hours / 7 days; thin hours excluded). Use confidence "high"/"medium" only; "low" means no reliable pattern.',
    inputSchema: hoursInput,
    annotations: READ_ONLY
  }, guarded('best_trade_hours', async ({ item }: z.infer<typeof hoursInput>) => {
    const entry = resolveItem(await prices.mapping(), item)
    const [hourly, sixHourly] = await Promise.all([prices.timeseries(entry.id, '1h'), prices.timeseries(entry.id, '6h')])
    return bestTradeHoursReport(entry, hourly, sixHourly)
  }))

  const fillInput = z.object({
    item: itemRef,
    qty: qty.describe('How many items to buy and then sell'),
    buy_price: price.optional().describe('Your buy offer price; default = live instant-sell price'),
    sell_price: price.optional().describe('Your sell offer price; default = live instant-buy price')
  })
  server.registerTool('fill_estimate', {
    title: 'Fill time estimate',
    description: 'How long buy and sell offers of a given size should take to fill, from the last 24h of per-side volume (buy offers fill from instant-sells, sell offers from instant-buys), how often the market reached your price, and your queue position. Also GP/hour one GE slot earns cycling one buy limit, profit after tax, and how many 4h buy-limit windows the quantity needs.',
    inputSchema: fillInput,
    annotations: READ_ONLY
  }, guarded('fill_estimate', async (a: z.infer<typeof fillInput>) => {
    const entry = resolveItem(await prices.mapping(), a.item)
    const [series, latest] = await Promise.all([prices.timeseries(entry.id, '1h'), prices.latest()])
    return fillEstimateReport({
      entry, series, latest: latest.get(entry.id), qty: a.qty, buyPrice: a.buy_price, sellPrice: a.sell_price, taxOf: p => geTax(p, entry.id)
    })
  }))

  const sellInput = z.object({
    item: itemRef,
    qty: qty.describe('How many you hold'),
    paid: z.number().min(0).max(MAX_PRICE).describe('What you paid per item in gp')
  })
  server.registerTool('sell_or_hold', {
    title: 'Sell now or list',
    description: 'For items you hold: sell now at the instant-sell price, or list at the 24h typical high and wait? Returns profit after tax for both vs what you paid, expected wait, break-even sell price, the best selling hour if there is a reliable pattern, and a thin-volume pump/dump flag (sell into a pump).',
    inputSchema: sellInput,
    annotations: READ_ONLY
  }, guarded('sell_or_hold', async (a: z.infer<typeof sellInput>) => {
    const entry = resolveItem(await prices.mapping(), a.item)
    const [series, latest, m5, h1, d1] = await Promise.all([
      prices.timeseries(entry.id, '1h'), prices.latest(), prices.averages('5m'), prices.averages('1h'), prices.averages('24h')
    ])
    return sellOrHoldReport({
      entry,
      qty: a.qty,
      paid: a.paid,
      series,
      latest: latest.get(entry.id),
      averages: { '5m': m5.get(entry.id), '1h': h1.get(entry.id), '24h': d1.get(entry.id) },
      taxOf: p => geTax(p, entry.id)
    })
  }))
}
