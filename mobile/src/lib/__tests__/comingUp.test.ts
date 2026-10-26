/// <reference types="node" />
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildComingUp, LATE_MOVE, pendingOnly, statusText, type ComingItem } from '../comingUp.ts'
import { cleanSentence, mentionsIn, parseComingPost, parsePollPage, parsePollQuestions, wikiSentences, withPlurals, type ComingPost, type ParseContext } from '../comingUpParse.ts'
import { buildMentionIndex, buildNameIndex, DAY_MS, type GameUpdate } from '../gameUpdates.ts'

const ITEMS = [
  { id: 1, name: 'Dragon bones' },
  { id: 2, name: 'Ascension shard' },
  { id: 3, name: 'Feather' },
  { id: 4, name: 'Abyssal whip' }
]
const ctx: ParseContext = { mentions: withPlurals(buildMentionIndex(ITEMS)), names: buildNameIndex(ITEMS) }

describe('wikiSentences', () => {
  it('splits lines and sentences and drops headings, files and templates', () => {
    const text = '==Heading==\n[[File:A.png|right|a [[link]]]]\n{{Clear}}\n* First point. Second point!\nlower. case stays'
    assert.deepEqual(wikiSentences(text), ['First point.', 'Second point!', 'lower. case stays'])
  })
  it('cleans link markup', () => {
    assert.equal(cleanSentence("'''Bold''' [[Dragon bones|bones]] and [https://x.com the site]."), 'Bold bones and the site.')
  })
})

describe('mentionsIn', () => {
  it('finds linked and written items, plurals included, with their sentence', () => {
    const text = 'Ascension shards are used to charge the folio. We added [[feather]]s to a shop. Slayer is fun.'
    const found = mentionsIn(text, ctx)
    assert.deepEqual(found.map(m => m.item), ['Ascension shard', 'Feather'])
    assert.equal(found[0].sentence, 'Ascension shards are used to charge the folio.')
  })
  it('prefers a sentence with a direction', () => {
    const text = 'The Abyssal whip is iconic. The Abyssal whip now provides more Strength.'
    assert.equal(mentionsIn(text, ctx)[0].sentence, 'The Abyssal whip now provides more Strength.')
  })
})

describe('parseComingPost', () => {
  it('keeps every sentence of a dev blog', () => {
    const post = parseComingPost('Update:Raid blog', '{{Update|date=6 October 2026|category=future}}\nDragon bones are required to enter.', ctx)
    assert.equal(post?.kind, 'future')
    assert.equal(post?.mentions[0].item, 'Dragon bones')
  })
  it('keeps only forward-looking lines of a game update', () => {
    const content = '{{Update|date=14 October 2026|category=game}}\nThe Abyssal whip was fixed.\nThe raid is coming next week with new Dragon bones uses.'
    const post = parseComingPost('Update:Weekly', content, ctx)
    assert.deepEqual(post?.mentions.map(m => m.item), ['Dragon bones'])
    assert.equal(parseComingPost('Update:Other', '{{Update|date=14 October 2026|category=game}}\nThe Abyssal whip was fixed.', ctx), null)
  })
})

const POLL = `{{PollNotice|1770|15 October 2026|22 October 2026}}
[https://secure.runescape.com/m=news/quest-month?oldschool=1 Visit the blog]
{{Poll
|Question = Should Dragon bones be used to make a new potion?
|Answer1 = Yes
|Votes1 = 9,000
|Answer2 = No
|Votes2 = 1000
|Answer3 = Skip question
|Votes3 = 50
}}
{{Poll
|Question = Should the Abyssal whip be buffed?
|Answer1 = Yes
|Votes1 = 600
|Answer2 = No
|Votes2 = 400
}}`

describe('polls', () => {
  it('reads questions and votes', () => {
    const qs = parsePollQuestions(POLL)
    assert.equal(qs.length, 2)
    assert.deepEqual([qs[0].yes, qs[0].no], [9000, 1000])
  })
  it('turns a poll page into a post', () => {
    const post = parsePollPage('Poll:Quest Month Rewards Poll', POLL, ctx)
    assert.equal(post?.title, 'Quest Month Rewards Poll')
    assert.equal(post?.kind, 'poll')
    assert.equal(post?.date, Date.UTC(2026, 9, 15))
    assert.equal(post?.closes, Date.UTC(2026, 9, 22))
    assert.equal(post?.url, 'https://secure.runescape.com/m=news/quest-month?oldschool=1')
    assert.deepEqual(post?.mentions.map(m => [m.item, m.pollShare]), [['Dragon bones', 0.9], ['Abyssal whip', 0.6]])
  })
})

describe('buildComingUp', () => {
  const POST_DATE = Date.UTC(2026, 9, 6)
  const NOW = Date.UTC(2026, 9, 26)
  const blog: ComingPost = {
    title: 'Raid blog',
    date: POST_DATE,
    url: null,
    kind: 'future',
    closes: null,
    mentions: [
      { item: 'Dragon bones', sentence: 'Dragon bones are required to enter.' },
      { item: 'Abyssal whip', sentence: 'The Abyssal whip is iconic.' },
      { item: 'Unknown thing', sentence: 'Not an item.' }
    ]
  }
  const poll: ComingPost = {
    title: 'Poll',
    date: Date.UTC(2026, 9, 15),
    url: null,
    kind: 'poll',
    closes: Date.UTC(2026, 9, 22),
    mentions: [
      { item: 'Dragon bones', sentence: 'Should Dragon bones be used?', pollShare: 0.9 },
      { item: 'Abyssal whip', sentence: 'Should the whip be buffed?', pollShare: 0.6 }
    ]
  }
  const items: Record<number, ComingItem> = {
    1: { id: 1, name: 'Dragon bones', icon: null, high: 2300, low: 2100, dailyVolume: 1e6 },
    4: { id: 4, name: 'Abyssal whip', icon: null, high: 1000, low: 1000, dailyVolume: 5000 }
  }
  const release: GameUpdate = { title: 'Raid out now', date: POST_DATE + 14 * DAY_MS, url: null, kind: 'game', links: ['Abyssal whip'] }
  const before: GameUpdate = { title: 'Older', date: POST_DATE - DAY_MS, url: null, kind: 'game', links: ['Dragon bones'] }
  const groups = buildComingUp([blog, poll], {
    names: ctx.names,
    getItem: id => items[id] ?? null,
    gameUpdates: [release, before],
    baselineFor: p => (p === blog ? { 1: { avgHighPrice: 2000, avgLowPrice: 1800 }, 4: { avgHighPrice: 1000, avgLowPrice: 1000 } } : undefined),
    weekAgo: { 1: { avgHighPrice: 2200, avgLowPrice: 2000 } },
    now: NOW
  })

  it('orders posts newest first and drops failed poll questions', () => {
    assert.deepEqual(groups.map(g => g.post.title), ['Poll', 'Raid blog'])
    assert.deepEqual(groups[0].rows.map(r => r.name), ['Dragon bones'])
  })
  it('marks released items by a later game update only', () => {
    const rows = groups[1].rows
    assert.deepEqual(rows.map(r => [r.name, r.status, r.releasedIn]), [['Dragon bones', 'pending', null], ['Abyssal whip', 'released', 'Raid out now']])
  })
  it('computes moves, 7d change and the late flag', () => {
    const bones = groups[1].rows[0]
    assert.equal(bones.now, 2200)
    assert.equal(bones.before, 1900)
    assert.ok((bones.sincePost ?? 0) > LATE_MOVE)
    assert.equal(bones.late, true)
    assert.ok(Math.abs((bones.change7d ?? 0) - 2200 / 2100 + 1) < 1e-9)
    assert.equal(bones.signal?.reason, 'new use')
    assert.equal(groups[1].rows[1].late, false)
  })
  it('filters to items not out yet', () => {
    assert.deepEqual(pendingOnly(groups).map(g => g.rows.map(r => r.name)), [['Dragon bones'], ['Dragon bones']])
  })
  it('describes the status', () => {
    assert.equal(statusText({ status: 'pending', pollShare: 0.9 }), 'passed 90%, not out yet')
    assert.equal(statusText({ status: 'voting', pollShare: null }), 'voting')
    assert.equal(statusText({ status: 'released', pollShare: null }), 'released')
  })
})
