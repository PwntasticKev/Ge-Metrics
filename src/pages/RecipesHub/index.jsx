import { lazy, Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Alert, Anchor, Badge, Box, Center, Group, Loader, Select, SegmentedControl, Switch, Tabs, Text, TextInput } from '@mantine/core'
import { IconAlertCircle, IconBook, IconChefHat, IconSearch } from '@tabler/icons-react'
import { DEFAULT_METHOD_KEY, MAX_ROWS, METHODS, findMethod, rankMethod } from './methodCatalog.js'
import { useWikiMarket } from './useWikiMarket.js'
import MethodsTable from './MethodsTable.jsx'

// The custom-recipe editor is big (modals, item pickers); only load it on its tab.
const UserRecipes = lazy(() => import('../Recipes/index.jsx'))

const METHOD_OPTIONS = METHODS.map(m => ({ value: m.key, label: m.title, group: m.group }))
const TAB_MINE = 'mine'
const TAB_WIKI = 'wiki'

function WikiMethods ({ methodKey, onMethodChange }) {
  const method = findMethod(methodKey)
  const { market, fetchedAt, isLoading, error } = useWikiMarket()
  const [sortBy, setSortBy] = useState(null)
  const [query, setQuery] = useState('')
  const [includeSuspicious, setIncludeSuspicious] = useState(false)
  const activeSort = method.sorts.some(s => s.value === sortBy) ? sortBy : method.defaultSort

  const ranked = useMemo(
    () => (market ? rankMethod(market, method, { sortBy: activeSort, query, includeSuspicious }) : []),
    [market, method, activeSort, query, includeSuspicious]
  )

  return (
    <Box>
      <Group align="flex-end" spacing="md" mb="sm">
        <Select
          label="Method"
          data={METHOD_OPTIONS}
          value={method.key}
          onChange={key => key && onMethodChange(key)}
          searchable
          maxDropdownHeight={420}
          sx={{ minWidth: 260 }}
        />
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
          label="Show suspicious margins"
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

export default function RecipesHub () {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === TAB_MINE ? TAB_MINE : TAB_WIKI
  const methodKey = params.get('method') ?? DEFAULT_METHOD_KEY

  const update = changes => {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    setParams(next, { replace: true })
  }

  return (
    <Box sx={{ py: 4 }}>
      <Group spacing="xs" mb={4}>
        <IconChefHat size={22} />
        <Text size="xl" weight={700}>Recipes</Text>
      </Group>
      <Text size="sm" color="dimmed" mb="md">
        Buy on the GE, make something, sell on the GE. Every recipe is priced live from the OSRS Wiki, after GE tax.
      </Text>

      <Tabs value={tab} onTabChange={value => update({ tab: value === TAB_MINE ? TAB_MINE : null })} keepMounted={false}>
        <Tabs.List mb="md">
          <Tabs.Tab value={TAB_WIKI}>Wiki recipes ({METHODS.length} methods)</Tabs.Tab>
          <Tabs.Tab value={TAB_MINE}>My recipes</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value={TAB_WIKI}>
          <WikiMethods methodKey={methodKey} onMethodChange={key => update({ method: key })} />
        </Tabs.Panel>
        <Tabs.Panel value={TAB_MINE}>
          <Text size="xs" color="dimmed" mb="sm">Your recipes are saved in this browser only.</Text>
          <Suspense fallback={<Center h={240}><Loader /></Center>}>
            <UserRecipes />
          </Suspense>
        </Tabs.Panel>
      </Tabs>
    </Box>
  )
}
