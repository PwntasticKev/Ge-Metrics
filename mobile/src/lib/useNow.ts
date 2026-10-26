import { useEffect, useState } from 'react'
import { AppState } from 'react-native'

// Wall-clock time that ticks every minute and when the app comes back to the
// foreground, independent of whether prices refreshed.
export function useNow (intervalMs = 60_000): number {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') setNow(Date.now())
    })
    return () => {
      clearInterval(timer)
      sub.remove()
    }
  }, [intervalMs])
  return now
}

export function startOfToday (now: number): number {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
