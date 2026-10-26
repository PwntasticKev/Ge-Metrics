import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { usePersistentState } from './usePersistentState'

// Starred sets (by recipe id), items (by item id) and processing methods
// (by recipe id), kept on the device.
export type WatchEntry = { kind: 'set'; id: string } | { kind: 'item'; id: number } | { kind: 'process'; id: string }

const KEY = 'gem.watchlist.v1'

function isEntry (e: unknown): e is WatchEntry {
  if (typeof e !== 'object' || e === null) return false
  const { kind, id } = e as { kind?: unknown; id?: unknown }
  return ((kind === 'set' || kind === 'process') && typeof id === 'string') || (kind === 'item' && Number.isInteger(id))
}

const NONE: readonly WatchEntry[] = []
// Keeps every valid entry; one bad entry doesn't wipe the list.
const parseEntries = (raw: unknown): readonly WatchEntry[] => (Array.isArray(raw) ? raw.filter(isEntry) : NONE)

const sameEntry = (a: WatchEntry, b: WatchEntry) => a.kind === b.kind && a.id === b.id

const mergeEntries = (saved: readonly WatchEntry[], early: readonly WatchEntry[]) =>
  [...saved, ...early.filter(e => !saved.some(s => sameEntry(s, e)))]

interface WatchlistContextValue {
  entries: readonly WatchEntry[]
  isStarred: (entry: WatchEntry) => boolean
  toggle: (entry: WatchEntry) => void
}

const WatchlistContext = createContext<WatchlistContextValue | null>(null)

export function WatchlistProvider ({ children }: { children: ReactNode }) {
  const [entries, setEntries] = usePersistentState<readonly WatchEntry[]>(KEY, NONE, parseEntries, mergeEntries)

  const toggle = useCallback((entry: WatchEntry) => {
    setEntries(prev => (prev.some(e => sameEntry(e, entry)) ? prev.filter(e => !sameEntry(e, entry)) : [...prev, entry]))
  }, [setEntries])

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
