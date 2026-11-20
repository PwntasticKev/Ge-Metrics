import { useCallback, useState } from 'react'

// Optional cash stack (gp) used to cap 4h quantities to what you can afford.
// Remembered per browser; null means "no limit".
const STORAGE_KEY = 'geMetrics.budget.v1'

function readBudget () {
  try {
    const value = Number(window.localStorage.getItem(STORAGE_KEY))
    return Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

export function useBudget () {
  const [budget, setBudgetState] = useState(readBudget)
  const setBudget = useCallback(value => {
    const next = Number.isFinite(value) && value > 0 ? Math.floor(value) : null
    setBudgetState(next)
    try {
      if (next === null) window.localStorage.removeItem(STORAGE_KEY)
      else window.localStorage.setItem(STORAGE_KEY, String(next))
    } catch {
      // Storage blocked: the budget still applies for this visit.
    }
  }, [])
  return [budget, setBudget]
}
