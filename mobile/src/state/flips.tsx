import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { cancelReminder, scheduleLimitReminder } from '../lib/reminders'
import { loadJson, saveJson } from './storage'

// Items you've actually bought and are holding to sell, kept on the device.
export interface Holding {
  id: string
  itemId: number
  name: string
  icon: string | null
  qty: number
  buyPrice: number
  boughtAt: number
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

function isHolding (v: unknown): v is Holding {
  return isObject(v) && typeof v.id === 'string' && isPositiveInt(v.itemId) && typeof v.name === 'string' &&
    isPositiveInt(v.qty) && isPositiveInt(v.buyPrice) && typeof v.boughtAt === 'number'
}

function isSale (v: unknown): v is Sale {
  return isObject(v) && isPositiveInt(v.itemId) && typeof v.name === 'string' && isPositiveInt(v.qty) &&
    typeof v.profit === 'number' && typeof v.soldAt === 'number'
}

function isFlipsState (v: unknown): v is FlipsState {
  return isObject(v) && Array.isArray(v.holdings) && v.holdings.every(isHolding) && Array.isArray(v.sales) && v.sales.every(isSale)
}

export interface NewHolding {
  itemId: number
  name: string
  icon: string | null
  qty: number
  buyPrice: number
}

interface FlipsContextValue extends FlipsState {
  addHolding: (holding: NewHolding) => Promise<void>
  sellHolding: (id: string, sellPrice: number, tax: number) => void
  removeHolding: (id: string) => void
}

const FlipsContext = createContext<FlipsContextValue | null>(null)

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export function FlipsProvider ({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FlipsState>(EMPTY)

  useEffect(() => {
    loadJson<FlipsState>(KEY, EMPTY, isFlipsState).then(setState)
  }, [])

  const commit = useCallback((change: (prev: FlipsState) => FlipsState) => {
    setState(prev => {
      const next = change(prev)
      saveJson(KEY, next)
      return next
    })
  }, [])

  const addHolding = useCallback(async (input: NewHolding) => {
    const boughtAt = Date.now()
    const reminderId = await scheduleLimitReminder(input.name, input.qty, boughtAt)
    const holding: Holding = { ...input, id: newId(), boughtAt, reminderId }
    commit(prev => ({ ...prev, holdings: [holding, ...prev.holdings] }))
  }, [commit])

  const sellHolding = useCallback((id: string, sellPrice: number, tax: number) => {
    cancelReminder(state.holdings.find(h => h.id === id)?.reminderId ?? null)
    commit(prev => {
      const holding = prev.holdings.find(h => h.id === id)
      if (!holding) return prev
      const sale: Sale = { itemId: holding.itemId, name: holding.name, qty: holding.qty, profit: (sellPrice - tax - holding.buyPrice) * holding.qty, soldAt: Date.now() }
      return { holdings: prev.holdings.filter(h => h.id !== id), sales: [sale, ...prev.sales].slice(0, MAX_SALES) }
    })
  }, [state.holdings, commit])

  const removeHolding = useCallback((id: string) => {
    cancelReminder(state.holdings.find(h => h.id === id)?.reminderId ?? null)
    commit(prev => ({ ...prev, holdings: prev.holdings.filter(h => h.id !== id) }))
  }, [state.holdings, commit])

  const value = useMemo(() => ({ ...state, addHolding, sellHolding, removeHolding }), [state, addHolding, sellHolding, removeHolding])
  return <FlipsContext.Provider value={value}>{children}</FlipsContext.Provider>
}

export function useFlips (): FlipsContextValue {
  const context = useContext(FlipsContext)
  if (!context) throw new Error('useFlips must be used inside FlipsProvider')
  return context
}
