import * as Haptics from 'expo-haptics'
import { useCallback } from 'react'
import { canNotify } from '../../lib/reminders'
import { averageFillPrice, createSlot, MEMBERS_SLOT_COUNT, freeSlots, setFilled, slotCount, updateOffer, withoutSlot, withSlot, type NewSlot, type Slot } from '../../lib/slots/slots'
import { useFlips } from '../../state/flips'
import { useSettings } from '../../state/settings'
import { updateSlots } from '../../state/slots'

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export type PlaceResult = { ok: true; slot: Slot } | { ok: false; error: string }

/**
 * Everything that changes a GE slot. Buy fills go straight onto the Bought
 * list; a sell slot that came from a Bought lot records the sale in the
 * Profit journal when it's closed.
 */
export function useSlotActions () {
  const { settings } = useSettings()
  const { applyFill, sellHolding } = useFlips()
  const members = settings.membersItems

  const place = useCallback(async (input: NewSlot): Promise<PlaceResult> => {
    try {
      const { result } = await updateSlots<PlaceResult>(state => {
        if (!freeSlots(state, members)) {
          return { state, result: { ok: false, error: `All ${slotCount(members)} GE slots are in use. Close one first.` } }
        }
        const slot = createSlot({ ...input, lotId: input.side === 'buy' ? newId() : input.lotId ?? null }, newId(), Date.now())
        if (!slot) return { state, result: { ok: false, error: 'That price or amount isn\'t valid.' } }
        return { state: withSlot(state, slot), result: { ok: true, slot } }
      })
      if (result?.ok) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      return result ?? { ok: false, error: 'Couldn\'t save the slot.' }
    } catch (error) {
      console.warn('[slots] could not place an offer', error)
      return { ok: false, error: 'Couldn\'t save the slot.' }
    }
  }, [members])

  const fill = useCallback(async (id: string, filled: number) => {
    const { result } = await updateSlots<{ slot: Slot; delta: number }>(state => {
      const slot = state.slots.find(s => s.id === id)
      if (!slot) return { state }
      const next = setFilled(slot, filled)
      return { state: next.delta ? withSlot(state, next.slot) : state, result: { slot, delta: next.delta } }
    })
    if (!result?.delta) return
    Haptics.selectionAsync()
    const { slot, delta } = result
    if (slot.side === 'buy' && slot.lotId) {
      applyFill({ lotId: slot.lotId, itemId: slot.itemId, name: slot.name, icon: slot.icon, delta, price: slot.price })
    }
  }, [applyFill])

  /** Resolves false when the new price or amount isn't valid. */
  const update = useCallback(async (id: string, price: number, qty: number): Promise<boolean> => {
    const { result } = await updateSlots<boolean>(state => {
      const slot = state.slots.find(s => s.id === id)
      const next = slot ? updateOffer(slot, price, qty, Date.now()) : null
      return next ? { state: withSlot(state, next), result: true } : { state, result: false }
    })
    if (result) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    return result === true
  }, [])

  const close = useCallback(async (id: string) => {
    const { result } = await updateSlots<Slot>(state => {
      const slot = state.slots.find(s => s.id === id)
      return slot ? { state: withoutSlot(state, id), result: slot } : { state }
    })
    if (result?.side === 'sell' && result.lotId && result.filled > 0) {
      sellHolding(result.lotId, averageFillPrice(result), result.filled)
    }
  }, [sellHolding])

  /** Resolves to whether notifications are allowed. */
  const setNotify = useCallback(async (on: boolean): Promise<boolean> => {
    const allowed = on ? await canNotify() : true
    await updateSlots(state => ({ state: { ...state, notify: on && allowed } }))
    return allowed
  }, [])

  const addSamples = useCallback(async (slots: Slot[]) => {
    await updateSlots(state => {
      const merged = slots.reduce(withSlot, state)
      return { state: { ...merged, slots: merged.slots.slice(0, MEMBERS_SLOT_COUNT) } }
    })
  }, [])

  return { place, fill, update, close, setNotify, addSamples, newId }
}
