// Resolves wiki link names to Grand Exchange items from the prices API
// mapping (https://prices.runescape.wiki/api/v1/osrs/mapping).

const DOSE_SUFFIX = /^(.*?)\s*\((\d+)\)$/

const key = name => name.toLowerCase().replace(/\s+/g, ' ').trim()

// "Saradomin brew" -> "Saradomin brew(4)": base names map to the highest
// dose/charge variant, unless an exact item with that name exists.
export function createItemIndexes (mapping) {
  const exact = new Map()
  const bestVariant = new Map()
  for (const item of Array.isArray(mapping) ? mapping : []) {
    if (!item || typeof item.name !== 'string' || !Number.isInteger(item.id)) continue
    exact.set(key(item.name), item)
    const variant = item.name.match(DOSE_SUFFIX)
    if (!variant) continue
    const base = key(variant[1])
    const current = bestVariant.get(base)
    if (!current || Number(variant[2]) > current.dose) bestVariant.set(base, { item, dose: Number(variant[2]) })
  }
  return { exact, bestVariant }
}

// Singular guesses for a plural link label ("Rune scimitars", "Magic logs").
export function nameVariants (name) {
  const base = key(name)
  const variants = [base]
  if (base.endsWith('ies')) variants.push(`${base.slice(0, -3)}y`)
  if (base.endsWith('es')) variants.push(base.slice(0, -2))
  if (base.endsWith('s')) variants.push(base.slice(0, -1))
  else variants.push(`${base}s`)
  return variants
}

export function createItemMatcher (mapping) {
  const { exact, bestVariant } = createItemIndexes(mapping)
  const lookup = name => exact.get(name) ?? bestVariant.get(name)?.item ?? null

  // Tries the link target first, then the shown label; exact names before
  // plural guesses. Returns the mapping item or null.
  return function matchItem ({ target, text = null }) {
    const names = [target, text].filter(n => typeof n === 'string' && n.trim())
    for (const name of names) {
      const hit = lookup(key(name))
      if (hit) return hit
    }
    for (const name of names) {
      for (const variant of nameVariants(name).slice(1)) {
        const hit = lookup(variant)
        if (hit) return hit
      }
    }
    return null
  }
}

// Unique item ids, in first-mention order, for a list of links.
export function matchItemIds (links, matchItem) {
  const ids = []
  for (const link of links) {
    const item = matchItem(link)
    if (item && !ids.includes(item.id)) ids.push(item.id)
  }
  return ids
}
