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
  useMantineTheme
} from '@mantine/core'
import { IconChartHistogram, IconReceipt, IconSearch } from '@tabler/icons-react'
import { Link, useLocation } from 'react-router-dom'
import UsrTransactionModal from '../../shared/modals/user-transaction.jsx'
import GraphModal from '../../shared/modals/graph-modal.jsx'

const useStyles = createStyles((theme) => ({
  th: {
    padding: '0 !important'
  },

  control: {
    width: '100%',
    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
    transition: 'background-color 0.2s ease-out',

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

export function DeathsCofferTable ({ data }) {
  const theme = useMantineTheme()
  const location = useLocation()

  const { classes, cx } = useStyles()
  const [search, setSearch] = useState('')
  const [sortedData, setSortedData] = useState(data)
  const [transactionModal, setTransactionModal] = useState(false)
  const [graphModal, setGraphModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [sortBy, setSortBy] = useState(null)
  const [reverseSortDirection, setReverseSortDirection] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 30

  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentPageData = sortedData.slice(startIndex, endIndex)

  useEffect(() => {
    // Keep the search term intact when new data is grabbed
    setSortedData(sortData(data, { sortBy, reversed: reverseSortDirection, search }))
  }, [data, sortBy, reverseSortDirection, search])

  const setGraphInfo = (id) => {
    setGraphModal(true)
    setSelectedItem(id)
  }

  const handleSearchChange = (event) => {
    const { value } = event.currentTarget
    const searchValue = value || ''
    setSearch(searchValue)
    setSortedData(sortData(data, { sortBy, reversed: reverseSortDirection, search: searchValue }))
  }

  const rows = currentPageData.map((row, idx) => {
    const profitString = row.profit
    const profitValue = Number(String(profitString ?? '0').replace(/[^0-9.-]+/g, ''))

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
                <td style={{ verticalAlign: 'middle' }}>{isNaN(row.low) ? 'N/A' : row.low}</td>
                <td style={{ verticalAlign: 'middle' }}>{row.highalch}</td>
                <td style={{
                  color: profitValue > 0 ? theme.colors.green[7] : theme.colors.red[9],
                  fontWeight: 'bold',
                  verticalAlign: 'middle'
                }}>
                    {row.profit}
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

            <TextInput
                placeholder="Search by any field"
                mb="md"
                icon={<IconSearch size="0.9rem" stroke={1.5}/>}
                value={search}
                onChange={handleSearchChange}
            />
            <ScrollArea>

                <Table sx={{ minWidth: 800 }} verticalSpacing="xs" highlightOnHover
                       striped={location.pathname !== '/combination-items'}>

                    <thead className={cx(classes.header, classes.scrolled)}>
                    <tr>
                        <th>Id</th>
                        <th colSpan={1}>Img</th>
                        <th colSpan={2}>
                            Name
                        </th>
                        <th>Buy Price</th>
                        <th>Alch Price</th>
                        <th>
                            Profit
                        </th>
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
                            <td colSpan={data.length && Object.keys(data[0]).length}>
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

export default DeathsCofferTable
