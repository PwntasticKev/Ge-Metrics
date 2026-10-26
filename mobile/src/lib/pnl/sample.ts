// Realistic sample flips for screenshots and trying the Profit tab, only
// offered in builds made with EXPO_PUBLIC_SAMPLE_FLIPS=1. Deterministic.

import { realize, type Flip, type ItemTaxOf, type Journal, type Lot } from './journal.ts'

interface SampleItem { id: number, name: string, icon: string, price: number, qty: number, edge: number }

// edge: average margin per flip as a share of price; negative loses on average.
const ITEMS: readonly SampleItem[] = [
  { id: 4151, name: 'Abyssal whip', icon: 'Abyssal whip.png', price: 1_480_000, qty: 8, edge: 0.012 },
  { id: 536, name: 'Dragon bones', icon: 'Dragon bones.png', price: 2_350, qty: 3000, edge: 0.03 },
  { id: 2434, name: 'Prayer potion(4)', icon: 'Prayer potion(4).png', price: 9_100, qty: 1500, edge: 0.028 },
  { id: 13190, name: 'Old school bond', icon: 'Old school bond.png', price: 11_200_000, qty: 2, edge: 0.012 },
  { id: 11832, name: 'Bandos chestplate', icon: 'Bandos chestplate.png', price: 19_400_000, qty: 1, edge: -0.008 },
  { id: 12934, name: 'Zulrah\'s scales', icon: 'Zulrah\'s scales.png', price: 152, qty: 30_000, edge: 0.045 },
  { id: 11802, name: 'Armadyl godsword', icon: 'Armadyl godsword.png', price: 11_900_000, qty: 2, edge: 0.01 },
  { id: 561, name: 'Nature rune', icon: 'Nature rune.png', price: 98, qty: 18_000, edge: -0.015 }
]

const HOUR = 3_600_000

// Small seeded generator (mulberry32) so the sample is the same every time.
function rng (seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** `priceOf` swaps in today's price for an item so the sample matches the live market. */
export function sampleJournal (now: number, taxOf: ItemTaxOf, priceOf: (itemId: number) => number | null = () => null, days = 30): Journal {
  const rand = rng(7)
  const items = ITEMS.map(item => ({ ...item, price: priceOf(item.id) ?? item.price }))
  const flips: Flip[] = []
  for (let d = days - 1; d >= 0; d--) {
    const count = 1 + Math.floor(rand() * 5)
    for (let k = 0; k < count; k++) {
      const item = items[Math.floor(rand() * items.length)]
      // Today's flips are bought in the last few hours so they land today.
      const boughtAt = d === 0 ? now - Math.floor((0.5 + rand() * 2.5) * HOUR) : now - d * 24 * HOUR - Math.floor(rand() * 14 * HOUR)
      const hold = (d === 0 ? 0.2 + rand() * 0.3 : 0.3 + rand() * rand() * 9) * HOUR
      const buyPrice = Math.round(item.price * (0.97 + rand() * 0.06))
      const swing = item.edge + (rand() - 0.55) * 0.06
      const sellPrice = Math.max(1, Math.round(buyPrice * (1 + swing + 0.02)))
      const qty = Math.max(1, Math.round(item.qty * (0.4 + rand() * 0.6)))
      const lot: Lot = { id: `sample-lot-${d}-${k}`, itemId: item.id, name: item.name, icon: item.icon, qty, buyPrice, boughtAt, windowStart: boughtAt, reminderId: null }
      const sold = realize(lot, sellPrice, qty, Math.min(now - 60_000, boughtAt + hold), taxOf, `sample-${d}-${k}`)
      if (sold) flips.push(sold.flip)
    }
  }
  const lots: Lot[] = items.slice(0, 3).map((item, i) => ({
    id: `sample-open-${i}`, itemId: item.id, name: item.name, icon: item.icon, qty: item.qty, buyPrice: Math.round(item.price * 0.99),
    boughtAt: now - (i + 1) * HOUR, windowStart: now - (i + 1) * HOUR, reminderId: null
  }))
  return { lots, flips: flips.sort((a, b) => b.soldAt - a.soldAt) }
}
