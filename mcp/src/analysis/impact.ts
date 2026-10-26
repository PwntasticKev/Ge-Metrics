// Price and volume before vs after a dated event (a game update).

import { TIMESTEPS, TIMESTEP_SECONDS, type Timestep, type TimeseriesPoint } from '../wiki/types.js'
import { change, isoTime, mid, round } from './format.js'
import { ToolInputError } from './resolve.js'

// /timeseries returns up to 365 points per timestep.
export const TIMESERIES_POINTS = 365
const DAY = 86_400

export function coverageSec (timestep: Timestep): number {
  return TIMESERIES_POINTS * TIMESTEP_SECONDS[timestep]
}

// Finest timestep whose history still reaches back to the start of the
// "before" window, so windows get as many points as possible.
export function pickTimestep (eventSec: number, nowSec: number, windowDays: number): Timestep {
  const needed = nowSec - (eventSec - windowDays * DAY)
  const step = TIMESTEPS.find(t => coverageSec(t) >= needed)
  if (!step) throw new ToolInputError('That update is older than the price history the wiki serves (about one year).')
  return step
}

interface WindowStats {
  readonly from: string | null
  readonly to: string | null
  readonly points: number
  readonly avgPrice: number | null
  readonly avgVolumePerDay: number | null
}

function windowStats (points: readonly TimeseriesPoint[], stepSec: number): WindowStats {
  const mids = points.map(p => mid(p.avgHighPrice, p.avgLowPrice)).filter((v): v is number => v !== null)
  const volume = points.reduce((s, p) => s + p.highPriceVolume + p.lowPriceVolume, 0)
  const days = (points.length * stepSec) / DAY
  return {
    from: isoTime(points[0]?.timestamp ?? null),
    to: isoTime(points.at(-1)?.timestamp ?? null),
    points: points.length,
    avgPrice: mids.length ? Math.round(mids.reduce((s, v) => s + v, 0) / mids.length) : null,
    avgVolumePerDay: days > 0 ? round(volume / days, 1) : null
  }
}

export interface ImpactInput {
  readonly points: readonly TimeseriesPoint[]
  readonly timestep: Timestep
  readonly eventSec: number
  readonly windowDays: number
  readonly nowSec: number
}

export function updateImpact ({ points, timestep, eventSec, windowDays, nowSec }: ImpactInput) {
  const span = windowDays * DAY
  const before = points.filter(p => p.timestamp >= eventSec - span && p.timestamp < eventSec)
  const after = points.filter(p => p.timestamp >= eventSec && p.timestamp < eventSec + span)
  const stepSec = TIMESTEP_SECONDS[timestep]
  const b = windowStats(before, stepSec)
  const a = windowStats(after, stepSec)
  const latest = points.at(-1)
  const latestPrice = latest ? mid(latest.avgHighPrice, latest.avgLowPrice) : null

  return {
    timestep,
    windowDays,
    before: b,
    after: a,
    afterWindowComplete: eventSec + span <= nowSec,
    priceChangePct: change(b.avgPrice, a.avgPrice),
    volumeChangePct: change(b.avgVolumePerDay, a.avgVolumePerDay),
    latestPrice: latestPrice === null ? null : Math.round(latestPrice),
    sinceUpdatePct: change(b.avgPrice, latestPrice)
  }
}
