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
  IconBell
} from '@tabler/icons-react'

export default function FutureItems () {
  const [activeTab, setActiveTab] = useState('upcoming')

  const upcomingItems = [
    {
      id: 1,
      name: 'Torva Platebody (or)',
      category: 'Armor',
      releaseDate: '2024-02-15',
      confidence: 85,
      predictedPrice: '2.1B - 2.8B',
      description: 'Ornament kit variant of Torva platebody expected with next update',
      icon: IconShield,
      rarity: 'Legendary',
      source: 'Nex Drop Table Enhancement'
    },
    {
      id: 2,
      name: 'Enhanced Crystal Bow',
      category: 'Weapon',
      releaseDate: '2024-03-01',
      confidence: 72,
      predictedPrice: '450M - 650M',
      description: 'Upgraded version of Crystal Bow with special attack',
      icon: IconSword,
      rarity: 'Rare',
      source: 'Gauntlet Expansion'
    },
    {
      id: 3,
      name: 'Lunar Spellbook Runes',
      category: 'Magic',
      releaseDate: '2024-02-28',
      confidence: 90,
      predictedPrice: '15K - 25K each',
      description: 'New rune type for enhanced lunar spells',
      icon: IconWand,
      rarity: 'Common',
      source: 'Magic Rework Update'
    },
    {
      id: 4,
      name: 'Dragon Slayer III Rewards',
      category: 'Quest Rewards',
      releaseDate: '2024-04-12',
      confidence: 60,
      predictedPrice: 'Variable',
      description: 'Multiple high-tier rewards from the anticipated quest',
      icon: IconStar,
      rarity: 'Legendary',
      source: 'Quest Line Continuation'
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
      title: 'Winter 2024 Update',
      date: 'February 15, 2024',
      description: 'Nex drop table enhancements and ornament kits',
      status: 'upcoming',
      impact: 'High'
    },
    {
      title: 'Magic System Rework',
      date: 'February 28, 2024',
      description: 'New runes and spell mechanics',
      status: 'upcoming',
      impact: 'Medium'
    },
    {
      title: 'Gauntlet Expansion',
      date: 'March 1, 2024',
      description: 'New tiers and crystal equipment upgrades',
      status: 'upcoming',
      impact: 'High'
    },
    {
      title: 'Dragon Slayer III',
      date: 'April 12, 2024',
      description: 'Major quest with multiple high-tier rewards',
      status: 'speculated',
      impact: 'Very High'
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
                            <ActionIcon variant="light" color="yellow">
                              <IconEye size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Set price alert">
                            <ActionIcon variant="light" color="blue">
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
                      <Button variant="light" leftIcon={<IconChartLine size={16} />} fullWidth>
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
