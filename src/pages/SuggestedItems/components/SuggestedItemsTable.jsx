import React, { useEffect, useState } from 'react'
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  createStyles,
  Flex,
  Group,
  Image,
  Pagination,
  rem,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
  useMantineTheme
} from '@mantine/core'
import {
  IconChartHistogram,
  IconSearch,
  IconChevronDown,
  IconChevronUp,
  IconHeart,
  IconHeartFilled
} from '@tabler/icons-react'
import { Link, useLocation } from 'react-router-dom'
import GraphModal from '../../../shared/modals/graph-modal.jsx'
import MiniChart from '../../../components/charts/MiniChart.jsx'
import { useMediaQuery } from '@mantine/hooks'
import LazyLoad from '../../../components/LazyLoad/index.jsx'

const useStyles = createStyles((theme) => ({
  tableHeader: {
    padding: '0 !important'
  },

  headerControl: {
    width: '100%',
    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
    borderRadius: 0,
    border: 'none',
    borderBottom: `${rem(1)} solid ${
      theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]
    }`,
    fontSize: theme.fontSizes.sm,
    fontWeight: 500,
    textAlign: 'left',

    '&:hover': {
      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[1]
    }
  },

  item: {
    '&[data-selected]': {
      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.blue[0],
      color: theme.colorScheme === 'dark' ? theme.white : theme.colors.blue[9]
    },

    '&[data-selected]:hover': {
      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.blue[1]
    }
  },

  icon: {
    color: theme.colorScheme === 'dark' ? theme.colors.dark[3] : theme.colors.gray[5]
  },

  header: {
    position: 'sticky',
    top: 0,
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
    transition: 'box-shadow 150ms ease',

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
  }
}))

function Th({ children, reversed, sorted, onSort, ...props }) {
  const { classes } = useStyles()
  const Icon = sorted ? (reversed ? IconChevronUp : IconChevronDown) : IconChevronDown
  return (
    <th className={classes.tableHeader} {...props}>
      <Button
        variant="subtle"
        className={classes.headerControl}
        onClick={onSort}
        rightIcon={sorted ? <Icon size={rem(14)} /> : null}
      >
        {children}
      </Button>
    </th>
  )
}

function filterData(data, search) {
  const query = search.toLowerCase().trim()
  return data.filter((item) =>
    item.name.toLowerCase().includes(query)
  )
}

function sortData(data, payload) {
  const { sortBy } = payload

  if (!sortBy) {
    return filterData(data, payload.search)
  }

  return filterData(
    [...data].sort((a, b) => {
      const aValue = a[sortBy]
      const bValue = b[sortBy]

      if (payload.reversed) {
        return bValue > aValue ? 1 : -1
      }

      return aValue > bValue ? 1 : -1
    }),
    payload.search
  )
}

export default function SuggestedItemsTable({
  data,
  favoriteItems = new Set(),
  onToggleFavorite,
  showFavoriteColumn = true
}) {
  const theme = useMantineTheme()
  const { classes, cx } = useStyles()
  const [search, setSearch] = useState('')
  const [sortedData, setSortedData] = useState(data)
  const [sortBy, setSortBy] = useState('suggestionScore')
  const [reverseSortDirection, setReverseSortDirection] = useState(true) // Start with highest score first
  const [scrolled, setScrolled] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)

  const isMobile = useMediaQuery('(max-width: 768px)')
  const [graphModalOpen, setGraphModalOpen] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState(null)

  const setSorting = (field) => {
    const reversed = field === sortBy ? !reverseSortDirection : false
    setReverseSortDirection(reversed)
    setSortBy(field)
    setSortedData(sortData(data, { sortBy: field, reversed, search }))
  }

  const handleSearchChange = (event) => {
    const { value } = event.currentTarget
    setSearch(value)
    setSortedData(sortData(data, { sortBy, reversed: reverseSortDirection, search: value }))
    setCurrentPage(1) // Reset to first page when searching
  }

  useEffect(() => {
    setSortedData(sortData(data, { sortBy, reversed: reverseSortDirection, search }))
    setCurrentPage(1)
  }, [data, sortBy, reverseSortDirection, search])

  // Calculate pagination
  const totalPages = Math.ceil(sortedData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentData = sortedData.slice(startIndex, endIndex)

  const formatGP = (amount) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}K`
    }
    return amount.toLocaleString()
  }

  const formatVolume = (volume) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(0)}K`
    }
    return volume.toLocaleString()
  }


  const openGraph = (itemId) => {
    setSelectedItemId(itemId)
    setGraphModalOpen(true)
  }

  // Helper function to get proper image URL (matches AllItems/Header pattern)
  const getItemImageUrl = (item) => {
    if (item.icon) {
      // If icon is already a full URL, use it
      if (item.icon.startsWith('http://') || item.icon.startsWith('https://')) {
        return item.icon
      }
      // Otherwise, construct URL from relative path (same pattern as AllItems/Header)
      // item.icon is typically like "c/c1/Item_name.png"
      return `https://oldschool.runescape.wiki/images/${item.icon}`.replace(/ /g, '_')
    }
    // Fallback to default wiki image based on item name
    const itemName = item.name?.replace(/\s+/g, '_') || `item_${item.itemId}`
    return `https://oldschool.runescape.wiki/images/c/c1/${itemName}.png`
  }

  const rows = currentData.map((row) => (
    <tr key={row.itemId}>
      <td>
        <Group spacing="sm">
          <Image
            fit="contain"
            height={32}
            width={32}
            placeholder={<Text align="center">Not available</Text>}
            src={getItemImageUrl(row)}
            withPlaceholder
          />
          <div>
            <Link to={`/item/${row.itemId}`} style={{ textDecoration: 'none' }}>
              <Text size="sm" weight={500} color={theme.colorScheme === 'dark' ? 'white' : 'black'}>
                {row.name}
              </Text>
            </Link>
            <Text size="xs" color="dimmed">
              ID: {row.itemId}
            </Text>
          </div>
        </Group>
      </td>
      <td style={{ textAlign: 'center' }}>
        {new Intl.NumberFormat().format(row.buyPrice)}
      </td>
      <td style={{ textAlign: 'center' }}>
        <Group spacing="xs" justify="center">
          <Text>{new Intl.NumberFormat().format(row.sellPrice)}</Text>
          {row.manipulationWarning && (
            <Tooltip label="⚠️ High Risk - Possible market manipulation detected. Volume spike or unusual price spread detected.">
              <Badge color="red" variant="light" size="xs">
                HIGH RISK
              </Badge>
            </Tooltip>
          )}
        </Group>
      </td>
      <td style={{ textAlign: 'center' }}>
        <Group spacing="xs" justify="center">
          <Text size="sm">{new Intl.NumberFormat().format(row.volume24h)}</Text>
          <Text size="xs" color="dimmed">24h</Text>
        </Group>
        <Text size="xs" color="dimmed" style={{ textAlign: 'center' }}>
          {new Intl.NumberFormat().format(row.volume1h)} (1h)
        </Text>
      </td>
      <td style={{ textAlign: 'center' }}>
        <Badge color={row.marginPercentage > 10 ? 'green' : row.marginPercentage > 5 ? 'yellow' : 'orange'}>
          {row.marginPercentage.toFixed(1)}%
        </Badge>
      </td>
      <td style={{ textAlign: 'center', color: theme.colors.green[7], fontWeight: 'bold' }}>
        {new Intl.NumberFormat().format(row.profitPerFlip)}
      </td>
      <td style={{ textAlign: 'center' }}>
        <Text size="xs" color="blue">
          {row.bestBuyTime}
        </Text>
      </td>
      <td style={{ textAlign: 'center' }}>
        <Text size="xs" color="green">
          {row.bestSellTime}
        </Text>
      </td>
      <td style={{ textAlign: 'center' }}>
        <Tooltip 
          label={
            <div>
              <Text size="xs" weight={500}>Scoring Breakdown:</Text>
              <Text size="xs">• Profit Score: {Math.round(row.profitPerFlip >= 500000 ? 100 : row.profitPerFlip >= 100000 ? 80 + (row.profitPerFlip - 100000) / 20000 : row.profitPerFlip >= 50000 ? 60 + (row.profitPerFlip - 50000) / 2500 : row.profitPerFlip >= 10000 ? 30 + (row.profitPerFlip - 10000) / 1333 : Math.min(row.profitPerFlip / 333, 30))} (70%)</Text>
              <Text size="xs">• Volume Score: {Math.round(Math.min(Math.sqrt(row.volume24h) / 100, 100))} (30%)</Text>
              <Text size="xs">• Profit: {new Intl.NumberFormat().format(row.profitPerFlip)} GP</Text>
              <Text size="xs">• Tax: (high × 0.98) - low</Text>
              {row.manipulationWarning && <Text size="xs" color="red">• Risk penalty applied</Text>}
            </div>
          }
          position="left"
          withArrow
        >
          <Badge variant="gradient" gradient={{ from: 'violet', to: 'blue' }}>
            {row.suggestionScore}
          </Badge>
        </Tooltip>
      </td>
      <td style={{ textAlign: 'center' }}>
        <Flex gap="xs" justify="center" align="center">
          {showFavoriteColumn && onToggleFavorite && (
            <ActionIcon
              size={isMobile ? 'sm' : 'md'}
              color="red"
              variant={favoriteItems.has(row.itemId) ? 'filled' : 'light'}
              onClick={() => onToggleFavorite(row.itemId)}
            >
              {favoriteItems.has(row.itemId) ? <IconHeartFilled size={isMobile ? 14 : 16} /> : <IconHeart size={isMobile ? 14 : 16} />}
            </ActionIcon>
          )}
          <ActionIcon
            variant="light"
            color="blue"
            onClick={() => openGraph(row.itemId)}
            size={isMobile ? 'sm' : 'md'}
          >
            <IconChartHistogram size={isMobile ? 14 : 16} />
          </ActionIcon>
        </Flex>
      </td>
    </tr>
  ))

  return (
    <>
      <Card withBorder radius="md" p={0}>

        {/* Controls */}
        <Card.Section withBorder inheritPadding py="xs">
          <Group position="apart">
            <Group>
              <TextInput
                placeholder="Search items..."
                icon={<IconSearch size={14} />}
                value={search}
                onChange={handleSearchChange}
                size="xs"
              />
            </Group>
            <Group>
              <Text size="xs" color="dimmed">
                Showing {currentData.length} of {sortedData.length} items
              </Text>
              <Select
                value={itemsPerPage.toString()}
                onChange={(value) => {
                  setItemsPerPage(parseInt(value))
                  setCurrentPage(1)
                }}
                data={[
                  { value: '25', label: '25 per page' },
                  { value: '50', label: '50 per page' },
                  { value: '100', label: '100 per page' }
                ]}
                size="xs"
              />
            </Group>
          </Group>
        </Card.Section>

        {/* Table */}
        <ScrollArea
          h={isMobile ? 300 : 450}
          onScrollPositionChange={({ y }) => setScrolled(y !== 0)}
        >
          <Table sx={{ minWidth: 800 }} verticalSpacing="xs">
            <thead className={cx(classes.header, { [classes.scrolled]: scrolled })}>
              <tr>
                <Th>Item</Th>
                <Th>Buy Price</Th>
                <Th>Sell Price</Th>
                <Th
                  sorted={sortBy === 'volume24h'}
                  reversed={reverseSortDirection}
                  onSort={() => setSorting('volume24h')}
                >
                  Volume
                </Th>
                <Th
                  sorted={sortBy === 'marginPercentage'}
                  reversed={reverseSortDirection}
                  onSort={() => setSorting('marginPercentage')}
                >
                  Margin
                </Th>
                <Th
                  sorted={sortBy === 'profitPerFlip'}
                  reversed={reverseSortDirection}
                  onSort={() => setSorting('profitPerFlip')}
                >
                  Profit
                </Th>
                <Th>Best Buy Time</Th>
                <Th>Best Sell Time</Th>
                <Th
                  sorted={sortBy === 'suggestionScore'}
                  reversed={reverseSortDirection}
                  onSort={() => setSorting('suggestionScore')}
                >
                  Score
                </Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows
              ) : (
                <tr>
                  <td colSpan={10}>
                    <Text color="dimmed" align="center" py="xl">
                      No items found matching your criteria
                    </Text>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </ScrollArea>

        {/* Pagination */}
        {totalPages > 1 && (
          <Card.Section withBorder inheritPadding py="xs">
            <Group position="center">
              <Pagination
                value={currentPage}
                onChange={setCurrentPage}
                total={totalPages}
                size="sm"
              />
            </Group>
          </Card.Section>
        )}
      </Card>

      {/* Graph Modal */}
      <GraphModal
        opened={graphModalOpen}
        setOpened={setGraphModalOpen}
        id={selectedItemId}
      />
    </>
  )
}