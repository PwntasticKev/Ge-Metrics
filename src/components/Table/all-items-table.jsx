import { useEffect, useState } from 'react'
import {
  Button,
  createStyles,
  Flex,
  Image,
  Pagination,
  rem,
  ScrollArea,
  Table,
  Text,
  TextInput,
  useMantineTheme,
  Group,
  Select,
  NumberInput,
  Checkbox,
  Card,
  Collapse,
  ActionIcon,
  Badge,
  Stack
} from '@mantine/core'
import {
  IconChartHistogram,
  IconReceipt,
  IconSearch,
  IconFilter,
  IconFilterOff,
  IconChevronDown,
  IconChevronUp
} from '@tabler/icons-react'
import { Link, useLocation } from 'react-router-dom'
import UsrTransactionModal from '../../shared/modals/user-transaction.jsx'
import GraphModal from '../../shared/modals/graph-modal.jsx'
import MiniChart from '../charts/MiniChart.jsx'

const useStyles = createStyles((theme) => ({
  th: {
    padding: '0 !important'
  },

  control: {
    width: '100%',
    padding: `${theme.spacing.xs} ${theme.spacing.md}`,

    '&:hover': {
      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0]
    }
  },

  icon: {
    width: rem(21),
    height: rem(21),
    borderRadius: rem(21)
  },

  header: {
    position: 'sticky',
    top: 0,
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
    transition: 'box-shadow 150ms ease',
    zIndex: 2,

    '&::after': {
      content: '""',
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      borderBottom: `${rem(1)} solid ${
                theme.colorScheme === 'dark' ? theme.colors.dark[3] : theme.colors.gray[2]
            }`
    }
  },

  scrolled: {
    boxShadow: theme.shadows.sm
  },

  image: {
    maxWidth: '40%',

    [theme.fn.smallerThan('sm')]: {
      maxWidth: '100%'
    }
  }
}))

// Enhanced filter data function with advanced filtering
function filterData (data, filters) {
  const {
    search,
    thirdAge,
    volumeFilter,
    raidsItems,
    priceMin,
    priceMax,
    profitMin,
    profitMax
  } = filters

  return data.filter((item) => {
    // Basic search filter
    if (search) {
      const query = search.toLowerCase().trim()
      const matchesSearch = Object.keys(item).some((key) => {
        const value = item[key]
        if (typeof value === 'string') {
          return value.toLowerCase().includes(query)
        }
        return false
      })
      if (!matchesSearch) return false
    }

    // Third Age filter
    if (thirdAge && !item.name.toLowerCase().includes('3rd age')) {
      return false
    }

    // Volume filter (based on buy limit as proxy for volume)
    if (volumeFilter) {
      const limit = parseInt(item.limit?.replace(/,/g, '') || '0')
      if (volumeFilter === 'low' && limit >= 100) return false
      if (volumeFilter === 'high' && limit < 1000) return false
    }

    // Raids items filter
    if (raidsItems) {
      const raidsKeywords = [
        'twisted', 'ancestral', 'kodai', 'elder maul', 'dragon claws',
        'dinh', 'justiciar', 'avernic', 'ghrazi', 'sanguinesti',
        'scythe', 'bow of faerdhinen', 'crystal armor', 'blade of saeldor',
        'inquisitor', 'nightmare staff', 'volatile', 'eldritch', 'harmonised',
        'tumeken', 'shadow', 'masori', 'lightbearer', 'torva', 'virtus'
      ]
      const isRaidsItem = raidsKeywords.some(keyword =>
        item.name.toLowerCase().includes(keyword)
      )
      if (!isRaidsItem) return false
    }

    // Price range filters
    if (priceMin !== null || priceMax !== null) {
      const price = parseInt((item.high || '0').replace(/,/g, ''))
      if (priceMin && price < priceMin) return false
      if (priceMax && price > priceMax) return false
    }

    // Profit range filters
    if (profitMin !== null || profitMax !== null) {
      const profit = parseInt((item.profit || '0').replace(/,/g, ''))
      if (profitMin && profit < profitMin) return false
      if (profitMax && profit > profitMax) return false
    }

    return true
  })
}

function sortData (data, payload) {
  const { sortBy, reversed } = payload

  if (!sortBy) {
    return filterData(data, payload.filters)
  }

  return filterData(
    [...data].sort((a, b) => {
      const aValue = a[sortBy] || ''
      const bValue = b[sortBy] || ''
      if (reversed) {
        return bValue.localeCompare(aValue)
      }
      return aValue.localeCompare(bValue)
    }),
    payload.filters
  )
}

export function AllItemsTable ({ data }) {
  const theme = useMantineTheme()
  const location = useLocation()
  const { classes, cx } = useStyles()

  // Basic state
  const [search, setSearch] = useState('')
  const [sortedData, setSortedData] = useState(data)
  const [transactionModal, setTransactionModal] = useState(false)
  const [graphModal, setGraphModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [sortBy, setSortBy] = useState(null)
  const [reverseSortDirection, setReverseSortDirection] = useState(false)

  // Filter state
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [thirdAge, setThirdAge] = useState(false)
  const [volumeFilter, setVolumeFilter] = useState('')
  const [raidsItems, setRaidsItems] = useState(false)
  const [priceMin, setPriceMin] = useState(null)
  const [priceMax, setPriceMax] = useState(null)
  const [profitMin, setProfitMin] = useState(null)
  const [profitMax, setProfitMax] = useState(null)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 100

  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentPageData = sortedData.slice(startIndex, endIndex)

  const filters = {
    search,
    thirdAge,
    volumeFilter,
    raidsItems,
    priceMin,
    priceMax,
    profitMin,
    profitMax
  }

  useEffect(() => {
    setSortedData(sortData(data, {
      sortBy,
      reversed: reverseSortDirection,
      filters
    }))
    setCurrentPage(1) // Reset to first page when filters change
  }, [data, sortBy, reverseSortDirection, search, thirdAge, volumeFilter, raidsItems, priceMin, priceMax, profitMin, profitMax])

  const setGraphInfo = (id) => {
    setGraphModal(true)
    setSelectedItem(id)
  }

  const handleSearchChange = (event) => {
    setSearch(event.currentTarget.value)
  }

  const clearFilters = () => {
    setSearch('')
    setThirdAge(false)
    setVolumeFilter('')
    setRaidsItems(false)
    setPriceMin(null)
    setPriceMax(null)
    setProfitMin(null)
    setProfitMax(null)
  }

  const activeFiltersCount = [
    thirdAge,
    volumeFilter,
    raidsItems,
    priceMin !== null,
    priceMax !== null,
    profitMin !== null,
    profitMax !== null
  ].filter(Boolean).length

  const rows = currentPageData.map((row, idx) => {
    const profitValue = Number((row.profit || '0').replace(/,/g, ''))
    return (
      <tr key={idx} style={{ background: row.background ? theme.colors.gray[7] : '' }}>
        <td>{row.id}</td>
        <td colSpan={1} style={{ verticalAlign: 'middle' }}>
          <Image
            className={classes.image}
            fit="contain"
            height={25}
            placeholder={<Text align="center">Not available</Text>}
            src={row.img}
            withPlaceholder
          />
        </td>
        <td colSpan={2} style={{ verticalAlign: 'middle' }}>
          <Link to={`/item/${row.id}`} style={{ textDecoration: 'none' }}>
            {row.name} {row.qty ? `(${row.qty})` : null}
          </Link>
        </td>
        <td style={{ verticalAlign: 'middle' }}>{row.low}</td>
        <td style={{ verticalAlign: 'middle' }}>{row.high}</td>
        <td style={{
          color: profitValue > 0 ? theme.colors.green[7] : theme.colors.red[9],
          fontWeight: 'bold',
          verticalAlign: 'middle'
        }}>
          {row.profit}
        </td>
        <td style={{ verticalAlign: 'middle' }}>{row.limit}</td>
        <td style={{ verticalAlign: 'middle', padding: '8px' }}>
          <MiniChart itemId={row.id} width={120} height={40} />
        </td>
        <td style={{ verticalAlign: 'middle' }}>
          <Flex gap="xs">
            <Button variant="light" onClick={() => setTransactionModal(true)}>
              <IconReceipt size={14}/>
            </Button>
            <Button variant="light" onClick={() => setGraphInfo(row.id)}>
              <IconChartHistogram size={14}/>
            </Button>
          </Flex>
        </td>
      </tr>
    )
  })

  return (
    <>
      <UsrTransactionModal opened={transactionModal} setOpened={setTransactionModal}/>
      <GraphModal opened={graphModal} setOpened={setGraphModal} id={selectedItem}/>

      {/* Search and Filter Controls */}
      <Stack spacing="md" mb="md">
        <Group position="apart">
          <TextInput
            placeholder="Search by any field"
            icon={<IconSearch size="0.9rem" stroke={1.5}/>}
            value={search}
            onChange={handleSearchChange}
            style={{ flex: 1 }}
          />
          <Group spacing="xs">
            <ActionIcon
              variant="light"
              color="blue"
              onClick={() => setFiltersOpen(!filtersOpen)}
              size="lg"
            >
              {filtersOpen ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
            </ActionIcon>
            <Button
              variant="light"
              leftIcon={<IconFilter size={16} />}
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              Filters {activeFiltersCount > 0 && <Badge size="xs" ml="xs">{activeFiltersCount}</Badge>}
            </Button>
            {activeFiltersCount > 0 && (
              <Button
                variant="subtle"
                color="red"
                leftIcon={<IconFilterOff size={16} />}
                onClick={clearFilters}
              >
                Clear
              </Button>
            )}
          </Group>
        </Group>

        <Collapse in={filtersOpen}>
          <Card withBorder p="md">
            <Text weight={500} mb="md">Advanced Filters</Text>
            <Group spacing="md" grow>
              <Stack spacing="sm">
                <Text size="sm" weight={500}>Item Categories</Text>
                <Checkbox
                  label="Third Age Items"
                  description="Filter for 3rd age equipment"
                  checked={thirdAge}
                  onChange={(e) => setThirdAge(e.currentTarget.checked)}
                />
                <Checkbox
                  label="Raids Items"
                  description="Items from raids content"
                  checked={raidsItems}
                  onChange={(e) => setRaidsItems(e.currentTarget.checked)}
                />
              </Stack>

              <Stack spacing="sm">
                <Text size="sm" weight={500}>Volume</Text>
                <Select
                  placeholder="Select volume"
                  value={volumeFilter}
                  onChange={setVolumeFilter}
                  data={[
                    { value: '', label: 'All Volumes' },
                    { value: 'low', label: 'Low Volume (< 100 limit)' },
                    { value: 'high', label: 'High Volume (≥ 1000 limit)' }
                  ]}
                />
              </Stack>

              <Stack spacing="sm">
                <Text size="sm" weight={500}>Price Range (GP)</Text>
                <Group spacing="xs">
                  <NumberInput
                    placeholder="Min price"
                    value={priceMin || 0}
                    defaultValue={0}
                    onChange={setPriceMin}
                    min={0}
                    formatter={(value) => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '0'}
                    parser={(value) => value ? value.replace(/\$\s?|(,*)/g, '') : '0'}
                  />
                  <NumberInput
                    placeholder="Max price"
                    value={priceMax || 0}
                    defaultValue={0}
                    onChange={setPriceMax}
                    min={0}
                    formatter={(value) => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '0'}
                    parser={(value) => value ? value.replace(/\$\s?|(,*)/g, '') : '0'}
                  />
                </Group>
              </Stack>

              <Stack spacing="sm">
                <Text size="sm" weight={500}>Profit Range (GP)</Text>
                <Group spacing="xs">
                  <NumberInput
                    placeholder="Min profit"
                    value={profitMin || 0}
                    defaultValue={0}
                    onChange={setProfitMin}
                    formatter={(value) => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '0'}
                    parser={(value) => value ? value.replace(/\$\s?|(,*)/g, '') : '0'}
                  />
                  <NumberInput
                    placeholder="Max profit"
                    value={profitMax || 0}
                    defaultValue={0}
                    onChange={setProfitMax}
                    formatter={(value) => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '0'}
                    parser={(value) => value ? value.replace(/\$\s?|(,*)/g, '') : '0'}
                  />
                </Group>
              </Stack>
            </Group>
          </Card>
        </Collapse>
      </Stack>

      {/* Results Summary */}
      <Group mb="md">
        <Text size="sm" color="dimmed">
          Showing {currentPageData.length} of {sortedData.length} items
        </Text>
        {activeFiltersCount > 0 && (
          <Badge variant="light" color="blue">
            {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} active
          </Badge>
        )}
      </Group>

      <ScrollArea>
        <Table sx={{ minWidth: 800 }} verticalSpacing="xs" highlightOnHover
               striped={location.pathname !== '/combination-items'}>
          <thead className={cx(classes.header, classes.scrolled)}>
            <tr>
              <th>Id</th>
              <th colSpan={1}>Img</th>
              <th colSpan={2}>Name</th>
              <th>Buy Price</th>
              <th>Sell Price</th>
              <th>Profit</th>
              <th>Buy Limit</th>
              <th>Chart</th>
              <th>Settings</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0
              ? rows
              : (
                <tr>
                  <td colSpan={10}>
                    <Text weight={500} align="center">
                      No items found matching your filters
                    </Text>
                  </td>
                </tr>
                )}
          </tbody>
        </Table>
        <Pagination
          total={Math.ceil(sortedData.length / itemsPerPage)}
          value={currentPage}
          onChange={setCurrentPage}
          gutter="md"
          mt="md"
          mb="md"
        />
      </ScrollArea>
    </>
  )
}

export default AllItemsTable
