import { useEffect, useState } from 'react'
import {
  Center,
  createStyles,
  Flex,
  Group,
  Image,
  Pagination,
  rem,
  ScrollArea,
  Table,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
  useMantineTheme,
  Button,
  ActionIcon
} from '@mantine/core'
import { IconChevronDown, IconChevronUp, IconSearch, IconSelector, IconChartHistogram, IconHeartFilled } from '@tabler/icons-react'
import TableSettingsMenu from './components/table-settings-menu.jsx'
import GraphModal from '../../shared/modals/graph-modal.jsx'
import MiniChart from '../charts/MiniChart.jsx'
import { Link, useLocation } from 'react-router-dom'

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

function Th ({ children, reversed, sorted, onSort }) {
  const { classes } = useStyles()
  const Icon = sorted ? (reversed ? IconChevronUp : IconChevronDown) : IconSelector
  return (
        <th className={classes.th}>
            <UnstyledButton onClick={onSort} className={classes.control}>
                <Group position="apart">
                    <Text fz="sm">
                        {children}
                    </Text>
                    <Center className={classes.icon}>
                        <Icon size="0.9rem" stroke={1.5}/>
                    </Center>
                </Group>
            </UnstyledButton>
        </th>
  )
}

function filterData (data, search) {
  const query = search.toLowerCase().trim()
  return data.filter((item) =>
    item && Object.keys(item).some((key) => {
      const value = item[key]
      if (typeof value === 'string') {
        return value.toLowerCase().includes(query)
      }
      return false
    })
  )
}

function sortData (data, payload) {
  const { sortBy, reversed, search } = payload

  if (!sortBy) {
    return filterData(data, search)
  }

  return filterData(
    [...data].sort((a, b) => {
      let aValue = a[sortBy]
      let bValue = b[sortBy]

      // Handle profit specifically for numeric sorting
      if (sortBy === 'profit') {
        aValue = parseFloat(String(aValue ?? '0').replace(/,/g, '')) || 0
        bValue = parseFloat(String(bValue ?? '0').replace(/,/g, '')) || 0
      }

      // Handle numeric comparisons
      if (reversed) {
        return bValue - aValue // Descending
      }
      return aValue - bValue // Ascending
    }),
    search
  )
}

export function AllItemsTable ({ data }) {
  const theme = useMantineTheme()
  const location = useLocation()

  const { classes, cx } = useStyles()
  const [search, setSearch] = useState('')
  const [sortedData, setSortedData] = useState(data)
  const [sortBy, setSortBy] = useState(null)
  const [reverseSortDirection, setReverseSortDirection] = useState(false)
  const [graphModal, setGraphModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 100

  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentPageData = sortedData.slice(startIndex, endIndex)

  useEffect(() => {
    // Keep the search term intact when new data is grabbed
    setSortedData(sortData(data, { sortBy, reversed: reverseSortDirection, search }))
  }, [data, sortBy, reverseSortDirection, search])

  const setSorting = (field) => {
    const reversed = field === sortBy ? !reverseSortDirection : field !== 'profit'
    setReverseSortDirection(reversed)
    setSortBy(field)
    setSortedData(sortData(sortedData, { sortBy: field, reversed, search }))
  }

  const handleSearchChange = (event) => {
    const { value } = event.currentTarget
    const searchValue = value || ''
    setSearch(searchValue)
    setSortedData(sortData(data, { sortBy, reversed: reverseSortDirection, search: searchValue }))
  }

  const shouldResetField = () => {
    setSearch('')
  }

  const setGraphInfo = (id) => {
    setGraphModal(true)
    setSelectedItem(id)
  }

  const rows = currentPageData
    .filter(row => row && typeof row.profit !== 'undefined' && Array.isArray(row.items))
    .map((row, idx) => {
      const profitValue = Number(String(row.profit).replace(/,/g, ''))
      return (
              <tr key={idx}>
                  {/* <td>{row.id}</td> */}
                <td colSpan={1} style={{ verticalAlign: 'middle' }}>

                    <Image
                        className={classes.image}
                        fit="contain"
                        height={32}
                        width={32}
                        placeholder={
                            <Text align="center">Not available</Text>
                        }
                        src={row.img}
                        withPlaceholder
                    />

                </td>

                <td style={{ verticalAlign: 'middle' }}>
                    <div>
                    <Link to={`/item/${row.id}`} style={{ textDecoration: 'none' }}>
                        {row.name} {row.qty ? `(${row.qty})` : null}
                    </Link>
                    </div>
                </td>
                <td colSpan={2} style={{ verticalAlign: 'middle' }}>
                    {row.items.map((item, idx) => (
                        <Flex key={idx}>
                            <Tooltip label={
                                item.qty
                                  ? `${item.name} (${item.qty})`
                                  : item.name
                            } position="left">
                                <div>
                                <Image fit="contain" width={25} height={25} src={item.img}
                                       style={{ marginRight: '8px' }}></Image>
                                </div>
                            </Tooltip>
                            <div>{item.low}</div>
                        </Flex>
                    ))}
                </td>

                <td style={{ verticalAlign: 'middle' }}>{row.high}</td>
                <td style={{
                  color: profitValue > 0 ? theme.colors.green[7] : theme.colors.red[9],
                  fontWeight: 'bold',
                  verticalAlign: 'middle'
                }}>
                    {new Intl.NumberFormat().format(row?.profit) ?? 'N/A'}
                </td>
                <td style={{ verticalAlign: 'middle', padding: '8px' }}>
                  <MiniChart itemId={row.id} width={120} height={40} />
                </td>
                <td style={{ verticalAlign: 'middle' }}>
                  <Flex gap="xs">
                    <TableSettingsMenu itemId={row.id}/>
                  </Flex>
                </td>
            </tr>
      )
    })

  return (
        <>
            <GraphModal opened={graphModal} setOpened={setGraphModal} id={selectedItem}/>

            <TextInput
                placeholder="Search by any field"
                mb="md"
                icon={<IconSearch size="0.9rem" stroke={1.5}/>}
                value={search}
                onChange={handleSearchChange}
                onClick={shouldResetField}
            />
            <ScrollArea>

                <Table sx={{ minWidth: 800 }} verticalSpacing="xs" highlightOnHover>

                    <thead className={cx(classes.header, classes.scrolled)}>
                    <tr>
                        {/* <Th>Id</Th> */}
                        <th colSpan={1}>Img</th>
                        <th>
                            Name
                        </th>
                        <th colSpan={2}>Items</th>
                        <th>Sell Price</th>
                        <th>
                            Profit
                        </th>
                        <th>Chart</th>
                        <th>Settings</th>
                    </tr>
                    </thead>
                    <tbody>
                    {rows.length > 0
                      ? (
                          rows
                        )
                      : (
                        <tr>
                            <td colSpan={data && data.length > 0 && data[0] ? Object.keys(data[0]).length : 1}>
                                <Text weight={500} align="center">
                                    Nothing found
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
