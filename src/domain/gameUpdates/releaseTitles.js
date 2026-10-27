// Names of announced releases: cleaning ("Get Ready For Leagues VI: Demonic
// Pacts - " -> "Leagues VI: Demonic Pacts"), matching an announcement to the
// "Out Today" post that ends it, and the "big release" rule.

/**
 * The regime gate's big-release rule, copied verbatim from
 * mcp/src/analysis/regime/gates.ts (MAJOR_UPDATE_TITLE, PR #48): launch posts,
 * "out today", seasonal events. Keep the two in sync.
 */
export const MAJOR_UPDATE_TITLE = /\b(out today|launch(?:es|ed)?|live today|is out|release[sd]?|christmas|halloween|easter|birthday|deadman|leagues? [ivx]+:)/i

/** Big when the gate's rule matches the release name or the announcing text. */
export function isBigRelease (title, evidence = '') {
  return MAJOR_UPDATE_TITLE.test(String(title ?? '')) || MAJOR_UPDATE_TITLE.test(String(evidence ?? ''))
}

const LEADING_NOISE = /^(?:(?:get ready for|prepare for|introducing|announcing|reminder:?|heads up:?|with|as|and|but|so|plus|once|when|while|until|before|after|the full|our|new:?)\s+)+/i
const TRAILING_NOISE = /[\s,:;–—-]*(?:\b(?:announcement|overview|reveal|is|are|will|be|has|have|now|finally|officially|update|news)\b[\s,:;–—-]*)*$/i
const STOP_TITLES = new Set([
  'today', 'tomorrow', 'this', 'that', 'it', 'we', 'you', 'they', 'our', 'the', 'next', 'week', 'old school',
  'osrs', 'runescape', 'old school runescape', 'jagex', 'the team', 'update', 'updates', 'game update', 'live',
  'utc', 'bst', 'gmt', 'am', 'pm', 'everything', 'everyone', 'players', 'scapers', 'mod', 'mods'
])
const MAX_TITLE_LENGTH = 80
// "We're aiming to open it on...", "It's coming on..."
const PRONOUN_START = /^(?:we|you|they|it|i|he|she|this|that|these|those|there|here|our|your|their)(?:['’](?:re|ve|ll|s|d|m))?\b/i

export function cleanReleaseTitle (raw) {
  if (typeof raw !== 'string') return ''
  return raw
    .replace(/[!?"“”]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(LEADING_NOISE, '')
    .replace(TRAILING_NOISE, '')
    .replace(/^the\s+(?=[a-z])/, '')
    .trim()
}

export function isUsableTitle (title) {
  if (typeof title !== 'string') return false
  const text = title.trim()
  if (text.length < 3 || text.length > MAX_TITLE_LENGTH) return false
  if (!/^[A-Z0-9]/.test(text) || PRONOUN_START.test(text)) return false
  return !STOP_TITLES.has(text.toLowerCase())
}

// Words that say nothing about which release it is.
const GENERIC_WORDS = new Set([
  'the', 'and', 'for', 'with', 'out', 'today', 'now', 'live', 'launch', 'launches', 'launched', 'launching',
  'release', 'released', 'releases', 'releasing', 'coming', 'here', 'update', 'updates', 'new', 'more', 'fixes',
  'changes', 'tweaks', 'week', 'next', 'this', 'event', 'events', 'is', 'are', 'on', 'of', 'in', 'to', 'a',
  'known', 'issues', 'everything', 'you', 'need', 'know', 'what', 'expect', 'arrives', 'drops', 'game', 'quest'
])

/** Distinctive lowercase words of a title (no years, no generic words). */
export function titleTokens (title) {
  return [...new Set(String(title ?? '')
    .toLowerCase()
    .replace(/['’]s\b/g, '')
    .split(/[^a-z0-9]+/)
    .filter(word => word.length >= 3 && !GENERIC_WORDS.has(word) && !/^\d+$/.test(word)))]
}

/**
 * Same release? At least half the distinctive words of the shorter title are
 * shared ("Wyrmscraig" ~ "Wyrmscraig Is Out Today!"). `strict` also needs half
 * of the longer one's, so "Sailing" and "Sailing Technical Pre-Release" stay
 * two releases when merging announcements.
 */
export function titlesMatch (a, b, { strict = false } = {}) {
  const left = titleTokens(a)
  const right = new Set(titleTokens(b))
  if (left.length === 0 || right.size === 0) return false
  const shared = left.filter(word => right.has(word)).length
  const enough = size => shared / size >= 0.5
  return shared > 0 && enough(Math.min(left.length, right.size)) && (!strict || enough(Math.max(left.length, right.size)))
}

/** A published post that says the content is out. */
export const RELEASED_TITLE = /\b(out (?:now|today)|launch(?:es|ed)? today|live (?:now|today)|(?:is|are) (?:out|here|live)|has (?:arrived|launched)|released|launch(?:ed)?!?$)/i
