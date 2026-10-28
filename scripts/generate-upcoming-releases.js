#!/usr/bin/env node
// Regenerates public/data/upcoming-releases.json: releases that are announced
// with a day-level date but not out yet, from the OSRS Wiki "Upcoming updates"
// page (its "Update schedule" table) and the last 90 days of news posts
// ("Wyrmscraig Launches July 29!", "...coming NEXT WEEK"). The MCP market_regime
// gate reads it to stand aside the day before a big release.
//
// Run after scripts/generate-game-updates.js (it reads public/data/game-updates.json):
//   node scripts/generate-upcoming-releases.js     (npm run data:updates runs both)

import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
  buildUpcomingReleases,
  createItemMatcher,
  createMentionFinder,
  extractLinks,
  matchItemIds,
  parseGameUpdatesPayload,
  POST_LOOKBACK_DAYS,
  toIsoDate,
  addDays,
  UPCOMING_PAGE_TITLE
} from '../src/domain/gameUpdates/index.js'
import { fetchPageTexts, getJson, MAPPING_URL } from './lib/osrsWiki.js'

const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/data')
const UPDATES_FILE = path.join(DATA_DIR, 'game-updates.json')
const OUTPUT = path.join(DATA_DIR, 'upcoming-releases.json')
const MIN_MAPPING_ITEMS = 1000

/** (wikitext) -> GE item ids it links or names. */
export function createItemFinder (mapping) {
  const matchItem = createItemMatcher(mapping)
  const findMentions = createMentionFinder(mapping)
  return text => [...new Set([...matchItemIds(extractLinks(text), matchItem), ...findMentions(text)])]
}

/** Dataset updates from the last `days` days with their wikitext attached. */
export async function postsWithText (updates, since) {
  const recent = updates.filter(update => update.date >= since)
  const texts = await fetchPageTexts(recent.map(update => `Update:${update.title}`))
  return recent.flatMap(update => {
    const page = texts.get(`Update:${update.title}`)
    return page ? [{ ...update, text: page.text }] : []
  })
}

async function readExisting () {
  try {
    return JSON.parse(await readFile(OUTPUT, 'utf8')).upcoming ?? null
  } catch {
    return null
  }
}

async function main () {
  const today = toIsoDate(Date.now())
  const published = parseGameUpdatesPayload(JSON.parse(await readFile(UPDATES_FILE, 'utf8')))
  const mapping = await getJson(MAPPING_URL)
  if (!Array.isArray(mapping) || mapping.length < MIN_MAPPING_ITEMS) throw new Error('Item mapping looks wrong; not overwriting.')
  const posts = await postsWithText(published, addDays(today, -POST_LOOKBACK_DAYS))
  const pageTexts = await fetchPageTexts([UPCOMING_PAGE_TITLE])
  const page = pageTexts.get(UPCOMING_PAGE_TITLE)
  if (!page) throw new Error(`Could not read the wiki "${UPCOMING_PAGE_TITLE}" page; not overwriting.`)
  console.log(`Read ${posts.length} posts since ${addDays(today, -POST_LOOKBACK_DAYS)} and "${UPCOMING_PAGE_TITLE}" (rev ${page.timestamp})`)

  const upcoming = buildUpcomingReleases({
    today,
    posts,
    page: { text: page.text, date: page.timestamp.slice(0, 10) },
    published,
    findItems: createItemFinder(mapping)
  })
  for (const entry of upcoming) console.log(`  ${entry.expectedDate} ${entry.big ? 'BIG' : '   '} ${entry.confidence.padEnd(8)} ${entry.title}  <- ${entry.sourcePost}`)
  if (JSON.stringify(await readExisting()) === JSON.stringify(upcoming)) {
    console.log(`No changes (${upcoming.length} upcoming); ${path.relative(process.cwd(), OUTPUT)} left as is.`)
    return
  }
  await writeFile(OUTPUT, `${JSON.stringify({ generatedAt: new Date().toISOString(), upcoming }, null, 2)}\n`)
  console.log(`Wrote ${upcoming.length} upcoming releases to ${path.relative(process.cwd(), OUTPUT)}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
