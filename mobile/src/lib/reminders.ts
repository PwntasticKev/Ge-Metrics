import * as Notifications from 'expo-notifications'

// Buy limits reset 4 hours after your first purchase. A local notification
// (no server) tells you when you can buy again.
export const BUY_LIMIT_WINDOW_MS = 4 * 60 * 60 * 1000

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false })
})

export async function canNotify (): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync()
  if (current.granted) return true
  if (!current.canAskAgain) return false
  return (await Notifications.requestPermissionsAsync()).granted
}

export async function scheduleLimitReminder (name: string, windowStart: number): Promise<string | null> {
  try {
    if (!(await canNotify())) return null
    const date = new Date(windowStart + BUY_LIMIT_WINDOW_MS)
    return await Notifications.scheduleNotificationAsync({
      content: { title: 'Buy limit reset', body: `You can buy a full limit of ${name} again.` },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date }
    })
  } catch (error) {
    console.warn('Could not schedule the buy limit reminder', error)
    return null
  }
}

export function cancelReminder (id: string | null): void {
  if (!id) return
  Notifications.cancelScheduledNotificationAsync(id).catch(error => {
    console.warn('Could not cancel the buy limit reminder', error)
  })
}
