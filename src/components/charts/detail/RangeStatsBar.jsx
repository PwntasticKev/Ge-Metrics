import React from 'react'
import { Button, Group, Text, Tooltip } from '@mantine/core'
import { IconZoomOut } from '@tabler/icons-react'
import { formatCompact, formatGp, formatPct, formatDateTime, changeColor } from '../../../domain/priceChart/index.js'
import { CHART_COLORS } from './chartTheme.js'

// % change, high/low and volume for the visible window, plus zoom reset.
export default function RangeStatsBar ({ stats, zoomed, onReset, dark = false }) {
  const valueColor = dark ? CHART_COLORS.strong : undefined
  return (
    <Group spacing="md" noWrap data-testid="range-stats">
      {stats && (
        <>
          <Tooltip label={`${formatGp(stats.first)} → ${formatGp(stats.last)} gp (mid price)`} withArrow>
            <Group spacing={4} noWrap>
              <Text size="xs" color="dimmed">{zoomed ? 'Zoom' : 'Range'}</Text>
              <Text size="sm" weight={700} style={{ color: changeColor(stats.changePct) }} data-testid="range-change">
                {formatPct(stats.changePct)}
              </Text>
            </Group>
          </Tooltip>
          <Tooltip label={`Highest sell · ${formatDateTime(stats.max.timestamp)}`} withArrow>
            <Group spacing={4} noWrap>
              <Text size="xs" style={{ color: CHART_COLORS.sell }}>High</Text>
              <Text size="sm" weight={600} style={{ color: valueColor }}>{formatCompact(stats.max.price)}</Text>
            </Group>
          </Tooltip>
          <Tooltip label={`Lowest buy · ${formatDateTime(stats.min.timestamp)}`} withArrow>
            <Group spacing={4} noWrap>
              <Text size="xs" style={{ color: CHART_COLORS.buy }}>Low</Text>
              <Text size="sm" weight={600} style={{ color: valueColor }}>{formatCompact(stats.min.price)}</Text>
            </Group>
          </Tooltip>
          <Group spacing={4} noWrap>
            <Text size="xs" color="dimmed">Vol</Text>
            <Text size="sm" weight={600} style={{ color: valueColor }}>
              {formatCompact(stats.buyVolume + stats.sellVolume)}
            </Text>
          </Group>
        </>
      )}
      {zoomed && (
        <Button
          leftIcon={<IconZoomOut size={12} />}
          size="xs"
          variant="light"
          color="orange"
          compact
          onClick={onReset}
          data-testid="zoom-reset"
        >
          Reset zoom
        </Button>
      )}
    </Group>
  )
}
