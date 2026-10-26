import * as BackgroundTask from 'expo-background-task'
import * as TaskManager from 'expo-task-manager'
import { Platform } from 'react-native'
import { runAlertCheck } from './alertCheck'
import { runSlotCheck } from './slotCheck'

// Background alert and GE slot checks. iOS (BGTaskScheduler) decides when this runs:
// at best every 15 minutes or so, often less, and never after the user
// swipes the app away. One /latest request covers every item.
export const ALERT_TASK = 'gem-alert-check'
const MINIMUM_INTERVAL_MIN = 15

// Must be defined at module scope, before any navigation runs; imported
// from the root layout.
if (Platform.OS !== 'web') {
  TaskManager.defineTask(ALERT_TASK, async () => {
    try {
      const [{ error }] = await Promise.all([
        runAlertCheck('background'),
        runSlotCheck().catch(slotError => console.warn('[slots] background check failed', slotError))
      ])
      return error ? BackgroundTask.BackgroundTaskResult.Failed : BackgroundTask.BackgroundTaskResult.Success
    } catch (error) {
      console.warn('[alerts] background check failed', error)
      return BackgroundTask.BackgroundTaskResult.Failed
    }
  })
}

/** Registers the task while any alert (or slot notification) is on, and removes it when none are. */
export async function syncAlertTask (wanted: boolean): Promise<void> {
  if (Platform.OS === 'web') return
  try {
    const registered = await TaskManager.isTaskRegisteredAsync(ALERT_TASK)
    if (wanted && !registered) await BackgroundTask.registerTaskAsync(ALERT_TASK, { minimumInterval: MINIMUM_INTERVAL_MIN })
    if (!wanted && registered) await BackgroundTask.unregisterTaskAsync(ALERT_TASK)
  } catch (error) {
    console.warn('[alerts] could not update the background task', error)
  }
}

export async function backgroundAvailable (): Promise<boolean> {
  if (Platform.OS === 'web') return false
  try {
    return (await BackgroundTask.getStatusAsync()) === BackgroundTask.BackgroundTaskStatus.Available
  } catch {
    return false
  }
}

/** Debug builds only: asks iOS to run the task now (physical devices only on iOS). */
export async function triggerAlertTaskForTesting (): Promise<boolean> {
  return BackgroundTask.triggerTaskWorkerForTestingAsync()
}
