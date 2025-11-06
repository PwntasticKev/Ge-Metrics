import React from 'react'
import { Badge, Tooltip, Group, Text } from '@mantine/core'

const COLORS = {
  Stable: 'green',
  Moderate: 'yellow',
  Volatile: 'orange',
  Risky: 'red'
}

export default function RiskBadge ({ risk }) {
  if (!risk) return null
  const color = COLORS[risk.label] || 'gray'
  const content = (
    <div>
      <Text size="sm" fw={600} mb={4}>Risk breakdown</Text>
      <Text size="xs">Liquidity: {risk.breakdown.liquidity}%</Text>
      <Text size="xs">Volatility: {risk.breakdown.volatility}%</Text>
      <Text size="xs">Spikes: {risk.breakdown.spikes}%</Text>
      <Text size="xs">Gaps: {risk.breakdown.gaps}%</Text>
      <Text size="xs" mt={6} c="dimmed">Score: {risk.score}</Text>
    </div>
  )
  return (
    <Group gap={4}>
      <Tooltip label={content} withinPortal position="top" withArrow>
        <Badge color={color} variant="filled" radius="md">{risk.label}</Badge>
      </Tooltip>
    </Group>
  )
}
