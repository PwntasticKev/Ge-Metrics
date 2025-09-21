import React, { useEffect, useState } from 'react'
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
  Stack,
  Tooltip
} from '@mantine/core'
import {
  IconChartHistogram,
  IconReceipt,
  IconSearch,
  IconFilter,
  IconFilterOff,
  IconChevronDown,
  IconChevronUp,
  IconHeart,
  IconHeartFilled
} from '@tabler/icons-react'
import { Link, useLocation } from 'react-router-dom'
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
      const limit = parseInt(String(item.limit ?? '0').replace(/,/g, ''))
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
    if (priceMin > 0 || priceMax > 0) {
      const price = parseInt(String(item.high ?? '0').replace(/,/g, ''))
      if (priceMin > 0 && price < priceMin) return false
      if (priceMax > 0 && price > priceMax) return false
    }

    // Profit range filters
    if (profitMin > 0 || profitMax > 0) {
      const profit = parseInt(String(item.profit ?? '0').replace(/,/g, ''))
      if (profitMin > 0 && profit < profitMin) return false
      if (profitMax > 0 && profit > profitMax) return false
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

// Risk classification helper
function classifyRisk (row) {
  // Parse numbers
  const profit = Number(String(row.profit ?? '0').replace(/,/g, ''))
  const high = Number(String(row.high ?? '0').replace(/,/g, ''))
  const low = Number(String(row.low ?? '0').replace(/,/g, ''))
  const limit = Number(String(row.limit ?? '0').replace(/,/g, ''))

  // Heuristics
  if (limit < 10 && profit > 1_000_000) {
    return { label: 'Risky', color: 'red', reason: 'Very low volume and unusually high profit.' }
  }
  if (profit > 2 * (high - low) && (high - low) > 0) {
    return { label: 'Risky', color: 'red', reason: 'Profit much higher than normal price range.' }
  }
  if (profit > 5_000_000) {
    return { label: 'Volatile', color: 'yellow', reason: 'Very high profit, check market history for manipulation.' }
  }
  if (limit < 50 && profit > 500_000) {
    return { label: 'Volatile', color: 'yellow', reason: 'Low volume and high profit.' }
  }
  if (profit > 0 && profit < 200_000 && limit > 100) {
    return { label: 'Safe', color: 'green', reason: 'Profit and volume are in a normal range.' }
  }
  return { label: 'Volatile', color: 'yellow', reason: 'Unusual market pattern or insufficient data.' }
}

export function AllItemsTable ({
  data,
  items,
  favoriteItems = new Set(),
  onToggleFavorite = null,
  showFavoriteColumn = false
}) {
  const theme = useMantineTheme()
  const location = useLocation()
  const { classes, cx } = useStyles()

  // Basic state
  const [search, setSearch] = useState('')
  const [sortedData, setSortedData] = useState(data)
  const [graphModal, setGraphModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [sortBy, setSortBy] = useState(null)
  const [reverseSortDirection, setReverseSortDirection] = useState(false)

  // Filter state
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [thirdAge, setThirdAge] = useState(false)
  const [volumeFilter, setVolumeFilter] = useState('')
  const [raidsItems, setRaidsItems] = useState(false)
  const [priceMin, setPriceMin] = useState(0)
  const [priceMax, setPriceMax] = useState(0)
  const [profitMin, setProfitMin] = useState(0)
  const [profitMax, setProfitMax] = useState(0)

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

  const [showId, setShowId] = useState(true)

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
    setPriceMin(0)
    setPriceMax(0)
    setProfitMin(0)
    setProfitMax(0)
  }

  const activeFiltersCount = [
    thirdAge,
    volumeFilter,
    raidsItems,
    priceMin > 0,
    priceMax > 0,
    profitMin > 0,
    profitMax > 0
  ].filter(Boolean).length

  const rows = currentPageData.map((row, idx) => {
    const profitValue = Number(String(row.profit ?? '0').replace(/,/g, ''))
    const isFavorite = favoriteItems.has(row.id)
    const risk = classifyRisk(row)

    return (
      <tr key={idx} style={{ background: row.background ? theme.colors.gray[7] : '' }}>
        {showId && <td style={{ textAlign: 'center' }}>{row.id}</td>}
        <td colSpan={1} style={{ verticalAlign: 'middle', textAlign: 'center' }}>
          <Image
            className={classes.image}
            fit="contain"
            height={32}
            width={32}
            placeholder={<Text align="center">Not available</Text>}
            src={row.img}
            withPlaceholder
          />
        </td>
        <td colSpan={2} style={{ verticalAlign: 'middle', textAlign: 'left' }}>
          <Link to={`/item/${row.id}`} style={{ textDecoration: 'none' }}>
            {row.name} {row.qty ? `(${row.qty})` : null}
          </Link>
        </td>
        <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>{new Intl.NumberFormat().format(row.low)}</td>
        <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>{new Intl.NumberFormat().format(row.high)}</td>
        <td style={{
          color: profitValue > 0 ? theme.colors.green[7] : theme.colors.red[9],
          fontWeight: 'bold',
          verticalAlign: 'middle',
          textAlign: 'center'
        }}>
          {new Intl.NumberFormat().format(row.profit)}
        </td>
        <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>{row.limit}</td>
        <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
          <Tooltip label={risk.reason} withArrow position="right">
            <Badge color={risk.color} variant="filled" size="sm">{risk.label}</Badge>
          </Tooltip>
        </td>
        <td style={{ verticalAlign: 'middle', padding: '8px', textAlign: 'center' }}>
          <MiniChart itemId={row.id} width={120} height={40} />
        </td>
        <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
          <Flex gap="xs" justify="center" align="center">
            {showFavoriteColumn && onToggleFavorite && (
              <ActionIcon
                size="xs"
                color="red"
                variant="light"
                onClick={() => onToggleFavorite(row.id)}
              >
                {isFavorite ? <IconHeartFilled size={12} /> : <IconHeart size={12} />}
              </ActionIcon>
            )}
            <Button variant="light" onClick={() => setGraphInfo(row.id)}>
              <IconChartHistogram size={14}/>
            </Button>
          </Flex>
        </td>
      </tr>
    )
  })

  const nameColIndex = showId ? 2 : 1

  return (
    <>
      <GraphModal opened={graphModal} setOpened={setGraphModal} id={selectedItem} items={items}/>

      {/* Show/Hide ID Button */}
      <Group position="right" mb="sm">
        <Button size="xs" variant="light" onClick={() => setShowId((v) => !v)}>
          {showId ? 'Hide ID' : 'Show ID'}
        </Button>
      </Group>

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
                  onChange={(value) => setVolumeFilter(value ?? '')}
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
                    value={priceMin}
                    defaultValue={0}
                    onChange={(value) => setPriceMin(value ?? 0)}
                    min={0}
                    formatter={(value) => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '0'}
                    parser={(value) => value ? value.replace(/\$\s?|(,*)/g, '') : '0'}
                  />
                  <NumberInput
                    placeholder="Max price"
                    value={priceMax}
                    defaultValue={0}
                    onChange={(value) => setPriceMax(value ?? 0)}
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
                    value={profitMin}
                    defaultValue={0}
                    onChange={(value) => setProfitMin(value ?? 0)}
                    formatter={(value) => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '0'}
                    parser={(value) => value ? value.replace(/\$\s?|(,*)/g, '') : '0'}
                  />
                  <NumberInput
                    placeholder="Max profit"
                    value={profitMax}
                    defaultValue={0}
                    onChange={(value) => setProfitMax(value ?? 0)}
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
              {showId && <th style={{ textAlign: 'center' }}>Id</th>}
              <th colSpan={1} style={{ textAlign: 'center' }}>Img</th>
              <th style={{ textAlign: 'center' }}>Name</th>
              <th colSpan={2} style={{ textAlign: 'center' }}>Items</th>
              <th style={{ textAlign: 'center' }}>Sell Price</th>
              <th style={{ textAlign: 'center' }}>Profit</th>
              <th style={{ textAlign: 'center' }}>Buy Limit</th>
              <th style={{ textAlign: 'center' }}>Risk</th>
              <th style={{ textAlign: 'center' }}>Chart</th>
              <th style={{ textAlign: 'center' }}>Settings</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0
              ? rows.map((row, idx) =>
                React.cloneElement(row, {
                  key: idx,
                  style: { ...row.props.style, textAlign: 'center', verticalAlign: 'middle' },
                  children: React.Children.map(row.props.children, (cell, i) => {
                    // Always left-align the Name column, regardless of ID visibility
                    if (i === nameColIndex) {
                      return React.cloneElement(cell, { style: { ...cell.props.style, textAlign: 'left', verticalAlign: 'middle' } })
                    }
                    return React.cloneElement(cell, { style: { ...cell.props.style, textAlign: 'center', verticalAlign: 'middle' } })
                  })
                })
              )
              : (
                <tr>
                  <td colSpan={showId ? 11 : 10} style={{ textAlign: 'center' }}>
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
          onChange={(value) => setCurrentPage(value ?? 1)}
          gutter="md"
          mt="md"
          mb="md"
        />
      </ScrollArea>
    </>
  )
}

export default AllItemsTable
