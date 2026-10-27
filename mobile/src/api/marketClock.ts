import type { Market } from '@ge/engine'

type ClockEnvironment = {
  now: () => number
  isActive: () => boolean
  start: (tick: () => void) => () => void
  listen: (resync: () => void) => () => void
}

// A dedicated, subscriber-owned clock: no timer or native listener without a
// mounted market consumer. The environment keeps this lifecycle testable in Node.
export function createMarketClock (environment: ClockEnvironment) {
  const subscribers = new Set<() => void>()
  let snapshot = Math.floor(environment.now() / 1000)
  let stopTimer: (() => void) | undefined
  let stopListening: (() => void) | undefined
  const read = () => Math.floor(environment.now() / 1000)
  const tick = () => {
    const next = read()
    if (next === snapshot) return
    snapshot = next
    subscribers.forEach(notify => notify())
  }
  const resync = () => {
    if (environment.isActive()) {
      tick()
      stopTimer ??= environment.start(tick)
    } else {
      stopTimer?.()
      stopTimer = undefined
    }
  }
  return {
    // Reading wall time before subscribing also handles a cold cache restore.
    getSnapshot: () => subscribers.size ? snapshot : read(),
    subscribe: (notify: () => void) => {
      subscribers.add(notify)
      if (subscribers.size === 1) {
        stopListening = environment.listen(resync)
        resync()
      }
      return () => {
        subscribers.delete(notify)
        if (subscribers.size) return
        stopTimer?.()
        stopListening?.()
        stopTimer = undefined
        stopListening = undefined
      }
    }
  }
}

// Engine get/all close over observations only, not nowSec. Share those lookups
// while changing market identity so memoized rankings recompute at each tick.
export function withMarketTime (base: Market, nowSec: number): Market {
  return Object.freeze({ nowSec, get: base.get, all: base.all })
}
