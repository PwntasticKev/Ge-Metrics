// The last OSRS Wiki /mapping, /latest and /volumes responses, kept in
// localStorage so a return visit can paint the tables immediately and refresh
// in the background (the mobile app does the same).
//
// Every read is validated: corrupted, malformed or expired entries are removed
// and treated as a cache miss. Storage being full or unavailable is never an
// error for the page; the site just behaves as if there were no cache.

export const PRICE_CACHE_KEY_PREFIX = 'gem:wiki-cache:v1:'

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
// Allowance for small clock adjustments between saving and reading.
const CLOCK_SKEW_MS = MINUTE

// freshMs: younger than this, skip the network entirely.
// maxAgeMs: younger than this, good enough to paint while refreshing.
export const PRICE_CACHE_POLICY = Object.freeze({
  // Item names, icons and buy limits only change with game updates.
  mapping: Object.freeze({ freshMs: DAY, maxAgeMs: 7 * DAY }),
  // Prices move by the minute: always refetch, paint only if recent.
  latest: Object.freeze({ freshMs: 0, maxAgeMs: HOUR }),
  volumes: Object.freeze({ freshMs: 0, maxAgeMs: HOUR })
})

const isPlainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const isMapping = value => Array.isArray(value) && value.length > 0 && value.every(row => isPlainObject(row) && Number.isInteger(row.id))

const VALIDATORS = Object.freeze({
  mapping: isMapping,
  latest: isPlainObject,
  volumes: isPlainObject
})

const isQuotaError = error =>
  error?.name === 'QuotaExceededError' ||
  error?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
  error?.code === 22 ||
  error?.code === 1014

function defaultStorage () {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    // Accessing localStorage throws when the browser blocks site data.
    return null
  }
}

export function createPricesCache ({ storage = defaultStorage(), now = () => Date.now() } = {}) {
  const keyOf = name => `${PRICE_CACHE_KEY_PREFIX}${name}`

  const remove = name => {
    try {
      storage?.removeItem(keyOf(name))
    } catch (error) {
      console.warn('[pricesCache] could not remove', name, error)
    }
  }

  const readRaw = name => {
    try {
      return storage ? storage.getItem(keyOf(name)) : null
    } catch (error) {
      console.warn('[pricesCache] storage unavailable', error)
      return null
    }
  }

  // Returns { data, savedAt } or null. Drops anything unreadable or expired.
  function read (name) {
    const raw = readRaw(name)
    if (raw === null) return null

    let entry
    try {
      entry = JSON.parse(raw)
    } catch {
      console.warn('[pricesCache] dropping corrupted entry', name)
      remove(name)
      return null
    }

    const age = now() - entry?.savedAt
    const valid = isPlainObject(entry) && Number.isFinite(entry.savedAt) &&
      age >= -CLOCK_SKEW_MS && VALIDATORS[name](entry.data)
    if (!valid) {
      console.warn('[pricesCache] dropping invalid entry', name)
      remove(name)
      return null
    }
    if (age > PRICE_CACHE_POLICY[name].maxAgeMs) return null
    return { data: entry.data, savedAt: entry.savedAt }
  }

  // The cached data if it is young enough to skip refetching, else null.
  function readFresh (name) {
    const entry = read(name)
    return entry && now() - entry.savedAt < PRICE_CACHE_POLICY[name].freshMs ? entry.data : null
  }

  function write (name, data) {
    if (!storage || !VALIDATORS[name](data)) return false
    try {
      storage.setItem(keyOf(name), JSON.stringify({ savedAt: now(), data }))
      return true
    } catch (error) {
      // Never leave an older copy behind that no longer matches the others.
      remove(name)
      console.warn(`[pricesCache] could not save ${name}${isQuotaError(error) ? ' (storage full)' : ''}`, error)
      return false
    }
  }

  // Everything the price tables need for a first paint, or null.
  function readSnapshot () {
    const mapping = read('mapping')
    const latest = read('latest')
    const volumes = read('volumes')
    if (!mapping || !latest || !volumes) return null
    return { mapping: mapping.data, latest: latest.data, volumes: volumes.data, savedAt: latest.savedAt }
  }

  return Object.freeze({ read, readFresh, write, readSnapshot })
}

export const pricesCache = createPricesCache()
