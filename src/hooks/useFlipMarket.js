import { useMemo } from 'react'
import ItemData from '../utils/item-data.jsx'
import { createMarket } from '../domain/flipping/index.js'

// Live market for the flip calculators, rebuilt whenever ItemData refreshes
// (every 60s). Works in both static and backend modes.
export function useFlipMarket () {
  const { items, priceStatus, mapStatus } = ItemData()

  const market = useMemo(
    () => (items.length ? createMarket(items, { nowSec: Math.floor(Date.now() / 1000) }) : null),
    [items]
  )

  const refreshFailed = priceStatus === 'error' || mapStatus === 'error'
  // Keep showing the last good prices if a later refresh fails.
  const status = market ? 'success' : refreshFailed ? 'error' : 'loading'

  return { market, status, refreshFailed, updatedAt: market ? new Date(market.nowSec * 1000) : null }
}
