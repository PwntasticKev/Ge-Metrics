import { describe, it, expect } from 'vitest'
import { parseItemSetRows } from '../../../../scripts/generate-ge-item-sets.js'

const row = (set, expr, extra = '') =>
  `|-\n|{{plinkt|${set}}}\n|{{Coins|{{#vardefineecho:set|{{GEP|${set}}}}}}}\n|{{Coins|{{#vardefineecho:pieces|{{#expr:${expr}}}}}}}\n|{{Coins|x}}${extra}\n`

describe('parseItemSetRows', () => {
  it('reads set name and parts with multipliers', () => {
    expect(parseItemSetRows(row("Dharok's armour set", "{{GEP|Dharok's helm}}+{{GEP|Dharok's greataxe}}*2"))).toEqual([
      { name: "Dharok's armour set", parts: [{ name: "Dharok's helm", qty: 1 }, { name: "Dharok's greataxe", qty: 2 }] }
    ])
  })

  it('ignores GEP calls in other cells', () => {
    const parsed = parseItemSetRows(row('A set', '{{GEP|Part}}', '\n|{{GEP|Unrelated}}'))
    expect(parsed[0].parts).toEqual([{ name: 'Part', qty: 1 }])
  })

  it('throws on a GEP variant it cannot read', () => {
    expect(() => parseItemSetRows(row('A set', '{{GEP|Part}}+{{GEP|Other|extra}}'))).toThrow(/Unparsed part/)
  })
})
