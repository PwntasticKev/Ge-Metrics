// Parsing of OSRS Wiki "Update:" pages. Each page starts with
//   {{Update|date=14 October 2026|link=https://secure.runescape.com/m=news/...|category=game}}
// (older pages use url= instead of link=).

export const WIKI_BASE_URL = 'https://oldschool.runescape.wiki/w/'
export const UPDATE_PREFIX = 'Update:'

const MONTHS = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12
}

// Wiki editors spell some categories several ways ("dev blog", "Dev blogs").
const CATEGORY_ALIASES = { devblogs: 'devblog', dev: 'devblog', gameupdate: 'game', gameupdates: 'game' }

export function normalizeCategory (value) {
  const compact = String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
  if (!compact) return 'game'
  return CATEGORY_ALIASES[compact] ?? compact
}

const pad = n => String(n).padStart(2, '0')

function isoDate (year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day))
  const valid = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  return valid ? `${year}-${pad(month)}-${pad(day)}` : null
}

// "14 October 2026", "14th Oct 2026", "October 14, 2026" or "2026-10-14" -> "2026-10-14".
export function parseWikiDate (value) {
  if (typeof value !== 'string') return null
  const text = value.replace(/\[\[|\]\]/g, '').trim()
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (iso) return isoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]))
  const dayFirst = text.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\.?,?\s+(\d{4})/)
  if (dayFirst) {
    const month = MONTHS[dayFirst[2].toLowerCase()]
    return month ? isoDate(Number(dayFirst[3]), month, Number(dayFirst[1])) : null
  }
  const monthFirst = text.match(/([A-Za-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/)
  if (monthFirst) {
    const month = MONTHS[monthFirst[1].toLowerCase()]
    return month ? isoDate(Number(monthFirst[3]), month, Number(monthFirst[2])) : null
  }
  return null
}

// Text of the first {{Name ...}} call, braces balanced, or null.
export function findTemplate (wikitext, name) {
  if (typeof wikitext !== 'string') return null
  const opener = new RegExp(`\\{\\{\\s*${name}\\s*[|}]`, 'i')
  const match = opener.exec(wikitext)
  if (!match) return null
  let depth = 0
  for (let i = match.index; i < wikitext.length - 1; i++) {
    const pair = wikitext.slice(i, i + 2)
    if (pair === '{{') { depth++; i++ } else if (pair === '}}') {
      depth--
      i++
      if (depth === 0) return wikitext.slice(match.index + 2, i - 1)
    }
  }
  return null
}

// Split template body on top-level "|" (ignoring pipes inside [[...]] / {{...}}).
export function splitTemplateParams (body) {
  const parts = []
  let depth = 0
  let current = ''
  for (let i = 0; i < body.length; i++) {
    const pair = body.slice(i, i + 2)
    if (pair === '{{' || pair === '[[') { depth++; current += pair; i++; continue }
    if ((pair === '}}' || pair === ']]') && depth > 0) { depth--; current += pair; i++; continue }
    if (body[i] === '|' && depth === 0) { parts.push(current); current = ''; continue }
    current += body[i]
  }
  parts.push(current)
  const [, ...params] = parts
  return Object.fromEntries(params
    .map(param => param.split('='))
    .filter(pieces => pieces.length > 1)
    .map(([key, ...rest]) => [key.trim().toLowerCase(), rest.join('=').trim()]))
}

// {{Update|...}} header -> { date, url, category } or null when missing/undated.
export function parseUpdateTemplate (wikitext) {
  const body = findTemplate(wikitext, 'Update')
  if (body === null) return null
  const params = splitTemplateParams(body)
  const date = parseWikiDate(params.date)
  if (!date) return null
  return {
    date,
    url: params.link || params.url || null,
    category: normalizeCategory(params.category)
  }
}

export function stripUpdatePrefix (title) {
  return title.startsWith(UPDATE_PREFIX) ? title.slice(UPDATE_PREFIX.length) : title
}

export function wikiUrlForTitle (title) {
  const path = encodeURIComponent(title.replace(/ /g, '_')).replace(/%3A/g, ':').replace(/%2F/g, '/')
  return `${WIKI_BASE_URL}${path}`
}
