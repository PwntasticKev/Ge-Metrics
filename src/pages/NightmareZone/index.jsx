import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  Center,
  Group,
  Loader,
  Text,
  Badge,
  Grid,
  Stack,
  SimpleGrid,
  Divider,
  Alert,
  Button,
  NumberInput,
  Tabs
} from '@mantine/core'
import {
  IconClock,
  IconTrendingUp,
  IconShield,
  IconActivity,
  IconSword,
  IconCalculator,
  IconTarget,
  IconCoins
} from '@tabler/icons-react'
import ItemData from '../../utils/item-data.jsx'
import { getRelativeTime } from '../../utils/utils.jsx'

const nightmareZoneStrategies = [
  {
    id: 'dharoks',
    name: "Dharok's Strategy",
    description: "Low HP + Dharok's set for maximum damage",
    requirements: ['1 HP', "Dharok's full set", 'Overload potions'],
    profitPerHour: '200-400k gp/hr',
    difficulty: 'Advanced',
    color: 'red'
  },
  {
    id: 'obsidian',
    name: 'Obsidian Strategy',
    description: 'Full obsidian + berserker necklace for consistent damage',
    requirements: ['Full obsidian', 'Berserker necklace', 'Strength potions'],
    profitPerHour: '150-300k gp/hr',
    difficulty: 'Intermediate',
    color: 'orange'
  },
  {
    id: 'whip',
    name: 'Whip Strategy',
    description: 'Standard whip training with decent profit',
    requirements: ['Abyssal whip', 'Dragon defender', 'Combat potions'],
    profitPerHour: '100-200k gp/hr',
    difficulty: 'Beginner',
    color: 'blue'
  }
]

const rewardItems = [
  { name: 'Imbue Ring', points: 650000, value: 'Priceless' },
  { name: 'Herb Box', points: 9500, value: '~15k gp' },
  { name: 'Pure Essence', points: 1, value: '~4 gp' },
  { name: 'Flax', points: 2, value: '~8 gp' },
  { name: 'Potato Cactus', points: 15, value: '~180 gp' }
]

export default function NightmareZone () {
  const { items, mapStatus, priceStatus } = ItemData()
  const [lastFetchTime, setLastFetchTime] = useState(new Date())
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedStrategy, setSelectedStrategy] = useState('dharoks')
  const [activeTab, setActiveTab] = useState('calculator')

  // Calculator states
  const [pointsPerHour, setPointsPerHour] = useState(100000)
  const [hoursPerDay, setHoursPerDay] = useState(6)

  useEffect(() => {
    if (priceStatus === 'success') {
      setLastFetchTime(new Date())
    }
  }, [priceStatus, items])

  // Update current time every second for live ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const calculateProfit = () => {
    const herbBoxes = Math.floor((pointsPerHour * hoursPerDay) / 9500)
    const herbBoxProfit = herbBoxes * 15000 // ~15k per herb box
    const dailyProfit = herbBoxProfit
    const weeklyProfit = dailyProfit * 7
    const monthlyProfit = dailyProfit * 30

    return {
      herbBoxes,
      dailyProfit,
      weeklyProfit,
      monthlyProfit
    }
  }

  const profitData = calculateProfit()

  if (mapStatus === 'loading' || priceStatus === 'loading') {
    return (
      <Center h={300}>
        <Loader size="lg" />
      </Center>
    )
  }

  return (
    <Box sx={{ py: 4 }}>
      {/* Header */}
      <Group position="apart" mb="xl">
        <div>
          <Text size="xl" weight={700} color="white">Nightmare Zone</Text>
          <Text size="sm" color="rgba(255, 255, 255, 0.7)">
            Money making and training strategies for Nightmare Zone
          </Text>
        </div>
        <Group spacing="md">
          <Badge
            color="blue"
            size="lg"
            leftIcon={<IconClock size={14} />}
          >
            {getRelativeTime(lastFetchTime, currentTime)}
          </Badge>
          <Badge color="purple" size="lg">
            Combat Training + Profit
          </Badge>
        </Group>
      </Group>

      {/* Strategy Overview */}
      <SimpleGrid cols={3} spacing="md" mb="xl">
        {nightmareZoneStrategies.map((strategy) => (
          <Card
            key={strategy.id}
            withBorder
            p="md"
            style={{
              cursor: 'pointer',
              borderColor: selectedStrategy === strategy.id ? `var(--mantine-color-${strategy.color}-5)` : undefined
            }}
            onClick={() => setSelectedStrategy(strategy.id)}
          >
            <Group position="apart" mb="sm">
              <Text weight={500}>{strategy.name}</Text>
              <Badge color={strategy.color}>{strategy.difficulty}</Badge>
            </Group>
            <Text size="sm" color="dimmed" mb="sm">
              {strategy.description}
            </Text>
            <Text size="xs" weight={500} color={strategy.color}>
              {strategy.profitPerHour}
            </Text>
            <Divider my="sm" />
            <Stack spacing="xs">
              <Text size="xs" weight={500}>Requirements:</Text>
              {strategy.requirements.map((req, idx) => (
                <Text key={idx} size="xs" color="dimmed">• {req}</Text>
              ))}
            </Stack>
          </Card>
        ))}
      </SimpleGrid>

      <Tabs value={activeTab} onTabChange={setActiveTab} variant="outline">
        <Tabs.List>
          <Tabs.Tab value="calculator" icon={<IconCalculator size={16} />}>
            Profit Calculator
          </Tabs.Tab>
          <Tabs.Tab value="rewards" icon={<IconTarget size={16} />}>
            Reward Shop
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="calculator" pt="xs">
          <Grid>
            <Grid.Col span={6}>
              <Card withBorder p="md">
                <Text weight={500} mb="md">Calculate Your Profits</Text>
                <Stack spacing="md">
                  <NumberInput
                    label="Points per hour"
                    description="Average NMZ points you earn per hour"
                    value={pointsPerHour ?? 50000}
                    defaultValue={50000}
                    onChange={(value) => setPointsPerHour(value ?? 50000)}
                    min={10000}
                    max={300000}
                    step={10000}
                    formatter={(value) => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '50,000'}
                    parser={(value) => value ? value.replace(/\$\s?|(,*)/g, '') : '50000'}
                  />
                  <NumberInput
                    label="Hours per day"
                    description="How many hours you plan to train daily"
                    value={hoursPerDay ?? 4}
                    defaultValue={4}
                    onChange={(value) => setHoursPerDay(value ?? 4)}
                    min={1}
                    max={24}
                    step={1}
                    parser={(value) => value ? value.replace(/\$\s?|(,*)/g, '') : '4'}
                    formatter={(value) => value ? `${Number(value)}` : '4'}
                  />
                </Stack>
              </Card>
            </Grid.Col>

            <Grid.Col span={6}>
              <Card withBorder p="md">
                <Text weight={500} mb="md">Projected Earnings</Text>
                <Stack spacing="md">
                  <Group position="apart">
                    <Text size="sm">Herb boxes per day:</Text>
                    <Text weight={500}>{profitData.herbBoxes}</Text>
                  </Group>
                  <Group position="apart">
                    <Text size="sm">Daily profit:</Text>
                    <Text weight={500} color="green">
                      {profitData.dailyProfit.toLocaleString()} gp
                    </Text>
                  </Group>
                  <Group position="apart">
                    <Text size="sm">Weekly profit:</Text>
                    <Text weight={500} color="green">
                      {profitData.weeklyProfit.toLocaleString()} gp
                    </Text>
                  </Group>
                  <Group position="apart">
                    <Text size="sm">Monthly profit:</Text>
                    <Text weight={500} color="green">
                      {profitData.monthlyProfit.toLocaleString()} gp
                    </Text>
                  </Group>
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        <Tabs.Panel value="rewards" pt="xs">
          <Card withBorder p="md">
            <Text weight={500} mb="md">Nightmare Zone Reward Shop</Text>
            <Stack spacing="sm">
              {rewardItems.map((item, idx) => (
                <Group key={idx} position="apart" p="sm" style={{
                  backgroundColor: idx % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                  borderRadius: '4px'
                }}>
                  <Group>
                    <Text weight={500}>{item.name}</Text>
                    <Badge size="sm" color="blue">
                      {item.points.toLocaleString()} pts
                    </Badge>
                  </Group>
                  <Text size="sm" color="green" weight={500}>
                    {item.value}
                  </Text>
                </Group>
              ))}
            </Stack>
          </Card>
        </Tabs.Panel>
      </Tabs>

      {/* Tips Alert */}
      <Alert
        icon={<IconCoins size={16} />}
        title="Pro Tips"
        color="yellow"
        mt="xl"
      >
        <Text size="sm">
          • Herb boxes are limited to 15 per day and provide the best GP/point ratio
          <br />
          • Always use absorptions instead of prayer for maximum efficiency
          <br />
          • Consider imbuing rings before selling points for GP
          <br />
          • Rock cake to 1 HP for Dharok's strategy maximum effectiveness
        </Text>
      </Alert>
    </Box>
  )
}
