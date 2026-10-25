import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { loadJson, saveJson } from './storage'

// Starred sets (by recipe id) and items (by item id), kept on the device.
export type WatchEntry = { kind: 'set'; id: string } | { kind: 'item'; id: number }

const KEY = 'gem.watchlist.v1'

function isEntryList (value: unknown): value is WatchEntry[] {
  return Array.isArray(value) && value.every(e =>
    typeof e === 'object' && e !== null &&
    ((e.kind === 'set' && typeof e.id === 'string') || (e.kind === 'item' && Number.isInteger(e.id)))
  )
}

const sameEntry = (a: WatchEntry, b: WatchEntry) => a.kind === b.kind && a.id === b.id

interface WatchlistContextValue {
  entries: readonly WatchEntry[]
  isStarred: (entry: WatchEntry) => boolean
  toggle: (entry: WatchEntry) => void
}

const WatchlistContext = createContext<WatchlistContextValue | null>(null)

export function WatchlistProvider ({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<readonly WatchEntry[]>([])

  useEffect(() => {
    loadJson<WatchEntry[]>(KEY, [], isEntryList).then(setEntries)
  }, [])

  const toggle = useCallback((entry: WatchEntry) => {
    setEntries(prev => {
      const next = prev.some(e => sameEntry(e, entry)) ? prev.filter(e => !sameEntry(e, entry)) : [...prev, entry]
      saveJson(KEY, next)
      return next
    })
  }, [])

  const value = useMemo(() => ({
    entries,
    toggle,
    isStarred: (entry: WatchEntry) => entries.some(e => sameEntry(e, entry))
  }), [entries, toggle])

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>
}

export function useWatchlist (): WatchlistContextValue {
  const context = useContext(WatchlistContext)
  if (!context) throw new Error('useWatchlist must be used inside WatchlistProvider')
  return context
}
