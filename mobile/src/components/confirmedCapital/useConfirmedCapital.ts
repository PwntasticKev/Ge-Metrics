import { useState } from 'react'
import { deriveCapitalPlan, type CashDeclaration } from '../../lib/confirmedCapital'
import { slotCount } from '../../lib/slots/slots'
import { useFlips } from '../../state/flips'
import { useSettings } from '../../state/settings'
import { useSlots } from '../../state/slots'
import { advanceActivity, capitalSnapshot, parseGp } from './activity'

/** Always mounted by Buy now, even while another mode is selected. No persistence. */
export function useConfirmedCapital () {
  const { slots, ready } = useSlots()
  const { holdings, flips } = useFlips()
  const { settings } = useSettings()
  // No age expiry: validation time advances only with an explicit declaration.
  const [validatedAt, setValidatedAt] = useState(Date.now)
  const [reserve, setReserve] = useState('')
  const [declaration, setDeclaration] = useState<CashDeclaration | null>(null)
  const snapshot = capitalSnapshot({ slots: slots.slots, holdings, sales: flips }, settings, reserve)
  const [activity, setActivity] = useState({ snapshot, revision: 0 })
  const current = advanceActivity(activity, snapshot)
  // Guard during render so no stale funded frame can appear before an effect runs.
  // Retain the monotonic revision: changing records back must not restore confirmation.
  if (current !== activity) setActivity(current)
  const reserveGp = parseGp(reserve, true)
  const capital = deriveCapitalPlan({
    declaration,
    activityRevision: current.revision,
    now: validatedAt,
    reserveGp: reserveGp ?? NaN,
    slotCount: slotCount(settings.membersItems),
    slots: slots.slots,
    holdings,
    sales: flips
  })
  const confirm = (amount: string): boolean => {
    const amountGp = parseGp(amount)
    if (!ready || amountGp === null || reserveGp === null) return false
    const now = Date.now()
    setValidatedAt(now)
    setDeclaration({ id: `screen-${now}`, amountGp, confirmedAt: now, activityRevision: current.revision })
    return true
  }
  return { capital, declaration, reserve, setReserve, confirm, ready }
}
