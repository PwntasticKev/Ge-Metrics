import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { BUY_LIMIT_WINDOW_MS, cancelReminder, scheduleLimitReminder } from '../lib/reminders'
import { usePersistentState } from './usePersistentState'

// Items you've actually bought and are holding to sell, kept on the device.
export interface Holding {
  id: string
  itemId: number
  name: string
  icon: string | null
  qty: number
  buyPrice: number
  boughtAt: number
  /** Start of the buy-limit window this purchase counts against. */
  windowStart: number
  reminderId: string | null
}

// Sold holdings, kept so the Bought tab can show what you've made.
export interface Sale {
  itemId: number
  name: string
  qty: number
  profit: number
  soldAt: number
}

interface FlipsState {
  holdings: Holding[]
  sales: Sale[]
}

const KEY = 'gem.flips.v1'
const MAX_SALES = 200
const EMPTY: FlipsState = { holdings: [], sales: [] }

const isPositiveInt = (v: unknown): v is number => Number.isInteger(v) && (v as number) > 0
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

function toHolding (v: unknown): Holding | null {
  if (!isObject(v) || typeof v.id !== 'string' || !isPositiveInt(v.itemId) || typeof v.name !== 'string' ||
    !isPositiveInt(v.qty) || !isPositiveInt(v.buyPrice) || typeof v.boughtAt !== 'number') return null
  return {
    id: v.id,
    itemId: v.itemId,
    name: v.name,
    icon: typeof v.icon === 'string' ? v.icon : null,
    qty: v.qty,
    buyPrice: v.buyPrice,
    boughtAt: v.boughtAt,
    windowStart: typeof v.windowStart === 'number' ? v.windowStart : v.boughtAt,
    reminderId: typeof v.reminderId === 'string' ? v.reminderId : null
  }
}

function toSale (v: unknown): Sale | null {
  if (!isObject(v) || !isPositiveInt(v.itemId) || typeof v.name !== 'string' || !isPositiveInt(v.qty) ||
    typeof v.profit !== 'number' || !Number.isFinite(v.profit) || typeof v.soldAt !== 'number') return null
  return { itemId: v.itemId, name: v.name, qty: v.qty, profit: v.profit, soldAt: v.soldAt }
}

// Keeps every valid record; one bad entry doesn't wipe the rest.
function parseFlips (raw: unknown): FlipsState {
  if (!isObject(raw)) return EMPTY
  const list = <T,>(v: unknown, to: (x: unknown) => T | null) => (Array.isArray(v) ? v.map(to).filter((x): x is T => x !== null) : [])
  return { holdings: list(raw.holdings, toHolding), sales: list(raw.sales, toSale) }
}

const mergeFlips = (saved: FlipsState, early: FlipsState): FlipsState => ({
  holdings: [...early.holdings, ...saved.holdings],
  sales: [...early.sales, ...saved.sales].slice(0, MAX_SALES)
})

export interface NewHolding {
  itemId: number
  name: string
  icon: string | null
  qty: number
  buyPrice: number
}

interface FlipsContextValue extends FlipsState {
  /** Resolves true when a buy-limit reminder was scheduled. */
  addHolding: (holding: NewHolding) => Promise<boolean>
  sellHolding: (id: string, sellPrice: number, tax: number) => void
  removeHolding: (id: string) => void
}

const FlipsContext = createContext<FlipsContextValue | null>(null)

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export function FlipsProvider ({ children }: { children: ReactNode }) {
  const [state, setState] = usePersistentState<FlipsState>(KEY, EMPTY, parseFlips, mergeFlips)
  const stateRef = useRef(state)
  useLayoutEffect(() => { stateRef.current = state }, [state])

  const addHolding = useCallback(async (input: NewHolding) => {
    const boughtAt = Date.now()
    // The limit resets 4h after the first buy in a window, not the latest one.
    const open = stateRef.current.holdings.find(h => h.itemId === input.itemId && h.windowStart + BUY_LIMIT_WINDOW_MS > boughtAt)
    const windowStart = open?.windowStart ?? boughtAt
    const reminderId = open ? null : await scheduleLimitReminder(input.name, windowStart)
    const holding: Holding = { ...input, id: newId(), boughtAt, windowStart, reminderId }
    setState(prev => ({ ...prev, holdings: [holding, ...prev.holdings] }))
    return Boolean(open?.reminderId ?? reminderId)
  }, [setState])

  const sellHolding = useCallback((id: string, sellPrice: number, tax: number) => {
    const holding = stateRef.current.holdings.find(h => h.id === id)
    if (!holding) return
    cancelReminder(holding.reminderId)
    const sale: Sale = { itemId: holding.itemId, name: holding.name, qty: holding.qty, profit: (sellPrice - tax - holding.buyPrice) * holding.qty, soldAt: Date.now() }
    setState(prev => ({ holdings: prev.holdings.filter(h => h.id !== id), sales: [sale, ...prev.sales].slice(0, MAX_SALES) }))
  }, [setState])

  const removeHolding = useCallback((id: string) => {
    cancelReminder(stateRef.current.holdings.find(h => h.id === id)?.reminderId ?? null)
    setState(prev => ({ ...prev, holdings: prev.holdings.filter(h => h.id !== id) }))
  }, [setState])

  const value = useMemo(() => ({ ...state, addHolding, sellHolding, removeHolding }), [state, addHolding, sellHolding, removeHolding])
  return <FlipsContext.Provider value={value}>{children}</FlipsContext.Provider>
}

export function useFlips (): FlipsContextValue {
  const context = useContext(FlipsContext)
  if (!context) throw new Error('useFlips must be used inside FlipsProvider')
  return context
}
