import React from 'react'
import { ComposedChart, ReferenceLine, ResponsiveContainer, Scatter, XAxis, YAxis } from 'recharts'

const CROSSHAIR = '#6B7280'

// Recharts strip of news markers under the price chart. Same margins and
// right-hand axis gutter as the price chart so the dots line up with it.
export default function EventsStrip ({ data, domain, activeTimestamp, grace, selectedId, onSelect, onHover }) {
  const renderDot = ({ cx, cy, payload }) => {
    if (!cx || !cy || !payload?.updateData) return null
    const marker = payload.updateData
    const near = activeTimestamp != null && Math.abs(activeTimestamp - payload.timestamp) <= grace
    const isHovered = near || marker.id === selectedId
    // Posts that mention the charted item are drawn bigger and bolder.
    const emphasis = marker.mentionsItem ? 1.5 : 1
    return (
      <g
        data-testid="event-dot"
        data-marker-group={marker.group}
        style={{ cursor: 'pointer' }}
        onMouseEnter={() => onHover(marker, payload.timestamp)}
        onMouseDown={event => event.stopPropagation()}
        onClick={event => { event.stopPropagation(); onSelect(marker, cx) }}
      >
        <circle cx={cx} cy={cy} r={(isHovered ? 12 : 8) * emphasis} fill={marker.color} opacity={isHovered ? 0.5 : 0.3} />
        <circle cx={cx} cy={cy} r={(isHovered ? 7 : 5) * emphasis} fill={marker.color} opacity={isHovered ? 0.8 : 0.6} />
        <circle
          cx={cx}
          cy={cy}
          r={(isHovered ? 4 : 3) * emphasis}
          fill={marker.color}
          stroke="white"
          strokeWidth={(isHovered ? 2 : 1) * emphasis}
        />
      </g>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
        <XAxis dataKey="timestamp" type="number" domain={domain} hide allowDataOverflow />
        <YAxis orientation="right" domain={[0, 100]} tick={false} axisLine={false} tickLine={false} />
        {activeTimestamp && (
          <ReferenceLine x={activeTimestamp} stroke={CROSSHAIR} strokeWidth={1} strokeDasharray="2 2" />
        )}
        {data.length > 0 && <Scatter dataKey="y" fill="none" shape={renderDot} isAnimationActive={false} />}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
