import { describe, it, expect, vi } from 'vitest'

// Mock the DB modules before importing the scraper
vi.mock('@server/db/index.js', () => ({
  db: {}
}))
vi.mock('@server/db/schema.js', () => ({
  gameUpdates: {}
}))
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  desc: vi.fn(),
  and: vi.fn()
}))

import { parseUpdateDate, determineUpdateType, extractGameUpdates } from '@server/services/gameUpdatesScraper.js'

describe('parseUpdateDate', () => {
  it('parses "2 July" with year 2025', () => {
    const result = parseUpdateDate('2 July', 2025)
    expect(result.getFullYear()).toBe(2025)
    expect(result.getMonth()).toBe(6)
    expect(result.getDate()).toBe(2)
  })

  it('parses "26 January" with year 2024', () => {
    const result = parseUpdateDate('26 January', 2024)
    expect(result.getFullYear()).toBe(2024)
    expect(result.getMonth()).toBe(0)
    expect(result.getDate()).toBe(26)
  })

  it('parses "15 December" with year 2023', () => {
    const result = parseUpdateDate('15 December', 2023)
    expect(result.getFullYear()).toBe(2023)
    expect(result.getMonth()).toBe(11)
    expect(result.getDate()).toBe(15)
  })

  it('returns current date for unparseable input', () => {
    const before = Date.now()
    const result = parseUpdateDate('invalid', 2025)
    const after = Date.now()
    expect(result.getTime()).toBeGreaterThanOrEqual(before)
    expect(result.getTime()).toBeLessThanOrEqual(after)
  })

  it('returns current date for unknown month', () => {
    const before = Date.now()
    const result = parseUpdateDate('15 Smarch', 2025)
    const after = Date.now()
    expect(result.getTime()).toBeGreaterThanOrEqual(before)
    expect(result.getTime()).toBeLessThanOrEqual(after)
  })
})

describe('determineUpdateType', () => {
  it('returns "quest" for quest-related titles', () => {
    expect(determineUpdateType('New Quest: Twilight Fang')).toBe('quest')
  })

  it('returns "poll" for poll-related titles', () => {
    expect(determineUpdateType('Poll 85 Results')).toBe('poll')
  })

  it('returns "hotfix" for fix titles', () => {
    expect(determineUpdateType('Bug Fix Patch')).toBe('hotfix')
  })

  it('returns "holiday" for holiday keywords', () => {
    // Note: "Christmas Event" matches "event" first due to priority ordering
    expect(determineUpdateType('Christmas Update 2025')).toBe('holiday')
    expect(determineUpdateType('Halloween Special')).toBe('holiday')
    expect(determineUpdateType('Easter Celebration')).toBe('holiday')
  })

  it('returns "leagues" for league titles', () => {
    expect(determineUpdateType('Leagues V Announcement')).toBe('leagues')
  })

  it('returns "pvm" for raid/boss titles', () => {
    expect(determineUpdateType('New Boss: Desert Colossus')).toBe('pvm')
    expect(determineUpdateType('Theatre of Blood Raid Update')).toBe('pvm')
  })

  it('returns "general" for unmatched titles', () => {
    expect(determineUpdateType('Weekly Update')).toBe('general')
  })

  it('is case-insensitive', () => {
    expect(determineUpdateType('POLL RESULTS')).toBe('poll')
    expect(determineUpdateType('quest release')).toBe('quest')
  })
})

describe('extractGameUpdates', () => {
  const mockHtml = `
    <html>
    <body>
      <h3><span class="mw-headline">2025</span></h3>
      <ul>
        <li>15 January - <a href="/w/Update:Weekly_Game_Update">Weekly Game Update</a></li>
        <li>22 January - <a href="/w/Update:New_Quest_Release">New Quest Release</a></li>
      </ul>
      <h3><span class="mw-headline">2024</span></h3>
      <ul>
        <li>10 December - <a href="/w/Update:Christmas_Event">Christmas Event 2024</a></li>
        <li>5 November - <a href="/w/Update:Poll_Results">Poll 84 Results</a></li>
      </ul>
      <h3><span class="mw-headline">2019</span></h3>
      <ul>
        <li>1 March - <a href="/w/Update:Old_Update">Old Update</a></li>
      </ul>
    </body>
    </html>
  `

  it('extracts updates from valid HTML', () => {
    const updates = extractGameUpdates(mockHtml)
    expect(updates.length).toBeGreaterThanOrEqual(4)
  })

  it('assigns correct year to updates', () => {
    const updates = extractGameUpdates(mockHtml)
    const jan2025 = updates.find(u => u.title === 'Weekly Game Update')
    expect(jan2025?.year).toBe(2025)

    const dec2024 = updates.find(u => u.title === 'Christmas Event 2024')
    expect(dec2024?.year).toBe(2024)
  })

  it('skips years before 2020', () => {
    const updates = extractGameUpdates(mockHtml)
    const old = updates.find(u => u.title === 'Old Update')
    expect(old).toBeUndefined()
  })

  it('extracts correct URLs', () => {
    const updates = extractGameUpdates(mockHtml)
    const quest = updates.find(u => u.title === 'New Quest Release')
    expect(quest?.url).toBe('/w/Update:New_Quest_Release')
  })

  it('extracts date text', () => {
    const updates = extractGameUpdates(mockHtml)
    const update = updates.find(u => u.title === 'Poll 84 Results')
    expect(update?.dateText).toBe('5 November')
  })

  it('returns empty array for empty HTML', () => {
    const updates = extractGameUpdates('<html><body></body></html>')
    expect(updates).toEqual([])
  })

  it('handles HTML with no update links gracefully', () => {
    const html = '<html><body><h3><span class="mw-headline">2025</span></h3><ul><li>No links here</li></ul></body></html>'
    const updates = extractGameUpdates(html)
    expect(updates).toEqual([])
  })
})
