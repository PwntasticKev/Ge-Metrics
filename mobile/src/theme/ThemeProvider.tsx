import { createContext, useContext, type ReactNode } from 'react'
import { useColorScheme } from 'react-native'
import { useSettings } from '../state/settings'
import { DARK, LIGHT, type Palette } from './tokens'

interface ThemeValue {
  palette: Palette
  isDark: boolean
}

const ThemeContext = createContext<ThemeValue>({ palette: LIGHT, isDark: false })

// Follows the phone's appearance unless the user picks one in Me.
export function ThemeProvider ({ children }: { children: ReactNode }) {
  const system = useColorScheme()
  const { settings } = useSettings()
  const isDark = settings.theme === 'system' ? system === 'dark' : settings.theme === 'dark'
  return (
    <ThemeContext.Provider value={{ palette: isDark ? DARK : LIGHT, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme (): ThemeValue {
  return useContext(ThemeContext)
}
