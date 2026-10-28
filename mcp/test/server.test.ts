import { Client } from '@modelcontextprotocol/client'
import { InMemoryTransport } from '@modelcontextprotocol/server'
import { describe, expect, it } from 'vitest'
import { createServer } from '../src/server.js'
import type { ToolDeps } from '../src/tools/deps.js'
import { parseDataset } from '../src/updates/parse.js'
import { UpstreamError } from '../src/wiki/http.js'
import { LATEST, MAPPING, NOW, VOLUMES, avg, hourly, market } from './fixtures/market.js'
import { DATASET } from './fixtures/updates.js'
import { comingFromPages } from '../src/updates/coming.js'
import { series } from './fixtures/series.js'
import { flatSeries } from './fixtures/fills.js'

const updates = parseDataset(DATASET)
const deps = (overrides: Partial<ToolDeps['prices']> = {}): ToolDeps => ({
  now: () => NOW,
  prices: {
    mapping: async () => MAPPING,
    latest: async () => LATEST,
    volumes: async () => VOLUMES,
    averages: async () => new Map([[4151, avg(1_000_000, 900_000)]]),
    timeseries: async () => hourly(NOW - 48 * 3600, Array(48).fill(950_000)),
    market: async () => market(),
    averagesAt: async () => new Map([[4151, avg(1_000_000, 900_000, 300, 300)]]),
    ...overrides
  },
  coming: {
    load: async () => comingFromPages({
      blogs: [{ title: 'Update:Whip blog', content: '{{Update|date=20 October 2026|category=future}}\nThe [[Abyssal whip]] will be required to make a new weapon.' }],
      games: [],
      polls: []
    }, MAPPING, 0)
  },
  updates: {
    list: async q => ({ source: 'ge-metrics dataset', updates: updates.slice(0, q.limit) }),
    find: async title => updates.find(u => u.title.toLowerCase().includes(title.toLowerCase())) ?? null
  }
})

async function connect (d: ToolDeps) {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair()
  await createServer(d).connect(serverSide)
  const client = new Client({ name: 'test', version: '0.0.0' })
  await client.connect(clientSide)
  return client
}

const call = async (client: Client, name: string, args: Record<string, unknown>) => {
  const result = await client.callTool({ name, arguments: args })
  const text = (result.content as { text: string }[])[0]?.text ?? ''
  return { isError: result.isError === true, text, data: result.isError ? null : JSON.parse(text) }
}

const snapshotStore = (cached: boolean): NonNullable<ToolDeps['snapshots']> => ({
  load: async () => new Map([[4151, avg(1_000_000, 900_000, 300, 300)]]),
  isCached: async () => cached,
  mapping: async () => MAPPING
})

// NOW is 07:33 UTC; a release dated today goes live at 12:00, inside the 1-day pre-release window.
const today = new Date(NOW * 1000).toISOString().slice(0, 10)
// No big release in the update feed.
const quietDeps = (): ToolDeps => ({ ...deps(), updates: { list: async () => ({ source: 'ge-metrics dataset', updates: [] }), find: async () => null } })

describe('MCP server', () => {
  it('market_regime: stands aside after a big release in the feed, or before an announced one', async () => {
    const recent = (await call(await connect(deps()), 'market_regime', {})).data
    expect(recent).toMatchObject({ state: 'stand-aside', size: 0, signals: { lastMajorUpdate: { title: 'The Fractured Archive - Out Today' } } })
    expect(recent.reasons[0]).toMatch(/Fractured Archive.*5\.8d ago/)
    const client = await connect(quietDeps())
    const calm = (await call(client, 'market_regime', {})).data
    expect(calm).toMatchObject({ state: 'trade', size: 1, reasons: [], rules: ['update -1d/+7d kw', 'risk-off x0.5'], warnings: [] })
    const near = (await call(client, 'market_regime', { upcoming: [{ date: today, title: 'Sailing launch' }] })).data
    expect(near).toMatchObject({ state: 'stand-aside', size: 0, signals: { nextMajorUpdate: { date: today, title: 'Sailing launch' } } })
    expect(near.reasons[0]).toMatch(/Sailing launch/)
    expect((await call(client, 'market_regime', { upcoming: [{ date: 'soon', title: 'x' }] })).isError).toBe(true)
    const down = await connect({ ...deps(), updates: { list: async () => { throw new Error('feed down') }, find: async () => null } })
    const blind = (await call(down, 'market_regime', {})).data
    expect(blind).toMatchObject({ state: 'trade' })
    expect(blind.warnings[0]).toMatch(/update feed unavailable/)
  })

  it('plan_flips / top_flips report the regime and apply it only when asked', async () => {
    const client = await connect(quietDeps())
    const upcoming = [{ date: today, title: 'Big release' }]
    const plain = (await call(client, 'plan_flips', { cash: 50_000_000, min_volume: 0, max_fill_hours: 8 })).data
    const info = (await call(client, 'plan_flips', { cash: 50_000_000, min_volume: 0, max_fill_hours: 8, upcoming })).data
    expect(info).toMatchObject({ regime: { state: 'stand-aside', applied: false } })
    expect(info.slotsPlan).toEqual(plain.slotsPlan)
    expect(info.standAside).toBeUndefined()
    const applied = (await call(client, 'plan_flips', { cash: 50_000_000, min_volume: 0, max_fill_hours: 8, upcoming, apply_regime: true })).data
    expect(applied).toMatchObject({ standAside: true, slotsPlan: [], regime: { applied: true } })
    const top = (await call(client, 'top_flips', { min_volume: 0, upcoming, apply_regime: true })).data
    expect(top).toMatchObject({ standAside: true, flips: [] })
    expect((await call(client, 'top_flips', { min_volume: 0 })).data.regime).toMatchObject({ state: 'trade', applied: false })
  })

  it('lists every tool, the prompt and the guide resource', async () => {
    const client = await connect(deps())
    const { tools } = await client.listTools()
    expect(tools.map(t => t.name).sort()).toEqual([
      'backtest', 'best_trade_hours', 'coming_up', 'fill_estimate', 'find_dips', 'game_updates', 'get_item', 'margin_scan', 'market_breadth', 'market_regime', 'plan_flips', 'price_history',
      'processing_methods', 'pump_dump_scan', 'search_items', 'sell_or_hold', 'set_arbitrage', 'top_flips', 'trend_scan', 'update_impact'
    ])
    expect(tools.every(t => (t.description ?? '').length > 40)).toBe(true)
    expect((await client.listPrompts()).prompts.map(p => p.name)).toEqual(['flip-analyst'])
    const guide = await client.readResource({ uri: 'ge-metrics://guide' })
    expect(JSON.stringify(guide.contents)).toContain('GE tax')
    const prompt = await client.getPrompt({ name: 'flip-analyst', arguments: { budget: '25m' } })
    expect(JSON.stringify(prompt.messages)).toContain('25m gp')
    expect(JSON.stringify(prompt.messages)).toMatch(/market_breadth[\s\S]*plan_flips[\s\S]*gp_per_hour[\s\S]*margin_scan[\s\S]*fill_estimate/)
  })

  it('answers every tool with JSON', async () => {
    const client = await connect(deps())
    expect((await call(client, 'search_items', { query: 'whip' })).data.results[0].id).toBe(4151)
    expect((await call(client, 'get_item', { item: 'abyssal whip' })).data.flip.marginAfterTax).toBe(80_000)
    expect((await call(client, 'price_history', { item: 4151, points: 5 })).data.series).toHaveLength(5)
    // The fixture whip's hourly series has no margin after tax: demoted, not handed out.
    expect((await call(client, 'top_flips', { min_volume: 0 })).data).toMatchObject({ sort: 'gp_per_hour', flips: [], demoted: { count: expect.any(Number) } })
    const all = await call(client, 'top_flips', { min_volume: 0, include_demoted: true })
    expect(all.data.flips[0]).toMatchObject({ id: 4151, demoted: true, demotedReason: expect.stringMatching(/No margin/) })
    expect((await call(client, 'set_arbitrage', {})).data.sets[0].setId).toBe(13012)
    expect((await call(client, 'processing_methods', { method: 'sawmill' })).data.count).toBeGreaterThan(0)
    expect((await call(client, 'find_dips', {})).data.dips).toEqual([])
    expect((await call(client, 'game_updates', { limit: 2 })).data.updates[0].items[0]).toEqual({ id: 4151, name: 'Abyssal whip' })
    const impact = await call(client, 'update_impact', { item: 4151, update: 'Fractured', window_days: 1 })
    expect(impact.data).toMatchObject({ item: { id: 4151 }, update: { date: '2026-10-20' } })
  })

  it('answers every trader tool with JSON', async () => {
    const client = await connect(deps({
      timeseries: async () => series({ days: 15, base: 1_000_000 }),
      averages: async () => new Map([[4151, avg(1_000_000, 900_000, 300, 300)]])
    }))
    const hours = await call(client, 'best_trade_hours', { item: 'whip' })
    expect(hours.data).toMatchObject({ id: 4151, timezone: 'UTC', hourOfDay: { table: { columns: expect.any(Array) } } })
    const fill = await call(client, 'fill_estimate', { item: 4151, qty: 70 })
    expect(fill.data).toMatchObject({ id: 4151, qty: 70, buyPrice: 900_000, sellPrice: 1_000_000, profitEach: 80_000, willFill: false, buyHours: null })
    // The fixture market trades around 1M, so a 900k bid never fills.
    const sell = await call(client, 'sell_or_hold', { item: 4151, qty: 2, paid: 850_000 })
    expect(sell.data).toMatchObject({ id: 4151, sellNow: { price: 900_000 } })
    expect((await call(client, 'pump_dump_scan', {})).data).toMatchObject({ flagged: 0, items: [] })
    expect((await call(client, 'margin_scan', {})).data).toMatchObject({ items: [] })
    expect((await call(client, 'trend_scan', { direction: 'up' })).data).toMatchObject({ direction: 'up', items: [] })
    expect((await call(client, 'trend_scan', { direction: 'below_mean' })).data).toMatchObject({ direction: 'below_mean' })
    const breadth = await call(client, 'market_breadth', {})
    expect(breadth.data).toMatchObject({ mood: 'mixed', liquidItems: 1, index: { size: 1 } })
    const coming = await call(client, 'coming_up', { limit: 3 })
    expect(coming.data.groups[0]).toMatchObject({ title: 'Whip blog', kind: 'future', date: '2026-10-20', items: [{ id: 4151, signal: 'up (new use)', status: 'pending' }] })
    expect((await call(client, 'fill_estimate', { item: 4151, qty: 0 })).isError).toBe(true)
    expect((await call(client, 'trend_scan', { direction: 'sideways' })).isError).toBe(true)
  })

  it('plans and lists fill-aware flips', async () => {
    const client = await connect(deps({
      timeseries: async () => flatSeries({ low: 900_000, high: 1_000_000, volume: 100 }),
      averages: async () => new Map([[4151, avg(1_000_000, 900_000, 2400, 2400)]])
    }))
    // Defaults from the walk-forward: 10k/day floor and 2h patience demote this 3k/day, 4.4h whip.
    expect((await call(client, 'top_flips', { budget: 50_000_000, max_fill_hours: 8 })).data).toMatchObject({ flips: [] })
    expect((await call(client, 'top_flips', { min_volume: 0, budget: 50_000_000 })).data).toMatchObject({ maxFillHours: 2, flips: [] })
    const top = await call(client, 'top_flips', { min_volume: 0, budget: 50_000_000, max_fill_hours: 8 })
    expect(top.data.flips[0]).toMatchObject({
      id: 4151, buyAt: 900_000, sellAt: 1_000_000, marginAfterTax: 80_000, qty: 55, demoted: false, priceBasis: 'hourly series (24h)',
      expectedFillHours: { buy: 2.2, sell: 2.2 }, realisticProfitPerLimit: 4_400_000
    })
    // Default volume floor (10k/day, backtest finding) excludes the 3k/day whip.
    expect((await call(client, 'plan_flips', { cash: 50_000_000 })).data).toMatchObject({ totals: { slotsUsed: 0 } })
    // Default 2h patience: only what buys and sells within 2h (25 of the 55 limit).
    expect((await call(client, 'plan_flips', { cash: 50_000_000, min_volume: 1000 })).data).toMatchObject({ maxFillHours: 2, slotsPlan: [{ id: 4151, qty: 25 }] })
    const plan = await call(client, 'plan_flips', { cash: 50_000_000, min_volume: 1000, max_fill_hours: 8 })
    expect(plan.data).toMatchObject({ slots: 8, maxFillHours: 8, totals: { slotsUsed: 1, cost: 49_500_000, expectedProfit: 4_400_000 } })
    expect(plan.data.slotsPlan[0]).toMatchObject({ id: 4151, buyAt: 900_000, sellAt: 1_000_000, qty: 55, taxEach: 20_000, expectedHours: 4.4 })
    expect((await call(client, 'plan_flips', { cash: 50_000_000, members: false })).data).toMatchObject({ slots: 3, totals: { slotsUsed: 0 } })
    expect((await call(client, 'plan_flips', { cash: 0 })).isError).toBe(true)
    expect((await call(client, 'margin_scan', { max_fill_hours: 4 })).data).toMatchObject({ maxFillHours: 4, items: [] })
    expect((await call(client, 'find_dips', {})).data).toMatchObject({ dips: [], demoted: { count: 0 } })
  })

  it('returns readable tool errors', async () => {
    const client = await connect(deps())
    const unknown = await call(client, 'get_item', { item: 'zzzz' })
    expect(unknown).toMatchObject({ isError: true })
    expect(unknown.text).toMatch(/No tradeable item matches/)
    const down = await connect(deps({ latest: async () => { throw new UpstreamError('prices.runescape.wiki returned HTTP 503') } }))
    const upstream = await call(down, 'search_items', { query: 'whip' })
    expect(upstream.text).toMatch(/Price data unavailable: prices.runescape.wiki returned HTTP 503/)
    expect((await call(client, 'processing_methods', { method: 'juggling' })).text).toMatch(/Unknown method/)
    expect((await call(client, 'top_flips', { limit: 0 })).isError).toBe(true)
  })

  it('backtest replays strategies from cached snapshots and bounds new requests', async () => {
    const client = await connect({ ...deps(), snapshots: snapshotStore(true) })
    const r = await call(client, 'backtest', { strategy: 'plan_flips', days: 1 })
    expect(r.isError).toBe(false)
    expect(r.data.window.decisions).toBe(7)
    expect(r.data.strategies.map((s: { key: string }) => s.key).every((k: string) => k.startsWith('plan_flips'))).toBe(true)
    expect(r.data.strategies[0]).toMatchObject({ picks: expect.any(Number), realizedProfit: expect.any(Number), buyFillRate: expect.anything() })
    const cold = await connect({ ...deps(), snapshots: snapshotStore(false) })
    const refused = await call(cold, 'backtest', { strategy: 'all', days: 14 })
    expect(refused).toMatchObject({ isError: true, text: expect.stringMatching(/uncached wiki snapshots/) })
    expect((await call(client, 'backtest', { strategy: 'nope' })).isError).toBe(true)
  })
})
