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
  Badge,
  NumberInput,
  Group,
  ActionIcon,
  Modal
} from '@mantine/core'
import { IconSearch, IconTrash, IconEdit, IconCheck, IconX } from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import MiniChart from '../charts/MiniChart.jsx'

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
  },

  editingRow: {
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[1]
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

export function WatchlistTable ({ data, onRemove, onUpdateThresholds }) {
  const theme = useMantineTheme()
  const { classes, cx } = useStyles()

  const [search, setSearch] = useState('')
  const [sortedData, setSortedData] = useState(data)
  const [editingRow, setEditingRow] = useState(null)
  const [editValues, setEditValues] = useState({})
  const [deleteModalOpened, setDeleteModalOpened] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentPageData = sortedData.slice(startIndex, endIndex)

  useEffect(() => {
    setSortedData(filterData(data, search))
  }, [data, search])

  const handleSearchChange = (event) => {
    const { value } = event.currentTarget
    setSearch(value ?? '')
    setSortedData(filterData(data, value ?? ''))
  }

  const startEditing = (item) => {
    setEditingRow(item.watchlist_id)
    setEditValues({
      volume_threshold: item.volume_threshold || '',
      price_drop_threshold: item.price_drop_threshold || ''
    })
  }

  const cancelEditing = () => {
    setEditingRow(null)
    setEditValues({})
  }

  const saveEditing = (watchlistId) => {
    onUpdateThresholds(watchlistId, editValues)
    setEditingRow(null)
    setEditValues({})
  }

  const confirmDelete = (item) => {
    setItemToDelete(item)
    setDeleteModalOpened(true)
  }

  const handleDelete = () => {
    if (itemToDelete) {
      onRemove(itemToDelete.watchlist_id)
      setDeleteModalOpened(false)
      setItemToDelete(null)
    }
  }

  const formatVolume = (volume) => {
    if (!volume) return 'N/A'
    return new Intl.NumberFormat().format(volume)
  }

  const getAlertStatus = (item) => {
    // Check for abnormal activity detection
    if (item.abnormal_activity) {
      // Mock abnormal activity detection result
      const mockAbnormalActivity = Math.random() > 0.7 // 30% chance of abnormal activity

      if (mockAbnormalActivity) {
        return { status: 'abnormal', color: 'red', text: 'ABNORMAL' }
      }
      return { status: 'ai_watching', color: 'violet', text: 'AI MONITORING' }
    }

    // Check manual thresholds
    const currentVolume = item.volume || 0
    const volumeThreshold = item.volume_threshold || 0

    if (currentVolume > volumeThreshold && volumeThreshold > 0) {
      return { status: 'alert', color: 'orange', text: 'THRESHOLD ALERT' }
    }

    return { status: 'watching', color: 'blue', text: 'WATCHING' }
  }

  const rows = currentPageData.map((row, idx) => {
    const profitValue = Number((row.profit || '0').toString().replace(/,/g, ''))
    const isEditing = editingRow === row.watchlist_id
    const alertStatus = getAlertStatus(row)

    return (
      <tr key={idx} className={isEditing ? classes.editingRow : ''}>
        <td>{row.item_id}</td>
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
          <Link to={`/item/${row.item_id}`} style={{ textDecoration: 'none' }}>
            {row.name} {row.qty ? `(${row.qty})` : null}
          </Link>
        </td>
        <td style={{ verticalAlign: 'middle' }}>{row.low}</td>
        <td style={{ verticalAlign: 'middle' }}>{row.high}</td>
        <td style={{ verticalAlign: 'middle', fontWeight: 'bold' }}>
          {formatVolume(row.volume)}
        </td>
        <td style={{ verticalAlign: 'middle' }}>
          {row.abnormal_activity
            ? (
            <Badge color="violet" size="sm" leftIcon="🧠">
              AI Detection
            </Badge>
              )
            : isEditing
              ? (
            <NumberInput
              value={editValues.volume_threshold ?? 0}
              defaultValue={0}
              onChange={(value) => setEditValues(prev => ({ ...prev, volume_threshold: value ?? 0 }))}
              size="xs"
              min={0}
              placeholder="Volume threshold"
              parser={(value) => value ? value.replace(/\$\s?|(,*)/g, '') : '0'}
              formatter={(value) => value ? `${Number(value).toLocaleString()}` : '0'}
            />
                )
              : (
            <Text size="sm" color={row.volume_threshold ? 'dark' : 'dimmed'}>
              {formatVolume(row.volume_threshold) || 'None'}
            </Text>
                )}
        </td>
        <td style={{ verticalAlign: 'middle' }}>
          {row.abnormal_activity
            ? (
            <Badge color="violet" size="sm" leftIcon="📊">
              Smart Alerts
            </Badge>
              )
            : isEditing
              ? (
            <NumberInput
              value={editValues.price_drop_threshold ?? 0}
              defaultValue={0}
              onChange={(value) => setEditValues(prev => ({ ...prev, price_drop_threshold: value ?? 0 }))}
              size="xs"
              min={0}
              max={100}
              step={0.1}
              placeholder="% drop"
              rightSection={<Text size="xs">%</Text>}
              parser={(value) => value ? value.replace(/\$\s?|(,*)/g, '') : '0'}
              formatter={(value) => value ? `${Number(value).toFixed(1)}` : '0'}
            />
                )
              : (
            <Text size="sm" color={row.price_drop_threshold ? 'dark' : 'dimmed'}>
              {row.price_drop_threshold ? `${row.price_drop_threshold}%` : 'None'}
            </Text>
                )}
        </td>
        <td style={{ verticalAlign: 'middle' }}>
          <Badge color={alertStatus.color} size="sm">
            {alertStatus.text}
          </Badge>
        </td>
        <td style={{ verticalAlign: 'middle', padding: '8px' }}>
          <MiniChart itemId={row.item_id} width={120} height={40} />
        </td>
        <td style={{ verticalAlign: 'middle' }}>
          {isEditing
            ? (
            <Group spacing="xs">
              <ActionIcon color="green" onClick={() => saveEditing(row.watchlist_id)}>
                <IconCheck size={16} />
              </ActionIcon>
              <ActionIcon color="red" onClick={cancelEditing}>
                <IconX size={16} />
              </ActionIcon>
            </Group>
              )
            : (
            <Group spacing="xs">
              <ActionIcon color="blue" onClick={() => startEditing(row)}>
                <IconEdit size={16} />
              </ActionIcon>
              <ActionIcon color="red" onClick={() => confirmDelete(row)}>
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
              )}
        </td>
      </tr>
    )
  })

  if (data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <Text size="lg" color="dimmed">No items in your watchlist</Text>
        <Text size="sm" color="dimmed">Click "Add Item to Watch" to start monitoring volume dumps</Text>
      </div>
    )
  }

  return (
    <>
      <Modal
        opened={deleteModalOpened}
        onClose={() => setDeleteModalOpened(false)}
        title="Remove from Watchlist"
      >
        <Text mb="md">
          Are you sure you want to remove <strong>{itemToDelete?.name}</strong> from your watchlist?
        </Text>
        <Group position="right">
          <Button variant="outline" onClick={() => setDeleteModalOpened(false)}>
            Cancel
          </Button>
          <Button color="red" onClick={handleDelete}>
            Remove
          </Button>
        </Group>
      </Modal>

      <TextInput
        placeholder="Search watchlist items..."
        mb="md"
        icon={<IconSearch size="0.9rem" stroke={1.5}/>}
        value={search ?? ''}
        onChange={handleSearchChange}
      />

      <ScrollArea>
        <Table sx={{ minWidth: 1000 }} verticalSpacing="xs" horizontalSpacing="md">
          <thead className={cx(classes.header)}>
            <tr>
              <th className={classes.th}>
                <Text weight={500} size="sm">ID</Text>
              </th>
              <th className={classes.th}>
                <Text weight={500} size="sm">Image</Text>
              </th>
              <th className={classes.th}>
                <Text weight={500} size="sm">Name</Text>
              </th>
              <th className={classes.th}>
                <Text weight={500} size="sm">Buy Price</Text>
              </th>
              <th className={classes.th}>
                <Text weight={500} size="sm">Sell Price</Text>
              </th>
              <th className={classes.th}>
                <Text weight={500} size="sm">Current Volume</Text>
              </th>
              <th className={classes.th}>
                <Text weight={500} size="sm">Volume Alert</Text>
              </th>
              <th className={classes.th}>
                <Text weight={500} size="sm">Price Drop Alert</Text>
              </th>
              <th className={classes.th}>
                <Text weight={500} size="sm">Status</Text>
              </th>
              <th className={classes.th}>
                <Text weight={500} size="sm">Chart</Text>
              </th>
              <th className={classes.th}>
                <Text weight={500} size="sm">Actions</Text>
              </th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </Table>
      </ScrollArea>

      <Pagination
        total={Math.ceil(sortedData.length / itemsPerPage)}
        value={currentPage}
        onChange={setCurrentPage}
        mt="sm"
      />
    </>
  )
}

export default WatchlistTable
