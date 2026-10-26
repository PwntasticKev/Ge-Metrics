import type { WikiAverage, WikiMappingEntry, WikiPrice } from '@ge/engine'

// OSRS Wiki real-time prices API. The wiki asks clients to send a
// descriptive User-Agent; native fetch lets us set one.
const BASE_URL = 'https://prices.runescape.wiki/api/v1/osrs'
export const USER_AGENT = 'GE-Metrics-iOS/1.0 (https://ge-metrics.com)'
const TIMEOUT_MS = 15_000

export class WikiError extends Error {}

/** GET a wiki URL as JSON with our User-Agent and a timeout. */
export async function fetchWikiJson (url: string, serverName = 'Prices server'): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal
    })
    if (!response.ok) throw new WikiError(`${serverName} returned ${response.status}`)
    return await response.json()
  } catch (error) {
    if (error instanceof WikiError) throw error
    throw new WikiError(controller.signal.aborted ? `${serverName} timed out` : `Could not reach the ${serverName.toLowerCase()}`)
  } finally {
    clearTimeout(timer)
  }
}

function getJson (endpoint: string): Promise<unknown> {
  return fetchWikiJson(`${BASE_URL}${endpoint}`)
}

export const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

function dataMap<T> (body: unknown, endpoint: string): Record<string, T> {
  if (!isObject(body) || !isObject(body.data)) throw new WikiError(`Unexpected response from ${endpoint}`)
  return body.data as Record<string, T>
}

export async function fetchMapping (): Promise<WikiMappingEntry[]> {
  const body = await getJson('/mapping')
  if (!Array.isArray(body)) throw new WikiError('Unexpected response from /mapping')
  return body.filter((m): m is WikiMappingEntry => isObject(m) && Number.isInteger(m.id) && typeof m.name === 'string')
}

export async function fetchLatest (): Promise<Record<string, WikiPrice>> {
  return dataMap<WikiPrice>(await getJson('/latest'), '/latest')
}

export async function fetchVolumes (): Promise<Record<string, number>> {
  return dataMap<number>(await getJson('/volumes'), '/volumes')
}

// Average prices and trade counts over the last 5 minutes, hour or day.
export async function fetchAverages (window: '5m' | '1h' | '24h'): Promise<Record<string, WikiAverage>> {
  return dataMap<WikiAverage>(await getJson(`/${window}`), `/${window}`)
}

// The 24h average for one past day; `timestamp` is that day's start (UTC seconds).
export async function fetchDayAveragesAt (timestamp: number): Promise<Record<string, WikiAverage>> {
  if (!Number.isInteger(timestamp) || timestamp % 86_400 !== 0) throw new WikiError('Day timestamps must start at midnight UTC')
  return dataMap<WikiAverage>(await getJson(`/24h?timestamp=${timestamp}`), '/24h')
}

// The 1h average for one past hour; `timestamp` is that hour's start (UTC seconds).
export async function fetchHourAveragesAt (timestamp: number): Promise<Record<string, WikiAverage>> {
  if (!Number.isInteger(timestamp) || timestamp % 3600 !== 0) throw new WikiError('Hour timestamps must start on the hour')
  return dataMap<WikiAverage>(await getJson(`/1h?timestamp=${timestamp}`), '/1h')
}

export interface PricePoint {
  timestamp: number
  avgHighPrice: number | null
  avgLowPrice: number | null
  highPriceVolume: number
  lowPriceVolume: number
}

export async function fetchTimeseries (id: number, timestep: '5m' | '1h' | '6h' | '24h' = '1h'): Promise<PricePoint[]> {
  const body = await getJson(`/timeseries?timestep=${timestep}&id=${id}`)
  if (!isObject(body) || !Array.isArray(body.data)) throw new WikiError('Unexpected response from /timeseries')
  const priceOrNull = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null)
  const count = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0)
  return body.data
    .filter((p): p is Record<string, unknown> => isObject(p) && typeof p.timestamp === 'number')
    .map(p => ({
      timestamp: p.timestamp as number,
      avgHighPrice: priceOrNull(p.avgHighPrice),
      avgLowPrice: priceOrNull(p.avgLowPrice),
      highPriceVolume: count(p.highPriceVolume),
      lowPriceVolume: count(p.lowPriceVolume)
    }))
}
