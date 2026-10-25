import React from 'react'
import { Group, SegmentedControl, Switch, TextInput } from '@mantine/core'
import { IconSearch } from '@tabler/icons-react'

export const SORT_OPTIONS = [
  { value: 'potential', label: '4h profit' },
  { value: 'profit', label: 'Profit each' },
  { value: 'roi', label: 'ROI' }
]

export default function FlipControls ({ search, onSearch, sortBy, onSort, hideStale, onHideStale, children }) {
  return (
    <Group spacing="sm" mb="md" position="apart">
      <Group spacing="sm">
        <TextInput
          placeholder="Search"
          icon={<IconSearch size={14} />}
          value={search}
          onChange={e => onSearch(e.currentTarget.value)}
          w={220}
          aria-label="Search"
        />
        <SegmentedControl value={sortBy} onChange={onSort} data={SORT_OPTIONS} aria-label="Sort by" />
        {children}
      </Group>
      <Switch
        label="Hide stale prices"
        checked={hideStale}
        onChange={e => onHideStale(e.currentTarget.checked)}
      />
    </Group>
  )
}

// Shared filter for both pages.
export function filterFlips (flips, { search, hideStale }) {
  const query = search.trim().toLowerCase()
  return flips.filter(flip =>
    (!hideStale || !flip.stale) &&
    (!query || flip.name.toLowerCase().includes(query))
  )
}
