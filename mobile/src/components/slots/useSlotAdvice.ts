import { geTax } from '@ge/engine'
import { useMemo } from 'react'
import { useAverages } from '../../api/useAverages'
import { useMarket } from '../../api/useMarket'
import { adviceFromPrices, type SlotAdvice } from '../../lib/slots/advice'
import { slotCount, type Slot } from '../../lib/slots/slots'
import { useNow } from '../../lib/useNow'
import { useSettings } from '../../state/settings'
import { useSlots } from '../../state/slots'

/** Live advice per slot id; refreshes with prices and every minute. Empty until prices load. */
export function useSlotAdvice (slots: readonly Slot[]): ReadonlyMap<string, SlotAdvice> {
  const { market } = useMarket()
  const { h1, h24 } = useAverages()
  const now = useNow()
  return useMemo(() => {
    if (!market) return new Map()
    const prices = { live: (id: number) => market.get(id), h1, h24 }
    return new Map(slots.map(slot => [slot.id, adviceFromPrices(slot, prices, now, geTax)]))
  }, [slots, market, h1, h24, now])
}

export interface SlotsSummary {
  active: number
  total: number
  needsAction: number
  /** "3/8 slots active · 1 needs action" */
  text: string
}

export function useSlotsSummary (): SlotsSummary {
  const { slots } = useSlots()
  const { settings } = useSettings()
  const advice = useSlotAdvice(slots.slots)
  const total = slotCount(settings.membersItems)
  const active = slots.slots.length
  const needsAction = [...advice.values()].filter(a => a.action).length
  const base = `${active}/${total} slots active`
  return { active, total, needsAction, text: needsAction ? `${base} · ${needsAction} need${needsAction === 1 ? 's' : ''} action` : base }
}
