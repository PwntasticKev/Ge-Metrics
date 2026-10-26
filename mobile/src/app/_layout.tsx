// Defines the background alert task before any navigation runs.
import '../lib/alertTask'
import { focusManager } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router'
import { NativeTabs } from 'expo-router/native-tabs'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { AppState, Platform } from 'react-native'
import { AlertsWatcher } from '../components/AlertsWatcher'
import { CACHE_BUSTER, CACHE_MAX_AGE_MS, createQueryClient, persister, shouldPersist } from '../api/queryCache'
import { useOrientationLock } from '../state/orientation'
import { FlipsProvider } from '../state/flips'
import { ItemSheetProvider } from '../state/itemSheet'
import { SettingsProvider } from '../state/settings'
import { WatchlistProvider } from '../state/watchlist'
import { ThemeProvider, useTheme } from '../theme/ThemeProvider'

// Refetch prices when the app comes back to the foreground.
function useAppFocus () {
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (Platform.OS !== 'web') focusManager.setFocused(state === 'active')
    })
    return () => sub.remove()
  }, [])
}

function Tabs () {
  const { palette, isDark } = useTheme()
  // Navigation theme in our colors avoids a white flash when switching tabs.
  const base = isDark ? DarkTheme : DefaultTheme
  const navTheme = { ...base, colors: { ...base.colors, background: palette.bg, card: palette.bar, text: palette.ink, border: palette.rule, primary: palette.brand } }
  return (
    <NavigationThemeProvider value={navTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NativeTabs tintColor={palette.brand} backgroundColor={palette.bar}>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>Buy now</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'cart', selected: 'cart.fill' }} md="shopping_cart" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="sets">
          <NativeTabs.Trigger.Label>Sets</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }} md="grid_view" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="items">
          <NativeTabs.Trigger.Label>Items</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'circle.circle', selected: 'circle.circle.fill' }} md="toll" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="watchlist">
          <NativeTabs.Trigger.Label>Watchlist</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'star', selected: 'star.fill' }} md="star" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="tools">
          <NativeTabs.Trigger.Label>Tools</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'wand.and.stars', selected: 'wand.and.stars' }} md="auto_fix_high" />
        </NativeTabs.Trigger>
      </NativeTabs>
    </NavigationThemeProvider>
  )
}

function OrientationLock () {
  useOrientationLock()
  return null
}

export default function RootLayout () {
  const [queryClient] = useState(createQueryClient)
  useAppFocus()
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: CACHE_MAX_AGE_MS, buster: CACHE_BUSTER, dehydrateOptions: { shouldDehydrateQuery: shouldPersist } }}
    >
      <SettingsProvider>
        <ThemeProvider>
          <WatchlistProvider>
            <FlipsProvider>
              <ItemSheetProvider>
                <OrientationLock />
                <AlertsWatcher />
                <Tabs />
              </ItemSheetProvider>
            </FlipsProvider>
          </WatchlistProvider>
        </ThemeProvider>
      </SettingsProvider>
    </PersistQueryClientProvider>
  )
}
