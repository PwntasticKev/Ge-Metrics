// Validation of untrusted wiki responses into our typed shapes. Malformed
// rows are dropped rather than failing the whole response.

import { UpstreamError } from './http.js'
import type { AveragePrice, IdMap, LatestPrice, MappingEntry, TimeseriesPoint } from './types.js'

export const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const str = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null)

function dataObject (body: unknown, endpoint: string): Record<string, unknown> {
  if (!isObject(body) || !isObject(body.data)) throw new UpstreamError(`Unexpected response from ${endpoint}`)
  return body.data
}

function idMap<T> (data: Record<string, unknown>, parse: (v: unknown) => T | null): IdMap<T> {
  const entries: [number, T][] = []
  for (const [key, raw] of Object.entries(data)) {
    const id = Number(key)
    const value = parse(raw)
    if (Number.isInteger(id) && value !== null) entries.push([id, value])
  }
  return new Map(entries)
}

export function parseMapping (body: unknown): MappingEntry[] {
  if (!Array.isArray(body)) throw new UpstreamError('Unexpected response from /mapping')
  return body.filter(isObject).flatMap(m => {
    const id = num(m.id)
    const name = str(m.name)
    if (id === null || !Number.isInteger(id) || name === null) return []
    return [Object.freeze({
      id,
      name,
      examine: str(m.examine),
      members: m.members === true,
      limit: num(m.limit),
      value: num(m.value),
      highalch: num(m.highalch),
      lowalch: num(m.lowalch),
      icon: str(m.icon)
    })]
  })
}

const parseLatestRow = (v: unknown): LatestPrice | null =>
  isObject(v) ? Object.freeze({ high: num(v.high), highTime: num(v.highTime), low: num(v.low), lowTime: num(v.lowTime) }) : null

const parseAverageRow = (v: unknown): AveragePrice | null =>
  isObject(v)
    ? Object.freeze({
      avgHighPrice: num(v.avgHighPrice),
      highPriceVolume: num(v.highPriceVolume) ?? 0,
      avgLowPrice: num(v.avgLowPrice),
      lowPriceVolume: num(v.lowPriceVolume) ?? 0
    })
    : null

export const parseLatest = (body: unknown): IdMap<LatestPrice> => idMap(dataObject(body, '/latest'), parseLatestRow)
export const parseAverages = (body: unknown, endpoint: string): IdMap<AveragePrice> => idMap(dataObject(body, endpoint), parseAverageRow)
export const parseVolumes = (body: unknown): IdMap<number> => idMap(dataObject(body, '/volumes'), num)

export function parseTimeseries (body: unknown): TimeseriesPoint[] {
  if (!isObject(body) || !Array.isArray(body.data)) throw new UpstreamError('Unexpected response from /timeseries')
  return body.data.filter(isObject).flatMap(p => {
    const timestamp = num(p.timestamp)
    const avg = parseAverageRow(p)
    return timestamp === null || avg === null ? [] : [Object.freeze({ timestamp, ...avg })]
  }).sort((a, b) => a.timestamp - b.timestamp)
}
