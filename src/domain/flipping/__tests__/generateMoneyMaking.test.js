import { describe, it, expect } from 'vitest'
import { parseMmgtable, toMethod, cleanWikiText, skillRequirements, evalQuantity } from '../../../../scripts/generate-money-making.js'

const PAGE = `{{Mmgtable
|Activity = Cleaning [[grimy toadflax]]
|Category = Skilling
|isperkill = y
|kph = 5000
|Input1 = Grimy toadflax
|Input1num = 1
|Output1 = [[Toadflax]]
|Output1num = 1
|Skill = {{SCP|Herblore|30}}
|Members = Yes
|Location = [[Grand Exchange]]
|Details = Clean them. {{Coins|15000000}}+ recommended
}}`

const ids = new Map([['grimy toadflax', 3049], ['toadflax', 2998], ['vial of water', 227], ['toadflax potion (unf)', 3002]])

describe('money making generator', () => {
  it('parses top-level template fields, ignoring nested templates', () => {
    const fields = parseMmgtable(PAGE)
    expect(fields.kph).toBe('5000')
    expect(fields.details).toContain('{{Coins|15000000}}')
  })

  it('turns a per-action guide into a recipe', () => {
    expect(toMethod('Money making guide/Cleaning grimy toadflax', parseMmgtable(PAGE), ids)).toMatchObject({
      id: 'mmg:Cleaning grimy toadflax',
      inputs: [{ id: 3049, qty: 1 }],
      outputs: [{ id: 2998, qty: 1 }],
      actionsPerHour: 5000,
      skill: 'Herblore 30',
      members: true,
      location: 'Grand Exchange'
    })
  })

  it('skips guides with untradeable inputs or no hourly quantities', () => {
    const untradeable = PAGE.replace('Grimy toadflax', 'Magic secret')
    expect(toMethod('Money making guide/X', parseMmgtable(untradeable), ids)).toBeNull()
    const hourlyWithoutNumbers = PAGE.replace('|isperkill = y\n', '').replace('|Input1num = 1\n', '')
    expect(toMethod('Money making guide/X', parseMmgtable(hourlyWithoutNumbers), ids)).toBeNull()
  })

  it('skips combat and other categories', () => {
    expect(toMethod('Money making guide/X', parseMmgtable(PAGE.replace('Skilling', 'Combat/High')), ids)).toBeNull()
  })

  it('cleans links and skill templates', () => {
    expect(cleanWikiText('[[Toadflax|toadflax]] and [[Vial of water]]')).toBe('toadflax and Vial of water')
    expect(skillRequirements('{{SCP|Herblore|50}} * {{SCP|Magic|70}} (recommended)')).toBe('Herblore 50, Magic 70')
  })

  it('keeps the last field intact (no stray brace)', () => {
    const lastNumeric = PAGE.replace('|Details = Clean them. {{Coins|15000000}}+ recommended\n', '')
    expect(parseMmgtable(lastNumeric).location).toBe('[[Grand Exchange]]')
    const kphLast = '{{Mmgtable\n|Category = Skilling\n|kph = 5000\n}}'
    expect(parseMmgtable(kphLast).kph).toBe('5000')
  })

  it('skips guides with unparseable quantities', () => {
    expect(toMethod('Money making guide/X', parseMmgtable(PAGE.replace('|Input1num = 1', '|Input1num = ~50')), ids)).toBeNull()
  })

  it('treats coins received as revenue, not a negative cost', () => {
    const alch = PAGE.replace('|Output1 = [[Toadflax]]\n|Output1num = 1', '|Output1 = Coins\n|Output1num = 900')
    expect(toMethod('Money making guide/Alch', parseMmgtable(alch), ids)).toMatchObject({ outputs: [], coinRevenue: 900, coinCost: 0 })
  })

  it('evaluates arithmetic quantities safely', () => {
    expect(evalQuantity('27*3')).toBe(81)
    expect(evalQuantity('1/4')).toBe(0.25)
    expect(evalQuantity('2.5*(1/1620)')).toBeCloseTo(0.0015432)
    expect(evalQuantity('(1/1)')).toBe(1)
    expect(evalQuantity('1,000')).toBe(1000)
    expect(evalQuantity('~50')).toBeNaN()
    expect(evalQuantity('alert(1)')).toBeNaN()
    expect(evalQuantity('2*')).toBeNaN()
  })
})
