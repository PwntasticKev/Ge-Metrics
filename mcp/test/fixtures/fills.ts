// Flat hourly markets for the fill-aware tools, with optional one-off spikes.

import type { TimeseriesPoint } from '../../src/wiki/types.js'
import { NOW } from './market.js'

const HOUR = 3600

export interface FlatOptions {
  readonly low: number
  readonly high: number
  /** Items per hour on each side. */
  readonly volume?: number
  readonly hours?: number
  /** Hour indexes (0 = oldest) whose high side spikes to `spikeHigh` on `spikeVolume` trades. */
  readonly spikeHours?: readonly number[]
  readonly spikeHigh?: number
  readonly spikeVolume?: number
}

export function flatSeries ({ low, high, volume = 100, hours = 24, spikeHours = [], spikeHigh = high, spikeVolume = volume }: FlatOptions): TimeseriesPoint[] {
  return Array.from({ length: hours }, (_, i) => {
    const spiked = spikeHours.includes(i)
    return {
      timestamp: NOW - (hours - i) * HOUR,
      avgLowPrice: low,
      avgHighPrice: spiked ? spikeHigh : high,
      lowPriceVolume: volume,
      highPriceVolume: spiked ? spikeVolume : volume
    }
  })
}
