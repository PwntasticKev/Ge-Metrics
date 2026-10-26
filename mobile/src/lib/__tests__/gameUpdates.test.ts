/// <reference types="node" />
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  baselineDay,
  buildMentionIndex,
  buildNameIndex,
  changeSince,
  extractLinks,
  latestItemPosts,
  markersInRange,
  mentionedItems,
  mergeUpdates,
  midPrice,
  normalizeTitle,
  parseUpdateDate,
  parseUpdatePage,
  postTime,
  type GameUpdate
} from '../gameUpdates.ts'

const PAGE = `{{Update|date=14 October 2026|url=https://secure.runescape.com/m=news/more-gathering-efficiencies?oldschool=1|category=game}}
[[File:More Gathering Efficiencies newspost.jpg|right]]
* The [[tackle box]] now holds [[Fishing bait|bait]] and [[Sandworms]].
* [[Abyssal_whip#Charged|whips]] and {{plink|Dragon bones}} drop more often in [[Varrock]].
[[Category:Game updates]] [[Update:Older post]] [[:Category:Foo]]`

const index = buildNameIndex([
  { id: 4151, name: 'Abyssal whip' },
  { id: 313, name: 'Fishing bait' },
  { id: 536, name: 'Dragon bones' },
  { id: 13431, name: 'Sandworms' }
])

const update = (title: string, day: string, kind: string, links: string[]): GameUpdate =>
  ({ title, date: parseUpdateDate(day) as number, url: null, kind, links })

describe('parseUpdateDate', () => {
  it('reads wiki dates, with or without a leading zero', () => {
    assert.equal(parseUpdateDate('14 October 2026'), Date.UTC(2026, 9, 14))
    assert.equal(parseUpdateDate('06 October 2026'), Date.UTC(2026, 9, 6))
  })
  it('rejects nonsense', () => {
    assert.equal(parseUpdateDate('October 14 2026'), null)
    assert.equal(parseUpdateDate('31 February 2026'), null)
    assert.equal(parseUpdateDate(''), null)
  })
})

describe('normalizeTitle', () => {
  it('matches wiki title rules', () => {
    assert.equal(normalizeTitle('abyssal_whip#Charged'), 'Abyssal whip')
    assert.equal(normalizeTitle('  Dragon  bones '), 'Dragon bones')
  })
})

describe('extractLinks', () => {
  it('collects plain, piped and plink links but skips namespaces', () => {
    assert.deepEqual(extractLinks(PAGE).sort(), ['Abyssal whip', 'Dragon bones', 'Fishing bait', 'Sandworms', 'Tackle box', 'Varrock'])
  })
})

const mentions = buildMentionIndex([
  { name: 'Abyssal whip' },
  { name: 'Bones' },
  { name: 'Prayer potion(4)' },
  { name: "Ava's assembler" }
])

describe('mentionedItems', () => {
  it('finds multi-word item names in plain text, ignoring case and markup', () => {
    const text = "{{Update|date=1 May 2026|category=game}}\nThe '''abyssal  whip''' and [[Ava's assembler|Ava's Assembler]] got buffs. Prayer potion(4) too. Bones are unchanged.\n[[File:Abyssal whip.png]]"
    assert.deepEqual(mentionedItems(text, mentions).sort(), ['Abyssal whip', "Ava's assembler", 'Prayer potion(4)'])
  })
})

describe('parseUpdatePage', () => {
  it('adds plain-text mentions to links when given a mention index', () => {
    const parsed = parseUpdatePage('Update:X', '{{Update|date=1 May 2026|category=game}} New drops: abyssal whip.', mentions)
    assert.deepEqual(parsed?.links, ['Abyssal whip'])
  })
  it('reads the Update template and links', () => {
    const parsed = parseUpdatePage('Update:More Gathering Efficiencies', PAGE)
    if (!parsed) throw new Error("expected a parsed update")
    assert.equal(parsed.title, 'More Gathering Efficiencies')
    assert.equal(parsed.date, Date.UTC(2026, 9, 14))
    assert.equal(parsed.kind, 'game')
    assert.equal(parsed.url, 'https://secure.runescape.com/m=news/more-gathering-efficiencies?oldschool=1')
    assert.ok(parsed.links.includes('Abyssal whip'))
  })
  it('reads dev blogs with extra params', () => {
    const parsed = parseUpdatePage('Update:Poll Blog', '{{Update|date=13 October 2026|rev=14 October 2026|url=https://x.test/a|category=future}}')
    assert.equal(parsed?.kind, 'future')
    assert.equal(parsed?.date, Date.UTC(2026, 9, 13))
  })
  it('drops non-https urls and pages without the template', () => {
    assert.equal(parseUpdatePage('Update:A', '{{Update|date=1 May 2026|url=javascript:alert(1)|category=game}}')?.url, null)
    assert.equal(parseUpdatePage('Update:B', 'no template here'), null)
  })
})

describe('mergeUpdates', () => {
  it('dedupes by title, sorts newest first and prunes old posts', () => {
    const old = update('Old', '1 January 2025', 'game', [])
    const a = update('A', '1 October 2026', 'game', ['x'])
    const a2 = { ...a, links: ['y'] }
    const b = update('B', '8 October 2026', 'future', [])
    const merged = mergeUpdates([old, a], [a2, b], Date.UTC(2026, 0, 1))
    assert.deepEqual(merged.map(u => u.title), ['B', 'A'])
    assert.deepEqual(merged[1].links, ['y'])
  })
})

describe('markers and movers', () => {
  const posts = [
    update('Blog', '13 October 2026', 'future', ['Varrock']),
    update('Fishing', '14 October 2026', 'game', ['Fishing bait', 'Abyssal whip']),
    update('Merch', '15 October 2026', 'community', ['Abyssal whip'])
  ]
  it('keeps price-moving posts in range and flags ones that mention the item', () => {
    const markers = markersInRange(posts, Date.UTC(2026, 9, 1), Date.UTC(2026, 9, 31), 4151, index)
    assert.deepEqual(markers.map(m => [m.title, m.mentionsItem]), [['Blog', false], ['Fishing', true]])
    assert.equal(markers[1].time, postTime(posts[1]))
  })
  it('lists the latest posts that link items', () => {
    const latest = latestItemPosts([...posts].reverse(), index, 5)
    assert.deepEqual(latest.map(p => [p.update.title, p.itemIds]), [['Fishing', [313, 4151]]])
  })
  it('compares against the day before the post', () => {
    assert.equal(baselineDay(posts[1]), Date.UTC(2026, 9, 13) / 1000)
    assert.equal(baselineDay(posts[1]) % 86400, 0)
  })
  it('computes mid prices and changes', () => {
    assert.equal(midPrice({ high: 110, low: 90 }), 100)
    assert.equal(midPrice({ high: null, low: 90 }), 90)
    assert.equal(midPrice(null), null)
    assert.equal(changeSince(100, 125), 0.25)
    assert.equal(changeSince(null, 125), null)
  })
})
