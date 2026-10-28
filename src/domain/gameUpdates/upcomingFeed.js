// public/data/upcoming-releases.json: announced-but-not-out releases with a
// day-level expected date, from the wiki "Upcoming updates" page and recent
// news posts. One entry per release; the most recent announcement wins (a
// delay re-announces the date). An entry is dropped once a matching "Out
// Today" post is published, or 7 days after its date (the regime gate's
// after-window) if none ever is.

import { addDays, CONFIDENCE, daysBetween } from './releaseDates.js'
import { releasesFromPost } from './releaseCandidates.js'
import { isBigRelease, RELEASED_TITLE, titlesMatch } from './releaseTitles.js'
import { parseUpcomingPage, UPCOMING_PAGE_TITLE, UPCOMING_PAGE_URL } from './upcomingPage.js'

/** Posts older than this are not read for announcements. */
export const POST_LOOKBACK_DAYS = 90
/** Keep an entry this long after its date when no "out" post shows up. */
export const KEEP_AFTER_DAYS = 7
/** An "out" post this many days before the expected date still counts (early release). */
const EARLY_RELEASE_DAYS = 3
const MAX_AHEAD_DAYS = 365

const SOURCE_RANK = { page: 1, post: 0 }
const confidenceRank = c => (c === CONFIDENCE.explicit ? 1 : 0)

/** A page release (parseUpcomingPage) -> feed candidate. */
export function candidateFromPage (row, referenceDate, findItems = () => []) {
  return {
    title: row.title,
    expectedDate: row.date,
    confidence: row.confidence,
    sourcePost: row.sourcePost ?? `${UPCOMING_PAGE_TITLE} (OSRS Wiki)`,
    sourceUrl: row.sourceUrl ?? UPCOMING_PAGE_URL,
    big: isBigRelease(row.title, row.evidence),
    items: findItems(row.text ?? ''),
    announcedOn: row.announcedOn ?? referenceDate,
    evidence: row.evidence,
    origin: 'page'
  }
}

/** Releases announced in one dataset post (+ its wikitext) -> feed candidates. */
export function candidatesFromPost (post, findItems = () => []) {
  return releasesFromPost(post).map(found => ({
    title: found.title,
    expectedDate: found.date,
    confidence: found.confidence,
    sourcePost: post.title,
    sourceUrl: post.url ?? post.wikiUrl ?? null,
    big: isBigRelease(found.title, (found.support ?? [found.evidence]).join(' | ')),
    // A post about the release (title names it) lists its items; otherwise only the sentence's.
    items: titlesMatch(post.title, found.title) && Array.isArray(post.items) ? post.items : findItems(found.evidence),
    announcedOn: post.date,
    evidence: found.evidence,
    origin: 'post'
  }))
}

// Newer announcement first; then explicit; then the structured page.
function compareAuthority (a, b) {
  return b.announcedOn.localeCompare(a.announcedOn) ||
    confidenceRank(b.confidence) - confidenceRank(a.confidence) ||
    SOURCE_RANK[b.origin] - SOURCE_RANK[a.origin]
}

/** Same release from several sources -> one entry from the most authoritative, items/big pooled. */
export function mergeCandidates (candidates) {
  const groups = []
  for (const candidate of [...candidates].sort(compareAuthority)) {
    const group = groups.find(g => titlesMatch(g[0].title, candidate.title, { strict: true }))
    if (group) group.push(candidate)
    else groups.push([candidate])
  }
  return groups.map(([winner, ...rest]) => ({
    ...winner,
    big: winner.big || rest.some(c => c.big && c.expectedDate === winner.expectedDate),
    items: [...new Set([winner, ...rest].flatMap(c => c.items))]
  }))
}

/** The published update that says this release is out, or null. */
export function releasedBy (entry, published) {
  return (published ?? []).find(update =>
    typeof update?.date === 'string' &&
    update.date >= entry.announcedOn &&
    daysBetween(entry.expectedDate, update.date) >= -EARLY_RELEASE_DAYS &&
    titlesMatch(update.title, entry.title) &&
    (RELEASED_TITLE.test(update.title) || (update.category === 'game' && Math.abs(daysBetween(entry.expectedDate, update.date)) <= 1))
  ) ?? null
}

const isLive = (entry, today) =>
  entry.expectedDate >= addDays(today, -KEEP_AFTER_DAYS) && daysBetween(today, entry.expectedDate) <= MAX_AHEAD_DAYS

const toOutput = ({ origin, ...entry }) => entry

/**
 * The feed on `today` (YYYY-MM-DD).
 *   posts: dataset updates with their wikitext ({ title, date, url, wikiUrl, items, text }), any age
 *   page: { text, date } of the "Upcoming updates" page (date = revision day), or null
 *   published: every published dataset update (to drop released entries)
 *   findItems: (wikitext) -> item ids
 */
export function buildUpcomingReleases ({ today, posts = [], page = null, published = [], findItems = () => [] }) {
  const recentPosts = posts.filter(p => p?.date && p.date <= today && daysBetween(p.date, today) <= POST_LOOKBACK_DAYS)
  const candidates = [
    ...(page?.text ? parseUpcomingPage(page.text, page.date) : []).map(row => candidateFromPage(row, page.date, findItems)),
    ...recentPosts.flatMap(post => candidatesFromPost(post, findItems))
  ]
  return mergeCandidates(candidates)
    .filter(entry => isLive(entry, today) && !releasedBy(entry, published))
    .sort((a, b) => a.expectedDate.localeCompare(b.expectedDate) || a.title.localeCompare(b.title))
    .map(toOutput)
}

/** Validates a parsed upcoming-releases.json payload; drops malformed rows. */
export function parseUpcomingReleasesPayload (payload) {
  const rows = Array.isArray(payload?.upcoming) ? payload.upcoming : null
  if (!rows) throw new Error('upcoming-releases.json: missing "upcoming" array')
  return rows.filter(row => row && typeof row.title === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.expectedDate ?? '') &&
    (row.confidence === CONFIDENCE.explicit || row.confidence === CONFIDENCE.inferred))
}
