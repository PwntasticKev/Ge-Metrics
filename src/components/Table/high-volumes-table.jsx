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
  Group
} from '@mantine/core'
import { IconChartHistogram, IconReceipt, IconSearch } from '@tabler/icons-react'
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

function filterData (data, search) {
  const query = search.toLowerCase().trim()
  return data.filter((item) =>
    Object.keys(item).some((key) => {
      const value = item[key]
      if (typeof value === 'string') {
        return value.toLowerCase().includes(query)
      }
      return false
    })
  )
}

function sortData (data, payload) {
  const { sortBy } = payload

  if (!sortBy) {
    return filterData(data, payload.search)
  }

  return filterData(
    [...data].sort((a, b) => {
      if (payload.reversed) {
        return b[sortBy]?.localeCompare(a[sortBy])
      }

      return a[sortBy].localeCompare(b[sortBy])
    }),
    payload.search
  )
}

// Sort items by volume (highest first)
function sortByVolume (data) {
  return [...data].sort((a, b) => {
    const volumeA = Number(a.volume) || 0
    const volumeB = Number(b.volume) || 0
    return volumeB - volumeA
  }).filter(item => {
    const volume = Number(item.volume) || 0
    return volume > 0 // Only show items with volume data
  })
}

export function HighVolumesTable ({ data }) {
  const theme = useMantineTheme()
  const location = useLocation()

  const { classes, cx } = useStyles()
  const [search, setSearch] = useState('')
  const [sortedData, setSortedData] = useState([])
  const [transactionModal, setTransactionModal] = useState(false)
  const [graphModal, setGraphModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [sortBy, setSortBy] = useState(null)
  const [reverseSortDirection, setReverseSortDirection] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 100

  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentPageData = sortedData.slice(startIndex, endIndex)

  useEffect(() => {
    if (!data || data.length === 0) {
      setSortedData([])
      return
    }

    try {
      // Sort by volume first, then apply search filter
      const volumeSortedData = sortByVolume(data)
      console.log(`Filtered ${volumeSortedData.length} items with volume data from ${data.length} total items`)
      setSortedData(sortData(volumeSortedData, { sortBy, reversed: reverseSortDirection, search }))
    } catch (error) {
      console.error('Error processing volume data:', error)
      setSortedData([])
    }
  }, [data, sortBy, reverseSortDirection, search])

  const setGraphInfo = (id) => {
    setGraphModal(true)
    setSelectedItem(id)
  }

  const handleSearchChange = (event) => {
    const { value } = event.currentTarget
    setSearch(value)

    if (!data || data.length === 0) {
      setSortedData([])
      return
    }

    try {
      const volumeSortedData = sortByVolume(data)
      setSortedData(sortData(volumeSortedData, { sortBy, reversed: reverseSortDirection, search: value }))
    } catch (error) {
      console.error('Error filtering data:', error)
      setSortedData([])
    }
  }

  const formatVolume = (volume) => {
    if (!volume) return 'N/A'
    const numVolume = Number(volume)
    if (isNaN(numVolume)) return 'N/A'
    return new Intl.NumberFormat().format(numVolume)
  }

  const formatPrice = (price) => {
    if (!price) return 'N/A'
    const numPrice = Number(price)
    if (isNaN(numPrice)) return 'N/A'
    return new Intl.NumberFormat().format(numPrice)
  }

  // Show helpful message if no data or no volume data
  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Text size="lg" color="dimmed">No data available</Text>
        <Text size="sm" color="dimmed" mt="xs">
          Waiting for price and volume data to load...
        </Text>
      </div>
    )
  }

  if (sortedData.length === 0 && search === '') {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Text size="lg" color="dimmed">No high volume items found</Text>
        <Text size="sm" color="dimmed" mt="xs">
          No items currently have volume data available from the API.
        </Text>
      </div>
    )
  }

  const rows = currentPageData.map((row, idx) => {
    const profitValue = row.profit ? Number(row.profit.replace(/,/g, '')) : 0
    const volumeValue = Number(row.volume) || 0

    return (
            <tr key={idx} style={{ background: row.background ? theme.colors.gray[7] : '' }}>
                <td>{row.id}</td>
                <td colSpan={1} style={{ verticalAlign: 'middle' }}>
                    <Image
                        className={classes.image}
                        fit="contain"
                        height={25}
                        placeholder={
                            <Text align="center">Not available</Text>
                        }
                        src={row.img}
                        withPlaceholder
                    />

                </td>

                <td colSpan={2} style={{ verticalAlign: 'middle' }}>
                    <Link to={`/item/${row.id}`} style={{ textDecoration: 'none' }}>
                        {row.name} {row.qty ? `(${row.qty})` : null}
                    </Link>

                </td>
                <td style={{ verticalAlign: 'middle' }}>{formatPrice(row.low)}</td>
                <td style={{ verticalAlign: 'middle' }}>{formatPrice(row.high)}</td>
                <td style={{
                  verticalAlign: 'middle',
                  fontWeight: 'bold',
                  color: volumeValue > 50000 ? theme.colors.green[6] : volumeValue > 20000 ? theme.colors.yellow[6] : theme.colors.blue[6]
                }}>
                    {formatVolume(row.volume)}
                </td>
                <td style={{
                  color: profitValue > 0 ? theme.colors.green[7] : theme.colors.red[9],
                  fontWeight: 'bold',
                  verticalAlign: 'middle'
                }}>
                    {row.profit || 'N/A'}
                </td>
                <td style={{ verticalAlign: 'middle' }}>{row.limit || 'N/A'}</td>
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

            <div style={{ marginBottom: '16px' }}>
              <Group position="apart" align="center">
                <div>
                  <Text size="sm" weight={500}>
                    High Volume Items ({sortedData.length} items)
                  </Text>
                  <Text size="xs" color="dimmed">
                    Showing items with active trading volume, sorted by highest volume first
                  </Text>
                </div>
                <TextInput
                    placeholder="Search by any field"
                    icon={<IconSearch size="0.9rem" stroke={1.5}/>}
                    value={search}
                    onChange={handleSearchChange}
                    style={{ width: '300px' }}
                />
              </Group>
            </div>

            <ScrollArea>
                <Table sx={{ minWidth: 800 }} verticalSpacing="xs">
                    <thead className={cx(classes.header)}>
                        <tr>
                            <th className={classes.th}>
                                <Text weight={500} size="sm">
                                    ID
                                </Text>
                            </th>
                            <th className={classes.th}>
                                <Text weight={500} size="sm">
                                    Image
                                </Text>
                            </th>
                            <th className={classes.th}>
                                <Text weight={500} size="sm">
                                    Name
                                </Text>
                            </th>
                            <th className={classes.th}>
                                <Text weight={500} size="sm">
                                    Buy Price
                                </Text>
                            </th>
                            <th className={classes.th}>
                                <Text weight={500} size="sm">
                                    Sell Price
                                </Text>
                            </th>
                            <th className={classes.th}>
                                <Text weight={500} size="sm" color="blue">
                                    Volume (24h)
                                </Text>
                            </th>
                            <th className={classes.th}>
                                <Text weight={500} size="sm">
                                    Profit
                                </Text>
                            </th>
                            <th className={classes.th}>
                                <Text weight={500} size="sm">
                                    Limit
                                </Text>
                            </th>
                            <th className={classes.th}>
                                <Text weight={500} size="sm">
                                    Chart
                                </Text>
                            </th>
                            <th className={classes.th}>
                                <Text weight={500} size="sm">
                                    Actions
                                </Text>
                            </th>
                        </tr>
                    </thead>
                    <tbody>{rows}</tbody>
                </Table>
            </ScrollArea>

            {sortedData.length > itemsPerPage && (
              <Pagination
                  total={Math.ceil(sortedData.length / itemsPerPage)}
                  value={currentPage}
                  onChange={setCurrentPage}
                  mt="sm"
                  position="center"
              />
            )}

            {sortedData.length === 0 && search !== '' && (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Text size="lg" color="dimmed">No items found</Text>
                <Text size="sm" color="dimmed" mt="xs">
                  No items match your search term "{search}"
                </Text>
              </div>
            )}
        </>
  )
}

export default HighVolumesTable
