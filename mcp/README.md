# ge-metrics-mcp

An [MCP](https://modelcontextprotocol.io) server that lets AI agents analyze the Old School RuneScape Grand Exchange: live prices, flips after GE tax, set arbitrage, processing methods, dips and how game updates moved prices.

- No accounts, no database: data comes straight from the [OSRS Wiki real-time prices API](https://prices.runescape.wiki/api/v1/osrs/) and OSRS Wiki `Update:` pages (or the ge-metrics.com game-updates dataset when it is published).
- Uses the same flipping engine as the GE Metrics web and iOS apps (`src/domain/flipping`): GE tax with the official exemption list, buy limits, volume caps, GE item sets and curated processing methods. It is bundled in, so `dist/` is self-contained apart from the MCP SDK and zod.
- In-memory caching: latest prices 60s, 5m averages 2 min, 1h averages 5 min, 24h averages and volumes 15 min, item mapping 6h, timeseries 2-60 min by timestep, game updates 30 min.
- stdio transport, built on `@modelcontextprotocol/server` v2 (serves both 2025-era and current MCP clients).

## Install

Requires Node 20+ to run (Node 22+ to build and test).

```bash
cd mcp
npm install
npm run build
```

### Claude Code

```bash
claude mcp add ge-metrics -- node /absolute/path/to/Ge-Metrics/mcp/dist/index.js
```

### Claude Desktop

Add to `claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`, Windows: `%APPDATA%\Claude\claude_desktop_config.json`), then restart Claude Desktop:

```json
{
  "mcpServers": {
    "ge-metrics": {
      "command": "node",
      "args": ["/absolute/path/to/Ge-Metrics/mcp/dist/index.js"]
    }
  }
}
```

Any other MCP client: run `node mcp/dist/index.js` over stdio. The package also declares a `ge-metrics-mcp` bin.

## Tools

All tools are read-only and return compact JSON. Every profit is after the 2% GE tax (capped at 5M per item; items under 50 gp and the exemption list are untaxed). `buyAt` is the instant-sell price (where buy offers fill), `sellAt` the instant-buy price.

| Tool | What it does |
| --- | --- |
| `search_items(query, limit)` | Find items by name: id, buy/sell, margin after tax, ROI, buy limit, daily volume. |
| `get_item(item)` | One item by id or name: latest prices + trade age, 5m/1h/24h averages and volumes, alch values and high-alch profit, limit, tax, margin, ROI, profit per buy limit. |
| `price_history(item, timestep, points)` | Series (`5m`, `1h`, `6h`, `24h`) plus min/max/mean, % change, volatility, spread and volume. |
| `top_flips(min_volume, max_price, budget, sort, members, limit)` | Best single-item flips; `sort` = `profit`, `roi` or `profit_per_limit` (profit x min(buy limit, ~1/6 daily volume, budget)). |
| `set_arbitrage(sort, budget, limit)` | GE item sets and crafted combinations vs their parts, combine or split. |
| `processing_methods(method, sort, budget, limit)` | Sawmill, plank make, enchanting, tanning, decanting, herb cleaning, Sailing methods and more; profit per action, per 4h and per hour. |
| `find_dips(min_drop_pct, ...)` | Liquid items whose last-hour average low is 5%+ under the 24h average low while the high side holds. |
| `game_updates(since, item, category, limit)` | Recent OSRS updates and dev blogs with the items they mention. |
| `update_impact(item, update, window_days)` | Average price and daily volume before vs after an update (by title or date). |

Also available:

- Prompt `flip-analyst` (args: `budget`, `focus`, `members`): a scan, vet, recommend workflow using the tools above.
- Resource `ge-metrics://guide`: field definitions, tax and buy-limit rules.

## Configuration

Optional environment variables:

| Variable | Default |
| --- | --- |
| `GE_METRICS_USER_AGENT` | `GE-Metrics MCP server (https://ge-metrics.com)`. The wiki asks for a descriptive User-Agent; put your contact in it if you run this heavily. |
| `GE_METRICS_PRICES_URL` | `https://prices.runescape.wiki/api/v1/osrs` |
| `GE_METRICS_WIKI_API_URL` | `https://oldschool.runescape.wiki/api.php` |
| `GE_METRICS_UPDATES_URL` | `https://ge-metrics.com/data/game-updates.json` |

## Development

```bash
npm test            # vitest unit tests on fixtures (no network)
npm run typecheck
npm run build
npm run smoke       # spawns dist/index.js over stdio and calls every tool against the live APIs
```

Layout: `src/wiki` (fetching, validation, cache), `src/analysis` (pure analysis functions), `src/updates` (game update sources and parsing), `src/tools` (MCP tool registration), `src/server.ts` and `src/index.ts` (entry). Engine types come from `mobile/src/engine/ge-engine.d.ts`; `@ge/engine` is aliased to `src/domain/flipping` in `tsup.config.ts` and `vitest.config.ts`.

## Notes and limits

- Wiki price history holds 365 points per timestep, so `update_impact` covers roughly the last year.
- Without the dataset, `game_updates` reads the 20-150 most recent wiki update pages, or searches update text for the item when `item` is given. Item matching uses wiki links plus multi-word item names in the text, so single-word items (e.g. "Logs") only match through links or an item search.
- Daily volume in flip math is the wiki `/volumes` figure, same as the apps.
