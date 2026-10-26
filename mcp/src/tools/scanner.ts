import type { McpServer } from '@modelcontextprotocol/server'
import { tax } from './fillData.js'
import { z } from 'zod'
import { marketBreadth } from '../analysis/scanner/breadth.js'
import { type Move, hourStartAgo, liquidMoves } from '../analysis/scanner/marketMoves.js'
import { breadthReport, flagSpikes, keepMarginRow, marginRow, reversionRows, spikeRow, trendRows } from '../analysis/scanner/report.js'
import { screenSpreads } from '../analysis/scanner/spreadScan.js'
import { dipCandidates, trendCandidates } from '../analysis/scanner/trendScan.js'
import type { PriceSource } from '../wiki/prices.js'
import type { ToolDeps } from './deps.js'
import { guarded } from './result.js'
import { seriesFor } from './series.js'
import { READ_ONLY, includeDemoted, limit, maxFillHours } from './schemas.js'
import { demotedSummary } from '../analysis/fills/metrics.js'
import { quoteFill, scanFillJson } from '../analysis/fills/scanFills.js'

// How many items per scan get a per-item history check (throttled requests).
const CHECK_SPIKES = 10
const CHECK_SPREADS = 25
const CHECK_CANDIDATES = 20


async function loadMoves (prices: PriceSource, nowSec: number): Promise<Move[]> {
  const [mapping, hour, day, hourDayAgo, hourWeekAgo] = await Promise.all([
    prices.mapping(), prices.averages('1h'), prices.averages('24h'),
    prices.averagesAt('1h', hourStartAgo(nowSec, 24)), prices.averagesAt('1h', hourStartAgo(nowSec, 24 * 7))
  ])
  return liquidMoves(mapping.map(m => m.id), { hour, day, hourDayAgo, hourWeekAgo })
}

const nameLookup = (mapping: readonly { id: number; name: string }[]) => {
  const names = new Map(mapping.map(m => [m.id, m.name]))
  return (id: number) => names.get(id) ?? String(id)
}

export function registerScannerTools (server: McpServer, { prices, now }: ToolDeps): void {
  const spikeInput = z.object({ limit: limit(50, 15) })
  server.registerTool('pump_dump_scan', {
    title: 'Pump and dump scan',
    description: `Items whose price just moved sharply on thin volume (likely a few traders pushing it; tends to snap back): last hour 8%+ from the 24h average on both sides with under 60% of a typical hour's trades, or a 1-3 trade 5-minute print 12%+ away from both the hour and the day. The top ${CHECK_SPIKES} also get an hourly z-score vs the past week (confirmed = |z| >= 3 on below-median volume). Avoid buying pumps; dumps can be buy-the-dip candidates if the item is otherwise healthy.`,
    inputSchema: spikeInput,
    annotations: READ_ONLY
  }, guarded('pump_dump_scan', async ({ limit }: z.infer<typeof spikeInput>) => {
    const [mapping, h1, h24, m5] = await Promise.all([prices.mapping(), prices.averages('1h'), prices.averages('24h'), prices.averages('5m')])
    const input = { mapping, h1, h24, m5 }
    const flagged = flagSpikes(input)
    const top = flagged.slice(0, limit)
    const series = await seriesFor(prices, top.slice(0, CHECK_SPIKES).map(f => f.entry.id), '1h')
    return {
      flagged: flagged.length,
      pumps: flagged.filter(f => f.flag.kind === 'pump').length,
      dumps: flagged.filter(f => f.flag.kind === 'dump').length,
      count: top.length,
      items: top.map(f => spikeRow(f, input, series.get(f.entry.id)))
    }
  }))

  const marginInput = z.object({ max_fill_hours: maxFillHours, include_demoted: includeDemoted, limit: limit(50, 10) })
  server.registerTool('margin_scan', {
    title: 'Margins opened',
    description: `Items whose live margin after tax is 2x+ their normal margin right now. Guards: both live prices traded in the last 20 min; the "careful" margin uses the worse of live and last-hour average on each side (a stray print can't fake a gap); each side traded 3+ times in the last hour; 240+ trades/day; profit per buy limit >= 20k; thin-volume pumps excluded. The top ${CHECK_SPREADS} are checked against their 7-day median hourly margin (robust z); rows with z < 2 are dropped as normal for the item. Fill-aware: each row's quoted buyAt/sellAt is run through the fill model on one buy limit using the item's last 24h of per-side volume and how often the price was actually reached ("fill": expectedFillHours, gpPerHourPerSlot, realisticProfitPerLimit). A margin whose buy or sell won't fill within max_fill_hours (typically a one-off spike) is demoted, with the trade at typical fillable prices under "atTypicalPrices"; demoted rows are dropped unless include_demoted. This is a check: confirm any pick with fill_estimate at your quantity.`,
    inputSchema: marginInput,
    annotations: READ_ONLY
  }, guarded('margin_scan', async (a: z.infer<typeof marginInput>) => {
    const [mapping, latest, h1, h24, m5] = await Promise.all([prices.mapping(), prices.latest(), prices.averages('1h'), prices.averages('24h'), prices.averages('5m')])
    const pumps = new Set(flagSpikes({ mapping, h1, h24, m5 }).filter(f => f.flag.kind === 'pump').map(f => f.entry.id))
    const screened = screenSpreads(mapping, { latest, h1, h24, nowSec: now(), tax, isPump: id => pumps.has(id) })
    const checked = screened.slice(0, Math.min(CHECK_SPREADS, Math.max(a.limit * 2, 10)))
    const series = await seriesFor(prices, checked.map(r => r.item.id), '1h')
    const rows = checked.flatMap(r => {
      const row = marginRow(r, series.get(r.item.id), tax)
      if (!keepMarginRow(row)) return []
      const market = { item: r.item, h1: h1.get(r.item.id), h24: h24.get(r.item.id), latest: latest.get(r.item.id), series: series.get(r.item.id) }
      return [{ ...row, ...scanFillJson(quoteFill(market, { buyAt: r.carefulBuy, sellAt: r.carefulSell }, tax, a.max_fill_hours)) }]
    })
    const ranked = [...rows].sort((x, y) => Number(x.demoted) - Number(y.demoted) || (y.fill?.gpPerHourPerSlot ?? 0) - (x.fill?.gpPerHourPerSlot ?? 0))
    const items = (a.include_demoted ? ranked : ranked.filter(r => !r.demoted)).slice(0, a.limit)
    return { screened: screened.length, checked: checked.length, maxFillHours: a.max_fill_hours, count: items.length, items, demoted: demotedSummary(ranked) }
  }))

  const trendInput = z.object({
    direction: z.enum(['up', 'down', 'both', 'below_mean']).default('both')
      .describe('up / down / both = steady 7-day trends; below_mean = liquid items 8%+ and 2+ std-devs under their 30-day mean after a range-bound month (mean-reversion buys)'),
    limit: limit(20, 10)
  })
  server.registerTool('trend_scan', {
    title: 'Trend and mean-reversion scan',
    description: `Screens liquid items (10M+ gp traded/day) by their move vs the same hour 1 and 7 days ago, then fits the top ${CHECK_CANDIDATES} candidates on their 6h price history. Trends: log-price line over 7 days with R² >= 0.7 and 0.5%+/day (fit.dailyPct, fit.weekPct, fit.r2). below_mean: gap and z vs the 30-day mean (excluding the last 2 days), baseline drift under 15%, on at least half a normal day's volume; thin-volume spikes excluded.`,
    inputSchema: trendInput,
    annotations: READ_ONLY
  }, guarded('trend_scan', async ({ direction, limit }: z.infer<typeof trendInput>) => {
    const nowSec = now()
    const [mapping, moves] = await Promise.all([prices.mapping(), loadMoves(prices, nowSec)])
    const nameOf = nameLookup(mapping)
    if (direction === 'below_mean') {
      const [h1, h24, m5] = await Promise.all([prices.averages('1h'), prices.averages('24h'), prices.averages('5m')])
      const spiking = new Set(flagSpikes({ mapping, h1, h24, m5 }).map(f => f.entry.id))
      const candidates = dipCandidates(moves.filter(m => !spiking.has(m.id)), CHECK_CANDIDATES)
      const rows = reversionRows(candidates, await seriesFor(prices, candidates.map(c => c.id), '6h'), nameOf)
      return { direction, candidates: candidates.length, count: Math.min(rows.length, limit), items: rows.slice(0, limit) }
    }
    const candidates = trendCandidates(moves, CHECK_CANDIDATES, direction)
    const rows = trendRows(candidates, await seriesFor(prices, candidates.map(c => c.id), '6h'), nameOf)
    return { direction, candidates: candidates.length, count: Math.min(rows.length, limit), items: rows.slice(0, limit) }
  }))

  server.registerTool('market_breadth', {
    title: 'Market breadth',
    description: 'Whole-market mood: how many liquid items rose, fell or stayed flat over 24h, a value-weighted index of the 100 most traded items (24h and 7d change), its top gainers and losers, and a risk-on / risk-off / mixed read. Check this first: in risk-off markets favour quick, high-volume flips and avoid holding.',
    inputSchema: z.object({}),
    annotations: READ_ONLY
  }, guarded('market_breadth', async () => {
    const [mapping, moves] = await Promise.all([prices.mapping(), loadMoves(prices, now())])
    return breadthReport(marketBreadth(moves), nameLookup(mapping))
  }))
}
