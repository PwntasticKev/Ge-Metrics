import { useEffect, useState } from 'react'
import LineChart from '../../shared/line-chart.jsx'
import {
  Accordion,
  Alert,
  Anchor,
  Avatar,
  Badge,
  Button,
  Card,
  Container,
  createStyles,
  Divider,
  Grid,
  Group,
  Image,
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
    transition: 'box-shadow 0.2s ease-out',

    '&:hover': {
      boxShadow: theme.shadows.md
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
    minHeight: '650px', // Much larger chart - hero element
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl
  },

  headerCard: {
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[0],
    marginBottom: theme.spacing.md
  },

  statCard: {
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[0],
    transition: 'box-shadow 0.2s ease-out',
    '&:hover': {
      boxShadow: theme.shadows.sm
    }
  }
}))

export default function ItemDetails () {
  const theme = useMantineTheme()
  const { items } = ItemData()
  const { classes } = useStyles()
  const { id } = useParams()
  const [item, setItem] = useState(null)
  const [options, setItemOptions] = useState([])
  const [profitLossInput, setProfitLossInput] = useState(0)
  const [lastFetchTime, setLastFetchTime] = useState(new Date())
  const [currentTime, setCurrentTime] = useState(new Date())

  const getColor = (color) => theme.colors[color][theme.colorScheme === 'dark' ? 5 : 7]

  // Helper function to safely parse price (handles both string and number)
  const safeParsePrice = (price) => {
    if (typeof price === 'number') return price
    if (typeof price === 'string') {
      return parseInt(price.replace(/,/g, '') || '0', 10)
    }
    return 0
  }

  // Volume manipulation detection
  const detectVolumeManipulation = (item) => {
    if (!item || !item.volume) return { isManipulated: false, severity: 'low' }

    const volume = safeParsePrice(item.volume)
    const avgVolume = 50000 // This should come from historical data
    const volumeRatio = volume / avgVolume

    if (volumeRatio > 3) return { isManipulated: true, severity: 'high' }
    if (volumeRatio > 2) return { isManipulated: true, severity: 'medium' }
    if (volumeRatio > 1.5) return { isManipulated: true, severity: 'low' }

    return { isManipulated: false, severity: 'normal' }
  }

  // Calculate taxes (2% GE tax)
  const calculateTaxes = (sellPrice) => {
    const price = safeParsePrice(sellPrice)
    return Math.floor(price * 0.02)
  }

  // Get helpful related items - REMOVED FOR BETTER UX
  // const getHelpfulItems = (currentItem) => {
  //   if (!currentItem || !items) return []
  //   // Simple logic - get items with similar names or categories
  //   return items
  //     .filter(item =>
  //       item.id !== currentItem.id &&
  //       (item.name.toLowerCase().includes(currentItem.name.toLowerCase().split(' ')[0]) ||
  //        Math.abs(parseInt(item.high?.replace(/,/g, '') || 0) - parseInt(currentItem.high?.replace(/,/g, '') || 0)) < 50000)
  //     )
  //     .slice(0, 10)
  //     .map(item => ({ value: item.id.toString(), label: item.name }))
  // }

  useEffect(() => {
    const foundItem = items.find(i => Number(i.id) === Number(id))
    setItem(foundItem)

    if (foundItem) {
      const highPrice = safeParsePrice(foundItem.high)
      const taxes = calculateTaxes(highPrice)
      const sellPriceAfterTax = highPrice - taxes
      const profitValue = safeParsePrice(foundItem.profit)

      const buyPrice = safeParsePrice(foundItem.low)
      const sellPrice = safeParsePrice(foundItem.high)

      setItemOptions([
        {
          title: 'Buy Price',
          data: new Intl.NumberFormat().format(buyPrice)
        },         {
          title: 'Sell Price',
          data: (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              {new Intl.NumberFormat().format(sellPrice)}
              <Text 
                size="xs" 
                color="red" 
                style={{ 
                  position: 'absolute', 
                  top: '100%', 
                  left: '50%', 
                  transform: 'translateX(-50%)', 
                  whiteSpace: 'nowrap',
                  fontSize: '10px',
                  marginTop: '2px'
                }}
              >
                (-{new Intl.NumberFormat().format(taxes)} tax)
              </Text>
            </div>
          )
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
          data: new Intl.NumberFormat().format(profitValue),
          props: {
            color: profitValue > 0 ? theme.colors.green[7] : theme.colors.red[9],
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

  // Don't render itemInfo as JSX yet - we'll use options directly in the layout

  const manipulationData = item ? detectVolumeManipulation(item) : { isManipulated: false, severity: 'normal' }
  // const helpfulItems = item ? getHelpfulItems(item) : [] // REMOVED FOR BETTER UX

  if (!item) {
    return (
      <Container>
        <Text>Item not found</Text>
      </Container>
    )
  }

  return <>
        {/* Compact Header Section - Item Name, Image, Key Stats */}
        <Card withBorder radius="md" className={classes.headerCard} p="md">
          <Group position="apart" align="flex-start">
            <Group spacing="md">
              {item.img && (
                <Avatar 
                  src={item.img} 
                  size={64} 
                  radius="md"
                  alt={item.name}
                />
              )}
              <Stack spacing="xs">
                <Title order={2} className={classes.title}>
                  {item?.name}
                </Title>
                <Group spacing="xs">
                  <IconClock size={14} />
                  <Text size="sm" color="dimmed">
                    Updated {getRelativeTime(lastFetchTime, currentTime)}
                  </Text>
                </Group>
              </Stack>
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

          {/* Key Stats in Horizontal Cards */}
          <SimpleGrid
            cols={5}
            breakpoints={[
              { maxWidth: 'md', cols: 3 },
              { maxWidth: 'xs', cols: 2 }
            ]}
            mt="md"
          >
            {options.map((option, idx) => (
              <Card key={idx} withBorder radius="md" className={classes.statCard} p="sm">
                <Stack spacing={4} align="center">
                  <Text size="xs" color="dimmed" weight={500}>
                    {option.title}
                  </Text>
                  <Text size="lg" weight={700} {...option.props}>
                    {option.data}
                  </Text>
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
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

        {/* Hero Chart Section - Largest Element on Page */}
        <Card withBorder radius="md" className={`${classes.card} ${classes.chartContainer}`} p="lg">
          <Group position="apart" mb="md">
            <Title order={2} className={classes.title}>Price History</Title>
            <Group spacing="xs">
              <Badge color="blue" variant="light">Live Updates</Badge>
              <Badge color="green" variant="light">High Volume</Badge>
            </Group>
          </Group>
          <div style={{ height: '600px', width: '100%' }}>
            <LineChart id={id} items={items} />
          </div>
        </Card>

        {/* Secondary Section - Profit Modifier and Additional Details */}
        <SimpleGrid
          cols={2}
          breakpoints={[
            { maxWidth: 'md', cols: 1 }
          ]}
          mt="xl"
        >
          <ProfitModifier item={item} />
          
          <Card withBorder radius="md" className={classes.card}>
            <Title order={3} className={classes.title} mb="md">Item Details</Title>
            <Stack spacing="sm">
              {item.examine && (
                <div>
                  <Text size="sm" weight={600} mb={4}>Examine:</Text>
                  <Text size="sm" color="dimmed">{item.examine}</Text>
                </div>
              )}
              {item.limit && (
                <div>
                  <Text size="sm" weight={600} mb={4}>Buy Limit:</Text>
                  <Text size="sm" color="dimmed">{item.limit.toLocaleString()}</Text>
                </div>
              )}
              {item.volume && (
                <div>
                  <Text size="sm" weight={600} mb={4}>24h Volume:</Text>
                  <Text size="sm" color="dimmed">{typeof item.volume === 'number' ? item.volume.toLocaleString() : item.volume}</Text>
                </div>
              )}
            </Stack>
          </Card>
        </SimpleGrid>
    </>
}
