import { describe, it, expect } from 'vitest'
import { parseExemptLinks } from '../../../../scripts/generate-tax-exempt.js'

describe('parseExemptLinks', () => {
  const text = `==Tax==\nstuff [[Not this]]\n===Exempt from tax===\n* [[Old school bond]]s\n* [[Games necklace|Games necklace(8)]]\n==Next==\n[[Also not]]`
  it('reads only the exemption section and keeps shown names', () => {
    expect(parseExemptLinks(text)).toEqual([
      { page: 'Old school bond', shown: null },
      { page: 'Games necklace', shown: 'Games necklace(8)' }
    ])
  })
  it('fails loudly if the section disappears', () => {
    expect(() => parseExemptLinks('nothing here')).toThrow(/Exempt from tax/)
  })
})
