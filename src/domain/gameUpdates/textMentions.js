// Plain-text item mentions. Wiki "Update:" pages are verbatim copies of the
// news posts and rarely link items, so besides [[links]] we look for
// Grand Exchange item names in the prose ("The value of blisterwood logs...").

import { createItemIndexes } from './itemMatcher.js'

// One-word names shorter than this are too ambiguous ("Bones", "Cake", "Logs").
export const SINGLE_WORD_MIN_LENGTH = 7

// Item names that are mostly ordinary words (or Jagex mod names) in news
// posts: "bank placeholders", "easter eggs", "Mod Pumpkin", "compost a patch".
export const AMBIGUOUS_NAMES = new Set([
  'feather', 'present', 'teleport', 'blessing', 'certificate', 'pumpkin', 'cabbage',
  'crossbow', 'placeholder', 'leather', 'mushroom', 'compost', 'easter egg', 'diamond'
])

const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Wikitext -> readable prose: drops comments, refs, file links, templates
// and tags; keeps link labels and external link text.
export function stripWikiMarkup (wikitext) {
  if (typeof wikitext !== 'string') return ''
  let text = wikitext
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<ref[^>]*\/>|<ref[^>]*>[\s\S]*?<\/ref>/gi, ' ')
    .replace(/\[\[(?:File|Image|Media|Category):[^[\]]*(?:\[\[[^[\]]*\]\][^[\]]*)*\]\]/gi, ' ')
  // Innermost templates first so nested ones collapse.
  for (let previous = ''; previous !== text;) {
    previous = text
    text = text.replace(/\{\{[^{}]*\}\}/g, ' ')
  }
  return text
    .replace(/\[\[(?:[^[\]|]*\|)?([^[\]]*)\]\]/g, '$1')
    .replace(/\[(?:https?:)?\/\/[^\s\]]+\s*([^\]]*)\]/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/'{2,}/g, '')
    .replace(/&nbsp;/g, ' ')
}

function isMentionable (name) {
  const lower = name.toLowerCase()
  if (AMBIGUOUS_NAMES.has(lower)) return false
  return /\s/.test(lower.trim()) || lower.length >= SINGLE_WORD_MIN_LENGTH
}

// mapping -> (wikitext) -> item ids in order of first mention. Longer names
// win at the same position ("Dragon bones" over "Bones"); plurals match.
export function createMentionFinder (mapping) {
  const { exact, bestVariant } = createItemIndexes(mapping)
  const byName = new Map()
  for (const [name, item] of exact) if (isMentionable(name)) byName.set(name, item)
  for (const [name, { item }] of bestVariant) if (!byName.has(name) && isMentionable(name)) byName.set(name, item)
  if (byName.size === 0) return () => []
  const alternatives = [...byName.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp)
  const pattern = new RegExp(`(?<![\\w'])(${alternatives.join('|')})(?:e?s)?(?![\\w])`, 'gi')

  return function findMentions (wikitext) {
    const ids = []
    for (const [, name] of stripWikiMarkup(wikitext).matchAll(pattern)) {
      const item = byName.get(name.toLowerCase())
      if (item && !ids.includes(item.id)) ids.push(item.id)
    }
    return ids
  }
}
