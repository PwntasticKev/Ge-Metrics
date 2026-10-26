import { Client } from '@modelcontextprotocol/client'
import { InMemoryTransport } from '@modelcontextprotocol/server'
import { describe, expect, it } from 'vitest'
import { createServer } from '../src/server.js'
import type { ToolDeps } from '../src/tools/deps.js'
import { parseDataset } from '../src/updates/parse.js'
import { UpstreamError } from '../src/wiki/http.js'
import { LATEST, MAPPING, NOW, VOLUMES, avg, hourly, market } from './fixtures/market.js'
import { DATASET } from './fixtures/updates.js'

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
    ...overrides
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

describe('MCP server', () => {
  it('lists every tool, the prompt and the guide resource', async () => {
    const client = await connect(deps())
    const { tools } = await client.listTools()
    expect(tools.map(t => t.name).sort()).toEqual([
      'find_dips', 'game_updates', 'get_item', 'price_history', 'processing_methods', 'search_items', 'set_arbitrage', 'top_flips', 'update_impact'
    ])
    expect(tools.every(t => (t.description ?? '').length > 40)).toBe(true)
    expect((await client.listPrompts()).prompts.map(p => p.name)).toEqual(['flip-analyst'])
    const guide = await client.readResource({ uri: 'ge-metrics://guide' })
    expect(JSON.stringify(guide.contents)).toContain('GE tax')
    const prompt = await client.getPrompt({ name: 'flip-analyst', arguments: { budget: '25m' } })
    expect(JSON.stringify(prompt.messages)).toContain('25m gp')
  })

  it('answers every tool with JSON', async () => {
    const client = await connect(deps())
    expect((await call(client, 'search_items', { query: 'whip' })).data.results[0].id).toBe(4151)
    expect((await call(client, 'get_item', { item: 'abyssal whip' })).data.flip.marginAfterTax).toBe(80_000)
    expect((await call(client, 'price_history', { item: 4151, points: 5 })).data.series).toHaveLength(5)
    expect((await call(client, 'top_flips', { min_volume: 0 })).data.flips[0].id).toBe(4151)
    expect((await call(client, 'set_arbitrage', {})).data.sets[0].setId).toBe(13012)
    expect((await call(client, 'processing_methods', { method: 'sawmill' })).data.count).toBeGreaterThan(0)
    expect((await call(client, 'find_dips', {})).data.dips).toEqual([])
    expect((await call(client, 'game_updates', { limit: 2 })).data.updates[0].items[0]).toEqual({ id: 4151, name: 'Abyssal whip' })
    const impact = await call(client, 'update_impact', { item: 4151, update: 'Fractured', window_days: 1 })
    expect(impact.data).toMatchObject({ item: { id: 4151 }, update: { date: '2026-10-20' } })
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
})
