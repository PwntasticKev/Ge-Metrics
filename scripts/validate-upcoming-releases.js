#!/usr/bin/env node
// Backtests the upcoming-releases feed: rebuilds it as the daily workflow
// (07:00 UTC) would have on every day of the last N days, from the news posts
// and the wiki "Upcoming updates" revision live at that time, and scores it
// against the big releases that shipped (game posts matching the regime
// gate's title rule).
//
//   node scripts/validate-upcoming-releases.js [--days 365] [--json out.json]

import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
  addDays,
  buildUpcomingReleases,
  MAJOR_UPDATE_TITLE,
  parseGameUpdatesPayload,
  POST_LOOKBACK_DAYS,
  toIsoDate,
  UPCOMING_PAGE_TITLE
} from '../src/domain/gameUpdates/index.js'
import { scoreUpcomingForecasts } from '../src/domain/gameUpdates/upcomingValidation.js'
import { fetchRevisionHistory, getJson, MAPPING_URL } from './lib/osrsWiki.js'
import { createItemFinder, postsWithText } from './generate-upcoming-releases.js'

const UPDATES_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/data/game-updates.json')
const RUN_HOUR_UTC = '07:00:00Z'
// Snapshots start this long before the window so early announcements are seen.
const WARMUP_DAYS = 60

function argValue (name, fallback) {
  const index = process.argv.indexOf(name)
  return index > 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback
}

// The page revision live at `day` 07:00 UTC.
function revisionAt (revisions, day) {
  const cutoff = `${day}T${RUN_HOUR_UTC}`
  let live = null
  for (const revision of revisions) if (revision.timestamp < cutoff) live = revision
  return live
}

function snapshotsFor ({ days, posts, revisions, published, findItems }) {
  const snapshots = new Map()
  for (const day of days) {
    const known = published.filter(update => update.date < day)
    const revision = revisionAt(revisions, day)
    snapshots.set(day, buildUpcomingReleases({
      today: day,
      posts: posts.filter(post => post.date < day),
      page: revision ? { text: revision.text, date: revision.timestamp.slice(0, 10) } : null,
      published: known,
      findItems
    }))
  }
  return snapshots
}

const pct = x => (x === null ? 'n/a' : `${(x * 100).toFixed(0)}%`)

function printReport (score, window) {
  console.log(`\nWindow ${window.from} .. ${window.to}, tolerance +/-${score.toleranceDays} day`)
  console.log(`Big releases shipped: ${score.releases}`)
  console.log(`Recall (big entry on the right day in the feed generated the day before): ${score.caught}/${score.releases} = ${pct(score.recall)}`)
  console.log(`  any entry on the right day (big flag or not): ${pct(score.recallAnyEntry)}`)
  console.log(`Precision (distinct big forecasts that matched a big release): ${pct(score.precision)} of ${score.forecasts}`)
  console.log(`Median error of the nearest forecast the day before: ${score.medianErrorDays ?? 'n/a'} days (${score.forecastsWithError} releases had one)`)
  console.log(`Median lead time of the first correct big forecast: ${score.medianLeadDays ?? 'n/a'} days`)
  console.log('\nPer release:')
  for (const r of score.perRelease) {
    const f = r.forecast ? `${r.forecast.expectedDate} ${r.forecast.confidence}${r.forecast.big ? ' big' : ''} "${r.forecast.title}" (err ${r.errorDays}d)` : 'no forecast'
    console.log(`  ${r.caught ? 'HIT ' : 'miss'} ${r.date} ${r.title.padEnd(55).slice(0, 55)} ${f}${r.leadDays === null ? '' : `, lead ${r.leadDays}d`}`)
  }
  console.log('\nFalse positives:')
  for (const fp of score.falsePositives) console.log(`  ${fp.expectedDate} "${fp.title}" <- ${fp.sourcePost}`)
}

async function main () {
  const windowDays = Number(argValue('--days', '365'))
  const today = toIsoDate(Date.now())
  const window = { from: addDays(today, -windowDays), to: addDays(today, -1) }
  const firstSnapshot = addDays(window.from, -WARMUP_DAYS)
  const published = parseGameUpdatesPayload(JSON.parse(await readFile(UPDATES_FILE, 'utf8')))
  const findItems = createItemFinder(await getJson(MAPPING_URL))
  const posts = await postsWithText(published, addDays(firstSnapshot, -POST_LOOKBACK_DAYS))
  const revisions = await fetchRevisionHistory(UPCOMING_PAGE_TITLE, `${firstSnapshot}T00:00:00Z`)
  console.log(`Replaying ${windowDays + WARMUP_DAYS} days from ${posts.length} posts and ${revisions.length} page revisions`)

  const days = Array.from({ length: windowDays + WARMUP_DAYS }, (_, i) => addDays(firstSnapshot, i))
  const snapshots = snapshotsFor({ days, posts, revisions, published, findItems })
  const releases = published.filter(u => u.category === 'game' && MAJOR_UPDATE_TITLE.test(u.title)).map(u => ({ date: u.date, title: u.title }))
  const scores = [0, 1].map(toleranceDays => scoreUpcomingForecasts({ snapshots, releases, window, toleranceDays }))
  for (const score of scores) printReport(score, window)
  const jsonOut = argValue('--json', null)
  if (jsonOut) await writeFile(jsonOut, `${JSON.stringify({ window, scores }, null, 2)}\n`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
