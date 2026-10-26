// Internal links in update wikitext: [[Page]], [[Page|shown]], [[Page#Anchor]],
// {{plink|Page|...}} (and plinkp/plinkt). Non-article namespaces are skipped.

const SKIPPED_NAMESPACES = new Set([
  'file', 'image', 'media', 'category', 'template', 'special', 'user', 'user talk',
  'talk', 'help', 'module', 'update', 'transcript', 'exchange', 'calculator', 'map',
  'rsw', 'osrsw', 'wikipedia', 'wp', 'w', 'rs', 'meta', 'mw', 'mediawiki', 'project',
  'old school runescape wiki', 'runescape', 'gemw', 'poll', 'guide', 'cat'
])

const WIKI_LINK = /\[\[([^[\]|]+)(?:\|([^[\]]*))?\]\]/g
const PLINK = /\{\{\s*plink[a-z]*\s*\|([^|}]+)/gi

const ENTITIES = { '&amp;': '&', '&#39;': "'", '&apos;': "'", '&quot;': '"', '&nbsp;': ' ' }

export function normalizeTarget (raw) {
  return raw
    .replace(/&(amp|#39|apos|quot|nbsp);/g, entity => ENTITIES[entity])
    .replace(/_/g, ' ')
    .split('#')[0]
    .replace(/\s+/g, ' ')
    .trim()
}

function isArticle (target) {
  const raw = target.trim()
  if (raw.startsWith(':') || raw.startsWith('#')) return false
  const colon = raw.indexOf(':')
  if (colon < 0) return true
  return !SKIPPED_NAMESPACES.has(raw.slice(0, colon).trim().toLowerCase())
}

const stripComments = text => text.replace(/<!--[\s\S]*?-->/g, '')

// -> [{ target, text }]: [[links]] first, then plinks; text is the shown label or null.
export function extractLinks (wikitext) {
  if (typeof wikitext !== 'string') return []
  const text = stripComments(wikitext)
  const links = [...text.matchAll(WIKI_LINK)]
    .filter(([, target]) => isArticle(target))
    .map(([, target, shown]) => ({ target: normalizeTarget(target), text: shown?.trim() || null }))
  const plinks = [...text.matchAll(PLINK)]
    .map(([, target]) => ({ target: normalizeTarget(target), text: null }))
  return [...links, ...plinks]
    .filter(link => link.target.length > 0)
}
