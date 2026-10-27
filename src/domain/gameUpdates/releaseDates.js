// Release-date phrases in OSRS news prose, resolved against the post's date:
//   "launches on Wednesday 4th November", "coming November 4th", "Oct 20, 2026"
//     -> explicit (the day is written out; the year is inferred when missing)
//   "next week", "next Wednesday", "this Friday", "tomorrow"
//     -> inferred (relative to the post date; a bare "next week" means that
//        week's Wednesday, when OSRS game updates go out)
// All dates are YYYY-MM-DD strings in UTC.

export const CONFIDENCE = Object.freeze({ explicit: 'explicit', inferred: 'inferred' })

const DAY_MS = 86_400_000
// An undated "4th November" in a post from late December means next year;
// one that is only a little in the past is a past date, not next year's.
const PAST_TOLERANCE_DAYS = 60
const GAME_UPDATE_WEEKDAY = 3 // Wednesday

const MONTHS = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8,
  september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12
}
const WEEKDAYS = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 }

const MONTH = '(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec)\\.?'
const WEEKDAY = '(monday|tuesday|wednesday|thursday|friday|saturday|sunday)'
const DAY = '(\\d{1,2})(?:st|nd|rd|th)?'
const YEAR = '(?:,?\\s+(\\d{4}))?'
const LEAD = `(?:${WEEKDAY},?\\s+)?(?:the\\s+)?`

// "Wednesday 4th November 2026", "the 4th of November"
const DAY_FIRST = new RegExp(`\\b${LEAD}${DAY}(?:\\s+of)?\\s+${MONTH}${YEAR}(?![\\w])`, 'gi')
// "Wednesday, November 4th, 2026", "Nov 4"
const MONTH_FIRST = new RegExp(`\\b${LEAD}${MONTH}\\s+(?:the\\s+)?${DAY}${YEAR}(?![\\w:])`, 'gi')
// "next week" (not "next week's update"), "next Wednesday", "this Friday", "tomorrow"
const RELATIVE = new RegExp(`\\b(?:(next|this)\\s+(week|${WEEKDAY.slice(1, -1)})|(tomorrow))\\b(?!['’]s)`, 'gi')

const pad = n => String(n).padStart(2, '0')

export function toIsoDate (ms) {
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

export function isoToMs (iso) {
  return typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? Date.parse(`${iso}T00:00:00Z`) : NaN
}

export const addDays = (iso, days) => toIsoDate(isoToMs(iso) + days * DAY_MS)

export const daysBetween = (fromIso, toIso) => Math.round((isoToMs(toIso) - isoToMs(fromIso)) / DAY_MS)

const weekdayOf = iso => new Date(isoToMs(iso)).getUTCDay()

function validDate (year, month, day) {
  const ms = Date.UTC(year, month - 1, day)
  const d = new Date(ms)
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day ? toIsoDate(ms) : null
}

// Year for an undated day/month near postDate; a stated weekday picks between
// this and next year when both are plausible.
export function resolveYear (month, day, postDate, weekday = null) {
  const postYear = Number(postDate.slice(0, 4))
  const candidates = [postYear, postYear + 1]
    .map(year => validDate(year, month, day))
    .filter(iso => iso && daysBetween(postDate, iso) >= -PAST_TOLERANCE_DAYS)
  if (weekday !== null) {
    const matching = candidates.find(iso => weekdayOf(iso) === weekday)
    if (matching) return matching
  }
  return candidates[0] ?? null
}

// Monday-based week: the given weekday in the week `weeksAhead` after postDate's week.
function weekdayInWeek (postDate, weekday, weeksAhead) {
  const offsetFromMonday = (weekdayOf(postDate) + 6) % 7
  const monday = addDays(postDate, -offsetFromMonday + 7 * weeksAhead)
  return addDays(monday, (weekday + 6) % 7)
}

function explicitMention (match, postDate, monthGroup, dayGroup) {
  const [text, weekdayName] = match
  const monthName = match[monthGroup]
  // "may" is far more often a verb than a month.
  if (monthName.toLowerCase() === 'may' && !/^May$/.test(monthName)) return null
  const month = MONTHS[monthName.toLowerCase()]
  const day = Number(match[dayGroup])
  const year = match[4] ? Number(match[4]) : null
  const weekday = weekdayName ? WEEKDAYS[weekdayName.toLowerCase()] : null
  const date = year ? validDate(year, month, day) : resolveYear(month, day, postDate, weekday)
  return date && { date, confidence: CONFIDENCE.explicit, index: match.index, length: text.length, text }
}

function relativeMention (match, postDate) {
  const [text, which, unit, tomorrow] = match
  let date = null
  if (tomorrow) date = addDays(postDate, 1)
  else if (unit.toLowerCase() === 'week') {
    date = which.toLowerCase() === 'next' ? weekdayInWeek(postDate, GAME_UPDATE_WEEKDAY, 1) : weekdayInWeek(postDate, GAME_UPDATE_WEEKDAY, 0)
    if (date <= postDate) date = null
  } else {
    const weekday = WEEKDAYS[unit.toLowerCase()]
    date = weekdayInWeek(postDate, weekday, which.toLowerCase() === 'next' ? 1 : 0)
    // "this Monday" in a Wednesday post is in the past
    if (date <= postDate) date = which.toLowerCase() === 'this' ? null : addDays(date, 7)
  }
  return date && { date, confidence: CONFIDENCE.inferred, index: match.index, length: text.length, text }
}

const overlaps = (a, b) => a.index < b.index + b.length && b.index < a.index + a.length

/**
 * Every date phrase in `text` -> [{ date, confidence, index, length, text }],
 * in reading order. Explicit dates win over relative phrases they overlap
 * ("next week on October 20th" -> one explicit mention).
 */
export function findDateMentions (text, postDate) {
  if (typeof text !== 'string' || Number.isNaN(isoToMs(postDate))) return []
  const explicit = [
    ...[...text.matchAll(DAY_FIRST)].map(m => explicitMention(m, postDate, 3, 2)),
    ...[...text.matchAll(MONTH_FIRST)].map(m => explicitMention(m, postDate, 2, 3))
  ].filter(Boolean)
  const uniqueExplicit = explicit.filter((m, i) => !explicit.some((o, j) => j !== i && overlaps(m, o) && (o.length > m.length || (o.length === m.length && j < i))))
  const relative = [...text.matchAll(RELATIVE)].map(m => relativeMention(m, postDate)).filter(Boolean)
    .filter(r => !uniqueExplicit.some(e => overlaps(e, r)))
  // "next week on October 20th": one explicit mention covering both phrases.
  const merged = uniqueExplicit.map(e => {
    const lead = relative.find(r => RESTATED.test(text.slice(r.index + r.length, e.index)) && r.index < e.index)
    return lead ? { ...e, index: lead.index, length: e.index + e.length - lead.index, text: text.slice(lead.index, e.index + e.length) } : e
  })
  const all = [...merged, ...relative.filter(r => !merged.some(e => overlaps(e, r)))]
  return all.sort((a, b) => a.index - b.index)
}

const RESTATED = /^[\s,(]*(?:on|-|–)?[\s,]*(?:the\s+)?$/

/** A day-level date cell like "November 4th", "4 November 2026" -> ISO, else null. */
export function parseDayCell (cell, referenceDate, yearHints = []) {
  if (typeof cell !== 'string') return null
  const text = cell.trim().replace(/\s+/g, ' ')
  const dayFirst = text.match(new RegExp(`^${LEAD}${DAY}(?:\\s+of)?\\s+${MONTH}${YEAR}$`, 'i'))
  const monthFirst = text.match(new RegExp(`^${LEAD}${MONTH}\\s+(?:the\\s+)?${DAY}${YEAR}$`, 'i'))
  const match = dayFirst ?? monthFirst
  if (!match) return null
  const month = MONTHS[(dayFirst ? match[3] : match[2]).toLowerCase()]
  const day = Number(dayFirst ? match[2] : match[3])
  if (match[4]) return validDate(Number(match[4]), month, day)
  const hinted = yearHints.map(year => validDate(year, month, day)).filter(Boolean)
  const nearReference = hinted.filter(iso => daysBetween(referenceDate, iso) >= -PAST_TOLERANCE_DAYS)
  return nearReference[0] ?? hinted[0] ?? resolveYear(month, day, referenceDate)
}
