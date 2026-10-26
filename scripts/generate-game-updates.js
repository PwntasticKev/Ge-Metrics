#!/usr/bin/env node
// Regenerates public/data/game-updates.json: every OSRS game update / dev blog
// news post mirrored on the wiki (namespace 112, "Update:" pages) since
// 2015-02-01, with the Grand Exchange items each one links to. The charts use
// it to mark updates on item price history.
//
//   node scripts/generate-game-updates.js     (or: npm run data:updates)

import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { buildUpdateEntry, createItemMatcher, createMentionFinder, sortUpdatesNewestFirst } from '../src/domain/gameUpdates/index.js'

const USER_AGENT = 'GE-Metrics game updates generator (https://ge-metrics.com)'
const API = 'https://oldschool.runescape.wiki/api.php'
const MAPPING_URL = 'https://prices.runescape.wiki/api/v1/osrs/mapping'
const UPDATE_NAMESPACE = '112'
const TITLES_PER_REQUEST = 50
const REQUEST_DELAY_MS = 300
const MAX_LAG_SECONDS = '5'
const MAX_RETRIES = 5
const MIN_EXPECTED_UPDATES = 1000
const OUTPUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/data/game-updates.json')

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function getJson (url, attempt = 1) {
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

const apiUrl = params => `${API}?${new URLSearchParams({ format: 'json', formatversion: '2', maxlag: MAX_LAG_SECONDS, ...params })}`

async function listUpdateTitles () {
  const titles = []
  let cont = {}
  do {
    const body = await getJson(apiUrl({ action: 'query', list: 'allpages', apnamespace: UPDATE_NAMESPACE, apfilterredir: 'nonredirects', aplimit: 'max', ...cont }))
    titles.push(...body.query.allpages.map(p => p.title))
    cont = body.continue ?? null
    await sleep(REQUEST_DELAY_MS)
  } while (cont)
  return titles
}

async function fetchPages (titles) {
  const pages = []
  for (let i = 0; i < titles.length; i += TITLES_PER_REQUEST) {
    const body = await getJson(apiUrl({
      action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main',
      titles: titles.slice(i, i + TITLES_PER_REQUEST).join('|')
    }))
    pages.push(...body.query.pages.filter(p => p.revisions).map(p => ({ title: p.title, text: p.revisions[0].slots.main.content })))
    process.stdout.write(`\rFetched ${Math.min(i + TITLES_PER_REQUEST, titles.length)}/${titles.length} pages`)
    await sleep(REQUEST_DELAY_MS)
  }
  process.stdout.write('\n')
  return pages
}

function summarize (updates) {
  const categories = {}
  for (const update of updates) categories[update.category] = (categories[update.category] ?? 0) + 1
  const withItems = updates.filter(update => update.items.length > 0).length
  return { categories, withItems }
}

// Previous dataset's updates, or null if missing/unreadable.
async function readExistingUpdates () {
  try {
    return JSON.parse(await readFile(OUTPUT, 'utf8')).updates ?? null
  } catch {
    return null
  }
}

async function main () {
  const mapping = await getJson(MAPPING_URL)
  if (!Array.isArray(mapping) || mapping.length < 1000) throw new Error('Item mapping looks wrong; not overwriting.')
  const matchers = { matchItem: createItemMatcher(mapping), findMentions: createMentionFinder(mapping) }
  const titles = await listUpdateTitles()
  console.log(`Found ${titles.length} Update: pages`)
  const pages = await fetchPages(titles)
  const updates = sortUpdatesNewestFirst(pages.map(page => buildUpdateEntry(page, matchers)).filter(Boolean))
  if (updates.length < MIN_EXPECTED_UPDATES) throw new Error(`Only ${updates.length} updates parsed; not overwriting.`)
  const { categories, withItems } = summarize(updates)
  console.log('Categories:', categories)
  // Leave the file (and its generatedAt) alone when nothing changed, so the
  // scheduled workflow only opens a PR for real changes.
  if (JSON.stringify(await readExistingUpdates()) === JSON.stringify(updates)) {
    console.log(`No changes (${updates.length} updates); ${path.relative(process.cwd(), OUTPUT)} left as is.`)
    return
  }
  const json = JSON.stringify({ generatedAt: new Date().toISOString(), updates })
  await writeFile(OUTPUT, `${json}\n`)
  console.log(`Wrote ${updates.length} updates (${withItems} mention items, ${(json.length / 1024).toFixed(0)} KB) to ${path.relative(process.cwd(), OUTPUT)}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
