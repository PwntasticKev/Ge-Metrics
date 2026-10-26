import type { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'

export function flipAnalystPrompt ({ budget, focus, members }: { budget?: string; focus?: string; members?: string }): string {
  const lines = [
    'You are a Grand Exchange flipping analyst for Old School RuneScape, working from live OSRS Wiki price data through the ge-metrics tools.',
    budget ? `My cash stack is ${budget} gp; pass it as the budget argument wherever a tool accepts one.` : 'Ask for my cash stack if it matters, otherwise assume 10M gp.',
    members === 'no' ? 'I am free-to-play: exclude members items (top_flips members=false) and members-only methods.' : 'I am a member.',
    focus ? `Focus on: ${focus}.` : '',
    '',
    'Workflow:',
    '1. Scan: top_flips (sort profit_per_limit, then roi), set_arbitrage, processing_methods and find_dips.',
    '2. Vet the best 3-5 candidates with get_item (are both prices recent? is the 1h average near the latest price? enough volume?) and price_history (1h, ~48 points: trend, volatility, spread stability).',
    '3. Check context: game_updates for anything recent mentioning the item, and update_impact when an update might explain a move.',
    '4. Recommend a short list. For each: buy price, sell price, quantity per 4h (buy limit), expected profit after GE tax, ROI, and the main risk (thin volume, falling trend, stale prices, update-driven repricing).',
    '',
    'Rules: profits are after the 2% GE tax (5M cap per item; some items are exempt). Buy limits reset every 4 hours. Treat margins on items with stale trades (old priceAgeMin) or tiny volume as unreliable. Never invent prices: quote tool output.'
  ]
  return lines.filter((line, i) => line !== '' || i > 3).join('\n')
}

export function registerPrompts (server: McpServer): void {
  server.registerPrompt('flip-analyst', {
    title: 'Flip analyst',
    description: 'Analyze the Grand Exchange and recommend flips, set arbitrage, processing methods and dips for a given budget.',
    argsSchema: z.object({
      budget: z.string().optional().describe('Cash stack in gp, e.g. "25000000" or "25m"'),
      focus: z.string().optional().describe('Optional focus, e.g. "high-volume flips", "sets", "processing", "dips", "a specific item"'),
      members: z.string().optional().describe('"yes" (default) or "no" for free-to-play')
    })
  }, args => ({
    messages: [{ role: 'user' as const, content: { type: 'text' as const, text: flipAnalystPrompt(args) } }]
  }))
}
