/// <reference types="node" />
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { overnightFooter, usableTonight } from '../overnightText.ts'
import { PICK_HORIZON_HOURS } from '../pickFill.ts'

describe('overnightFooter', () => {
  it('states the horizon and the sell cap the amounts are really cut to', () => {
    const text = overnightFooter(PICK_HORIZON_HOURS.overnight, 0.5)
    assert.match(text, /within 8 hours/)
    assert.match(text, /sell alone fills within 30m \(your slowest sell setting\)/)
    assert.match(text, /idle/)
    assert.doesNotMatch(text, /sized to buy and sell within 8 hours\./)
  })

  it('a sell cap above the horizon is the horizon', () => {
    assert.match(overnightFooter(8, 10), /sell alone fills within 8h/)
    assert.match(overnightFooter(8, 2), /sell alone fills within 2h/)
  })
})

describe('usableTonight', () => {
  it('says how much of the stack the night can use when cash sits idle', () => {
    assert.equal(usableTonight(26_000_000, 650_000, 50_000_000), '~26M of 50M usable tonight, +650K')
  })

  it('reads as a full plan when nearly all of it is used', () => {
    assert.equal(usableTonight(9_800_000, 400_000, 10_000_000), 'Uses 9.8M of 10M tonight, +400K')
  })
})
