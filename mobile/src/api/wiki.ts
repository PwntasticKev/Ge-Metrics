import type { WikiMappingEntry, WikiPrice } from '@ge/engine'

// OSRS Wiki real-time prices API. The wiki asks clients to send a
// descriptive User-Agent; native fetch lets us set one.
const BASE_URL = 'https://prices.runescape.wiki/api/v1/osrs'
const USER_AGENT = 'GE-Metrics-iOS/1.0 (https://ge-metrics.com)'
const TIMEOUT_MS = 15_000

export class WikiError extends Error {}

async function getJson (endpoint: string): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal
    })
    if (!response.ok) throw new WikiError(`Prices server returned ${response.status}`)
    return await response.json()
  } catch (error) {
    if (error instanceof WikiError) throw error
    throw new WikiError(controller.signal.aborted ? 'Prices server timed out' : 'Could not reach the prices server')
  } finally {
    clearTimeout(timer)
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

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

export interface PricePoint {
  timestamp: number
  avgHighPrice: number | null
  avgLowPrice: number | null
}

export async function fetchTimeseries (id: number, timestep: '5m' | '1h' | '6h' | '24h' = '1h'): Promise<PricePoint[]> {
  const body = await getJson(`/timeseries?timestep=${timestep}&id=${id}`)
  if (!isObject(body) || !Array.isArray(body.data)) throw new WikiError('Unexpected response from /timeseries')
  const priceOrNull = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
  return body.data
    .filter((p): p is Record<string, unknown> => isObject(p) && typeof p.timestamp === 'number')
    .map(p => ({ timestamp: p.timestamp as number, avgHighPrice: priceOrNull(p.avgHighPrice), avgLowPrice: priceOrNull(p.avgLowPrice) }))
}
