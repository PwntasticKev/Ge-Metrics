import { describe, it, expect } from 'vitest'
import {
  releasesFromPost,
  releaseFromPostTitle,
  releasesFromHeadings,
  cleanReleaseTitle,
  isUsableTitle,
  titlesMatch,
  isBigRelease,
  MAJOR_UPDATE_TITLE,
  parseScheduleTable,
  parseUpcomingProse,
  citedSource,
  latestCitationDate,
  buildUpcomingReleases,
  mergeCandidates,
  releasedBy,
  parseUpcomingReleasesPayload,
  UPCOMING_PAGE_URL
} from '../index.js'
import { scoreUpcomingForecasts } from '../upcomingValidation.js'

const post = (title, date, text, extra = {}) => ({ title, date, text, url: `https://news/${encodeURIComponent(title)}`, items: [], category: 'game', ...extra })
const found = p => releasesFromPost(p).map(r => [r.title, r.date, r.confidence])

describe('release titles', () => {
  it('cleans announcement noise', () => {
    expect(cleanReleaseTitle('Get Ready For Leagues VI: Demonic Pacts - ')).toBe('Leagues VI: Demonic Pacts')
    expect(cleanReleaseTitle('Grid Master Announcement - ')).toBe('Grid Master')
    expect(cleanReleaseTitle('Hardcore Worlds Are Coming On ')).toBe('Hardcore Worlds Are Coming On')
    expect(cleanReleaseTitle(42)).toBe('')
  })

  it('rejects pronouns, lowercase and empty subjects', () => {
    expect(isUsableTitle('Today')).toBe(false)
    expect(isUsableTitle('the update')).toBe(false)
    expect(isUsableTitle('')).toBe(false)
    expect(isUsableTitle("We're")).toBe(false)
    expect(isUsableTitle("It's")).toBe(false)
    expect(isUsableTitle('Wyrmscraig')).toBe(true)
  })

  it('matches an announcement to its out post', () => {
    expect(titlesMatch('Wyrmscraig', 'Wyrmscraig Is Out Today!')).toBe(true)
    expect(titlesMatch('2026 Halloween event', 'Halloween Event Out Now')).toBe(true)
    expect(titlesMatch('The Fractured Archive', 'The Fractured Archive - Out Today')).toBe(true)
    expect(titlesMatch('Sailing', 'Grid Master - Out Today!')).toBe(false)
    expect(titlesMatch('', 'Sailing')).toBe(false)
  })

  it('strict matching keeps a sub-release apart from the main one', () => {
    expect(titlesMatch('Sailing', 'Sailing Technical Pre-Release')).toBe(true)
    expect(titlesMatch('Sailing', 'Sailing Technical Pre-Release', { strict: true })).toBe(false)
  })

  it('big = the regime gate title rule on the name or the announcing text', () => {
    expect(MAJOR_UPDATE_TITLE.source).toBe('\\b(out today|launch(?:es|ed)?|live today|is out|release[sd]?|christmas|halloween|easter|birthday|deadman|leagues? [ivx]+:)')
    expect(isBigRelease('2026 Halloween event')).toBe(true)
    expect(isBigRelease('Wyrmscraig', 'With Wyrmscraig launching on July 29')).toBe(true)
    expect(isBigRelease('Hardcore Worlds', 'Hardcore Worlds are coming on November 4th')).toBe(false)
  })
})

describe('releasesFromPost', () => {
  it('reads a dated post title', () => {
    expect(releaseFromPostTitle('Wyrmscraig Launches July 29!', '2026-07-16')).toMatchObject({ title: 'Wyrmscraig', date: '2026-07-29', confidence: 'explicit' })
    expect(releaseFromPostTitle('Hardcore Worlds Are Coming On November 4th', '2026-10-22')).toMatchObject({ title: 'Hardcore Worlds', date: '2026-11-04' })
    expect(releaseFromPostTitle('Deadman: Annihilation Drops This Friday!', '2026-01-28')).toMatchObject({ title: 'Deadman: Annihilation', date: '2026-01-30', confidence: 'inferred' })
    expect(releaseFromPostTitle('Jagex Accounts: Migration Begins Nov 17', '2026-10-16')).toBeNull()
    expect(releaseFromPostTitle('Community Spotlight: 10Boot', '2026-10-15')).toBeNull()
  })

  it('finds launches in prose, named before or after the date', () => {
    expect(found(post('Meet Mortimer', '2026-07-24', "With [[Wyrmscraig]] launching on '''July 29''', it's time to talk numbers."))).toEqual([['Wyrmscraig', '2026-07-29', 'explicit']])
    expect(found(post('Bank Tags', '2026-06-17', 'Heads up: As we prepare for the launch of Blood Moon Rises on June 30th, there will be no game update next Wednesday, June 24th.'))).toEqual([['Blood Moon Rises', '2026-06-30', 'explicit']])
    expect(found(post('Sailing Changes', '2026-05-13', "More improvements in the coming weeks, including next week - alongside the launch of the new Sailing quest, ''The Red Reef''!"))).toEqual([['The Red Reef', '2026-05-20', 'inferred']])
    expect(found(post('Game Status', '2026-04-08', "There's no game update today as the team's focusing on Leagues VI: Demonic Pacts, launching next Wednesday."))).toEqual([['Leagues VI: Demonic Pacts', '2026-04-15', 'inferred']])
  })

  it('prefers the explicit date of a release over "next week" in the same post', () => {
    const text = "The Fractured Archive is coming '''NEXT WEEK!''' We're aiming to open it on Tuesday, October 20th. Ahead of The Fractured Archive's release next week on '''October 20th''', a small update."
    expect(found(post('More Gathering Efficiencies', '2026-10-14', text))).toEqual([['The Fractured Archive', '2026-10-20', 'explicit']])
  })

  it('ignores fixes, polls, streams, other games and past dates', () => {
    const text = [
      "We'll get this fixed in next week's update.",
      'The poll launches on Thursday 5th November.',
      'Our livestream is coming on November 6th.',
      'RuneScape: Dragonwilds launches on September 15th.',
      'Polls are expected to open on Tuesday, January 13th.',
      'The Fractured Archive launched on October 20th.',
      'Entries are open to 7 January 2026.'
    ].join(' ')
    expect(found(post('Misc', '2026-10-22', text))).toEqual([])
  })

  it('reads "Next Week: X" headings', () => {
    expect(releasesFromHeadings(post('New Renderer Beta Pause', '2025-10-29', '==Next Week: Sailing Technical Pre-Release Update==\nText'))).toEqual([
      { title: 'Sailing Technical Pre-Release', date: '2025-11-05', confidence: 'inferred', evidence: 'Next Week: Sailing Technical Pre-Release Update' }
    ])
    expect(releasesFromHeadings(post('x', '2025-10-29', '====Next week:====\nstuff'))).toEqual([])
  })

  it('returns [] for malformed posts', () => {
    expect(releasesFromPost(null)).toEqual([])
    expect(releasesFromPost({ title: 'x', date: '2026-01-01' })).toEqual([])
  })
})

const SCHEDULE = `{{Future Content}}
=Roadmap and Schedule=
==Update schedule==
{| class="wikitable"
! colspan="2" | Timeframe
! Update
! Poll Status
! Source(s)
|-
| rowspan="3" | Autumn 2026
| October 28th
| [[2026 Halloween event]]
| {{NA}}
| {{CiteReddit|author=Mod Goblin|url=https://reddit.com/r/2007scape/x|title=|quote=Halloween on the 28th!|date=14 October 2026}}
|-
| November 4th
| [[Hardcore Worlds]]
*Separate servers.
| {{NA}}
| {{CiteNews|url=https://news/old|title=RuneFest 2026 Summit Overview|newsdate=Oct 3, 2026}}{{CiteNews|url=https://news/new|title=Hardcore Worlds Are Coming On November 4th|newsdate=22 October 2026}}
|-
| November
| [[The Graveyard]]
| Passed
|
|-
! colspan="5" |
|-
| rowspan="1" | Winter 2026-2027
| January 6th
| [[The Chosen Commander]] with [[Abyssal whip]] changes
| Passed
|
|}
=Confirmed update details=
===Sailing===
Sailing is a new skill. Full release is planned for 19 November 2026.
`

describe('Upcoming updates page', () => {
  it('parses day-level schedule rows with sources, carrying rowspans', () => {
    const rows = parseScheduleTable(SCHEDULE, '2026-10-25')
    expect(rows.map(r => [r.title, r.date, r.sourcePost ?? null, r.announcedOn ?? null])).toEqual([
      ['2026 Halloween event', '2026-10-28', 'Reddit: Mod Goblin', '2026-10-14'],
      ['Hardcore Worlds', '2026-11-04', 'Hardcore Worlds Are Coming On November 4th', '2026-10-22'],
      ['The Chosen Commander with Abyssal whip changes', '2027-01-06', null, null]
    ])
    expect(rows[1].sourceUrl).toBe('https://news/new')
  })

  it('handles a 4-column table and pages without one', () => {
    const fourColumns = SCHEDULE.replace('! Poll Status\n', '').replace(/\| \{\{NA\}\}\n/g, '').replace(/\| Passed\n/g, '')
    expect(parseScheduleTable(fourColumns, '2026-10-25').map(r => r.title)).toContain('Hardcore Worlds')
    expect(parseScheduleTable('no table here', '2026-10-25')).toEqual([])
    expect(parseScheduleTable(null, '2026-10-25')).toEqual([])
  })

  it('names prose releases after their section', () => {
    expect(parseUpcomingProse(SCHEDULE, '2026-10-25').map(r => [r.title, r.date])).toEqual([['Sailing', '2026-11-19']])
  })

  it('citation helpers', () => {
    expect(citedSource('{{CiteNews|url=https://a|title=A|newsdate=1 June 2026}}{{CiteNews|url=https://b|title=B|newsdate=2 June 2026}}')).toEqual({ sourcePost: 'B', sourceUrl: 'https://b' })
    expect(citedSource('')).toBeNull()
    expect(latestCitationDate('{{CiteNews|newsdate=June 15, 2026|url=x}}{{CiteReddit|date=16 September 2026|url=y}}')).toBe('2026-09-16')
    expect(latestCitationDate(undefined)).toBeNull()
  })
})

const findItems = text => (/Abyssal whip/.test(text) ? [4151] : [])

describe('buildUpcomingReleases', () => {
  const page = { text: SCHEDULE, date: '2026-10-25' }

  it('builds the feed from the page and recent posts', () => {
    const posts = [post('Hardcore Worlds Are Coming On November 4th', '2026-10-22', 'Hardcore Worlds are coming on November 4th!', { items: [1] })]
    const feed = buildUpcomingReleases({ today: '2026-10-26', posts, page, published: [], findItems })
    expect(feed.map(e => [e.title, e.expectedDate, e.confidence, e.big])).toEqual([
      ['2026 Halloween event', '2026-10-28', 'explicit', true],
      ['Hardcore Worlds', '2026-11-04', 'explicit', false],
      ['Sailing', '2026-11-19', 'explicit', true], // "Full release is planned..."
      ['The Chosen Commander with Abyssal whip changes', '2027-01-06', 'explicit', false]
    ])
    expect(feed[1].items).toEqual([1])
    expect(feed[3]).toMatchObject({ items: [4151], sourceUrl: UPCOMING_PAGE_URL })
    expect(Object.keys(feed[0]).sort()).toEqual(['announcedOn', 'big', 'confidence', 'evidence', 'expectedDate', 'items', 'sourcePost', 'sourceUrl', 'title'])
  })

  it('drops entries once the out post is published', () => {
    const published = [{ date: '2026-10-28', title: 'Halloween Event Out Now!', category: 'game' }]
    const feed = buildUpcomingReleases({ today: '2026-10-29', page, published })
    expect(feed.map(e => e.title)).not.toContain('2026 Halloween event')
  })

  it('keeps an entry up to 7 days past its date without an out post', () => {
    expect(buildUpcomingReleases({ today: '2026-11-04', page }).map(e => e.title)).toContain('2026 Halloween event')
    expect(buildUpcomingReleases({ today: '2026-11-05', page }).map(e => e.title)).not.toContain('2026 Halloween event')
  })

  it('a newer announcement moves the date (delay)', () => {
    const posts = [post('Wyrmscraig Launches July 29!', '2026-07-01', 'x'), post('Wyrmscraig Delayed', '2026-07-20', 'Wyrmscraig now launches on August 5th.')]
    const feed = buildUpcomingReleases({ today: '2026-07-21', posts })
    expect(feed.map(e => [e.title, e.expectedDate, e.sourcePost])).toEqual([['Wyrmscraig', '2026-08-05', 'Wyrmscraig Delayed']])
  })

  it('ignores posts older than the lookback or after today', () => {
    const posts = [post('Wyrmscraig Launches July 29!', '2025-11-01', 'x'), post('Cow Boss Launches March 4!', '2026-03-02', 'x')]
    expect(buildUpcomingReleases({ today: '2026-03-01', posts })).toEqual([])
  })
})

describe('mergeCandidates / releasedBy', () => {
  const base = { confidence: 'explicit', sourcePost: 's', sourceUrl: 'u', big: false, items: [], evidence: '' }

  it('pools items and big from same-day duplicates', () => {
    const merged = mergeCandidates([
      { ...base, title: 'Wyrmscraig', expectedDate: '2026-07-29', announcedOn: '2026-07-16', origin: 'post', items: [1] },
      { ...base, title: 'Wyrmscraig', expectedDate: '2026-07-29', announcedOn: '2026-07-10', origin: 'page', items: [2], big: true }
    ])
    expect(merged).toHaveLength(1)
    expect(merged[0]).toMatchObject({ announcedOn: '2026-07-16', big: true, items: [1, 2] })
  })

  it('an announcement post itself does not count as the release', () => {
    const entry = { title: 'Wyrmscraig', expectedDate: '2026-07-29', announcedOn: '2026-07-16' }
    expect(releasedBy(entry, [{ date: '2026-07-16', title: 'Wyrmscraig Launches July 29!', category: 'bts' }])).toBeNull()
    expect(releasedBy(entry, [{ date: '2026-07-29', title: 'Wyrmscraig Is Out Today!', category: 'game' }])).not.toBeNull()
    expect(releasedBy(entry, [{ date: '2026-07-29', title: 'Wyrmscraig Tweaks', category: 'game' }])).not.toBeNull()
    expect(releasedBy(entry, [{ date: '2026-08-12', title: 'Wyrmscraig Tweaks', category: 'game' }])).toBeNull()
  })
})

describe('parseUpcomingReleasesPayload', () => {
  it('validates rows', () => {
    const rows = parseUpcomingReleasesPayload({ upcoming: [{ title: 'A', expectedDate: '2026-11-04', confidence: 'explicit' }, { title: 'B', expectedDate: 'soon', confidence: 'explicit' }, null] })
    expect(rows.map(r => r.title)).toEqual(['A'])
    expect(() => parseUpcomingReleasesPayload({})).toThrow(/upcoming/)
  })
})

describe('scoreUpcomingForecasts', () => {
  const entry = (title, expectedDate, big = true) => ({ title, expectedDate, big, confidence: 'explicit', sourcePost: 's' })
  const snapshots = new Map([
    ['2026-07-20', [entry('Wyrmscraig', '2026-07-29')]],
    ['2026-07-28', [entry('Wyrmscraig', '2026-07-29'), entry('PvP Tutorial', '2026-07-31')]],
    ['2026-08-04', [entry('Ruff', '2026-08-05', false)]]
  ])
  const releases = [{ date: '2026-07-29', title: 'Wyrmscraig Is Out Today!' }, { date: '2026-08-05', title: 'Ruff Out Today' }, { date: '2026-08-12', title: 'Cow Boss Out Today' }]

  it('scores recall, precision, error and lead time', () => {
    const score = scoreUpcomingForecasts({ snapshots, releases, window: { from: '2026-07-01', to: '2026-08-31' } })
    expect(score).toMatchObject({ releases: 3, caught: 1, forecasts: 2, precision: 0.5, medianErrorDays: 0, medianLeadDays: 9 })
    expect(score.recall).toBeCloseTo(1 / 3)
    expect(score.recallAnyEntry).toBeCloseTo(2 / 3)
    expect(score.falsePositives).toEqual([{ title: 'PvP Tutorial', expectedDate: '2026-07-31', sourcePost: 's' }])
    expect(score.perRelease[2]).toMatchObject({ caught: false, forecast: null, errorDays: null, leadDays: null })
  })

  it('handles no data', () => {
    const score = scoreUpcomingForecasts({ snapshots: new Map(), releases: [], window: { from: '2026-01-01', to: '2026-12-31' } })
    expect(score).toMatchObject({ releases: 0, recall: null, precision: null, medianErrorDays: null })
  })
})
