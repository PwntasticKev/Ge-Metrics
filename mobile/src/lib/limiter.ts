// Runs async jobs at most `concurrency` at a time, starting each at least
// `gapMs` after the previous start. Keeps per-item history requests for a
// top-N list polite to the wiki. No imports.

export type Limiter = <T>(job: () => Promise<T>) => Promise<T>

export function createLimiter (concurrency: number, gapMs: number, sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))): Limiter {
  if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error('concurrency must be a positive integer')
  let active = 0
  let lastStart = -Infinity
  const waiting: (() => void)[] = []

  // A finished job hands its slot straight to the next waiter, so a new
  // caller can't slip in between and exceed the limit.
  const release = () => {
    const next = waiting.shift()
    if (next) next()
    else active--
  }

  const acquire = async () => {
    if (active >= concurrency) await new Promise<void>(resolve => waiting.push(resolve))
    else active++
    const wait = lastStart + gapMs - Date.now()
    lastStart = Date.now() + Math.max(0, wait)
    if (wait > 0) await sleep(wait)
  }

  return async job => {
    await acquire()
    try {
      return await job()
    } finally {
      release()
    }
  }
}
