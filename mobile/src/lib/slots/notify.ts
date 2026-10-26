// Which slots should notify: advice that just turned into an action, with a
// per-slot cooldown so a price wobbling around a line can't spam. Pure.

import type { SlotAdvice } from './advice.ts'
import type { Slot } from './slots.ts'

/** Same default as alert rules. */
export const SLOT_COOLDOWN_MS = 60 * 60_000

export interface SlotNotice {
  slotId: string
  itemId: number
  title: string
  body: string
}

export interface NoticeResult {
  notices: SlotNotice[]
  slots: Slot[]
}

const sideWord = (slot: Slot) => (slot.side === 'buy' ? 'buy' : 'sell')

/**
 * Notifies a slot when its advice is an action different from the last one
 * it was told about, and its cooldown has passed. While cooling down the
 * slot keeps its old kind, so a change that sticks still notifies later.
 * Non-action advice resets the kind, so the next action is news again.
 */
export function slotNotices (slots: readonly Slot[], adviceOf: (slot: Slot) => SlotAdvice | null, now: number, cooldownMs = SLOT_COOLDOWN_MS): NoticeResult {
  const notices: SlotNotice[] = []
  const next = slots.map(slot => {
    const advice = adviceOf(slot)
    if (!advice || advice.kind === 'unknown') return slot
    if (!advice.action) return advice.kind === slot.lastKind ? slot : { ...slot, lastKind: advice.kind }
    if (advice.kind === slot.lastKind) return slot
    if (slot.notifiedAt !== null && now - slot.notifiedAt < cooldownMs) return slot
    notices.push({
      slotId: slot.id,
      itemId: slot.itemId,
      title: `${slot.name} ${sideWord(slot)}: ${advice.headline.toLowerCase()}`,
      body: advice.detail
    })
    return { ...slot, lastKind: advice.kind, notifiedAt: now }
  })
  return { notices, slots: next }
}
