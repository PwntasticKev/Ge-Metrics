import * as ScreenOrientation from 'expo-screen-orientation'
import { useEffect } from 'react'
import { useSettings, type OrientationPreference } from './settings'

const LOCKS: Record<OrientationPreference, ScreenOrientation.OrientationLock> = {
  auto: ScreenOrientation.OrientationLock.DEFAULT,
  portrait: ScreenOrientation.OrientationLock.PORTRAIT_UP,
  landscape: ScreenOrientation.OrientationLock.LANDSCAPE
}

// Applies the orientation chosen on the Me tab to the whole app.
export function useOrientationLock () {
  const { settings } = useSettings()
  useEffect(() => {
    ScreenOrientation.lockAsync(LOCKS[settings.orientation]).catch(error => {
      console.warn('Could not change screen orientation', error)
    })
  }, [settings.orientation])
}
