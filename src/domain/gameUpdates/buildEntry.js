// Turns a wiki Update page into a dataset entry and sorts/filters the list.

import { parseUpdateTemplate, stripUpdatePrefix, wikiUrlForTitle } from './parseUpdatePage.js'
import { extractLinks } from './extractLinks.js'
import { matchItemIds } from './itemMatcher.js'

export const MIN_UPDATE_DATE = '2015-02-01'

// { title, text } page -> entry, or null if not a dated update on/after
// minDate. Items: linked ones (matchItem) first, then prose mentions.
export function buildUpdateEntry ({ title, text }, { matchItem, findMentions = () => [] }, { minDate = MIN_UPDATE_DATE } = {}) {
  if (typeof title !== 'string' || typeof text !== 'string') return null
  const header = parseUpdateTemplate(text)
  if (!header || header.date < minDate) return null
  return {
    date: header.date,
    title: stripUpdatePrefix(title),
    url: header.url,
    wikiUrl: wikiUrlForTitle(title),
    category: header.category,
    items: [...new Set([...matchItemIds(extractLinks(text), matchItem), ...findMentions(text)])]
  }
}

// Newest first; same-day entries by title for stable output.
export function sortUpdatesNewestFirst (updates) {
  return [...updates].sort((a, b) => (a.date === b.date ? a.title.localeCompare(b.title) : b.date.localeCompare(a.date)))
}
