import { McpServer } from '@modelcontextprotocol/server'
import { TtlCache } from './cache.js'
import { registerPrompts } from './prompts.js'
import { registerResources } from './resources.js'
import type { ToolDeps } from './tools/deps.js'
import { registerMarketTools } from './tools/market.js'
import { registerOpportunityTools } from './tools/opportunities.js'
import { registerUpdateTools } from './tools/updates.js'
import { createUpdateSource } from './updates/source.js'
import { createPriceSource } from './wiki/prices.js'

export const SERVER_NAME = 'ge-metrics'
export const SERVER_VERSION = '0.1.0'

const INSTRUCTIONS = 'Live OSRS Grand Exchange analysis from the OSRS Wiki prices API. Start with search_items to find ids, top_flips / set_arbitrage / processing_methods / find_dips to scan for opportunities, get_item and price_history to vet one item, game_updates and update_impact for update-driven moves. All profits are after GE tax and respect 4h buy limits. Read ge-metrics://guide for field definitions.'

// One shared data layer (and cache) for every connection the process serves.
export function createDeps (): ToolDeps {
  const cache = new TtlCache()
  const prices = createPriceSource({ cache })
  return {
    prices,
    updates: createUpdateSource({ cache, mapping: () => prices.mapping() }),
    now: () => Math.floor(Date.now() / 1000)
  }
}

export function createServer (deps: ToolDeps): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION }, { instructions: INSTRUCTIONS })
  registerMarketTools(server, deps)
  registerOpportunityTools(server, deps)
  registerUpdateTools(server, deps)
  registerPrompts(server)
  registerResources(server)
  return server
}
