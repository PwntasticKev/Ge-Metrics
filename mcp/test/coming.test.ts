import { describe, expect, it } from 'vitest'
import { type ComingPost, type ParseContext, cleanSentence, mentionsIn, parseComingPost, parsePollPage, parsePollQuestions, wikiSentences } from '../src/analysis/coming/parse.js'
import { LATE_MOVE, buildComingUp, pendingOnly, type ComingItem } from '../src/analysis/coming/rows.js'
import { classifySignal } from '../src/analysis/coming/signals.js'
import { DAY_SEC, type UpdatePage, buildMentionIndex, buildNameIndex, extractLinks, parseUpdateDate, withPlurals } from '../src/analysis/coming/wikitext.js'
import { comingFromPages, pagesFrom } from '../src/updates/coming.js'
import { UpstreamError } from '../src/wiki/http.js'
import { MAPPING } from './fixtures/market.js'
import { avgOf } from './fixtures/series.js'

const ITEMS = [
  { id: 1, name: 'Dragon bones' },
  { id: 2, name: 'Ascension shard' },
  { id: 3, name: 'Feather' },
  { id: 4, name: 'Abyssal whip' }
]
const ctx: ParseContext = { mentions: withPlurals(buildMentionIndex(ITEMS)), names: buildNameIndex(ITEMS) }
const utc = (y: number, m: number, d: number) => Date.UTC(y, m, d) / 1000

describe('wikitext helpers', () => {
  it('parses wiki dates and links', () => {
    expect(parseUpdateDate('14 October 2026')).toBe(utc(2026, 9, 14))
    expect(parseUpdateDate('31 February 2026')).toBeNull()
    expect(extractLinks('[[dragon_bones|bones]] {{plink|Feather}} [[File:X.png]] [[:Category:Y]]')).toEqual(['Dragon bones', 'Feather'])
  })

  it('splits sentences and cleans markup', () => {
    const text = '==Heading==\n[[File:A.png|right|a [[link]]]]\n{{Clear}}\n* First point. Second point!\nlower. case stays'
    expect(wikiSentences(text)).toEqual(['First point.', 'Second point!', 'lower. case stays'])
    expect(cleanSentence("'''Bold''' [[Dragon bones|bones]] and [https://x.com the site].")).toBe('Bold bones and the site.')
  })
})

describe('direction signals', () => {
  it('reads supply, use, buff and nerf wording in order', () => {
    expect(classifySignal('Dragon bones drop rate increased')).toEqual({ direction: 'down', reason: 'more supply' })
    expect(classifySignal('will no longer be dropped by goblins')).toEqual({ direction: 'up', reason: 'less supply' })
    expect(classifySignal('Shards are used to charge the folio')).toEqual({ direction: 'up', reason: 'new use' })
    expect(classifySignal('The whip has been nerfed')?.direction).toBe('down')
    expect(classifySignal('It looks nice')).toBeNull()
  })
})

describe('coming-up parsing', () => {
  it('finds linked and written items, plurals included, preferring a directional sentence', () => {
    const found = mentionsIn('Ascension shards are used to charge the folio. We added [[feather]]s to a shop. Slayer is fun.', ctx)
    expect(found.map(m => m.item)).toEqual(['Ascension shard', 'Feather'])
    expect(mentionsIn('The Abyssal whip is iconic. The Abyssal whip now provides more Strength.', ctx)[0]?.sentence).toBe('The Abyssal whip now provides more Strength.')
  })

  it('keeps every sentence of a dev blog but only forward-looking lines of a game update', () => {
    const blog = parseComingPost('Update:Raid blog', '{{Update|date=6 October 2026|category=future}}\nDragon bones are required to enter.', ctx)
    expect(blog).toMatchObject({ kind: 'future', date: utc(2026, 9, 6), mentions: [{ item: 'Dragon bones' }] })
    const game = '{{Update|date=14 October 2026|category=game}}\nThe Abyssal whip was fixed.\nThe raid is coming next week with new Dragon bones uses.'
    expect(parseComingPost('Update:Weekly', game, ctx)?.mentions.map(m => m.item)).toEqual(['Dragon bones'])
    expect(parseComingPost('Update:Other', '{{Update|date=14 October 2026|category=game}}\nThe Abyssal whip was fixed.', ctx)).toBeNull()
  })

  const POLL = `{{PollNotice|1770|15 October 2026|22 October 2026}}
[https://secure.runescape.com/m=news/quest-month?oldschool=1 Visit the blog]
{{Poll
|Question = Should Dragon bones be used to make a new potion?
|Answer1 = Yes
|Votes1 = 9,000
|Answer2 = No
|Votes2 = 1000
}}
{{Poll
|Question = Should the Abyssal whip be buffed?
|Answer1 = Yes
|Votes1 = 600
|Answer2 = No
|Votes2 = 400
}}`

  it('reads poll pages with Yes shares', () => {
    expect(parsePollQuestions(POLL).map(q => [q.yes, q.no])).toEqual([[9000, 1000], [600, 400]])
    const post = parsePollPage('Poll:Quest Month Rewards Poll', POLL, ctx)
    expect(post).toMatchObject({ title: 'Quest Month Rewards Poll', kind: 'poll', date: utc(2026, 9, 15), closes: utc(2026, 9, 22), url: 'https://secure.runescape.com/m=news/quest-month?oldschool=1' })
    expect(post?.mentions.map(m => [m.item, m.pollShare])).toEqual([['Dragon bones', 0.9], ['Abyssal whip', 0.6]])
  })
})

describe('coming-up rows', () => {
  const POST_DATE = utc(2026, 9, 6)
  const blog: ComingPost = {
    title: 'Raid blog', date: POST_DATE, url: null, kind: 'future', closes: null,
    mentions: [
      { item: 'Dragon bones', sentence: 'Dragon bones are required to enter.' },
      { item: 'Abyssal whip', sentence: 'The Abyssal whip is iconic.' },
      { item: 'Unknown thing', sentence: 'Not an item.' }
    ]
  }
  const poll: ComingPost = {
    title: 'Poll', date: utc(2026, 9, 15), url: null, kind: 'poll', closes: utc(2026, 9, 22),
    mentions: [
      { item: 'Dragon bones', sentence: 'Should Dragon bones be used?', pollShare: 0.9 },
      { item: 'Abyssal whip', sentence: 'Should the whip be buffed?', pollShare: 0.6 }
    ]
  }
  const items: Record<number, ComingItem> = {
    1: { id: 1, name: 'Dragon bones', high: 2300, low: 2100, dailyVolume: 1e6 },
    4: { id: 4, name: 'Abyssal whip', high: 1000, low: 1000, dailyVolume: 5000 }
  }
  const release: UpdatePage = { title: 'Raid out now', date: POST_DATE + 14 * DAY_SEC, url: null, kind: 'game', links: ['Abyssal whip'] }
  const older: UpdatePage = { title: 'Older', date: POST_DATE - DAY_SEC, url: null, kind: 'game', links: ['Dragon bones'] }
  const groups = buildComingUp([blog, poll], {
    names: ctx.names,
    getItem: id => items[id] ?? null,
    gameUpdates: [release, older],
    baselineFor: p => (p === blog ? new Map([[1, avgOf(2000, 1800)], [4, avgOf(1000, 1000)]]) : undefined),
    weekAgo: new Map([[1, avgOf(2200, 2000)]]),
    now: utc(2026, 9, 26)
  })

  it('orders posts newest first and drops failed poll questions', () => {
    expect(groups.map(g => g.post.title)).toEqual(['Poll', 'Raid blog'])
    expect(groups[0]?.rows.map(r => r.name)).toEqual(['Dragon bones'])
  })

  it('marks releases by a later game update only', () => {
    expect(groups[1]?.rows.map(r => [r.name, r.status, r.releasedIn])).toEqual([['Dragon bones', 'pending', null], ['Abyssal whip', 'released', 'Raid out now']])
  })

  it('computes moves, 7d change and the late flag', () => {
    const bones = groups[1]!.rows[0]!
    expect(bones).toMatchObject({ now: 2200, before: 1900, late: true, signal: { reason: 'new use' } })
    expect(bones.sincePost!).toBeGreaterThan(LATE_MOVE)
    expect(bones.change7d).toBeCloseTo(2200 / 2100 - 1)
    expect(groups[1]?.rows[1]?.late).toBe(false)
  })

  it('filters to items not out yet', () => {
    expect(pendingOnly(groups).map(g => g.rows.map(r => r.name))).toEqual([['Dragon bones'], ['Dragon bones']])
  })
})

describe('coming source parsing', () => {
  it('reads generator pages and rejects bad responses', () => {
    const body = { query: { pages: [{ title: 'Update:X', revisions: [{ slots: { main: { content: 'hi' } } }] }, { title: 'Update:Y' }] } }
    expect(pagesFrom(body)).toEqual([{ title: 'Update:X', content: 'hi' }])
    expect(pagesFrom({ batchcomplete: true })).toEqual([])
    expect(() => pagesFrom('nope')).toThrow(UpstreamError)
  })

  it('builds posts and release pages from fetched wiki pages', () => {
    const blogs = [
      { title: 'Update:Sailing blog', content: '{{Update|date=20 October 2026|category=future}}\n[[Dragon bones]] will be required to build hulls.' },
      { title: 'Update:Old blog', content: '{{Update|date=1 January 2026|category=future}}\n[[Dragon bones]] are required.' }
    ]
    const games = [{ title: 'Update:Weekly', content: '{{Update|date=22 October 2026|category=game}}\nThe [[Abyssal whip]] was rebalanced.' }]
    const data = comingFromPages({ blogs, games, polls: [] }, MAPPING, utc(2026, 7, 1))
    expect(data.posts.map(p => p.title)).toEqual(['Sailing blog'])
    expect(data.gameUpdates).toMatchObject([{ title: 'Weekly', kind: 'game', links: ['Abyssal whip'] }])
    expect(data.names.get('dragon bones')).toBe(536)
  })
})
