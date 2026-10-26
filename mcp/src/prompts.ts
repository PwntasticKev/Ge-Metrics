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
    '1. Read the market: market_breadth. Risk-off (index falling, more fallers than risers): favour fast, high-volume flips, smaller positions, no overnight holds. Risk-on: trend-following and pre-positioning are fine.',
    '2. Scan: top_flips (sort profit_per_limit, then roi), margin_scan (margins opened vs their norm), find_dips and trend_scan (direction "up" for momentum, "below_mean" for mean reversion), set_arbitrage and processing_methods. Use coming_up for items named in upcoming content; skip rows flagged late (already priced in) or released.',
    '3. Avoid pumps: run pump_dump_scan and drop any candidate flagged as a pump (thin-volume spike that tends to snap back). A dump on an otherwise healthy, liquid item can be a buy.',
    '4. Vet the best 3-5 candidates: get_item (both prices recent? 1h average near the latest price? volume?), price_history (1h, ~48 points), best_trade_hours (only act on high/medium confidence: place buys in the buyAt hour, sells in the sellAt hour, UTC) and fill_estimate at the quantity you plan (buy and sell hours, GP/hour per GE slot). Prefer the highest GP/hour per slot, not just the biggest margin.',
    '5. Size: quantity = min(4h buy limit, what fill_estimate says fills in a few hours, budget / buy price). Spread the stack over several items rather than one; keep total cost within the cash stack and leave room for 8 GE slots.',
    '6. Context: game_updates / update_impact when an update might explain a move.',
    '7. Recommend a short list. For each: buy price, sell price, quantity, expected profit after GE tax, ROI, expected fill time and GP/hour per slot, best hours if any, and the main risk (thin volume, pump, falling trend, risk-off market, stale prices, update-driven repricing).',
    'For items already held, use sell_or_hold (qty, price paid) to decide between selling now and listing.',
    '',
    'Rules: profits are after the 2% GE tax (5M cap per item; some items are exempt). Buy limits reset every 4 hours. Treat margins on items with stale trades (old priceAgeMin) or tiny volume as unreliable. Never invent prices: quote tool output.'
  ]
  return lines.filter((line, i) => line !== '' || i > 3).join('\n')
}

export function registerPrompts (server: McpServer): void {
  server.registerPrompt('flip-analyst', {
    title: 'Flip analyst',
    description: 'Analyze the Grand Exchange (market mood, scans, timing, fill times, pump checks) and recommend sized flips, set arbitrage, processing methods and pre-positions for a given budget.',
    argsSchema: z.object({
      budget: z.string().optional().describe('Cash stack in gp, e.g. "25000000" or "25m"'),
      focus: z.string().optional().describe('Optional focus, e.g. "high-volume flips", "sets", "processing", "dips", "trends", "upcoming updates", "a specific item"'),
      members: z.string().optional().describe('"yes" (default) or "no" for free-to-play')
    })
  }, args => ({
    messages: [{ role: 'user' as const, content: { type: 'text' as const, text: flipAnalystPrompt(args) } }]
  }))
}
