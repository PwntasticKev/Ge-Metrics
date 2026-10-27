// Scores the upcoming-releases feed against what actually shipped: replay the
// feed as it would have been generated each morning, then ask, for every big
// release, whether the feed generated the day before had it on the right day
// (that is when the regime gate's 1-day-before window has to start).

import { addDays, daysBetween } from './releaseDates.js'
import { titlesMatch } from './releaseTitles.js'

/** Search radius for the "nearest forecast" used for the error in days. */
const NEAR_DAYS = 7

const median = values => {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const ratio = (part, whole) => (whole === 0 ? null : part / whole)
const within = (a, b, days) => Math.abs(daysBetween(a, b)) <= days

// The forecast for this release in a snapshot: same name first, else the nearest big one.
function forecastFor (release, upcoming) {
  const named = upcoming.filter(e => titlesMatch(e.title, release.title))
  const pool = named.length ? named : upcoming.filter(e => e.big && within(e.expectedDate, release.date, NEAR_DAYS))
  return [...pool].sort((a, b) => Math.abs(daysBetween(a.expectedDate, release.date)) - Math.abs(daysBetween(b.expectedDate, release.date)))[0] ?? null
}

function scoreRelease (release, snapshots, toleranceDays) {
  const dayBefore = snapshots.get(addDays(release.date, -1)) ?? []
  const caught = dayBefore.some(e => e.big && within(e.expectedDate, release.date, toleranceDays))
  const listed = dayBefore.some(e => within(e.expectedDate, release.date, toleranceDays))
  const forecast = forecastFor(release, dayBefore)
  const firstDay = [...snapshots.keys()].sort()
    .find(day => day < release.date && (snapshots.get(day) ?? []).some(e => e.big && within(e.expectedDate, release.date, toleranceDays)))
  return {
    date: release.date,
    title: release.title,
    caught,
    listed,
    forecast: forecast ? { title: forecast.title, expectedDate: forecast.expectedDate, confidence: forecast.confidence, big: forecast.big } : null,
    errorDays: forecast ? Math.abs(daysBetween(forecast.expectedDate, release.date)) : null,
    leadDays: firstDay ? daysBetween(firstDay, release.date) : null
  }
}

/**
 * snapshots: Map(day -> upcoming entries as generated that morning)
 * releases: [{ date, title }] big releases that shipped (the gate's ground truth)
 * window: { from, to } dates; forecasts dated outside it are not scored
 */
export function scoreUpcomingForecasts ({ snapshots, releases, window, toleranceDays = 1 }) {
  const inWindow = date => date >= window.from && date <= window.to
  const scored = releases.filter(r => inWindow(r.date)).map(r => scoreRelease(r, snapshots, toleranceDays))
  const forecasts = new Map()
  for (const upcoming of snapshots.values()) {
    for (const e of upcoming) {
      if (e.big && inWindow(e.expectedDate)) forecasts.set(`${e.title}|${e.expectedDate}`, e)
    }
  }
  const unique = [...forecasts.values()]
  const correct = unique.filter(e => releases.some(r => within(r.date, e.expectedDate, toleranceDays)))
  const errors = scored.map(r => r.errorDays).filter(d => d !== null)
  return {
    toleranceDays,
    releases: scored.length,
    caught: scored.filter(r => r.caught).length,
    recall: ratio(scored.filter(r => r.caught).length, scored.length),
    recallAnyEntry: ratio(scored.filter(r => r.listed).length, scored.length),
    forecasts: unique.length,
    precision: ratio(correct.length, unique.length),
    medianErrorDays: median(errors),
    forecastsWithError: errors.length,
    medianLeadDays: median(scored.map(r => r.leadDays).filter(d => d !== null)),
    perRelease: scored,
    falsePositives: unique.filter(e => !correct.includes(e)).map(e => ({ title: e.title, expectedDate: e.expectedDate, sourcePost: e.sourcePost }))
  }
}
