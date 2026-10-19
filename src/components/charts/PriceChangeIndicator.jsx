import React, { useState, useMemo } from 'react'
import { Group, Badge, Button, Text } from '@mantine/core'

const WINDOWS = [
  { key: '1H', seconds: 3600 },
  { key: '6H', seconds: 21600 },
  { key: '1D', seconds: 86400 }
]

const findNearestPoint = (chartData, targetTimestamp, toleranceSeconds) => {
  let closest = null
  let minDiff = Infinity

  for (const point of chartData) {
    const diff = Math.abs(point.timestamp - targetTimestamp)
    if (diff < minDiff && diff <= toleranceSeconds) {
      minDiff = diff
      closest = point
    }
  }
  return closest
}

const PriceChangeIndicator = ({ chartData }) => {
  const [activeWindow, setActiveWindow] = useState('1D')

  const change = useMemo(() => {
    if (!chartData || chartData.length < 2) return null

    const latest = chartData[chartData.length - 1]
    const currentPrice = latest.high || latest.low
    if (!currentPrice) return null

    const windowConfig = WINDOWS.find(w => w.key === activeWindow)
    if (!windowConfig) return null

    // Allow 50% tolerance for finding nearest point
    const tolerance = windowConfig.seconds * 0.5
    const targetTs = latest.timestamp - windowConfig.seconds
    const pastPoint = findNearestPoint(chartData, targetTs, tolerance)

    if (!pastPoint) return null

    const pastPrice = pastPoint.high || pastPoint.low
    if (!pastPrice) return null

    const pctChange = ((currentPrice - pastPrice) / pastPrice) * 100
    return {
      pct: pctChange,
      isPositive: pctChange >= 0
    }
  }, [chartData, activeWindow])

  if (!change) return null

  const arrow = change.isPositive ? '\u25B2' : '\u25BC'
  const color = change.isPositive ? 'teal' : 'red'

  return (
    <Group spacing={4} noWrap>
      <Badge
        color={color}
        variant="light"
        size="sm"
        sx={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {arrow} {Math.abs(change.pct).toFixed(1)}%
      </Badge>
      <Group spacing={2} noWrap>
        {WINDOWS.map(w => (
          <Button
            key={w.key}
            size="xs"
            compact
            variant={activeWindow === w.key ? 'filled' : 'subtle'}
            color={activeWindow === w.key ? 'blue' : 'gray'}
            onClick={() => setActiveWindow(w.key)}
            styles={{ root: { padding: '0 4px', height: 20, minWidth: 28, fontSize: 10 } }}
          >
            {w.key}
          </Button>
        ))}
      </Group>
    </Group>
  )
}

export default PriceChangeIndicator
