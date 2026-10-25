import { describe, it, expect } from 'vitest'
import { applyBudget, withBudget } from '../index.js'

const item = { buyAt: 1_000_000, profit: 50_000, maxQty: 8, potential: 400_000 }
const set = { cost: 10_000_000, profit: 300_000, maxSets: 8, potential: 2_400_000 }
const process = { cost: 2_000, profit: 100, maxActions: 13_000, potential: 1_300_000, perHour: 400_000 }

describe('applyBudget', () => {
  it('caps quantity to what the cash buys and recomputes 4h profit', () => {
    expect(applyBudget(item, 3_500_000)).toMatchObject({ maxQty: 3, potential: 150_000, affordable: true })
    expect(applyBudget(set, 25_000_000)).toMatchObject({ maxSets: 2, potential: 600_000 })
    expect(applyBudget(process, 10_000_000)).toMatchObject({ maxActions: 5_000, potential: 500_000, perHour: 125_000 })
  })

  it('leaves flips alone when the budget covers everything or is unset', () => {
    expect(applyBudget(item, 1e12).maxQty).toBe(8)
    expect(applyBudget(item, null)).toBe(item)
  })

  it('marks unaffordable flips', () => {
    expect(applyBudget(set, 5_000_000)).toMatchObject({ maxSets: 0, affordable: false })
  })
})

describe('withBudget', () => {
  it('drops what you cannot afford and re-ranks by capped 4h profit', () => {
    const cheap = { buyAt: 100, profit: 11, maxQty: 10_000, potential: 110_000 }
    const ranked = withBudget([item, cheap, set], 2_000_000)
    expect(ranked.map(f => f.buyAt ?? f.cost)).toEqual([100, 1_000_000])
    expect(ranked[0].potential).toBe(110_000) // 10,000 x 11 (budget allows 20,000)
    expect(ranked[1].potential).toBe(100_000) // 2 x 50,000
  })
})
