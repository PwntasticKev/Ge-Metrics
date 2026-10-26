import type { UpdateSource } from '../updates/source.js'
import type { PriceSource } from '../wiki/prices.js'

export interface ToolDeps {
  readonly prices: PriceSource
  readonly updates: UpdateSource
  readonly now: () => number // unix seconds
}
