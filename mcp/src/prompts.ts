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
    '2. Plan first: plan_flips (cash = my stack, slots = 8, or 3 if free-to-play; max_fill_hours = how long I can wait, default 2: short cycles re-planned often did best out of sample). It already uses fillable prices (what actually traded with volume on each side, never one-off prints), sizes each slot by buy limit, fill time and cash, and excludes pumps. For a ranked list use top_flips with sort "gp_per_hour" (the recommended sort) and budget.',
    '3. Look for extra edges, then check them: margin_scan (margins opened vs their norm), find_dips, trend_scan (direction "up" for momentum, "below_mean" for mean reversion), set_arbitrage and processing_methods; coming_up for items named in upcoming content (skip rows flagged late or released). Rows from margin_scan, find_dips and top_flips carry expectedFillHours, gpPerHourPerSlot and realisticProfitPerLimit; anything demoted (would not fill within max_fill_hours, pump, no per-side volume) is not a trade. Treat margin_scan as a check: verify any pick with fill_estimate at the exact buy price, sell price and quantity before swapping it into the plan.',
    '4. Avoid pumps: plan_flips and top_flips already exclude/demote them; for other candidates run pump_dump_scan and drop anything flagged as a pump. A dump on an otherwise healthy, liquid item can be a buy.',
    '5. Vet the final picks: fill_estimate at the planned quantity and prices (buy and sell hours, GP/hour per GE slot); best_trade_hours (only act on high/medium confidence: buys in the buyAt hour, sells in the sellAt hour, UTC); get_item / price_history if a price looks off. Never quote a sell price that fill_estimate says takes longer than max_fill_hours: re-price at the 24h typical range instead.',
    '6. Size: use the plan_flips quantities (min of buy limit, what fills within max_fill_hours, cash). Keep total cost within the cash stack, one item per GE slot.',
    '7. Context: game_updates / update_impact when an update might explain a move.',
    '8. Recommend per slot: item, buy price, sell price, quantity, cost, expected profit after GE tax, ROI, expected hours to buy and sell, GP/hour per slot, best hours if any, and the main risk (thin volume, pump, falling trend, risk-off market, stale prices, update-driven repricing). Finish with totals: cash used, expected profit, longest slot time.',
    'For items already held, use sell_or_hold (qty, price paid) to decide between selling now and listing.',
    '',
    'Rules: profits are after the 2% GE tax (5M cap per item; some items are exempt). Buy limits reset every 4 hours. Treat margins on items with stale trades (old priceAgeMin) or tiny volume as unreliable. Never invent prices: quote tool output.'
  ]
  return lines.filter((line, i) => line !== '' || i > 3).join('\n')
}

export function registerPrompts (server: McpServer): void {
  server.registerPrompt('flip-analyst', {
    title: 'Flip analyst',
    description: 'Analyze the Grand Exchange (market mood, fill-aware flip plan across GE slots, scans, timing, fill times, pump checks) and recommend sized flips, set arbitrage, processing methods and pre-positions for a given budget.',
    argsSchema: z.object({
      budget: z.string().optional().describe('Cash stack in gp, e.g. "25000000" or "25m"'),
      focus: z.string().optional().describe('Optional focus, e.g. "high-volume flips", "sets", "processing", "dips", "trends", "upcoming updates", "a specific item"'),
      members: z.string().optional().describe('"yes" (default) or "no" for free-to-play')
    })
  }, args => ({
    messages: [{ role: 'user' as const, content: { type: 'text' as const, text: flipAnalystPrompt(args) } }]
  }))
}
