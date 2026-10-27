// Announced release dates in published news posts (wiki "Update:" pages):
// "Wyrmscraig Launches July 29!", "...as we prepare for the launch of Blood
// Moon Rises on June 30th", "Leagues VI: Demonic Pacts, launching next
// Wednesday". A date only counts when a release verb sits just before it and
// nothing in that clause says it is a fix, poll, stream, sale or another game.

import { stripWikiMarkup } from './textMentions.js'
import { findDateMentions, CONFIDENCE } from './releaseDates.js'
import { cleanReleaseTitle, isUsableTitle, titlesMatch } from './releaseTitles.js'

// How far before a date phrase we look for the release verb / subject.
const CONTEXT_CHARS = 90
const MAX_DAYS_AHEAD = 180

const RELEASE_VERB = /\b(launch(?:es|ed|ing)?|releas(?:e|es|ing)|com(?:es|ing)|arriv(?:e|es|ing)|drop(?:s|ping)?|goes live|go live|going live|out on|lands?|landing|kicks? off|opens?|opening)\b/gi
// Clause words that mean the date is not a content release.
const NOT_A_RELEASE = new RegExp(`\\b(?:no (?:major )?game updates?|game updates?|${[
  'coldfix', 'hotfix', 'fix', 'bug', 'poll', 'survey', 'livestream', 'stream', 'podcast', 'episode', 'ticket', 'pre-?sale',
  'maintenance', 'video', 'blog', 'q&a', 'wraps? up', 'ends?', 'ending', 'closes?', 'closing', 'deadline', 'vote', 'voting',
  'nominations?', 'merch', 'album', 'streaming platforms', 'graphic novel', 'novel', 'comic', 'discount', 'sale', 'price',
  'dragonwilds', 'runescape 3', 'rs3', 'steam', 'switch', 'ps5', 'xbox', 'launcher', 'macos', 'summit', 'campfire',
  'runefest', 'finale', 'qualifiers?', 'tournament', 'competition', 'all[- ]stars', 'chicago', 'migration', 'entries', 'entry', 'submissions?'
].join('|')})(?:s|es)?\\b`, 'i')
const SENTENCE_BREAK = /[.!?\n|]\s/g
const AUXILIARY = /\s*(?:,\s*)?\b(?:is|are|will|will be|be|'s|has been|have been|now|finally|officially|set to be|set to|planned to be|aiming to|due to|expected to)\s*$/i
const CAPS_RUN = /((?:[A-Z0-9][\w'’:-]*(?:\s+(?:of|the|and|&|to|in|on|a|-)\s+|\s+|:\s*)?)*[A-Z0-9][\w'’-]*)\s*$/
const LAUNCH_OF = /\b(?:launch|release|arrival|opening)\s+of\s+(?:the\s+)?(?:new\s+[^,.]{0,30},\s*)?(?:the\s+)?([A-Z][\w'’:-]*(?:\s+(?:of|the|and|&|[A-Z0-9][\w'’:-]*))*)/

function sentenceStart (text, index) {
  let start = 0
  for (const match of text.slice(0, index).matchAll(SENTENCE_BREAK)) start = match.index + match[0].length
  return start
}

// Text between the previous date/clause boundary and the date phrase.
function clauseBefore (text, mention, previousEnd) {
  const start = Math.max(sentenceStart(text, mention.index), mention.index - CONTEXT_CHARS, previousEnd)
  return text.slice(start, mention.index)
}

function lastVerb (clause) {
  const verbs = [...clause.matchAll(RELEASE_VERB)]
  return verbs.length ? verbs[verbs.length - 1] : null
}

// "With Wyrmscraig launching on" -> "Wyrmscraig"; "the launch of Blood Moon Rises on" -> "Blood Moon Rises".
export function subjectBefore (clause, verb) {
  const launchOf = clause.match(LAUNCH_OF)
  if (launchOf) return cleanReleaseTitle(launchOf[1])
  const beforeVerb = clause.slice(0, verb.index).replace(/[\s,;:–—-]+$/, ' ').replace(AUXILIARY, '').replace(AUXILIARY, '')
  const run = beforeVerb.match(CAPS_RUN)
  return run ? cleanReleaseTitle(run[1]) : null
}

/** Post title like "Wyrmscraig Launches July 29!" -> { title, date, confidence } or null. */
export function releaseFromPostTitle (postTitle, postDate) {
  const [mention] = findDateMentions(postTitle, postDate)
  if (!mention || mention.date <= postDate) return null
  const clause = postTitle.slice(0, mention.index)
  if (NOT_A_RELEASE.test(postTitle)) return null
  const verb = lastVerb(clause)
  const subject = cleanReleaseTitle(verb ? clause.slice(0, verb.index) : clause)
  if (!isUsableTitle(subject)) return null
  return { title: subject, date: mention.date, confidence: mention.confidence, evidence: postTitle.trim() }
}

// "...including next week, alongside the launch of The Red Reef": subject named after the date.
function subjectAfter (text, mention) {
  const end = mention.index + mention.length
  const rest = text.slice(end, end + CONTEXT_CHARS)
  const sentence = rest.slice(0, rest.search(SENTENCE_BREAK) < 0 ? rest.length : rest.search(SENTENCE_BREAK))
  if (!ALONGSIDE.test(sentence)) return null
  const launchOf = sentence.match(LAUNCH_OF)
  return launchOf ? cleanReleaseTitle(launchOf[1]) : null
}

// Only right after the date: "next week - alongside the launch of ..." (not "..., or alongside ...").
const ALONGSIDE = /^[\s,–—-]*(?:alongside|with|for)\s+the\s+(?:launch|release|arrival)\s+of\b/i

const isNear = (from, to) => to > from && dayGap(from, to) <= MAX_DAYS_AHEAD

function candidateAt (prose, mention, clause, post, fromTitle) {
  const verb = lastVerb(clause)
  if (!verb) {
    const after = subjectAfter(prose, mention)
    return isUsableTitle(after) ? { title: after, date: mention.date, confidence: mention.confidence, evidence: oneLine(`${mention.text} ${prose.slice(mention.index + mention.length, mention.index + mention.length + CONTEXT_CHARS)}`) } : null
  }
  if (NOT_A_RELEASE.test(clause.slice(verb.index)) || NOT_A_RELEASE.test(clause.slice(0, verb.index).slice(-40))) return null
  const before = subjectBefore(clause, verb)
  const after = before ? null : subjectAfter(prose, mention)
  const subject = before ?? after ?? (fromTitle?.date === mention.date ? fromTitle.title : null)
  const tail = after ? prose.slice(mention.index + mention.length, mention.index + mention.length + CONTEXT_CHARS) : ''
  return isUsableTitle(subject) ? { title: subject, date: mention.date, confidence: mention.confidence, evidence: oneLine(`${clause}${mention.text}${tail}`) } : null
}

const oneLine = text => text.replace(/\s+/g, ' ').replace(/=+/g, '').trim()

/**
 * Release announcements in one post -> [{ title, date, confidence, evidence, support }]
 * (support = every sentence in the post that gave this date).
 * `post` = { title, date, text } (text = wikitext). Only dates after the post date.
 */
export function releasesFromPost (post) {
  if (!post || typeof post.text !== 'string' || typeof post.title !== 'string' || typeof post.date !== 'string') return []
  const prose = stripWikiMarkup(post.text).replace(/[ \t]+/g, ' ')
  const fromTitle = releaseFromPostTitle(post.title, post.date)
  const mentions = findDateMentions(prose, post.date)
  const found = mentions.flatMap((mention, i) => {
    if (!isNear(post.date, mention.date)) return []
    const previous = mentions[i - 1]
    const clause = clauseBefore(prose, mention, previous ? previous.index + previous.length : 0)
    const candidate = candidateAt(prose, mention, clause, post, fromTitle)
    return candidate ? [candidate] : []
  })
  return bestPerRelease([...(fromTitle ? [fromTitle] : []), ...found, ...releasesFromHeadings(post)])
}

// "==Next Week: Sailing Technical Pre-Release Update==" -> that release, next week's Wednesday.
const NEXT_WEEK_HEADING = /^=+\s*(?:coming\s+)?(next week|this week)\s*[:\-–—]\s*([^=\n]+?)\s*=+\s*$/gim

export function releasesFromHeadings (post) {
  return [...post.text.matchAll(NEXT_WEEK_HEADING)].flatMap(([line, when, rawTitle]) => {
    const title = cleanReleaseTitle(stripWikiMarkup(rawTitle))
    const [mention] = findDateMentions(when, post.date)
    if (!mention || !isUsableTitle(title) || NOT_A_RELEASE.test(title)) return []
    return [{ title, date: mention.date, confidence: mention.confidence, evidence: oneLine(line) }]
  })
}

const dayGap = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)
const isWeekOnly = candidate => /\bweek\b/i.test(candidate.evidence.slice(-12))

// Rank inside one post: explicit > named weekday > bare "next week"; ties keep the earlier find.
const rank = candidate => (candidate.confidence === CONFIDENCE.explicit ? 2 : isWeekOnly(candidate) ? 0 : 1)

// One date per release per post (the best-ranked), and one release per date
// (the first name found, which is the post title's when it has one).
// `support` lists every sentence that gave the kept date (for the big rule).
function bestPerRelease (found) {
  return found.reduce((kept, candidate) => {
    const same = kept.findIndex(k => k.date === candidate.date || titlesMatch(k.title, candidate.title, { strict: true }))
    if (same < 0) return [...kept, { ...candidate, support: [candidate.evidence] }]
    const current = kept[same]
    const replacement = rank(candidate) > rank(current)
      ? { ...candidate, title: current.title, support: [...(candidate.date === current.date ? current.support : []), candidate.evidence] }
      : { ...current, support: candidate.date === current.date ? [...current.support, candidate.evidence] : current.support }
    return kept.map((k, i) => (i === same ? replacement : k))
  }, [])
}
