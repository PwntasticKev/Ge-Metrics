import { describe, expect, it } from 'vitest'
import { botFarmFilter, oresAndBarsFilter, raidsFilter } from '../market-watch-filters.js'

describe('market watch exact-name filters', () => {
  it('matches raid uniques case-insensitively and nothing else', () => {
    expect(raidsFilter({ name: 'Twisted bow' })).toBe(true)
    expect(raidsFilter({ name: 'scythe of vitur (uncharged)' })).toBe(true)
    expect(raidsFilter({ name: 'Twisted bow (broken)' })).toBe(false)
    expect(raidsFilter({ name: 'Shark' })).toBe(false)
    expect(raidsFilter({})).toBe(false)
  })

  it('matches botted resources', () => {
    expect(botFarmFilter({ name: "Zulrah's scales" })).toBe(true)
    expect(botFarmFilter({ name: 'Wine of Zamorak' })).toBe(true)
    expect(botFarmFilter({ name: 'Twisted bow' })).toBe(false)
  })
})

describe('oresAndBarsFilter', () => {
  it('keeps ores and bars but not nails', () => {
    expect(oresAndBarsFilter({ name: 'Iron ore' })).toBe(true)
    expect(oresAndBarsFilter({ name: 'Steel bar' })).toBe(true)
    expect(oresAndBarsFilter({ name: 'Bronze nails' })).toBe(false)
  })
})
