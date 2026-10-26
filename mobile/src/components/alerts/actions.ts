import type { AlertRule } from '../../lib/alerts'
import { withoutRule, withRule, withRuleEnabled } from '../../lib/alertState'
import { canNotify } from '../../lib/reminders'
import { updateAlerts } from '../../state/alerts'
import type { NewRule } from './AlertForm'

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

/** Saves the rule; resolves false when notifications are off, so the UI can say so. */
export async function addRule (input: NewRule): Promise<boolean> {
  const rule: AlertRule = { ...input, id: newId(), enabled: true, createdAt: Date.now(), lastTriggeredAt: null }
  await updateAlerts(state => withRule(state, rule))
  return canNotify()
}

export function removeRule (id: string): void {
  updateAlerts(state => withoutRule(state, id)).catch(error => console.warn('[alerts] could not remove the alert', error))
}

export function setRuleEnabled (id: string, enabled: boolean): void {
  updateAlerts(state => withRuleEnabled(state, id, enabled)).catch(error => console.warn('[alerts] could not update the alert', error))
}
