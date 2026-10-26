import React from 'react'
import { Box, Group, Stack, Text } from '@mantine/core'
import { CHART_COLORS } from './chartTheme.js'

const MAX_SHOWN = 4

// News posts at the crosshair position (hover preview; click a dot for details).
export default function NewsHoverCard ({ markers, itemName, style }) {
  if (!markers?.length) return null
  return (
    <Box style={style}>
      <Box
        style={{
          background: 'rgba(26,27,30,0.92)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: 10,
          padding: '10px 12px',
          boxShadow: '0 12px 30px rgba(0,0,0,0.35)'
        }}
      >
        <Text size="xs" mb={6} style={{ color: CHART_COLORS.dimmed }}>News · click the dot for details</Text>
        <Stack spacing={6}>
          {markers.slice(0, MAX_SHOWN).map(marker => (
            <Group key={marker.id} spacing={8} align="flex-start" noWrap>
              <Box style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: marker.color, marginTop: 4, flexShrink: 0 }} />
              <Box style={{ flex: 1 }}>
                <Text size="sm" weight={marker.mentionsItem ? 700 : 500} style={{ lineHeight: 1.2, color: CHART_COLORS.strong }}>
                  {marker.title}
                </Text>
                {marker.mentionsItem && (
                  <Text size="xs" style={{ color: marker.color }}>Mentions {itemName || 'this item'}</Text>
                )}
              </Box>
            </Group>
          ))}
          {markers.length > MAX_SHOWN && (
            <Text size="xs" style={{ color: CHART_COLORS.dimmed }}>+{markers.length - MAX_SHOWN} more</Text>
          )}
        </Stack>
      </Box>
    </Box>
  )
}
