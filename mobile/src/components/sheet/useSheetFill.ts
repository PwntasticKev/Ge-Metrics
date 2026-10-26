import { geTax, type MarketItem } from '@ge/engine'
import { useMemo } from 'react'
import { useAverages } from '../../api/useAverages'
import { useTimeseries } from '../../api/useTimeseries'
import { sheetFill, type SheetFill } from '../../lib/sheetFill'
import { useSettings } from '../../state/settings'

/**
 * The sheet's realistic flip (lib/sheetFill) for one item, from the bulk
 * averages at first and the 1h series (shared with the chart and timing
 * section) once it loads. `limit` is the engine's limit, assumed when unknown.
 */
export function useSheetFill (item: MarketItem | null, limit: number | null): SheetFill | null {
  const { h1, h24 } = useAverages()
  const { settings } = useSettings()
  const hourly = useTimeseries(item?.id ?? 0, '1h', item !== null)
  const series = hourly.data
  return useMemo(() => {
    if (!item || !limit) return null
    const key = String(item.id)
    return sheetFill({
      item: { id: item.id, high: item.high, low: item.low, limit },
      hour: h1?.[key],
      day: h24?.[key],
      series,
      maxSellHours: settings.maxSellHours,
      budget: settings.budget,
      tax: geTax
    })
  }, [item, limit, h1, h24, series, settings.maxSellHours, settings.budget])
}
