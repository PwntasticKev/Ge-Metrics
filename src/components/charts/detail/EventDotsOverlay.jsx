import React from 'react'
import { Box } from '@mantine/core'

// Clickable news-marker dots drawn on the buy and sell lines of a
// Lightweight Charts price chart. `groups` = [{ time, markers, high, low }].
export default function EventDotsOverlay ({ groups, chart, highSeries, lowSeries, selectedTime, onSelect }) {
  if (!chart || !groups?.length) return null
  const timeScale = chart.timeScale()

  const dots = groups.flatMap(group => [
    { group, series: highSeries, value: group.high, key: `high-${group.time}` },
    { group, series: lowSeries, value: group.low, key: `low-${group.time}` }
  ])

  return (
    <Box style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none' }}>
      {dots.map(({ group, series, value, key }) => {
        const x = timeScale.timeToCoordinate(group.time)
        const y = Number.isFinite(value) ? series?.priceToCoordinate(value) : null
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null
        const lead = group.markers[0]
        const mentions = group.markers.some(m => m.mentionsItem)
        // Posts that mention the charted item are bigger and bolder
        const size = (mentions ? 12 : 8) + (group.time === selectedTime ? 4 : 0)
        return (
          <Box
            key={key}
            component="button"
            type="button"
            data-testid="event-dot"
            data-marker-group={lead.group}
            aria-label={`${lead.title}${group.markers.length > 1 ? ` and ${group.markers.length - 1} more` : ''}`}
            onMouseDown={event => event.stopPropagation()}
            onClick={event => { event.stopPropagation(); onSelect(group, x, y) }}
            style={{
              position: 'absolute',
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              padding: 0,
              border: 0,
              borderRadius: 999,
              background: lead.color,
              boxShadow: mentions ? '0 0 0 2px #fff, 0 0 0 4px rgba(0,0,0,0.35)' : '0 0 0 2px rgba(0,0,0,0.35)',
              cursor: 'pointer',
              pointerEvents: 'auto'
            }}
          />
        )
      })}
    </Box>
  )
}
