import React, { useState } from 'react'
import {
  Container,
  Title,
  Text,
  Card,
  Group,
  Badge,
  Stack,
  Grid,
  Button,
  Progress,
  Tabs,
  Alert,
  Timeline,
  ThemeIcon,
  Divider,
  ActionIcon,
  Tooltip
} from '@mantine/core'
import {
  IconCalendar,
  IconTrendingUp,
  IconClock,
  IconStar,
  IconInfoCircle,
  IconChartLine,
  IconCoin,
  IconFlame,
  IconShield,
  IconSword,
  IconWand,
  IconEye,
  IconBell,
  IconAnchor
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'

export default function FutureItems () {
  const [activeTab, setActiveTab] = useState('upcoming')

  const upcomingItems = [
    {
      id: 1,
      name: 'Varlamore Combat Gear',
      category: 'Combat Equipment',
      releaseDate: 'Q1 2025',
      predictedPrice: '15-25M GP',
      confidence: 78,
      rarity: 'Rare',
      source: 'Dev Blog Analysis',
      description: 'New tier combat equipment from Varlamore expansion. Expected to bridge gap between current high-tier gear.',
      icon: IconSword
    },
    {
      id: 2,
      name: 'Sailing Materials Bundle',
      category: 'Skilling Supplies',
      releaseDate: 'Q2 2025',
      predictedPrice: '500K-2M GP',
      confidence: 65,
      rarity: 'Common',
      source: 'Community Speculation',
      description: 'Essential materials for the upcoming Sailing skill. Demand expected to be extremely high on release.',
      icon: IconAnchor
    },
    {
      id: 3,
      name: 'Desert Treasure III Rewards',
      category: 'Magic Equipment',
      releaseDate: 'Q3 2025',
      predictedPrice: '50-100M GP',
      confidence: 72,
      rarity: 'Very Rare',
      source: 'Quest Series Pattern',
      description: 'Continuation rewards from Desert Treasure series. Historically these quests introduce game-changing magic items.',
      icon: IconWand
    },
    {
      id: 4,
      name: 'Enhanced Wilderness Drops',
      category: 'PvP Equipment',
      releaseDate: 'Q4 2024',
      predictedPrice: '10-30M GP',
      confidence: 85,
      rarity: 'Rare',
      source: 'Official Announcement',
      description: 'Improved drops from wilderness boss rework. Expected to revitalize PvP economy and create new meta.',
      icon: IconShield
    }
  ]

  const marketTrends = [
    {
      category: 'Pre-Release Speculation',
      items: ['Torva pieces', 'Crystal equipment', 'Dragon items'],
      trend: 'Rising',
      change: '+15-30%',
      reason: 'Players stockpiling in anticipation'
    },
    {
      category: 'Materials & Components',
      items: ['Crystal shards', 'Dragon scales', 'Rare ores'],
      trend: 'Volatile',
      change: '±20%',
      reason: 'Uncertain crafting requirements'
    },
    {
      category: 'Legacy Equipment',
      items: ['Whips', 'Barrows items', 'God Wars gear'],
      trend: 'Declining',
      change: '-5-10%',
      reason: 'Expected to be outclassed by new items'
    }
  ]

  const timeline = [
    {
      title: 'Varlamore Part 2: The Rising Darkness',
      date: 'Q1 2025 (Expected)',
      status: 'upcoming',
      impact: 'Very High',
      description: 'Major content expansion introducing new areas, quests, and high-level items. Expected to significantly impact herb, rune, and equipment markets.'
    },
    {
      title: 'Sailing Skill Release',
      date: 'Q2 2025 (Speculated)',
      status: 'upcoming',
      impact: 'Very High',
      description: 'New skill introduction will create massive demand for materials, tools, and consumables. Prepare for market volatility.'
    },
    {
      title: 'Desert Treasure III',
      date: 'Q3 2025 (Rumored)',
      status: 'upcoming',
      impact: 'High',
      description: 'Continuation of the Desert Treasure quest series. Likely to introduce powerful magic equipment and affect rune prices.'
    },
    {
      title: 'Wilderness Boss Rework',
      date: 'Q4 2024 - Q1 2025',
      status: 'upcoming',
      impact: 'High',
      description: 'Rework of existing wilderness bosses with improved drop tables. Will affect PvP supply economics and rare item values.'
    },
    {
      title: 'Mobile Interface Updates',
      date: 'Ongoing 2024-2025',
      status: 'upcoming',
      impact: 'Medium',
      description: 'Quality of life improvements for mobile players. May increase player base and trading volume.'
    }
  ]

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return 'green'
    if (confidence >= 60) return 'yellow'
    return 'red'
  }

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'Legendary': return 'grape'
      case 'Rare': return 'blue'
      case 'Uncommon': return 'green'
      default: return 'gray'
    }
  }

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'Rising': return 'green'
      case 'Declining': return 'red'
      case 'Volatile': return 'yellow'
      default: return 'gray'
    }
  }

  // Handler functions for interactive elements
  const handleAddToWatchlist = (item) => {
    notifications.show({
      title: 'Added to Watchlist',
      message: `${item.name} has been added to your watchlist`,
      color: 'green',
      icon: <IconEye size={16} />
    })
  }

  const handleSetPriceAlert = (item) => {
    notifications.show({
      title: 'Price Alert Set',
      message: `You'll be notified when ${item.name} reaches your target price`,
      color: 'blue',
      icon: <IconBell size={16} />
    })
  }

  const handleViewMarketAnalysis = (item) => {
    notifications.show({
      title: 'Market Analysis',
      message: `Showing detailed analysis for ${item.name} - Price trends, volume predictions, and market impact`,
      color: 'purple',
      icon: <IconChartLine size={16} />
    })
  }

  return (
    <Container size="xl" py="md">
      <Stack spacing="lg">
      {/* Header */}
        <div>
          <Group spacing="xs" align="center" mb="xs">
            <IconCalendar size={28} color="#4DABF7" />
            <Title order={1} color="white">Future Items</Title>
          </Group>
          <Text size="lg" color="dimmed">
            Upcoming OSRS content, market predictions, and release speculation
          </Text>
        </div>

        {/* Alert */}
        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
          <Text size="sm">
            <strong>Disclaimer:</strong> All predictions are speculative based on community discussions,
            dev blogs, and market analysis. Actual release dates and item stats may vary.
          </Text>
        </Alert>

        {/* Tabs */}
        <Tabs value={activeTab} onTabChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="upcoming" icon={<IconClock size={16} />}>
              Upcoming Items
            </Tabs.Tab>
            <Tabs.Tab value="trends" icon={<IconTrendingUp size={16} />}>
              Market Trends
            </Tabs.Tab>
            <Tabs.Tab value="timeline" icon={<IconCalendar size={16} />}>
              Release Timeline
            </Tabs.Tab>
          </Tabs.List>

          {/* Upcoming Items Tab */}
          <Tabs.Panel value="upcoming" pt="md">
            <Grid>
              {upcomingItems.map((item) => (
                <Grid.Col key={item.id} span={12} md={6}>
                  <Card withBorder p="lg" radius="md" h="100%">
                    <Stack spacing="md">
                      {/* Header */}
                      <Group position="apart" align="flex-start">
                        <Group spacing="sm">
                          <ThemeIcon size="lg" variant="light" color="blue">
                            <item.icon size={20} />
                          </ThemeIcon>
                          <div>
                            <Text weight={600} size="lg">{item.name}</Text>
                            <Text size="sm" color="dimmed">{item.category}</Text>
                          </div>
                        </Group>
                        <Group spacing="xs">
                          <Tooltip label="Add to watchlist">
                            <ActionIcon variant="light" color="yellow" onClick={() => handleAddToWatchlist(item)}>
                              <IconEye size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Set price alert">
                            <ActionIcon variant="light" color="blue" onClick={() => handleSetPriceAlert(item)}>
                              <IconBell size={16} />
                            </ActionIcon>
                          </Tooltip>
        </Group>
      </Group>

                      {/* Badges */}
                      <Group spacing="xs">
                        <Badge color={getRarityColor(item.rarity)} variant="light">
                          {item.rarity}
                        </Badge>
                        <Badge color={getConfidenceColor(item.confidence)} variant="light">
                          {item.confidence}% confidence
          </Badge>
        </Group>

                      {/* Details */}
            <Stack spacing="xs">
                        <Group position="apart">
                          <Text size="sm" color="dimmed">Release Date:</Text>
                          <Text size="sm" weight={500}>{item.releaseDate}</Text>
                        </Group>
                        <Group position="apart">
                          <Text size="sm" color="dimmed">Predicted Price:</Text>
                          <Text size="sm" weight={500} color="green">{item.predictedPrice}</Text>
                        </Group>
                        <Group position="apart">
                          <Text size="sm" color="dimmed">Source:</Text>
                          <Text size="sm">{item.source}</Text>
              </Group>
            </Stack>

                      {/* Confidence Bar */}
                      <div>
                        <Group position="apart" mb={5}>
                          <Text size="xs" color="dimmed">Prediction Confidence</Text>
                          <Text size="xs" color="dimmed">{item.confidence}%</Text>
                        </Group>
                <Progress
                          value={item.confidence}
                          color={getConfidenceColor(item.confidence)}
                  size="sm"
                        />
                      </div>

                      {/* Description */}
                      <Text size="sm" color="dimmed">
                        {item.description}
                      </Text>

                      {/* Action Button */}
                      <Button variant="light" leftIcon={<IconChartLine size={16} />} fullWidth onClick={() => handleViewMarketAnalysis(item)}>
                        View Market Analysis
                      </Button>
            </Stack>
                  </Card>
          </Grid.Col>
              ))}
            </Grid>
          </Tabs.Panel>

          {/* Market Trends Tab */}
          <Tabs.Panel value="trends" pt="md">
            <Stack spacing="lg">
              <Text size="lg" weight={600}>Pre-Release Market Impact</Text>

              {marketTrends.map((trend, index) => (
                <Card key={index} withBorder p="lg">
                  <Stack spacing="md">
                    <Group position="apart" align="center">
                      <Text weight={600} size="lg">{trend.category}</Text>
                      <Group spacing="xs">
                        <Badge color={getTrendColor(trend.trend)} variant="light">
                          {trend.trend}
                        </Badge>
                        <Badge color={getTrendColor(trend.trend)} variant="filled">
                          {trend.change}
                        </Badge>
                      </Group>
                    </Group>

                    <Group spacing="xs">
                      <Text size="sm" color="dimmed">Affected Items:</Text>
                      {trend.items.map((item, i) => (
                        <Badge key={i} size="sm" variant="outline">
                          {item}
                        </Badge>
                      ))}
              </Group>

                    <Text size="sm" color="dimmed">
                      <strong>Reason:</strong> {trend.reason}
                    </Text>
                  </Stack>
                </Card>
              ))}
            </Stack>
          </Tabs.Panel>

          {/* Timeline Tab */}
          <Tabs.Panel value="timeline" pt="md">
            <Stack spacing="lg">
              <Text size="lg" weight={600}>Content Release Timeline</Text>

              <Timeline active={0} bulletSize={24} lineWidth={2}>
                {timeline.map((event, index) => (
                  <Timeline.Item
                    key={index}
                    bullet={<IconCalendar size={12} />}
                    title={event.title}
                  >
                    <Stack spacing="xs">
                        <Group spacing="xs">
                        <Text size="sm" color="dimmed">{event.date}</Text>
                        <Badge
                          size="xs"
                          color={event.status === 'upcoming' ? 'blue' : 'gray'}
                          variant="light"
                        >
                          {event.status}
                        </Badge>
                        <Badge
                          size="xs"
                          color={event.impact === 'Very High' ? 'red' : event.impact === 'High' ? 'orange' : 'blue'}
                          variant="light"
                        >
                          {event.impact} Impact
                        </Badge>
                        </Group>
                      <Text size="sm" color="dimmed">
                        {event.description}
                      </Text>
                    </Stack>
                  </Timeline.Item>
                ))}
              </Timeline>
                </Stack>
          </Tabs.Panel>
      </Tabs>
      </Stack>
    </Container>
  )
}
