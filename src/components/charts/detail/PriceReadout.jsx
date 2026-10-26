import React from 'react'
import { Box, Group, Stack, Text } from '@mantine/core'
import { formatGp, formatDateTime, changeColor } from '../../../domain/priceChart/index.js'
import { CHART_COLORS, overlayCardStyle } from './chartTheme.js'

function Row ({ label, value, color, labelColor = CHART_COLORS.dimmed, size = 'sm' }) {
  return (
    <Group position="apart" spacing={12} noWrap>
      <Text size={size} style={{ color: labelColor }}>{label}</Text>
      <Text size={size} weight={600} style={{ color: color ?? CHART_COLORS.strong }}>{value}</Text>
    </Group>
  )
}

// Crosshair readout: time, buy/sell, margin after GE tax, per-side volume.
export default function PriceReadout ({ data, style }) {
  if (!data) return null
  return (
    <Box style={{ ...overlayCardStyle, minWidth: 200, ...style }} data-testid="price-readout">
      <Text size="xs" mb={4} style={{ color: CHART_COLORS.dimmed }}>{formatDateTime(data.timestamp)}</Text>
      <Stack spacing={2}>
        <Row label="Buy" labelColor={CHART_COLORS.buy} value={`${formatGp(data.buy)} gp`} />
        <Row label="Sell" labelColor={CHART_COLORS.sell} value={`${formatGp(data.sell)} gp`} />
        <Row
          label="Margin after tax"
          size="xs"
          value={data.margin == null ? '—' : `${formatGp(data.margin)} gp`}
          color={changeColor(data.margin)}
        />
        {data.tax > 0 && <Row label="GE tax" size="xs" value={`${formatGp(data.tax)} gp`} color={CHART_COLORS.dimmed} />}
        <Row label="Buy vol" size="xs" labelColor={CHART_COLORS.buy} value={formatGp(data.buyVolume)} />
        <Row label="Sell vol" size="xs" labelColor={CHART_COLORS.sell} value={formatGp(data.sellVolume)} />
      </Stack>
    </Box>
  )
}
