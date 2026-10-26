import type { ComingSource } from '../updates/coming.js'
import type { UpdateSource } from '../updates/source.js'
import type { PriceSource } from '../wiki/prices.js'

export interface ToolDeps {
  readonly prices: PriceSource
  readonly updates: UpdateSource
  readonly coming: ComingSource
  readonly now: () => number // unix seconds
}
