import { useEffect, useState } from 'react'
import LineChart from '../../shared/line-chart.jsx'
import {
  Accordion,
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Container,
  createStyles,
  Divider,
  Grid,
  Group,
  NumberInput,
  rem,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Title,
  useMantineTheme
} from '@mantine/core'
import { useParams } from 'react-router-dom'
import ItemData from '../../utils/item-data.jsx'
import ProfitModifier from './components/profit-modifier.jsx'
import { getRelativeTime } from '../../utils/utils.jsx'
import { IconAlertTriangle, IconCalendarPlus, IconClock, IconTrendingUp } from '@tabler/icons-react'

const useStyles = createStyles((theme) => ({
  card: {
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0]
  },

  title: {
    fontFamily: `Greycliff CF, ${theme.fontFamily}`,
    fontWeight: 700
  },

  item: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    borderRadius: theme.radius.md,
    height: rem(90),
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
    transition: 'box-shadow 150ms ease, transform 100ms ease',

    '&:hover': {
      boxShadow: theme.shadows.md,
      transform: 'scale(1.05)'
    }
  },

  statusCard: {
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[1],
    marginBottom: theme.spacing.md
  },

  radarAlert: {
    marginBottom: theme.spacing.md
  },

  chartContainer: {
    height: '500px', // Increased height for bigger chart
    marginTop: theme.spacing.lg
  }
}))

export default function ItemDetails () {
  const theme = useMantineTheme()
  const { items } = ItemData()
  const { classes } = useStyles()
  const { id } = useParams()
  const [item, setItem] = useState('')
  const [options, setItemOptions] = useState([])
  const [profitLossInput, setProfitLossInput] = useState(0)
  const [selectedHelpfulItem, setSelectedHelpfulItem] = useState(null)
  const [lastFetchTime, setLastFetchTime] = useState(new Date())
  const [currentTime, setCurrentTime] = useState(new Date())

  const getColor = (color) => theme.colors[color][theme.colorScheme === 'dark' ? 5 : 7]

  // Volume manipulation detection
  const detectVolumeManipulation = (item) => {
    if (!item || !item.volume) return { isManipulated: false, severity: 'low' }

    const volume = parseInt(item.volume?.toString().replace(/,/g, '') || '0')
    const avgVolume = 50000 // This should come from historical data
    const volumeRatio = volume / avgVolume

    if (volumeRatio > 3) return { isManipulated: true, severity: 'high' }
    if (volumeRatio > 2) return { isManipulated: true, severity: 'medium' }
    if (volumeRatio > 1.5) return { isManipulated: true, severity: 'low' }

    return { isManipulated: false, severity: 'normal' }
  }

  // Calculate taxes (2% GE tax)
  const calculateTaxes = (sellPrice) => {
    const price = parseInt(sellPrice?.toString().replace(/,/g, '') || '0')
    return Math.floor(price * 0.02)
  }

  // Get helpful related items
  const getHelpfulItems = (currentItem) => {
    if (!currentItem || !items) return []

    // Simple logic - get items with similar names or categories
    return items
      .filter(item =>
        item.id !== currentItem.id &&
        (item.name.toLowerCase().includes(currentItem.name.toLowerCase().split(' ')[0]) ||
         Math.abs(parseInt(item.high?.replace(/,/g, '') || 0) - parseInt(currentItem.high?.replace(/,/g, '') || 0)) < 50000)
      )
      .slice(0, 10)
      .map(item => ({ value: item.id.toString(), label: item.name }))
  }

  useEffect(() => {
    const foundItem = items.find(i => Number(i.id) === Number(id))
    setItem(foundItem)

    if (foundItem) {
      const taxes = calculateTaxes(foundItem.high)
      const sellPriceAfterTax = parseInt(foundItem.high?.replace(/,/g, '') || 0) - taxes

      setItemOptions([
        {
          title: 'Buy Price',
          data: foundItem?.low
        }, {
          title: 'Sell Price',
          data: foundItem?.high
        },
        {
          title: 'After Tax (2%)',
          data: new Intl.NumberFormat().format(sellPriceAfterTax),
          props: {
            color: theme.colors.yellow[7],
            fontWeight: 'bold'
          }
        },
        {
          title: 'Tax Amount',
          data: new Intl.NumberFormat().format(taxes),
          props: {
            color: theme.colors.red[7],
            fontWeight: 'bold'
          }
        },
        {
          title: 'Profit',
          data: foundItem?.profit,
          props: {
            color: Number(foundItem?.profit?.replace(/,/g, '') || 0) > 0 ? theme.colors.green[7] : theme.colors.red[9],
            fontWeight: 'bold'
          }
        }
      ])
    }

    // Update last fetch time
    setLastFetchTime(new Date())
  }, [items, id, theme])

  // Update current time every second for live ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const itemInfo = options.map((option, idx) => (
        <Group position="apart" style={{ padding: '8px 0' }} key={idx}>
            <Text className={classes.title} size="sm">
                {option.title}
            </Text>
            <Text {...option.props}>
                {option.data}
            </Text>
        </Group>
  ))

  const manipulationData = item ? detectVolumeManipulation(item) : { isManipulated: false, severity: 'normal' }
  const helpfulItems = item ? getHelpfulItems(item) : []

  return <>
        {/* Status Card */}
        <Card withBorder radius="md" className={classes.statusCard}>
          <Group position="apart">
            <Group>
              <IconClock size={16} />
              <Text size="sm">
                Updated {getRelativeTime(lastFetchTime, currentTime)}
              </Text>
            </Group>
            <Group spacing="xs">
              <Badge color="green" variant="light">Live Data</Badge>
              {manipulationData.isManipulated && (
                <Badge
                  color={manipulationData.severity === 'high' ? 'red' : manipulationData.severity === 'medium' ? 'orange' : 'yellow'}
                  variant="light"
                >
                  Volume Alert
                </Badge>
              )}
            </Group>
          </Group>
        </Card>

        {/* Volume Manipulation Alert */}
        {manipulationData.isManipulated && (
          <Alert
            icon={<IconAlertTriangle size={16} />}
            title="Volume Manipulation Detected"
            color={manipulationData.severity === 'high' ? 'red' : manipulationData.severity === 'medium' ? 'orange' : 'yellow'}
            className={classes.radarAlert}
          >
            This item is showing {manipulationData.severity} volume manipulation.
            Exercise caution when trading and verify prices across multiple sources.
          </Alert>
        )}

        <SimpleGrid
            cols={3}
            breakpoints={[
              { maxWidth: 'md', cols: 2 },
              { maxWidth: 'xs', cols: 1 }
            ]}
        >
            <Card withBorder radius="md" className={classes.card}>
                <Group position="apart">
                    <Text className={classes.title}>
                        {item?.name}
                    </Text>
                </Group>
                <Stack spacing="xs">
                    {itemInfo}
                </Stack>
            </Card>

            <Card withBorder radius="md" className={classes.card}>
                <Group position="apart">
                    <Text className={classes.title}>Helpful Items</Text>
                </Group>
                <Select
                  placeholder="Select related item"
                  data={helpfulItems}
                  value={selectedHelpfulItem}
                  onChange={setSelectedHelpfulItem}
                  searchable
                  clearable
                />
                {selectedHelpfulItem && (
                  <Text size="sm" color="dimmed" mt="xs">
                    <Anchor href={`/item/${selectedHelpfulItem}`}>
                      View item details
                    </Anchor>
                  </Text>
                )}
            </Card>

            <ProfitModifier item={item} />
        </SimpleGrid>

        {/* Enhanced Chart Section - Now Much Larger */}
        <Card withBorder radius="md" className={`${classes.card} ${classes.chartContainer}`} mt="lg">
          <Group position="apart" mb="md">
            <Text className={classes.title} size="lg">Price History</Text>
            <Group spacing="xs">
              <Badge color="blue" variant="light">Live Updates</Badge>
              <Badge color="green" variant="light">High Volume</Badge>
            </Group>
          </Group>
          <div style={{ height: '420px', width: '100%' }}>
            <LineChart />
          </div>
        </Card>
    </>
}
