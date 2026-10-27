// The OSRS Wiki "Upcoming updates" page: the structured source of announced
// release dates. Since September 2026 it has an "Update schedule" wikitable
//   | rowspan="8" | Autumn 2026 | October 28th | [[2026 Halloween event]] | {{NA}} | {{CiteNews|...}}
// Older revisions (and the details below the table) are prose sections like
//   ===Sailing=== ... "Full release is planned for 19 November 2025."
// Only day-level dates become releases; "November", "Late November" are skipped.

import { findTemplate, parseWikiDate, splitTemplateParams } from './parseUpdatePage.js'
import { stripWikiMarkup } from './textMentions.js'
import { parseDayCell, CONFIDENCE } from './releaseDates.js'
import { releasesFromPost } from './releaseCandidates.js'
import { cleanReleaseTitle, isUsableTitle } from './releaseTitles.js'

export const UPCOMING_PAGE_TITLE = 'Upcoming updates'
export const UPCOMING_PAGE_URL = 'https://oldschool.runescape.wiki/w/Upcoming_updates'

const ATTRIBUTES = /^\s*(?:[a-z-]+\s*=\s*"[^"]*"\s*)+\|(?!\|)/i

// "rowspan="8" | Autumn 2026" -> { text: "Autumn 2026", rowspan: 8 }
function parseCell (raw) {
  const attributes = raw.match(ATTRIBUTES)
  const rowspan = attributes ? Number(attributes[0].match(/rowspan\s*=\s*"(\d+)"/i)?.[1] ?? 1) : 1
  return { text: (attributes ? raw.slice(attributes[0].length) : raw).trim(), rowspan }
}

// Cells of one table row: "| a" lines (or "a || b") start cells, other lines continue them.
function rowCells (rowText) {
  const cells = []
  for (const line of rowText.split('\n')) {
    if (line.startsWith('|') && !line.startsWith('|}')) cells.push(...line.slice(1).split('||'))
    else if (cells.length > 0) cells[cells.length - 1] += `\n${line}`
  }
  return cells.map(parseCell)
}

// Header row "! colspan="2" | Timeframe\n! Update ..." -> ['timeframe', 'timeframe', 'update', ...]
function headerColumns (headerText) {
  return headerText.split('\n')
    .filter(line => line.startsWith('!'))
    .flatMap(line => line.slice(1).split('!!'))
    .flatMap(raw => {
      const { text } = parseCell(raw)
      const span = Number(raw.match(/colspan\s*=\s*"(\d+)"/i)?.[1] ?? 1)
      return Array.from({ length: span }, () => text.toLowerCase())
    })
}

function scheduleTable (wikitext) {
  const heading = wikitext.search(/^==\s*Update schedule\s*==\s*$/im)
  if (heading < 0) return null
  const start = wikitext.indexOf('{|', heading)
  const end = wikitext.indexOf('\n|}', start)
  return start < 0 || end < 0 ? null : wikitext.slice(start, end)
}

// Every {{CiteNews}} / {{CiteReddit}} in a cell -> [{ kind, params }] in order.
function citations (cell) {
  const found = []
  const text = String(cell ?? '')
  for (const match of text.matchAll(/\{\{\s*Cite(News|Reddit)\s*\|/gi)) {
    const body = findTemplate(text.slice(match.index), `Cite${match[1]}`)
    if (body !== null) found.push({ kind: match[1].toLowerCase(), params: splitTemplateParams(body) })
  }
  return found
}

const citationDate = params => parseWikiDate(String(params.newsdate ?? params.date ?? '').trim())

/**
 * The newest-dated {{CiteNews}} (else {{CiteReddit}}) in a sources cell ->
 * { sourcePost, sourceUrl } or null. Newest = the post that set the current date.
 */
export function citedSource (cell) {
  const usable = citations(cell).filter(c => c.params.url)
  const newestFirst = kind => usable.filter(c => c.kind === kind).sort((a, b) => (citationDate(b.params) ?? '').localeCompare(citationDate(a.params) ?? ''))
  const [news] = newestFirst('news')
  if (news) return { sourcePost: news.params.title || 'Jagex news post', sourceUrl: news.params.url }
  const [reddit] = newestFirst('reddit')
  if (reddit) return { sourcePost: `Reddit${reddit.params.author ? `: ${reddit.params.author}` : ''}`, sourceUrl: reddit.params.url }
  return null
}

/** Newest citation date (newsdate= / date=) in a sources cell, or null. */
export function latestCitationDate (cell) {
  const dates = citations(cell).map(c => citationDate(c.params)).filter(Boolean).sort()
  return dates.length ? dates[dates.length - 1] : null
}

const yearsIn = text => [...String(text).matchAll(/\b(20\d{2})\b/g)].map(m => Number(m[1]))

function rowRelease (values, columns, referenceDate) {
  const seasonText = values[0] ?? ''
  const dateText = stripWikiMarkup(values[1] ?? '')
  const date = parseDayCell(dateText, referenceDate, yearsIn(seasonText))
  if (!date) return null
  const updateCell = values[columns.indexOf('update')] ?? ''
  const title = cleanReleaseTitle(stripWikiMarkup(updateCell.split('\n')[0]))
  if (!isUsableTitle(title)) return null
  const sourceIndex = columns.findIndex(c => c.startsWith('source'))
  const sources = sourceIndex < 0 ? '' : values[sourceIndex] ?? ''
  const announcedOn = latestCitationDate(sources)
  return {
    title,
    date,
    confidence: CONFIDENCE.explicit,
    evidence: `${dateText}: ${stripWikiMarkup(updateCell).replace(/\s+/g, ' ').trim()}`,
    text: updateCell,
    ...(announcedOn && announcedOn <= referenceDate ? { announcedOn } : {}),
    ...(citedSource(sources) ?? {})
  }
}

/**
 * "Update schedule" rows with a day-level date -> [{ title, date, confidence,
 * evidence, text, sourcePost?, sourceUrl? }]. referenceDate (YYYY-MM-DD,
 * usually the revision date) resolves dates written without a year.
 */
export function parseScheduleTable (wikitext, referenceDate) {
  const table = typeof wikitext === 'string' ? scheduleTable(wikitext) : null
  if (!table) return []
  const [header, ...rows] = table.split(/^\|-.*$/m)
  const columns = headerColumns(header)
  let carried = { text: '', remaining: 0 }
  const releases = []
  for (const row of rows) {
    if (!/^\|/m.test(row)) continue // "! colspan=..." separator rows
    const cells = rowCells(row)
    const values = carried.remaining > 0 ? [carried.text, ...cells.map(c => c.text)] : cells.map(c => c.text)
    if (carried.remaining > 0) carried = { ...carried, remaining: carried.remaining - 1 }
    else if (cells[0]) carried = { text: cells[0].text, remaining: cells[0].rowspan - 1 }
    const release = rowRelease(values, columns, referenceDate)
    if (release) releases.push(release)
  }
  return releases
}

const GENERIC_SUBJECT = /^(?:full|entries|it|this|the update|release|beta|launch)$/i

/** Prose sections ("===Sailing===" + text) -> releases named after the section when the sentence doesn't say. */
export function parseUpcomingProse (wikitext, referenceDate) {
  if (typeof wikitext !== 'string') return []
  const sections = wikitext.split(/^(={2,4}[^=\n]+={2,4})\s*$/m)
  const releases = []
  for (let i = 1; i < sections.length; i += 2) {
    const heading = cleanReleaseTitle(stripWikiMarkup(sections[i].replace(/=/g, '')))
    const body = sections[i + 1] ?? ''
    if (/update schedule|references|roadmap/i.test(heading)) continue
    for (const found of releasesFromPost({ title: heading, date: referenceDate, text: body })) {
      const title = GENERIC_SUBJECT.test(found.title) && isUsableTitle(heading) ? heading : found.title
      releases.push({ ...found, title, text: body, evidence: (found.support ?? [found.evidence]).join(' | ') })
    }
  }
  return releases
}

/** Every dated release on one revision of the page; table rows first. */
export function parseUpcomingPage (wikitext, referenceDate) {
  return [...parseScheduleTable(wikitext, referenceDate), ...parseUpcomingProse(wikitext, referenceDate)]
}
