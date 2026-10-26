// Past /1h and /5m snapshots never change once their window has closed, so a
// backtest keeps them on disk (gzipped JSON, one file per window) and only
// asks the wiki for windows it hasn't seen. Requests go through the shared
// polite limiter with the server's User-Agent. Open windows are never cached.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'
import { PRICES_BASE_URL } from '../config.js'
import { type FetchLike, UpstreamError, getJson } from '../wiki/http.js'
import type { Limiter } from '../wiki/limiter.js'
import { parseAverages, parseMapping } from '../wiki/parse.js'
import type { MappingEntry } from '../wiki/types.js'
import { type Snapshot, type SnapshotWindow, WINDOW_SEC } from './history.js'

export interface SnapshotStore {
  load (window: SnapshotWindow, ts: number): Promise<Snapshot>
  isCached (window: SnapshotWindow, ts: number): Promise<boolean>
  mapping (): Promise<readonly MappingEntry[]>
}

export interface DiskCacheOptions {
  readonly dir: string
  readonly limiter: Limiter
  readonly fetchImpl?: FetchLike
  readonly baseUrl?: string
  readonly nowSec?: () => number
  readonly retries?: number
}

const MAPPING_MAX_AGE_SEC = 24 * 3_600
const RETRY_BASE_MS = 2_000
const RETRYABLE = new Set([429, 500, 502, 503, 504])

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

async function readGz (file: string): Promise<unknown | undefined> {
  try {
    return JSON.parse(gunzipSync(await readFile(file)).toString('utf8'))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    // A corrupt cache file is refetched rather than trusted.
    console.error(`[ge-metrics-mcp] ignoring unreadable backtest cache file ${file}:`, (error as Error).message)
    return undefined
  }
}

async function writeGz (file: string, body: unknown): Promise<void> {
  const tmp = `${file}.${process.pid}.tmp`
  await writeFile(tmp, gzipSync(JSON.stringify(body)))
  await rename(tmp, file)
}

export function createDiskSnapshotStore (o: DiskCacheOptions): SnapshotStore {
  const base = o.baseUrl ?? PRICES_BASE_URL
  const now = o.nowSec ?? (() => Math.floor(Date.now() / 1000))
  const retries = o.retries ?? 2
  const fileOf = (window: SnapshotWindow, ts: number) => join(o.dir, `${window}-${ts}.json.gz`)
  const ready = mkdir(o.dir, { recursive: true })

  async function fetchWithRetry (url: string, attempt = 0): Promise<unknown> {
    try {
      return await o.limiter(() => getJson(url, o.fetchImpl))
    } catch (error) {
      const retryable = error instanceof UpstreamError && (error.status === undefined || RETRYABLE.has(error.status))
      if (!retryable || attempt >= retries) throw error
      await sleep(RETRY_BASE_MS * 2 ** attempt)
      return fetchWithRetry(url, attempt + 1)
    }
  }

  async function load (window: SnapshotWindow, ts: number): Promise<Snapshot> {
    const step = WINDOW_SEC[window]
    if (ts % step !== 0) throw new Error(`${window} snapshot timestamp ${ts} is not aligned to ${step}s`)
    if (ts + step > now()) throw new Error(`${window} window at ${ts} has not closed yet`)
    await ready
    const file = fileOf(window, ts)
    const cached = await readGz(file)
    if (cached !== undefined) return parseAverages(cached, `/${window}`)
    const body = await fetchWithRetry(`${base}/${window}?timestamp=${ts}`)
    const parsed = parseAverages(body, `/${window}`)
    await writeGz(file, body)
    return parsed
  }

  async function isCached (window: SnapshotWindow, ts: number): Promise<boolean> {
    await ready
    try {
      await readFile(fileOf(window, ts))
      return true
    } catch {
      return false
    }
  }

  async function mapping (): Promise<readonly MappingEntry[]> {
    await ready
    const file = join(o.dir, 'mapping.json.gz')
    const cached = await readGz(file) as { savedAt?: number; body?: unknown } | undefined
    if (cached?.body && typeof cached.savedAt === 'number' && now() - cached.savedAt < MAPPING_MAX_AGE_SEC) return parseMapping(cached.body)
    const body = await fetchWithRetry(`${base}/mapping`)
    const parsed = parseMapping(body)
    await writeGz(file, { savedAt: now(), body })
    return parsed
  }

  return { load, isCached, mapping }
}
