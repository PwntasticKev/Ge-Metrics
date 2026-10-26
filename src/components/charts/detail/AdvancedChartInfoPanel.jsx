import React from 'react'
import { Badge, Box, Group, Stack, Text } from '@mantine/core'
import { marginAfterTax, markerGroup, formatGp, changeColor } from '../../../domain/priceChart/index.js'
import { geTax } from '../../../domain/flipping/geTax.js'
import { CHART_COLORS } from './chartTheme.js'

const COLORS = { ...CHART_COLORS, sma: '#22d3ee', ema: '#a78bfa' }
const fmt = value => new Intl.NumberFormat().format(value)

function Section ({ title, children }) {
  return (
    <div>
      <Text size="xs" color="dimmed" transform="uppercase" weight={700} spacing={1}>{title}</Text>
      <Stack spacing={4}>{children}</Stack>
    </div>
  )
}

function Row ({ label, value, labelColor, valueColor = 'white', weight = 600, size = 'sm' }) {
  return (
    <Group position="apart" spacing={4} noWrap>
      <Text size={size} color={labelColor}>{label}</Text>
      <Text size={size} weight={weight} color={valueColor}>{value}</Text>
    </Group>
  )
}

// Side panel of the graph modal: crosshair readout + nearby news post.
export default function AdvancedChartInfoPanel ({ data, seriesVisibility, itemName, itemId }) {
  if (!data) {
    return (
      <Stack spacing="xs" p="md" align="center" justify="center" h="100%">
        <Text color="dimmed" size="sm">Hover chart for details</Text>
      </Stack>
    )
  }

  const margin = marginAfterTax(data.buy, data.sell, itemId)
  const tax = Number.isFinite(data.sell) ? geTax(data.sell, Number(itemId)) : 0
  const marker = data.updateData

  return (
    <Stack spacing="md" p="md" h="100%" style={{ borderLeft: '1px solid rgba(255,255,255,0.05)', overflowY: 'auto' }} data-testid="info-panel">
      <div>
        <Text size="xs" color="dimmed" transform="uppercase" weight={700} spacing={1}>Date</Text>
        <Text size="lg" weight={600} color="white">{data.dateFormatted}</Text>
        <Text size="xs" color="dimmed">{data.dateObj?.toLocaleString()}</Text>
      </div>

      {(data.high !== undefined || data.low !== undefined) && (
        <Section title="Price">
          {seriesVisibility.highPrice && data.high !== undefined && (
            <Row label="Sell:" labelColor={COLORS.sell} value={fmt(data.high)} valueColor={COLORS.sell} weight={700} />
          )}
          {seriesVisibility.lowPrice && data.low !== undefined && (
            <Row label="Buy:" labelColor={COLORS.buy} value={fmt(data.low)} valueColor={COLORS.buy} weight={700} />
          )}
          <Row
            label="Margin after tax:"
            size="xs"
            labelColor="dimmed"
            value={margin == null ? '—' : formatGp(margin)}
            valueColor={changeColor(margin)}
          />
          {tax > 0 && <Row label="GE tax:" size="xs" labelColor="dimmed" value={formatGp(tax)} valueColor="dimmed" />}
        </Section>
      )}

      {(seriesVisibility.sma20 || seriesVisibility.ema20) && (
        <Section title="Indicators">
          {seriesVisibility.sma20 && data.sma20 && (
            <Row label="SMA(20):" labelColor={COLORS.sma} value={fmt(Math.round(data.sma20))} />
          )}
          {seriesVisibility.ema20 && data.ema20 && (
            <Row label="EMA(20):" labelColor={COLORS.ema} value={fmt(Math.round(data.ema20))} />
          )}
        </Section>
      )}

      {(data.sellVolume !== undefined || data.buyVolume !== undefined) && (
        <Section title="Volume">
          {seriesVisibility.sellVolume && <Row label="Sell Vol:" labelColor={COLORS.sell} value={fmt(data.sellVolume || 0)} />}
          {seriesVisibility.buyVolume && <Row label="Buy Vol:" labelColor={COLORS.buy} value={fmt(data.buyVolume || 0)} />}
        </Section>
      )}

      {marker && (
        <Box mt="sm" p="xs" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>
          <Badge variant="filled" size="sm" mb={4} style={{ backgroundColor: marker.color }}>
            {markerGroup(marker.group).label}
          </Badge>
          <Text size="sm" weight={600} color="white">{marker.title}</Text>
          {marker.mentionsItem && (
            <Text size="xs" weight={700} color={marker.color} mt={2}>Mentions {itemName || 'this item'}</Text>
          )}
          <Text size="xs" color="dimmed" mt={2}>Click the marker for details</Text>
        </Box>
      )}
    </Stack>
  )
}
