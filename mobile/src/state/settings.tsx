import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { loadJson, saveJson } from './storage'

export type ThemePreference = 'system' | 'light' | 'dark'
export type OrientationPreference = 'auto' | 'portrait' | 'landscape'

const ORIENTATIONS: readonly OrientationPreference[] = ['auto', 'portrait', 'landscape']

export interface Settings {
  theme: ThemePreference
  orientation: OrientationPreference
  hideStale: boolean
  hideFlukes: boolean
  membersItems: boolean
  /** Cash available per 4-hour window; null means no limit. */
  budget: number | null
  /** The one-time "tap a set" tip has been dismissed. */
  seenSetsTip: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  orientation: 'portrait',
  hideStale: true,
  hideFlukes: true,
  membersItems: true,
  budget: null,
  seenSetsTip: false
}

const KEY = 'gem.settings.v1'

function isSettings (value: unknown): value is Partial<Settings> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

interface SettingsContextValue {
  settings: Settings
  update: (patch: Partial<Settings>) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider ({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)

  useEffect(() => {
    loadJson(KEY, {}, isSettings).then(stored => {
      const budget = typeof stored.budget === 'number' && stored.budget > 0 ? stored.budget : null
      const orientation = ORIENTATIONS.includes(stored.orientation as OrientationPreference) ? stored.orientation as OrientationPreference : DEFAULT_SETTINGS.orientation
      setSettings({ ...DEFAULT_SETTINGS, ...stored, budget, orientation })
    })
  }, [])

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      saveJson(KEY, next)
      return next
    })
  }, [])

  const value = useMemo(() => ({ settings, update }), [settings, update])
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings (): SettingsContextValue {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings must be used inside SettingsProvider')
  return context
}
