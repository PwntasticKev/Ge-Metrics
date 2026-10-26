// Drives the built server over stdio against the live APIs and calls every
// tool once. Usage: npm run build && node scripts/smoke.mjs [--full]
import { Client } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'
import { fileURLToPath } from 'node:url'

const full = process.argv.includes('--full')
const server = fileURLToPath(new URL('../dist/index.js', import.meta.url))
const client = new Client({ name: 'ge-metrics-smoke', version: '0.0.0' })
await client.connect(new StdioClientTransport({ command: process.execPath, args: [server], stderr: 'inherit' }))

const trim = (value, max = full ? Infinity : 900) => {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  return text.length > max ? `${text.slice(0, max)}... (${text.length} chars)` : text
}

const { tools } = await client.listTools()
console.log(`tools (${tools.length}): ${tools.map(t => t.name).join(', ')}`)
const { prompts } = await client.listPrompts()
console.log(`prompts: ${prompts.map(p => p.name).join(', ')}`)
const { resources } = await client.listResources()
console.log(`resources: ${resources.map(r => r.uri).join(', ')}`)

const calls = [
  ['search_items', { query: 'godsword', limit: 3 }],
  ['get_item', { item: 'abyssal whip' }],
  ['price_history', { item: 4151, timestep: '1h', points: 6 }],
  ['top_flips', { min_volume: 5000, budget: 50_000_000, sort: 'profit_per_limit', limit: 3 }],
  ['set_arbitrage', { limit: 3 }],
  ['processing_methods', { limit: 3, sort: 'per_hour' }],
  ['find_dips', { limit: 3 }],
  ['game_updates', { limit: 3 }],
  ['game_updates', { item: 'dragon bones', limit: 2 }],
  ['update_impact', { item: 'twisted bow', update: 'Fractured Archive', window_days: 3 }],
  ['market_breadth', {}],
  ['pump_dump_scan', { limit: 3 }],
  ['margin_scan', { limit: 3 }],
  ['trend_scan', { direction: 'both', limit: 3 }],
  ['trend_scan', { direction: 'below_mean', limit: 3 }],
  ['coming_up', { limit: 2, pending_only: true }],
  ['best_trade_hours', { item: 'dragon bones' }],
  ['fill_estimate', { item: 'dragon bones', qty: 7500 }],
  ['sell_or_hold', { item: 'abyssal whip', qty: 5, paid: 1_400_000 }]
]

let failures = 0
for (const [name, args] of calls) {
  const started = Date.now()
  const result = await client.callTool({ name, arguments: args })
  const text = result.content.map(c => c.text ?? '').join('')
  if (result.isError) failures++
  console.log(`\n## ${name} ${JSON.stringify(args)} ${result.isError ? 'ERROR' : 'ok'} ${Date.now() - started}ms\n${trim(text)}`)
}

const prompt = await client.getPrompt({ name: 'flip-analyst', arguments: { budget: '25m' } })
console.log(`\n## prompt flip-analyst\n${trim(prompt.messages[0].content.text, 600)}`)
await client.close()
process.exit(failures ? 1 : 0)
