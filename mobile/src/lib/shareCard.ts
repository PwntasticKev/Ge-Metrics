// Words and numbers on a shared pick's image card. Pure.
import { duration, gpFull, qty as qtyText, signed, stripUncharged } from './format.ts'

/** One flip worth sharing: realistic (fill-aware) prices and a fill-sized amount. */
export interface SharePick {
  itemId: number
  name: string
  icon: string | null
  buyAt: number
  sellAt: number
  qty: number
  /** Margin per item after tax. */
  profitEach: number
  /** Hours to buy and then sell `qty`; null when unknown. */
  fillHours: number | null
  /** When the prices were read, ms since epoch. */
  at: number
}

export interface ShareCardText {
  name: string
  rows: readonly { label: string; value: string }[]
  /** Total profit after tax, signed. */
  profit: string
  profitEach: string
  fills: string
  stamp: string
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pad2 = (n: number) => String(n).padStart(2, '0')

/** "26 Oct 2026, 14:35" in local time. */
export function shareStamp (ms: number): string {
  const d = new Date(ms)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/** "~2.5h"; "–" when unknown or it rarely fills. */
export function fillsText (hours: number | null): string {
  return hours !== null && Number.isFinite(hours) && hours > 0 ? duration(hours) : '–'
}

/** True when a pick has the numbers a card needs. */
export function isSharable (pick: SharePick | null | undefined): pick is SharePick {
  return !!pick && pick.qty >= 1 && pick.buyAt > 0 && pick.sellAt > 0 && pick.name.trim().length > 0
}

export function shareCardText (pick: SharePick): ShareCardText {
  const name = stripUncharged(pick.name)
  const total = pick.profitEach * pick.qty
  const fills = fillsText(pick.fillHours)
  const stamp = shareStamp(pick.at)
  const rows = [
    { label: 'Buy at', value: gpFull(pick.buyAt) },
    { label: 'Sell at', value: gpFull(pick.sellAt) },
    { label: 'Quantity', value: qtyText(pick.qty) }
  ]
  return { name, rows, profit: signed(total), profitEach: `${signed(pick.profitEach)} each`, fills, stamp }
}

/** File name for the card's PNG: "ge-metrics-abyssal-whip.png". */
export function shareFileName (name: string): string {
  const slug = stripUncharged(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
  return `ge-metrics-${slug || 'pick'}.png`
}
