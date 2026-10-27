import { fileURLToPath } from 'node:url'

// Endpoints, identification and cache lifetimes. Everything is overridable by
// environment variable so the server can be pointed at mirrors in tests.

const env = (name: string, fallback: string): string => process.env[name]?.trim() || fallback

export const PRICES_BASE_URL = env('GE_METRICS_PRICES_URL', 'https://prices.runescape.wiki/api/v1/osrs')
export const WIKI_API_URL = env('GE_METRICS_WIKI_API_URL', 'https://oldschool.runescape.wiki/api.php')
export const GAME_UPDATES_URL = env('GE_METRICS_UPDATES_URL', 'https://ge-metrics.com/data/game-updates.json')
// The wiki asks every client for a descriptive User-Agent.
export const USER_AGENT = env('GE_METRICS_USER_AGENT', 'GE-Metrics MCP server (https://ge-metrics.com)')
export const REQUEST_TIMEOUT_MS = 20_000

const SECOND = 1000
const MINUTE = 60 * SECOND

export const TTL = Object.freeze({
  mapping: 6 * 60 * MINUTE,
  latest: 60 * SECOND,
  '5m': 2 * MINUTE,
  '1h': 5 * MINUTE,
  '24h': 15 * MINUTE,
  volumes: 15 * MINUTE,
  timeseries: { '5m': 2 * MINUTE, '1h': 10 * MINUTE, '6h': 30 * MINUTE, '24h': 60 * MINUTE },
  updates: 30 * MINUTE,
  updateMiss: 5 * MINUTE,
  // Past /1h and /24h snapshots never change; keep them a while.
  snapshot: 2 * 60 * MINUTE,
  comingUp: 60 * MINUTE
})

// Per-item and historical requests (timeseries, past snapshots) go through one
// limiter: at most 2 at a time, starts at least 300 ms apart.
export const HISTORY_CONCURRENCY = 2
export const HISTORY_GAP_MS = 300

// Backtests keep past wiki snapshots on disk (they never change) and write
// reports next to the package. Both default to paths under the mcp/ package
// root (this file sits in src/ or dist/, one level below it).
const PACKAGE_ROOT = new URL('..', import.meta.url)
export const BACKTEST_CACHE_DIR = env('GE_METRICS_BACKTEST_CACHE', fileURLToPath(new URL('.cache/backtest/', PACKAGE_ROOT)))
export const BACKTEST_REPORTS_DIR = env('GE_METRICS_BACKTEST_REPORTS', fileURLToPath(new URL('reports/', PACKAGE_ROOT)))
// The repo's curated game-updates dataset (what ge-metrics.com serves), read by the regime-gate study.
export const GAME_UPDATES_FILE = env('GE_METRICS_UPDATES_FILE', fileURLToPath(new URL('../public/data/game-updates.json', PACKAGE_ROOT)))
