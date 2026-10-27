import { describe, it, expect } from 'vitest'
import { findDateMentions, parseDayCell, resolveYear, addDays, daysBetween, CONFIDENCE } from '../index.js'

const dates = (text, postDate) => findDateMentions(text, postDate).map(m => [m.date, m.confidence])

describe('findDateMentions: explicit dates', () => {
  it.each([
    ['launches on Wednesday 4th November', '2026-10-22', '2026-11-04'],
    ['Hardcore Worlds are coming on November 4th', '2026-10-22', '2026-11-04'],
    ['coming 11 November', '2026-10-22', '2026-11-11'],
    ['launching on Tuesday, June 30th', '2026-05-29', '2026-06-30'],
    ['on the 4th of November', '2026-10-22', '2026-11-04'],
    ['Deadman: Annihilation releases January 30th, 2026', '2025-11-10', '2026-01-30'],
    ['out on Sept 3, 2025', '2025-08-01', '2025-09-03'],
    ['Leagues VI: Demonic Pacts - April 15th', '2026-03-23', '2026-04-15'],
    ['aiming to open the raid at Tuesday, October 20th at 11:00 AM UTC', '2026-10-14', '2026-10-20']
  ])('%s (posted %s) -> %s', (text, postDate, expected) => {
    expect(dates(text, postDate)).toEqual([[expected, CONFIDENCE.explicit]])
  })

  it('rolls an undated early-year day into next year for a late-year post', () => {
    expect(dates('launching on January 7th', '2025-12-20')).toEqual([['2026-01-07', 'explicit']])
  })

  it('keeps a recently passed date in the post year (callers drop past dates)', () => {
    expect(dates('released on October 20th', '2026-10-22')).toEqual([['2026-10-20', 'explicit']])
  })

  it('uses a stated weekday to pick the year', () => {
    // 6 January is a Wednesday in 2027, a Tuesday in 2026
    expect(dates('Wednesday 6th January', '2026-01-01')).toEqual([['2027-01-06', 'explicit']])
  })

  it('rejects impossible days and lowercase "may" (the verb)', () => {
    expect(dates('on February 30th', '2026-01-10')).toEqual([])
    expect(dates('you may 5 times reroll', '2026-01-10')).toEqual([])
    expect(dates('The Red Reef arrives May 20th', '2026-05-01')).toEqual([['2026-05-20', 'explicit']])
  })

  it('does not read times or numbers as dates', () => {
    expect(dates('at 10:00 UTC with 25 new items', '2026-01-10')).toEqual([])
  })
})

describe('findDateMentions: relative phrases', () => {
  it('"next week" is the Wednesday of next week (OSRS update day)', () => {
    expect(dates('coming next week', '2026-10-14')).toEqual([['2026-10-21', 'inferred']]) // Wed post
    expect(dates('coming next week', '2026-10-16')).toEqual([['2026-10-21', 'inferred']]) // Fri post
    expect(dates('coming next week', '2026-10-19')).toEqual([['2026-10-28', 'inferred']]) // Mon post
  })

  it('"next <weekday>" is that weekday of next week', () => {
    expect(dates('launching next Wednesday', '2026-04-08')).toEqual([['2026-04-15', 'inferred']])
    expect(dates('dropping next Friday', '2026-01-21')).toEqual([['2026-01-30', 'inferred']])
    expect(dates('next Tuesday', '2026-06-24')).toEqual([['2026-06-30', 'inferred']])
  })

  it('"this <weekday>" in the same week, never in the past', () => {
    expect(dates('see you this Friday', '2026-05-27')).toEqual([['2026-05-29', 'inferred']])
    expect(dates('released this Monday', '2026-05-27')).toEqual([])
  })

  it('"tomorrow" and "this week"', () => {
    expect(dates('arriving tomorrow', '2026-05-11')).toEqual([['2026-05-12', 'inferred']])
    expect(dates('out this week', '2026-05-11')).toEqual([['2026-05-13', 'inferred']])
    expect(dates('out this week', '2026-05-14')).toEqual([])
  })

  it('ignores "next week\'s game update"', () => {
    expect(dates("fixed in next week's game update", '2026-10-14')).toEqual([])
    expect(dates('fixed in next week’s game update', '2026-10-14')).toEqual([])
  })

  it('merges "next week on October 20th" into one explicit mention', () => {
    const [mention, ...rest] = findDateMentions("The Fractured Archive's release next week on October 20th", '2026-10-14')
    expect(rest).toEqual([])
    expect(mention).toMatchObject({ date: '2026-10-20', confidence: 'explicit', text: 'next week on October 20th' })
  })

  it('returns [] for bad input', () => {
    expect(findDateMentions(null, '2026-01-01')).toEqual([])
    expect(findDateMentions('next week', 'not a date')).toEqual([])
  })
})

describe('parseDayCell (schedule table)', () => {
  it('parses day-level cells with the season year', () => {
    expect(parseDayCell('October 28th', '2026-10-25', [2026])).toBe('2026-10-28')
    expect(parseDayCell('November 4th', '2026-10-25', [2026])).toBe('2026-11-04')
    expect(parseDayCell('4 November 2026', '2026-10-25')).toBe('2026-11-04')
    expect(parseDayCell('January 7th', '2026-10-25', [2026, 2027])).toBe('2027-01-07')
  })

  it('skips month-level and vague cells', () => {
    for (const cell of ['November', 'Late November', 'October or later', 'November / December', '{{NA}}', '']) {
      expect(parseDayCell(cell, '2026-10-25', [2026])).toBeNull()
    }
    expect(parseDayCell(undefined, '2026-10-25')).toBeNull()
  })
})

describe('date helpers', () => {
  it('resolveYear, addDays, daysBetween', () => {
    expect(resolveYear(11, 4, '2026-10-22')).toBe('2026-11-04')
    expect(resolveYear(2, 29, '2026-10-22')).toBe(null) // 2026/2027 have no Feb 29... and 2028 is out of range
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(daysBetween('2026-10-20', '2026-11-04')).toBe(15)
  })
})
