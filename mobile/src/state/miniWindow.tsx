import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import PipTicker, { type TickerRow } from '../../modules/pip-ticker'
import { useAverages } from '../api/useAverages'
import { useMarket } from '../api/useMarket'
import { miniPayload, miniRows, type MiniSource } from '../lib/miniWindow'
import { usePicks } from '../lib/picks'
import { useFlips } from './flips'
import { useSettings } from './settings'
import { useSlots } from './slots'
import { useWatchlist } from './watchlist'

// The Picture in Picture mini window: a small live price ticker that floats
// over other apps (like the game). The rows are built here and handed to the
// native module, which also re-fetches prices on its own while the app is in
// the background, because the JS side may be suspended there.

interface MiniWindowContextValue {
  /** The native module is in this build (iOS); the preview can render. */
  available: boolean
  /** Picture in Picture itself works here (false on the Simulator). */
  supported: boolean
  active: boolean
  rows: TickerRow[]
  source: MiniSource
  setSource: (source: MiniSource) => void
  /** Call from a tap. Resolves to an error message, or null when it opened. */
  start: () => Promise<string | null>
  stop: () => void
  lastError: string | null
}

const MiniWindowContext = createContext<MiniWindowContextValue | null>(null)

const readableError = (error: unknown) => (error instanceof Error ? error.message : 'The mini window couldn\'t open.')

export function MiniWindowProvider ({ children }: { children: ReactNode }) {
  const { settings, update } = useSettings()
  const { market, updatedAt } = useMarket()
  const { h1, h24 } = useAverages()
  const source = settings.miniSource
  // Ranking every item is not free; only do it when Buy now is the source.
  const picks = usePicks(source === 'picks' ? market : null, h1, h24, 'quick')
  const { entries } = useWatchlist()
  const { holdings } = useFlips()
  const { slots } = useSlots()
  const [supported] = useState(() => PipTicker?.isSupported() ?? false)
  const [active, setActive] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)

  const rows = useMemo(
    () => miniRows(source, { market, h24, entries, picks, holdings, slots: slots.slots }),
    [source, market, h24, entries, picks, holdings, slots.slots]
  )

  useEffect(() => {
    if (!PipTicker || !supported) return
    const subs = [
      PipTicker.addListener('onStart', () => { setActive(true); setLastError(null) }),
      PipTicker.addListener('onStop', () => setActive(false)),
      PipTicker.addListener('onError', ({ message }) => setLastError(message))
    ]
    PipTicker.isActive().then(setActive).catch(() => setActive(false))
    return () => subs.forEach(s => s.remove())
  }, [supported])

  // Keep the native frame current; it also drives the in-app preview, which
  // renders even where PiP itself is unavailable (the iOS Simulator).
  useEffect(() => {
    if (!PipTicker) return
    PipTicker.update(miniPayload(source, rows, updatedAt)).catch(error => console.warn('[mini window] update failed', error))
  }, [source, rows, updatedAt])

  const autoStart = settings.miniAutoStart && rows.length > 0
  useEffect(() => {
    if (!PipTicker || !supported) return
    PipTicker.setAutoStart(autoStart).catch(error => console.warn('[mini window] auto-start failed', error))
  }, [supported, autoStart])

  const start = useCallback(async () => {
    if (!PipTicker || !supported) return 'Picture in Picture isn\'t available on this device.'
    try {
      await PipTicker.update(miniPayload(source, rows, updatedAt))
      await PipTicker.start()
      setLastError(null)
      return null
    } catch (error) {
      const message = readableError(error)
      setLastError(message)
      return message
    }
  }, [supported, source, rows, updatedAt])

  const stop = useCallback(() => {
    PipTicker?.stop().catch(error => console.warn('[mini window] stop failed', error))
  }, [])

  const setSource = useCallback((next: MiniSource) => update({ miniSource: next }), [update])

  const value = useMemo(
    () => ({ available: PipTicker !== null, supported, active, rows, source, setSource, start, stop, lastError }),
    [supported, active, rows, source, setSource, start, stop, lastError]
  )
  return <MiniWindowContext.Provider value={value}>{children}</MiniWindowContext.Provider>
}

export function useMiniWindow (): MiniWindowContextValue {
  const context = useContext(MiniWindowContext)
  if (!context) throw new Error('useMiniWindow must be used inside MiniWindowProvider')
  return context
}
