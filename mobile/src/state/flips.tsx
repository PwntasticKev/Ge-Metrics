import { geTax } from '@ge/engine'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { mergeJournal, parseJournal, realize, MAX_FLIPS, type Flip, type Journal, type Lot, type MergeResult } from '../lib/pnl/journal'
import { BUY_LIMIT_WINDOW_MS, cancelReminder, scheduleLimitReminder } from '../lib/reminders'
import { usePersistentState } from './usePersistentState'

// The flip journal, kept on the device: what you bought and still hold
// (lots, shown on the Bought tab) and every completed flip (Profit tab).
// Stored under the original key; `parseJournal` migrates the version 1
// shape (`holdings` + price-less `sales`) on load.
export type Holding = Lot
export type { Flip }

const KEY = 'gem.flips.v1'
const EMPTY: Journal = { lots: [], flips: [] }

const mergeEarly = (saved: Journal, early: Journal): Journal => mergeJournal(saved, early).journal

export interface NewHolding {
  itemId: number
  name: string
  icon: string | null
  qty: number
  buyPrice: number
}

interface FlipsContextValue {
  holdings: Lot[]
  /** Completed flips, newest first. */
  flips: Flip[]
  /** Resolves true when a buy-limit reminder was scheduled. */
  addHolding: (holding: NewHolding) => Promise<boolean>
  /** Sells `qty` (all of it by default) at `sellPrice` each. False on bad input. */
  sellHolding: (id: string, sellPrice: number, qty?: number) => boolean
  removeHolding: (id: string) => void
  removeFlip: (id: string) => void
  /** Adds records from a restore; ids already here are skipped. */
  importJournal: (journal: Journal) => MergeResult
}

const FlipsContext = createContext<FlipsContextValue | null>(null)

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export function FlipsProvider ({ children }: { children: ReactNode }) {
  const [state, setState] = usePersistentState<Journal>(KEY, EMPTY, parseJournal, mergeEarly)
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])

  const addHolding = useCallback(async (input: NewHolding) => {
    const boughtAt = Date.now()
    // The limit resets 4h after the first buy in a window, not the latest one.
    const open = stateRef.current.lots.find(h => h.itemId === input.itemId && h.windowStart + BUY_LIMIT_WINDOW_MS > boughtAt)
    const windowStart = open?.windowStart ?? boughtAt
    const reminderId = open ? null : await scheduleLimitReminder(input.name, windowStart)
    const lot: Lot = { ...input, id: newId(), boughtAt, windowStart, reminderId }
    setState(prev => ({ ...prev, lots: [lot, ...prev.lots] }))
    return Boolean(open?.reminderId ?? reminderId)
  }, [setState])

  const sellHolding = useCallback((id: string, sellPrice: number, qty?: number) => {
    const lot = stateRef.current.lots.find(h => h.id === id)
    const soldAt = Date.now()
    const flipId = newId()
    const check = lot ? realize(lot, sellPrice, qty ?? lot.qty, soldAt, geTax, flipId) : null
    if (!lot || !check) return false
    if (!check.remaining) cancelReminder(lot.reminderId)
    // Realized again from the latest state, so two quick sells can't both sell the same items.
    setState(prev => {
      const current = prev.lots.find(h => h.id === id)
      const result = current ? realize(current, sellPrice, qty ?? current.qty, soldAt, geTax, flipId) : null
      if (!result) return prev
      const { remaining } = result
      return {
        lots: remaining ? prev.lots.map(h => (h.id === id ? remaining : h)) : prev.lots.filter(h => h.id !== id),
        flips: [result.flip, ...prev.flips].slice(0, MAX_FLIPS)
      }
    })
    return true
  }, [setState])

  const removeHolding = useCallback((id: string) => {
    cancelReminder(stateRef.current.lots.find(h => h.id === id)?.reminderId ?? null)
    setState(prev => ({ ...prev, lots: prev.lots.filter(h => h.id !== id) }))
  }, [setState])

  const removeFlip = useCallback((id: string) => {
    setState(prev => ({ ...prev, flips: prev.flips.filter(f => f.id !== id) }))
  }, [setState])

  const importJournal = useCallback((journal: Journal) => {
    const result = mergeJournal(stateRef.current, journal)
    setState(prev => mergeJournal(prev, journal).journal)
    return result
  }, [setState])

  const value = useMemo(() => ({
    holdings: state.lots, flips: state.flips, addHolding, sellHolding, removeHolding, removeFlip, importJournal
  }), [state, addHolding, sellHolding, removeHolding, removeFlip, importJournal])
  return <FlipsContext.Provider value={value}>{children}</FlipsContext.Provider>
}

export function useFlips (): FlipsContextValue {
  const context = useContext(FlipsContext)
  if (!context) throw new Error('useFlips must be used inside FlipsProvider')
  return context
}
