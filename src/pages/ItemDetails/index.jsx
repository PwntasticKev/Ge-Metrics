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
import GoalTracker from './components/GoalTracker.jsx'
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
                  variant="filled"
                >
                  ⚠️ Manipulation Detected
                </Badge>
              )}
            </Group>
          </Group>
        </Card>

        {/* Volume Manipulation Radar */}
        {manipulationData.isManipulated && (
          <Alert
            icon={<IconAlertTriangle size={16} />}
            title="Volume Manipulation Detected"
            color={manipulationData.severity === 'high' ? 'red' : manipulationData.severity === 'medium' ? 'orange' : 'yellow'}
            className={classes.radarAlert}
          >
            This item shows {manipulationData.severity} signs of volume manipulation.
            Trade volume is significantly higher than average - exercise caution.
          </Alert>
        )}

        {
            item && Object.keys(item).length > 0 && (
                <SimpleGrid cols={2} spacing="sm" breakpoints={[{ maxWidth: 'sm', cols: 1 }]}>
                    <Grid gutter="sm">
                        <Grid.Col>
                            <Card withBorder radius="md" className={classes.card}>
                                <Group position="apart" style={{ paddingBottom: '8px' }}>
                                    <Text className={classes.title}>
                                        {item.name}
                                    </Text>
                                    <Anchor size="xs" color="dimmed" sx={{ lineHeight: 1 }}>
                                        + 21 other services
                                    </Anchor>
                                </Group>
                                <Text style={{ padding: '6px 0' }} size="xs">Buy/sell prices are updated every 60 seconds.
                                    Trade
                                    volumes and
                                    current price is
                                    updated every 5-minutes. Do a margin calculation in-game to check current prices.
                                </Text>
                                <Divider style={{ margin: '6px 0' }}/>
                                {itemInfo}

                            </Card>
                        </Grid.Col>
                        <Grid.Col>
                            <GoalTracker/>
                        </Grid.Col>
                    </Grid>
                    <Grid gutter="sm">
                        <Grid.Col span={7}>
                            <ProfitModifier/>

                            {/* Profit/Loss Input */}
                            <Card withBorder radius="md" className={classes.card} mt="sm">
                              <Title order={4} className={classes.title} mb="sm">
                                Track Your Performance
                              </Title>
                              <Stack spacing="sm">
                                <NumberInput
                                  label="Profit/Loss on this item"
                                  placeholder="Enter amount (negative for losses)"
                                  value={profitLossInput}
                                  onChange={setProfitLossInput}
                                  parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                                  formatter={(value) =>
                                    !Number.isNaN(parseFloat(value))
                                      ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                                      : ''
                                  }
                                />
                                <Button variant="filled" leftIcon={<IconTrendingUp size={16} />}>
                                  Record Transaction
                                </Button>
                              </Stack>
                            </Card>
                        </Grid.Col>
                        <Grid.Col span={5}>
                            <Card withBorder radius="md" className={classes.card}>
                                <Group position="apart">
                                    <Text className={classes.title} sx={{ paddingBottom: 8 }}>Helpful Information</Text>
                                </Group>

                                {/* Helpful Items Dropdown */}
                                {helpfulItems.length > 0 && (
                                  <Select
                                    label="Related Items"
                                    placeholder="Select a related item"
                                    data={helpfulItems}
                                    value={selectedHelpfulItem}
                                    onChange={setSelectedHelpfulItem}
                                    mb="md"
                                    searchable
                                  />
                                )}

                                <Accordion variant="contained">
                                    <Accordion.Item value="Help">
                                        <Accordion.Control
                                            icon={<IconCalendarPlus size={rem(20)} color={getColor('teal')}/>}>
                                            Help
                                        </Accordion.Control>
                                        <Accordion.Panel sx={{ fontSize: '0.8rem' }}>Use the profit track to record your
                                            transactions. The interface
                                            is designed
                                            to make it easy for you to add profits. Just enter the amount you earned
                                            from selling an item in the game, and it will be added to your profile. If
                                            needed, you can also update a transaction in your profile
                                            settings.
                                        </Accordion.Panel>
                                    </Accordion.Item>
                                    <Accordion.Item value="Tax Info">
                                        <Accordion.Control
                                            icon={<IconCalendarPlus size={rem(20)} color={getColor('orange')}/>}>
                                            Tax Information
                                        </Accordion.Control>
                                        <Accordion.Panel sx={{ fontSize: '0.8rem' }}>
                                            The Grand Exchange charges a 2% tax on all sales. This is automatically
                                            calculated and shown in the "After Tax" price above. The tax amount is
                                            deducted from your sell price when you complete a sale.
                                        </Accordion.Panel>
                                    </Accordion.Item>
                                </Accordion>
                            </Card>
                            {/* <Skeleton height={SECONDARY_COL_HEIGHT} radius="md" animate={false}/> */}
                        </Grid.Col>
                    </Grid>
                </SimpleGrid>
            )
        }

        <Container size="70rem" px={0}>
            <LineChart id={id}/>
        </Container>

    </>
}
