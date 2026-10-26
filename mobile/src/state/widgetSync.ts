import type { ExtensionStorage as ExtensionStorageClass } from '@bacons/apple-targets'
import { geTax, type Market } from '@ge/engine'
import { useEffect, useMemo, useRef } from 'react'
import { Platform } from 'react-native'
import { useAverages } from '../api/useAverages'
import { useMarket } from '../api/useMarket'
import { usePicks } from '../lib/picks'
import { buildWidgetPayload, payloadContentKey, WIDGET_APP_GROUP, WIDGET_STORAGE_KEY } from '../lib/widget/payload'
import { useFlips } from './flips'
import { useWatchlist } from './watchlist'

// Mirrors Buy now picks, starred items and holdings into the App Group the
// iOS widget reads, then asks WidgetKit to redraw. Reloads requested while
// the app is in the foreground don't count against the widget's budget.
const IS_IOS = Platform.OS === 'ios'
// Loaded on iOS only: the module reads the native `expo` global at import.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ExtensionStorage: typeof ExtensionStorageClass | null = IS_IOS ? require('@bacons/apple-targets').ExtensionStorage : null
const storage = ExtensionStorage ? new ExtensionStorage(WIDGET_APP_GROUP) : null

// Any price over 50 gp pays tax unless the item is on the exemption list.
const isTaxExempt = (id: number) => geTax(1_000_000, id) === 0

const nameOf = (market: Market | null) => (id: number) => market?.get(id)?.name ?? null

function writePayload (json: string): void {
  try {
    if (!storage || !ExtensionStorage) return
    storage.set(WIDGET_STORAGE_KEY, json)
    ExtensionStorage.reloadWidget()
  } catch (error) {
    // The widget keeps its last data; the app works the same without it.
    console.warn('Widget data was not saved', error)
  }
}

export function useWidgetSync (): void {
  const { market } = useMarket()
  const { h1, h24 } = useAverages()
  const picks = usePicks(market, h1, h24, 'quick')
  const { entries } = useWatchlist()
  const { holdings } = useFlips()
  const lastKey = useRef<string | null>(null)

  const watchlistIds = useMemo(() => entries.flatMap(e => (e.kind === 'item' ? [e.id] : [])), [entries])

  useEffect(() => {
    // Wait for picks (cached averages load in about a second) so a cold
    // start doesn't blank the widget's last picks.
    if (!IS_IOS || !market || !picks) return
    const payload = buildWidgetPayload({ picks, watchlistIds, lots: holdings, nameOf: nameOf(market), isTaxExempt, now: Date.now() })
    const key = payloadContentKey(payload)
    if (key === lastKey.current) return
    lastKey.current = key
    writePayload(JSON.stringify(payload))
  }, [market, picks, watchlistIds, holdings])
}

export function WidgetSync (): null {
  useWidgetSync()
  return null
}
