import { useMemo, useState } from 'react'
import { Alert, Anchor, Badge, Box, Center, Group, Loader, Select, SegmentedControl, Switch, Text, TextInput } from '@mantine/core'
import { IconAlertCircle, IconBook, IconSearch } from '@tabler/icons-react'
import { MAX_ROWS, METHODS, findMethod, rankMethod } from './methodCatalog.js'
import { useWikiMarket } from './useWikiMarket.js'
import MethodsTable from './MethodsTable.jsx'

const METHOD_OPTIONS = METHODS.map(m => ({ value: m.key, label: m.title, group: m.group }))

// One method's live-ranked recipes. `lockMethod` hides the method picker
// (e.g. the High Alchemy page shows only high alchemy).
export default function WikiMethods ({ methodKey, onMethodChange, lockMethod = false }) {
  const method = findMethod(methodKey)
  const { market, fetchedAt, isLoading, error } = useWikiMarket()
  const [sortBy, setSortBy] = useState(null)
  const [query, setQuery] = useState('')
  const [includeSuspicious, setIncludeSuspicious] = useState(false)
  const activeSort = method.sorts.some(s => s.value === sortBy) ? sortBy : method.defaultSort

  const ranked = useMemo(
    () => (market ? rankMethod(market, method, { sortBy: activeSort, query, includeSuspicious, includeStale: includeSuspicious }) : []),
    [market, method, activeSort, query, includeSuspicious]
  )

  return (
    <Box>
      <Group align="flex-end" spacing="md" mb="sm">
        {!lockMethod && (
        <Select
          label="Method"
          data={METHOD_OPTIONS}
          value={method.key}
          onChange={key => key && onMethodChange(key)}
          searchable
          maxDropdownHeight={420}
          sx={{ minWidth: 260 }}
        />
        )}
        <TextInput
          label="Search"
          placeholder="Filter by name"
          icon={<IconSearch size={14} />}
          value={query}
          onChange={e => setQuery(e.currentTarget.value)}
          sx={{ minWidth: 200 }}
        />
        <div>
          <Text size="sm" weight={500} mb={4}>Sort by</Text>
          <SegmentedControl data={method.sorts} value={activeSort} onChange={setSortBy} />
        </div>
        <Switch
          label="Show flagged (stale or suspicious)"
          checked={includeSuspicious}
          onChange={e => setIncludeSuspicious(e.currentTarget.checked)}
          mb={8}
        />
      </Group>

      <Text size="sm" color="dimmed">{method.blurb}</Text>
      {method.requirements && <Text size="xs" color="dimmed">Requirements: {method.requirements}</Text>}
      <Group spacing="xs" mt={4} mb="md">
        {method.source && (
          <Anchor href={method.source} target="_blank" rel="noopener noreferrer" size="xs">
            <Group spacing={4}><IconBook size={12} />Wiki source</Group>
          </Anchor>
        )}
        {fetchedAt && <Badge size="sm" variant="light">Prices {new Date(fetchedAt).toLocaleTimeString()}</Badge>}
        {market && <Badge size="sm" variant="light" color="green">{ranked.length} profitable</Badge>}
      </Group>

      {error && !market && (
        <Alert color="red" icon={<IconAlertCircle size={16} />}>
          Could not load prices from the OSRS Wiki. They will retry automatically.
        </Alert>
      )}
      {isLoading && <Center h={240}><Loader /></Center>}
      {market && (
        <>
          <MethodsTable flips={ranked.slice(0, MAX_ROWS)} showPerHour={method.sorts.some(s => s.value === 'perHour')} />
          {ranked.length > MAX_ROWS && (
            <Text size="xs" color="dimmed" mt="sm">Showing the top {MAX_ROWS} of {ranked.length}. Search to narrow it down.</Text>
          )}
        </>
      )}
    </Box>
  )
}
