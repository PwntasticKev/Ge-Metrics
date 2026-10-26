// Which way a sentence in a dev blog or poll probably pushes an item's price.
// Plain keyword rules, checked in order; the first match wins. Tools always
// return the sentence next to the guess so a wrong guess is easy to spot.
// Ported from mobile/src/lib/updateSignals.ts.

export type Direction = 'up' | 'down'

export interface Signal {
  readonly direction: Direction
  /** Short reason: "new use", "more supply", ... */
  readonly reason: string
}

interface Rule {
  readonly test: RegExp
  readonly direction: Direction
  readonly reason: string
}

// Order matters: supply wording ("drop rate increased") must win over the
// generic buff/nerf words it contains.
const RULES: readonly Rule[] = [
  {
    test: /\bno longer (?:be )?(?:drop|dropped|obtain|obtainable|available|sold|purchas)|\bremov\w* from (?:the |its |their )?(?:drop table|shop|store)|\b(?:drop rate|drop chance|droprate)s?\b[^.]{0,40}\b(?:reduc|decreas|lower|nerf|halv)/i,
    direction: 'up',
    reason: 'less supply'
  },
  {
    test: /\b(?:drop rate|drop chance|droprate)s?\b[^.]{0,40}\b(?:increas|buff|boost|improv|doubl)|\b(?:increas|buff|boost|improv|doubl)\w*[^.]{0,30}\b(?:drop rate|drop chance|droprate)|\badded to [^.]{0,30}drop table|\bnow (?:drops?|be dropped|be obtained|obtainable)\b|\bnew (?:source|way to (?:get|obtain))|\b(?:can|will) (?:now )?be (?:obtained|found|bought|purchased|looted)\b|\b(?:sold|stocked) (?:by|in|at)\b|\bshop\b|\bmore common\b/i,
    direction: 'down',
    reason: 'more supply'
  },
  {
    test: /\b(?:used|needed|required) (?:to|for|in)\b|\brequires?\b|\bconsum\w*|\bingredient|\bto (?:make|create|craft|charge|repair|upgrade|fletch|brew|imbue)\b|\bcombin\w* with\b|\bin exchange for\b|\bcosts? \d|\bfuel\b/i,
    direction: 'up',
    reason: 'new use'
  },
  {
    test: /\bnerf\w*|\bweaker\b|\breduc\w*|\blower(?:ed|ing|s)?\b|\bdecreas\w*|\bremov\w*|\bno longer\b/i,
    direction: 'down',
    reason: 'nerf or removal'
  },
  {
    test: /\bbuff\w*|\bstronger\b|\bimprov\w*|\bincreas\w*|\bboost\w*|\bnow (?:provides?|gives?|grants?|offers?)\b|\bbest in slot\b|\bbis\b/i,
    direction: 'up',
    reason: 'buff'
  }
]

export function classifySignal (sentence: string): Signal | null {
  const rule = RULES.find(r => r.test.test(sentence))
  return rule ? { direction: rule.direction, reason: rule.reason } : null
}
