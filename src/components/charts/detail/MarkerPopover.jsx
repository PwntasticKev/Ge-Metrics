import React, { useEffect } from 'react'
import { ActionIcon, Anchor, Box, Group, Stack, Text } from '@mantine/core'
import { IconExternalLink, IconX } from '@tabler/icons-react'
import {
  markerGroup,
  markerImpact,
  formatDate,
  formatPct,
  formatSignedGp,
  changeColor
} from '../../../domain/priceChart/index.js'
import { CHART_COLORS, overlayCardStyle } from './chartTheme.js'

const MAX_SHOWN = 3
const WIDTH = 300

function Impact ({ label, change }) {
  return (
    <Group spacing={4} noWrap>
      <Text size="xs" style={{ color: CHART_COLORS.dimmed }}>{label}</Text>
      {change
        ? (
          <Text size="xs" weight={700} style={{ color: changeColor(change.changePct) }}>
            {formatPct(change.changePct)} ({formatSignedGp(change.change)})
          </Text>
          )
        : <Text size="xs" style={{ color: CHART_COLORS.dimmed }}>not enough data</Text>}
    </Group>
  )
}

function MarkerDetails ({ marker, itemName, points }) {
  const group = markerGroup(marker.group)
  const impact = markerImpact(marker, points)
  return (
    <Box data-testid="marker-details">
      <Group spacing={6} mb={2} noWrap>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: marker.color, flexShrink: 0 }} />
        <Text size="xs" weight={700} style={{ color: marker.color }}>{group.label}</Text>
        <Text size="xs" style={{ color: CHART_COLORS.dimmed }}>· {formatDate(marker.time)}</Text>
      </Group>
      <Text size="sm" weight={600} style={{ color: CHART_COLORS.strong, lineHeight: 1.25 }}>{marker.title}</Text>
      {marker.mentionsItem && (
        <Text size="xs" weight={700} mt={2} style={{ color: marker.color }}>Mentions {itemName || 'this item'}</Text>
      )}
      <Stack spacing={0} mt={4}>
        <Impact label="24h after" change={impact.day} />
        <Impact label="7d after" change={impact.week} />
      </Stack>
      {marker.url && (
        <Anchor href={marker.url} target="_blank" rel="noopener noreferrer" size="xs" mt={4} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          Read the news post <IconExternalLink size={12} />
        </Anchor>
      )}
    </Box>
  )
}

// Click-to-open details for one marker position (may hold several posts).
// `x` is relative to the positioned parent; the card is clamped inside it.
export default function MarkerPopover ({ markers, x, top, bottom, containerWidth, itemName, points, onClose }) {
  useEffect(() => {
    const onKey = event => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!markers?.length) return null
  const maxLeft = Math.max(8, (containerWidth || WIDTH) - WIDTH - 8)
  const left = Math.min(Math.max(x - WIDTH / 2, 8), maxLeft)
  const shown = markers.slice(0, MAX_SHOWN)

  return (
    <Box
      data-testid="marker-popover"
      onMouseDown={event => event.stopPropagation()}
      style={{ ...overlayCardStyle, position: 'absolute', left, top, bottom, width: WIDTH, zIndex: 30, borderColor: `${shown[0].color}99` }}
    >
      <ActionIcon
        size="xs"
        variant="subtle"
        onClick={onClose}
        aria-label="Close"
        data-testid="marker-popover-close"
        style={{ position: 'absolute', top: 6, right: 6, color: CHART_COLORS.dimmed }}
      >
        <IconX size={12} />
      </ActionIcon>
      <Stack spacing={10} pr={14}>
        {shown.map(marker => <MarkerDetails key={marker.id} marker={marker} itemName={itemName} points={points} />)}
        {markers.length > MAX_SHOWN && (
          <Text size="xs" style={{ color: CHART_COLORS.dimmed }}>+{markers.length - MAX_SHOWN} more on this day</Text>
        )}
      </Stack>
    </Box>
  )
}
