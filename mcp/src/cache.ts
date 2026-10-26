// Tiny in-memory TTL cache with in-flight de-duplication: concurrent callers
// asking for the same key share one fetch. Failed fetches are not cached.

interface Entry<T> {
  readonly value: Promise<T>
  readonly expiresAt: number
}

export interface CacheOptions {
  readonly maxEntries?: number
  readonly now?: () => number
}

export class TtlCache {
  private readonly entries = new Map<string, Entry<unknown>>()
  private readonly maxEntries: number
  private readonly now: () => number

  constructor ({ maxEntries = 500, now = Date.now }: CacheOptions = {}) {
    this.maxEntries = maxEntries
    this.now = now
  }

  get<T> (key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
    const hit = this.entries.get(key)
    if (hit && hit.expiresAt > this.now()) return hit.value as Promise<T>

    const value = load()
    this.entries.delete(key)
    this.entries.set(key, { value, expiresAt: this.now() + ttlMs })
    value.catch(() => {
      if (this.entries.get(key)?.value === value) this.entries.delete(key)
    })
    this.evict()
    return value
  }

  clear (): void {
    this.entries.clear()
  }

  get size (): number {
    return this.entries.size
  }

  // Map keeps insertion order, so the first key is the oldest write.
  private evict (): void {
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value
      if (oldest === undefined) return
      this.entries.delete(oldest)
    }
  }
}
