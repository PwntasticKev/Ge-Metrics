// Browser-side replacement for the server's `items.*` tRPC procedures.
// Fetches from the public OSRS Wiki prices API and returns the same shapes
// the server used to return, so existing pages keep working unchanged.

const WIKI_BASE_URL = 'https://prices.runescape.wiki/api/v1/osrs'
const PRICES_TTL_MS = 60 * 1000
const MAPPING_TTL_MS = 6 * 60 * 60 * 1000
const REQUEST_TIMEOUT_MS = 15 * 1000
// After a failure with nothing cached, wait this long before hitting the wiki again.
const ERROR_BACKOFF_MS = 15 * 1000

export class WikiApiError extends Error {
  constructor (message, { status, endpoint } = {}) {
    super(message)
    this.name = 'WikiApiError'
    this.status = status
    this.endpoint = endpoint
  }
}

function isPlainObject (value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

async function fetchJson (fetchImpl, endpoint) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  let response
  try {
    response = await fetchImpl(`${WIKI_BASE_URL}${endpoint}`, { signal: controller.signal })
  } catch (error) {
    const reason = error?.name === 'AbortError' ? 'Timed out' : 'Network error'
    throw new WikiApiError(`${reason} reaching OSRS Wiki (${endpoint})`, { endpoint })
  } finally {
    clearTimeout(timer)
  }
  if (!response.ok) {
    throw new WikiApiError(`OSRS Wiki returned ${response.status} for ${endpoint}`, {
      status: response.status,
      endpoint
    })
  }
  try {
    return await response.json()
  } catch (error) {
    throw new WikiApiError(`Invalid JSON from OSRS Wiki (${endpoint})`, { endpoint })
  }
}

// Validates `{ data: { [id]: {...} }, timestamp? }` envelopes.
function requireDataMap (body, endpoint) {
  if (!isPlainObject(body) || !isPlainObject(body.data)) {
    throw new WikiApiError(`Unexpected response shape from ${endpoint}`, { endpoint })
  }
  return body
}

function requireArray (body, endpoint) {
  if (!Array.isArray(body)) {
    throw new WikiApiError(`Unexpected response shape from ${endpoint}`, { endpoint })
  }
  return body
}

function toNumber (value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

// Merges /24h and /1h into the server's volume map shape.
// `lastUpdatedAt` is when we fetched; the wiki timestamps mark window starts.
export function buildVolumeMap (dailyBody, hourlyBody, lastUpdatedAt) {
  const daily = dailyBody.data
  const hourly = hourlyBody.data
  const ids = new Set([...Object.keys(daily), ...Object.keys(hourly)])

  return Object.fromEntries(
    [...ids].map(id => [id, {
      itemId: Number(id),
      highPriceVolume: toNumber(daily[id]?.highPriceVolume),
      lowPriceVolume: toNumber(daily[id]?.lowPriceVolume),
      hourlyHighPriceVolume: toNumber(hourly[id]?.highPriceVolume),
      hourlyLowPriceVolume: toNumber(hourly[id]?.lowPriceVolume),
      lastUpdatedAt
    }])
  )
}

export function createWikiItemsService ({ fetchImpl = (...args) => fetch(...args), now = () => Date.now() } = {}) {
  // Map of key -> { value, expiresAt, pending, error, retryAt }
  let cache = new Map()

  async function cached (key, ttlMs, loader) {
    const entry = cache.get(key)
    if (entry?.value !== undefined && entry.expiresAt > now()) return entry.value
    if (entry?.pending) return entry.pending
    if (entry?.error && entry.retryAt > now()) throw entry.error

    const pending = loader()
      .then(value => {
        cache = new Map(cache).set(key, { value, expiresAt: now() + ttlMs })
        return value
      })
      .catch(error => {
        // Serve stale data if we have it; otherwise surface the error.
        // Either way, back off before the next request.
        const stale = cache.get(key)?.value
        const retryAt = now() + ERROR_BACKOFF_MS
        if (stale !== undefined) {
          cache = new Map(cache).set(key, { value: stale, expiresAt: retryAt })
          console.warn('[wikiItemsService] serving stale data after error', error)
          return stale
        }
        cache = new Map(cache).set(key, { error, retryAt })
        throw error
      })
    cache = new Map(cache).set(key, { ...entry, pending })
    return pending
  }

  const getLatest = () => cached('latest', PRICES_TTL_MS, async () =>
    requireDataMap(await fetchJson(fetchImpl, '/latest'), '/latest').data)

  const getMapping = () => cached('mapping', MAPPING_TTL_MS, async () =>
    requireArray(await fetchJson(fetchImpl, '/mapping'), '/mapping'))

  const getVolumes = () => cached('volumes', PRICES_TTL_MS, async () => {
    const [daily, hourly] = await Promise.all([
      fetchJson(fetchImpl, '/24h').then(b => requireDataMap(b, '/24h')),
      fetchJson(fetchImpl, '/1h').then(b => requireDataMap(b, '/1h'))
    ])
    return buildVolumeMap(daily, hourly, new Date(now()).toISOString())
  })

  const getVolumesLastUpdated = async () => {
    const volumes = await getVolumes()
    const first = Object.values(volumes)[0]
    return first ? { lastUpdatedAt: first.lastUpdatedAt } : null
  }

  return { getLatest, getMapping, getVolumes, getVolumesLastUpdated }
}

export const wikiItemsService = createWikiItemsService()
