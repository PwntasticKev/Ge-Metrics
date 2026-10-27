// Small OSRS Wiki API client for the data generators (Node built-ins only).
// Retries on maxlag / 429 / 5xx and spaces requests out.

export const USER_AGENT = 'GE-Metrics upcoming releases generator (https://ge-metrics.com)'
export const WIKI_API = 'https://oldschool.runescape.wiki/api.php'
export const MAPPING_URL = 'https://prices.runescape.wiki/api/v1/osrs/mapping'
const BATCH = 50
const REQUEST_DELAY_MS = 300
const MAX_RETRIES = 5

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

export async function getJson (url, attempt = 1) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  const retryAfter = Number(response.headers.get('retry-after')) || attempt * 2
  const body = response.ok ? await response.json() : null
  const lagged = body?.error?.code === 'maxlag'
  if ((lagged || response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES) {
    console.warn(`Retrying in ${retryAfter}s (${lagged ? 'maxlag' : response.status})`)
    await sleep(retryAfter * 1000)
    return getJson(url, attempt + 1)
  }
  if (!response.ok) throw new Error(`${url} returned ${response.status}`)
  if (body?.error) throw new Error(`${url} returned API error ${body.error.code}: ${body.error.info}`)
  return body
}

export const apiUrl = params => `${WIKI_API}?${new URLSearchParams({ format: 'json', formatversion: '2', maxlag: '5', ...params })}`

const contentOf = revision => revision?.slots?.main?.content ?? null

/** Current wikitext of pages -> Map(title -> { text, timestamp }). Missing pages are left out. */
export async function fetchPageTexts (titles) {
  const pages = new Map()
  for (let i = 0; i < titles.length; i += BATCH) {
    const body = await getJson(apiUrl({ action: 'query', prop: 'revisions', rvprop: 'content|timestamp', rvslots: 'main', titles: titles.slice(i, i + BATCH).join('|') }))
    for (const page of body.query?.pages ?? []) {
      const revision = page.revisions?.[0]
      if (contentOf(revision) !== null) pages.set(page.title, { text: contentOf(revision), timestamp: revision.timestamp })
    }
    await sleep(REQUEST_DELAY_MS)
  }
  return pages
}

/** Every revision of `title` from `since` (ISO) on, plus the one live at `since`, oldest first, with content. */
export async function fetchRevisionHistory (title, since) {
  const ids = []
  let cont = {}
  do {
    const body = await getJson(apiUrl({ action: 'query', prop: 'revisions', titles: title, rvprop: 'ids|timestamp', rvlimit: 'max', rvend: since, ...cont }))
    ids.push(...(body.query.pages[0].revisions ?? []))
    cont = body.continue ?? null
    await sleep(REQUEST_DELAY_MS)
  } while (cont)
  const before = await getJson(apiUrl({ action: 'query', prop: 'revisions', titles: title, rvprop: 'ids|timestamp', rvlimit: '1', rvstart: since }))
  ids.push(...(before.query.pages[0].revisions ?? []))
  const revisions = []
  for (let i = 0; i < ids.length; i += BATCH) {
    const body = await getJson(apiUrl({ action: 'query', prop: 'revisions', revids: ids.slice(i, i + BATCH).map(r => r.revid).join('|'), rvprop: 'ids|timestamp|content', rvslots: 'main' }))
    for (const page of body.query.pages) {
      for (const revision of page.revisions ?? []) {
        if (contentOf(revision) !== null) revisions.push({ timestamp: revision.timestamp, text: contentOf(revision) })
      }
    }
    await sleep(REQUEST_DELAY_MS)
  }
  return revisions.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}
