// Chart markers for game updates / news posts, grouped into the filter
// chips shown on the charts.

import { mentionsItem } from '../gameUpdates/filters.js'
import { priceChangeAfter } from './series.js'

const DAY = 24 * 60 * 60

// Order = chip order. `defaultOn` keeps busy ranges readable (1Y has ~170
// posts, most of them community/website news).
export const MARKER_GROUPS = Object.freeze([
  { key: 'game', label: 'Game updates', color: '#f59e0b', defaultOn: true },
  { key: 'devblog', label: 'Dev blogs', color: '#3b82f6', defaultOn: true },
  { key: 'future', label: 'Upcoming', color: '#a78bfa', defaultOn: true },
  { key: 'community', label: 'Community', color: '#10b981', defaultOn: false },
  { key: 'website', label: 'Website', color: '#94a3b8', defaultOn: false }
])

const GROUP_BY_KEY = new Map(MARKER_GROUPS.map(group => [group.key, group]))

// Wiki news categories -> chip group. Anything unknown is website news.
const CATEGORY_GROUP = {
  game: 'game',
  devblog: 'devblog',
  bts: 'devblog',
  future: 'future',
  community: 'community',
  events: 'community',
  competitions: 'community',
  yourfeedback: 'community',
  forum: 'community',
  website: 'website',
  technical: 'website',
  support: 'website',
  mobile: 'website'
}

export const DEFAULT_MARKER_FILTER = Object.freeze(
  MARKER_GROUPS.filter(group => group.defaultOn).map(group => group.key)
)

export function markerGroupKey (category, fallbackType) {
  const key = typeof category === 'string' ? category.toLowerCase().replace(/[^a-z]/g, '') : ''
  if (CATEGORY_GROUP[key]) return CATEGORY_GROUP[key]
  if (key.includes('blog')) return 'devblog'
  if (!key) return fallbackType === 'blog' ? 'devblog' : 'game'
  return 'website'
}

export function markerGroup (key) {
  return GROUP_BY_KEY.get(key) ?? GROUP_BY_KEY.get('website')
}

// Only http(s) links are rendered (the dataset comes from editable wiki pages).
export function safeUrl (value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim()) ? value.trim() : null
}

// "2026-10-20" or Date -> unix seconds at 00:00 UTC.
function toUnixSec (value) {
  if (!value) return null
  const ms = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? Date.parse(`${value}T00:00:00Z`)
    : new Date(value).getTime()
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : null
}

// { blogs, updates } from useGameEvents -> sorted, de-duplicated markers.
export function toMarkers ({ blogs = [], updates = [] } = {}, itemId) {
  const raw = [
    ...blogs.map(event => ({ event, type: 'blog' })),
    ...updates.map(event => ({ event, type: 'update' }))
  ]
  const seen = new Set()
  const markers = []
  for (const { event, type } of raw) {
    const time = toUnixSec(event?.updateDate ?? event?.date)
    if (time == null) continue
    const title = event.title || (type === 'blog' ? 'Developer Blog' : 'Game Update')
    const id = `${time}|${title}`
    if (seen.has(id)) continue
    seen.add(id)
    const group = markerGroupKey(event.category, type)
    markers.push({
      id,
      time,
      title,
      category: event.category ?? null,
      group,
      color: markerGroup(group).color,
      url: safeUrl(event.url) ?? safeUrl(event.wikiUrl),
      wikiUrl: safeUrl(event.wikiUrl),
      mentionsItem: mentionsItem(event, itemId)
    })
  }
  return markers.sort((a, b) => a.time - b.time || a.title.localeCompare(b.title))
}

export function filterMarkers (markers, enabledGroups, from, to) {
  const enabled = new Set(enabledGroups)
  const lo = from ?? -Infinity
  const hi = to ?? Infinity
  return (markers ?? []).filter(m => enabled.has(m.group) && m.time >= lo && m.time <= hi)
}

// Draw order: item mentions last so they sit on top.
export function mentionsLast (markers) {
  return [...(markers ?? []).filter(m => !m.mentionsItem), ...(markers ?? []).filter(m => m.mentionsItem)]
}

export function toggleGroup (enabledGroups, key) {
  return enabledGroups.includes(key)
    ? enabledGroups.filter(k => k !== key)
    : MARKER_GROUPS.map(g => g.key).filter(k => k === key || enabledGroups.includes(k))
}

// 24h and 7d moves after the post, from the charted series.
export function markerImpact (marker, points) {
  if (!marker) return { day: null, week: null }
  return {
    day: priceChangeAfter(points, marker.time, DAY),
    week: priceChangeAfter(points, marker.time, 7 * DAY)
  }
}

// Markers whose day matches the given point within `tolerance` seconds.
export function markersNear (markers, ts, tolerance) {
  return (markers ?? []).filter(m => Math.abs(m.time - ts) <= tolerance)
}

// Snaps markers to the nearest series timestamp (sorted `times`) and groups
// posts landing on the same bar. Markers outside the series span are dropped.
// Keeps every group that mentions the item, then the latest others, up to
// `maxGroups`. Within a group, item mentions come first.
export function groupMarkersByTime (markers, times, maxGroups = Infinity) {
  if (!times?.length) return []
  const first = times[0]
  const last = times[times.length - 1]
  const byTime = new Map()
  for (const marker of markers ?? []) {
    if (marker.time < first || marker.time > last) continue
    const time = nearestTime(times, marker.time)
    byTime.set(time, [...(byTime.get(time) ?? []), marker])
  }
  const groups = [...byTime.entries()]
    .sort(([a], [b]) => a - b)
    .map(([time, list]) => ({ time, markers: [...list].sort((a, b) => Number(b.mentionsItem) - Number(a.mentionsItem)) }))
  if (groups.length <= maxGroups) return groups
  const mentioning = groups.filter(g => g.markers.some(m => m.mentionsItem))
  const others = groups.filter(g => !g.markers.some(m => m.mentionsItem))
  const slots = Math.max(0, maxGroups - mentioning.length)
  return [...mentioning, ...(slots > 0 ? others.slice(-slots) : [])].sort((a, b) => a.time - b.time)
}

function nearestTime (times, target) {
  let lo = 0
  let hi = times.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (times[mid] < target) lo = mid + 1
    else hi = mid
  }
  const before = times[lo - 1]
  return before != null && target - before <= times[lo] - target ? before : times[lo]
}
