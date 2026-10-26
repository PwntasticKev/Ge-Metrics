import React from 'react'
import { Group, Text, UnstyledButton } from '@mantine/core'
import { MARKER_GROUPS, toggleGroup } from '../../../domain/priceChart/index.js'

const hexAlpha = (hex, alpha) => `${hex}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`

// Category chips for the news markers. `counts` = markers per group in view.
export default function MarkerFilterChips ({ value, onChange, counts = {}, label = 'Markers', dark = false }) {
  return (
    <Group spacing={6} noWrap={false} data-testid="marker-filter-chips">
      {label && <Text size="xs" weight={600} color="dimmed" mr={2}>{label}</Text>}
      {MARKER_GROUPS.map(group => {
        const on = value.includes(group.key)
        const count = counts[group.key]
        return (
          <UnstyledButton
            key={group.key}
            onClick={() => onChange(toggleGroup(value, group.key))}
            aria-pressed={on}
            data-testid={`marker-chip-${group.key}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '2px 10px',
              borderRadius: 999,
              fontSize: 12,
              lineHeight: '18px',
              border: `1px solid ${on ? group.color : (dark ? 'rgba(255,255,255,0.15)' : 'rgba(134,142,150,0.4)')}`,
              background: on ? hexAlpha(group.color, 0.16) : 'transparent',
              color: on ? group.color : '#868e96',
              fontWeight: on ? 600 : 500
            }}
          >
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: on ? group.color : 'transparent',
              border: `1px solid ${group.color}`
            }} />
            {group.label}
            {Number.isFinite(count) && <span style={{ opacity: 0.7 }}>{count}</span>}
          </UnstyledButton>
        )
      })}
    </Group>
  )
}
