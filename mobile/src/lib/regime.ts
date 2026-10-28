// Market regime for Buy now's quick lists (Next 4 hours and Plan): trade,
// caution (half size) or stand aside. Ported from the MCP's live rules
// (mcp/src/analysis/regime/gates.ts, LIVE_REGIME_RULES in tools/regime.ts):
//   - stand aside from 1 day before to 7 days after a big game release;
//   - half size when the scanner's market breadth reads risk-off.
// Evidence (mcp/reports/regime-gates.md, PR #48): over three 60-day
// out-of-sample periods the quick list went 54.5M -> 68.7M, -7.0M -> +4.5M
// and -30.4M -> -9.2M with the gate, and max drawdown fell sharply.
// Overnight and Dips are not gated: every gate cost them money. Pure.
import type { Mood } from './breadth.ts'
import type { GameUpdate } from './gameUpdates.ts'
import { pickFromOffer, type OfferPick } from './pickFill.ts'

export type RegimeState = 'trade' | 'caution' | 'stand-aside'

const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000

/** Big releases: launch posts, "out today", seasonal events. Same as MAJOR_UPDATE_TITLE in the MCP. */
export const MAJOR_UPDATE_TITLE = /\b(out today|launch(?:es|ed)?|live today|is out|release[sd]?|christmas|halloween|easter|birthday|deadman|leagues? [ivx]+:)/i
/** Updates count as live at 12:00 UTC on the post date, so a post is never read before it went out. */
export const UPDATE_LIVE_HOUR_UTC = 12
export const STAND_ASIDE_BEFORE_DAYS = 1
export const STAND_ASIDE_AFTER_DAYS = 7
export const RISK_OFF_SIZE = 0.5
/** Buy now lists the regime applies to. */
export const GATED_MODES: readonly string[] = ['quick', 'plan']

export interface Release {
  /** Post title as published. */
  title: string
  /** Post date, midnight UTC, in ms. */
  date: number
  /** When the release counts as live, in ms. */
  at: number
}

/** An announced release that isn't in the update feed yet (date: midnight UTC, ms). */
export interface UpcomingRelease {
  title: string
  date: number
}

export interface RegimeReason {
  kind: 'release' | 'risk-off'
  text: string
}

export interface Regime {
  state: RegimeState
  /** Multiplier for new quick positions: 1 full, 0.5 half, 0 none. */
  size: number
  /** Size to use if the trader shows the picks anyway (the other rules still apply). */
  sizeIfShown: number
  reasons: RegimeReason[]
  /** The release behind a stand aside, if any. */
  release: Release | null
}

export interface RegimeInput {
  now: number
  mood: Mood | null
  updates: readonly GameUpdate[]
  upcoming?: readonly UpcomingRelease[]
  /** Settings: pause quick flips around big updates. */
  updateGate: boolean
}

export const TRADE: Regime = Object.freeze({ state: 'trade', size: 1, sizeIfShown: 1, reasons: [], release: null })

export function liveAt (date: number): number {
  return date + UPDATE_LIVE_HOUR_UTC * HOUR_MS
}

/** Game updates whose title reads like a big release, plus announced ones; oldest first. */
export function bigReleases (updates: readonly GameUpdate[], upcoming: readonly UpcomingRelease[] = []): Release[] {
  const published = updates
    .filter(u => u.kind === 'game' && MAJOR_UPDATE_TITLE.test(u.title))
    .map(u => ({ title: u.title, date: u.date }))
  return [...published, ...upcoming]
    .filter(u => Number.isFinite(u.date))
    .map(u => ({ title: u.title, date: u.date, at: liveAt(u.date) }))
    .sort((a, b) => a.at - b.at)
}

/** The big release whose window [live - 1 day, live + 7 days) holds `now`, nearest first. */
export function releaseInWindow (releases: readonly Release[], now: number): Release | null {
  const near = releases
    .filter(r => now >= r.at - STAND_ASIDE_BEFORE_DAYS * DAY_MS && now < r.at + STAND_ASIDE_AFTER_DAYS * DAY_MS)
    .sort((a, b) => Math.abs(a.at - now) - Math.abs(b.at - now))
  return near[0] ?? null
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "20 Oct" for a midnight-UTC date. */
export function shortDate (date: number): string {
  const d = new Date(date)
  return `${d.getUTCDate()} ${SHORT_MONTHS[d.getUTCMonth()]}`
}

/** "The Fractured Archive - Out Today" -> "The Fractured Archive". */
export function releaseName (title: string): string {
  const name = title.replace(/\s*[-–:]\s*(out (today|now)|live (today|now)|is out( now)?|released?|launch(es)? today)!*\s*$/i, '').trim()
  return name || title
}

export function standAsideText (release: Release, now: number): string {
  const name = releaseName(release.title)
  const when = release.at > now ? `releases ${shortDate(release.date)}` : `released ${shortDate(release.date)}`
  return `Stand aside: ${name} ${when}. Quick flips lost money in the week after big releases. Overnight and Dips are still listed.`
}

export const RISK_OFF_TEXT = 'Market is risk-off: quick amounts are halved. Quick flips lose more often in risk-off markets.'

/** Stand aside beats caution; caution beats trade. */
export function decideRegime (input: RegimeInput): Regime {
  const release = input.updateGate ? releaseInWindow(bigReleases(input.updates, input.upcoming), input.now) : null
  const riskOff = input.mood === 'risk-off'
  const reasons: RegimeReason[] = [
    ...(release ? [{ kind: 'release' as const, text: standAsideText(release, input.now) }] : []),
    ...(riskOff ? [{ kind: 'risk-off' as const, text: RISK_OFF_TEXT }] : [])
  ]
  const sizeIfShown = riskOff ? RISK_OFF_SIZE : 1
  const size = release ? 0 : sizeIfShown
  const state: RegimeState = size <= 0 ? 'stand-aside' : size < 1 ? 'caution' : 'trade'
  return { state, size, sizeIfShown, reasons, release }
}

/** The regime for a Buy now list: Overnight and Dips always trade. */
export function regimeForMode (regime: Regime, mode: string): Regime {
  return GATED_MODES.includes(mode) ? regime : TRADE
}

/** Amount for a size multiplier: floor, at least 1. */
export function scaledQty (qty: number, size: number): number {
  return Math.max(1, Math.floor(qty * size))
}

/** Picks with every amount (and its profit and cost) scaled by `size`. Size 1 returns the same list. */
export function resizePicks (picks: readonly OfferPick[], size: number): readonly OfferPick[] {
  if (size >= 1 || size <= 0) return picks
  return picks.map(p => pickFromOffer(p, p.offer, scaledQty(p.maxQty, size)))
}
