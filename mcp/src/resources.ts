import type { McpServer } from '@modelcontextprotocol/server'
import { PROCESSING_METHOD_KEYS } from './analysis/flips.js'

export const GUIDE = `# GE Metrics glossary

- buyAt: the instant-sell price (wiki "low"). Placing a buy offer here usually fills.
- sellAt: the instant-buy price (wiki "high"). Placing a sell offer here usually fills.
- GE tax: 2% of the sell price per item, rounded down, capped at 5,000,000 gp. Items sold under 50 gp and items on the official exemption list (bonds, teleport tablets, some food and ammo...) are untaxed.
- marginAfterTax / profit: sellAt - buyAt - tax.
- Buy limit: max quantity you can buy per item per 4 hours. Unknown limits are assumed to be 8.
- qtyPer4h / setsPer4h / actionsPer4h: min(buy limit, ~1/6 of daily volume, what the budget affords).
- profitPer4h: profit x that quantity ("profit_per_limit" sort).
- priceAgeMin: minutes since the older of the two latest trades. Old = unreliable margin.
- Daily volume: OSRS Wiki /volumes (items traded on the GE in the last day).

Processing methods: ${PROCESSING_METHOD_KEYS.join(', ')}.

Data: OSRS Wiki real-time prices API (prices.runescape.wiki), cached for 1-60 minutes depending on endpoint.
`

export function registerResources (server: McpServer): void {
  server.registerResource('guide', 'ge-metrics://guide', {
    title: 'GE Metrics glossary',
    description: 'Definitions of the fields the tools return, GE tax rules and buy-limit math.',
    mimeType: 'text/markdown'
  }, async uri => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: GUIDE }] }))
}
