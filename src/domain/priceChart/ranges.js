// Chart ranges -> wiki /timeseries timestep. The wiki returns at most 365
// points per call, so each timestep is the finest one that still covers the
// whole range: 5m x 365 ~ 30h, 1h ~ 15d, 6h ~ 91d, 24h ~ 1y.

const HOUR = 60 * 60
const DAY = 24 * HOUR

export const CHART_RANGES = Object.freeze({
  '1D': { label: '1D', timestep: '5m', seconds: DAY },
  '1W': { label: '1W', timestep: '1h', seconds: 7 * DAY },
  '1M': { label: '1M', timestep: '6h', seconds: 30 * DAY },
  '3M': { label: '3M', timestep: '24h', seconds: 90 * DAY },
  '6M': { label: '6M', timestep: '24h', seconds: 180 * DAY },
  '1Y': { label: '1Y', timestep: '24h', seconds: 365 * DAY },
  All: { label: 'All', timestep: '24h', seconds: null }
})

export const DEFAULT_RANGE = '1W'

export function rangeConfig (range) {
  return CHART_RANGES[range] ?? CHART_RANGES[DEFAULT_RANGE]
}

// Unix seconds where the range starts, or 0 for "All".
export function rangeCutoff (range, nowSec = Math.floor(Date.now() / 1000)) {
  const { seconds } = rangeConfig(range)
  return seconds == null ? 0 : nowSec - seconds
}
