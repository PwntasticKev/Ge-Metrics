import { describe, it, expect } from 'vitest'
import {
  parseWikiDate,
  findTemplate,
  splitTemplateParams,
  parseUpdateTemplate,
  normalizeCategory,
  stripUpdatePrefix,
  wikiUrlForTitle,
  extractLinks,
  createItemMatcher,
  matchItemIds,
  createMentionFinder,
  stripWikiMarkup,
  buildUpdateEntry,
  sortUpdatesNewestFirst,
  filterUpdatesByDateRange,
  filterUpdatesByItem,
  mentionsItem,
  isBlogCategory,
  toChartEvents,
  parseGameUpdatesPayload
} from '../index.js'

const MAPPING = [
  { id: 4151, name: 'Abyssal whip' },
  { id: 1333, name: 'Rune scimitar' },
  { id: 6685, name: 'Saradomin brew(4)' },
  { id: 6687, name: 'Saradomin brew(3)' },
  { id: 11865, name: 'Ring of dueling(8)' },
  { id: 1513, name: 'Magic logs' },
  { id: 536, name: 'Dragon bones' },
  { id: 526, name: 'Bones' },
  { id: 12934, name: "Zulrah's scales" },
  { id: 20997, name: 'Twisted bow' },
  { id: 1959, name: 'Pumpkin' },
  { id: 11230, name: 'Dragon dart' },
  { id: 2, name: 'Cannonball' },
  { id: 9999, name: 'Rune platebody (g)' },
  { id: 'bad', name: 'Broken row' }
]

describe('parseWikiDate', () => {
  it.each([
    ['14 October 2026', '2026-10-14'],
    ['1st Feb 2015', '2015-02-01'],
    ['[[3 March]] [[2016]]', '2016-03-03'],
    ['March 3, 2016', '2016-03-03'],
    ['2024-07-09', '2024-07-09']
  ])('parses %s', (input, expected) => {
    expect(parseWikiDate(input)).toBe(expected)
  })

  it.each([[undefined], [''], ['31 February 2020'], ['14 Smarch 2020'], ['soon']])('rejects %s', input => {
    expect(parseWikiDate(input)).toBeNull()
  })
})

describe('Update template parsing', () => {
  const page = '{{Update|date=14 October 2026|link=https://secure.runescape.com/m=news/x?oldschool=1|category=game}}\nBody {{plink|Abyssal whip}}'

  it('finds the balanced template body', () => {
    expect(findTemplate('a {{Update|x={{nested|y}}|z=1}} b', 'Update')).toBe('Update|x={{nested|y}}|z=1')
    expect(findTemplate('no template', 'Update')).toBeNull()
    expect(findTemplate('{{Update|unclosed', 'Update')).toBeNull()
  })

  it('splits params on top-level pipes only', () => {
    expect(splitTemplateParams('Update|date=1 May 2020|note=[[A|B]] {{x|y}}|url=a=b')).toEqual({
      date: '1 May 2020', note: '[[A|B]] {{x|y}}', url: 'a=b'
    })
  })

  it('reads date, news link and category', () => {
    expect(parseUpdateTemplate(page)).toEqual({ date: '2026-10-14', url: 'https://secure.runescape.com/m=news/x?oldschool=1', category: 'game' })
  })

  it('accepts url= and defaults the category', () => {
    expect(parseUpdateTemplate('{{Update|date=2 March 2015|url=http://n}}')).toEqual({ date: '2015-03-02', url: 'http://n', category: 'game' })
  })

  it('returns null without a template or date', () => {
    expect(parseUpdateTemplate('plain text')).toBeNull()
    expect(parseUpdateTemplate('{{Update|category=game}}')).toBeNull()
  })

  it('normalizes category spellings', () => {
    expect(normalizeCategory('Dev blog')).toBe('devblog')
    expect(normalizeCategory('dev blogs')).toBe('devblog')
    expect(normalizeCategory('game update')).toBe('game')
    expect(normalizeCategory('Your Feedback')).toBe('yourfeedback')
    expect(normalizeCategory(undefined)).toBe('game')
  })

  it('builds titles and wiki urls', () => {
    expect(stripUpdatePrefix('Update:Varlamore: Part Two')).toBe('Varlamore: Part Two')
    expect(stripUpdatePrefix('Other')).toBe('Other')
    expect(wikiUrlForTitle("Update:Poll 80? Yes & No")).toBe('https://oldschool.runescape.wiki/w/Update:Poll_80%3F_Yes_%26_No')
  })
})

describe('extractLinks', () => {
  it('extracts article links, labels, anchors and plinks', () => {
    const text = '[[Abyssal whip]] and [[Rune scimitar|scimmies]], [[Magic_logs#Uses]], {{plink|Twisted bow|pic=x}} {{plinkp|Dragon dart}}'
    expect(extractLinks(text)).toEqual([
      { target: 'Abyssal whip', text: null },
      { target: 'Rune scimitar', text: 'scimmies' },
      { target: 'Magic logs', text: null },
      { target: 'Twisted bow', text: null },
      { target: 'Dragon dart', text: null }
    ])
  })

  it('skips files, categories, interwiki, self anchors and comments', () => {
    const text = '[[File:x.png|thumb|A [[Bones]] caption]] [[Category:Updates]] [[:Category:X]] [[wikipedia:Bones]] [[#Top]] <!-- [[Dragon bones]] -->'
    expect(extractLinks(text)).toEqual([{ target: 'Bones', text: null }])
  })

  it('handles non-strings', () => {
    expect(extractLinks(null)).toEqual([])
  })
})

describe('createItemMatcher', () => {
  const match = createItemMatcher(MAPPING)

  it('matches case-insensitively by target then label', () => {
    expect(match({ target: 'abyssal WHIP' }).id).toBe(4151)
    expect(match({ target: 'Whip page', text: 'Abyssal whip' }).id).toBe(4151)
  })

  it('maps base names to the highest dose/charge variant', () => {
    expect(match({ target: 'Saradomin brew' }).id).toBe(6685)
    expect(match({ target: 'Ring of dueling' }).id).toBe(11865)
  })

  it('handles plurals', () => {
    expect(match({ target: 'Rune scimitars' }).id).toBe(1333)
    expect(match({ target: 'Magic log' }).id).toBe(1513)
    expect(match({ target: 'Saradomin brews' }).id).toBe(6685)
  })

  it('returns null for non-items and tolerates bad mapping', () => {
    expect(match({ target: 'Darkmeyer' })).toBeNull()
    expect(createItemMatcher(null)({ target: 'Abyssal whip' })).toBeNull()
  })

  it('dedupes ids in mention order', () => {
    const links = [{ target: 'Twisted bow' }, { target: 'Nope' }, { target: 'Abyssal whip' }, { target: 'twisted bow' }]
    expect(matchItemIds(links, match)).toEqual([20997, 4151])
  })
})

describe('createMentionFinder', () => {
  const find = createMentionFinder(MAPPING)

  it('strips wiki markup to prose', () => {
    const text = "{{Update|date=1 May 2020}}[[File:a.png|thumb|[[Bones]]]] '''Bold''' [[A|label]] [https://x.com site] <b>tag</b><ref>note</ref>"
    expect(stripWikiMarkup(text).replace(/\s+/g, ' ').trim()).toBe('Bold label site tag')
  })

  it('finds item names in prose, longest first, with plurals', () => {
    const text = 'The drop rate of Dragon bones and twisted bows is up. Saradomin brews heal. Zulrah\'s scales too.'
    expect(find(text)).toEqual([536, 20997, 6685, 12934])
  })

  it('ignores short one-word and ambiguous names', () => {
    expect(find('Bones, Mod Pumpkin and a Cannonball')).toEqual([2])
  })

  it('needs word boundaries and handles names with brackets', () => {
    expect(find('Abyssal whipping. Rune platebody (g) added.')).toEqual([9999])
  })

  it('returns [] for an empty mapping', () => {
    expect(createMentionFinder([])('Abyssal whip')).toEqual([])
  })
})

describe('buildUpdateEntry', () => {
  const matchers = { matchItem: createItemMatcher(MAPPING), findMentions: createMentionFinder(MAPPING) }
  const page = {
    title: 'Update:Whip Changes',
    text: '{{Update|date=5 June 2020|link=https://news/whip|category=dev blog}}\nThe [[Abyssal whip]] and twisted bow change.'
  }

  it('builds an entry with linked then mentioned items', () => {
    expect(buildUpdateEntry(page, matchers)).toEqual({
      date: '2020-06-05',
      title: 'Whip Changes',
      url: 'https://news/whip',
      wikiUrl: 'https://oldschool.runescape.wiki/w/Update:Whip_Changes',
      category: 'devblog',
      items: [4151, 20997]
    })
  })

  it('drops updates before the cutoff, undated pages and bad input', () => {
    expect(buildUpdateEntry({ ...page, text: '{{Update|date=31 January 2015}}' }, matchers)).toBeNull()
    expect(buildUpdateEntry({ ...page, text: 'nothing' }, matchers)).toBeNull()
    expect(buildUpdateEntry({ title: 1, text: null }, matchers)).toBeNull()
  })

  it('works with link matching only', () => {
    expect(buildUpdateEntry(page, { matchItem: matchers.matchItem }).items).toEqual([4151])
  })

  it('sorts newest first, ties by title, without mutating', () => {
    const list = [{ date: '2020-01-01', title: 'B' }, { date: '2021-01-01', title: 'A' }, { date: '2020-01-01', title: 'A' }]
    expect(sortUpdatesNewestFirst(list).map(u => `${u.date}${u.title}`)).toEqual(['2021-01-01A', '2020-01-01A', '2020-01-01B'])
    expect(list[0].title).toBe('B')
  })
})

describe('filters and chart events', () => {
  const updates = [
    { date: '2024-03-10', title: 'Blog', category: 'devblog', url: 'u1', wikiUrl: 'w1', items: [4151] },
    { date: '2024-03-05', title: 'Update', category: 'game', url: 'u2', wikiUrl: 'w2', items: [] },
    { date: '2024-01-01', title: 'Old', category: 'website' }
  ]

  it('filters by inclusive date range (Date, ms, string, open ends)', () => {
    expect(filterUpdatesByDateRange(updates, new Date('2024-03-05T12:00:00Z'), '2024-03-10').map(u => u.title)).toEqual(['Blog', 'Update'])
    expect(filterUpdatesByDateRange(updates, Date.parse('2024-03-06'), null).map(u => u.title)).toEqual(['Blog'])
    expect(filterUpdatesByDateRange(updates, null, null)).toHaveLength(3)
    expect(filterUpdatesByDateRange(updates, 'garbage', null)).toEqual([])
    expect(filterUpdatesByDateRange(undefined, null, null)).toEqual([])
  })

  it('filters and checks by item id', () => {
    expect(filterUpdatesByItem(updates, '4151').map(u => u.title)).toEqual(['Blog'])
    expect(mentionsItem(updates[0], 4151)).toBe(true)
    expect(mentionsItem(updates[2], 4151)).toBe(false)
    expect(mentionsItem(updates[0], undefined)).toBe(false)
  })

  it('maps dev blogs to blogs and the rest to updates', () => {
    expect(isBlogCategory('devblog')).toBe(true)
    expect(isBlogCategory('game')).toBe(false)
    const events = toChartEvents(updates)
    expect(events.blogs.map(b => b.title)).toEqual(['Blog'])
    expect(events.updates.map(u => u.title)).toEqual(['Update', 'Old'])
    expect(events.updates[1]).toEqual({ date: '2024-01-01', title: 'Old', category: 'website', url: null, wikiUrl: null, items: [] })
  })

  it('validates the JSON payload', () => {
    expect(parseGameUpdatesPayload({ updates: [...updates, { date: 'x', title: 'Bad' }, null] })).toHaveLength(3)
    expect(() => parseGameUpdatesPayload({})).toThrow(/updates/)
  })
})
