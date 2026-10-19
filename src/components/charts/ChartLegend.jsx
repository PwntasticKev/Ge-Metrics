import React from 'react'
import { Group, Text, UnstyledButton } from '@mantine/core'

const LegendItem = ({ color, label, active, onClick }) => (
  <UnstyledButton
    onClick={onClick}
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '2px 8px',
      borderRadius: 4,
      opacity: active ? 1 : 0.35,
      transition: 'opacity 150ms ease',
      '&:hover': { opacity: active ? 0.85 : 0.5 }
    }}
  >
    <div
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: color,
        boxShadow: active ? `0 0 6px ${color}` : 'none'
      }}
    />
    <Text size="xs" color="dimmed" weight={500}>
      {label}
    </Text>
  </UnstyledButton>
)

const LEGEND_ITEMS = [
  { key: 'highPrice', color: '#f59e0b', label: 'Sell Price' },
  { key: 'lowPrice', color: '#3b82f6', label: 'Buy Price' },
  { key: 'sma20', color: '#22d3ee', label: 'SMA(20)' },
  { key: 'ema20', color: '#a78bfa', label: 'EMA(20)' },
  { key: 'buyVolume', color: '#3b82f6', label: 'Buy Vol' },
  { key: 'sellVolume', color: '#f59e0b', label: 'Sell Vol' }
]

const ChartLegend = ({ seriesVisibility, onToggle }) => (
  <Group spacing={2} noWrap>
    {LEGEND_ITEMS.map(({ key, color, label }) => (
      <LegendItem
        key={key}
        color={color}
        label={label}
        active={seriesVisibility[key]}
        onClick={() => onToggle(key)}
      />
    ))}
  </Group>
)

export default ChartLegend
