// Turns "4151", 4151 or "abyssal whip" into a mapping entry.

import type { MappingEntry } from '../wiki/types.js'

export class ToolInputError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'ToolInputError'
  }
}

const normalize = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, ' ')

// Rank: exact name, then prefix, then word-prefix, then substring; ties go to
// the shorter name (usually the base item rather than a variant).
export function matchItems (mapping: readonly MappingEntry[], query: string): MappingEntry[] {
  const q = normalize(query)
  if (!q) return []
  const scored = mapping.flatMap(entry => {
    const name = normalize(entry.name)
    if (name === q) return [{ entry, score: 0 }]
    if (name.startsWith(q)) return [{ entry, score: 1 }]
    if (name.split(/[\s(-]+/).some(word => word.startsWith(q))) return [{ entry, score: 2 }]
    if (name.includes(q)) return [{ entry, score: 3 }]
    return []
  })
  return scored
    .sort((a, b) => a.score - b.score || a.entry.name.length - b.entry.name.length || a.entry.id - b.entry.id)
    .map(s => s.entry)
}

export function resolveItem (mapping: readonly MappingEntry[], item: string | number): MappingEntry {
  const asId = typeof item === 'number' ? item : /^\d+$/.test(item.trim()) ? Number(item.trim()) : null
  if (asId !== null) {
    const byId = mapping.find(m => m.id === asId)
    if (!byId) throw new ToolInputError(`No tradeable item with id ${asId}.`)
    return byId
  }
  const matches = matchItems(mapping, String(item))
  const first = matches[0]
  if (!first) throw new ToolInputError(`No tradeable item matches "${item}". Try search_items with a shorter query.`)
  return first
}
