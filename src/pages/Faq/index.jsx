import React, { useState } from 'react'
import {
  Container,
  Title,
  Accordion,
  Text,
  List,
  ThemeIcon,
  Group,
  Badge,
  Card,
  SimpleGrid,
  Button,
  Anchor,
  Stack,
  Alert,
  Divider,
  Box
} from '@mantine/core'
import {
  IconQuestionMark,
  IconCoin,
  IconTrendingUp,
  IconUsers,
  IconExternalLink,
  IconInfoCircle,
  IconTarget,
  IconChartLine,
  IconBrandTwitter,
  IconBrandYoutube,
  IconBrandDiscord,
  IconHelp,
  IconSearch,
  IconPlus,
  IconMinus,
  IconChevronDown,
  IconChevronUp,
  IconMail,
  IconBrandReddit,
  IconBrandTwitch
} from '@tabler/icons-react'
import { Link } from 'react-router-dom'

export default function Faq () {
  const [activeAccordion, setActiveAccordion] = useState(['website-faq'])

  const flippingExperts = [
    {
      name: 'FlippingOldschool',
      platform: 'YouTube',
      description: 'Most comprehensive flipping tutorials and market analysis',
      link: 'https://youtube.com/@FlippingOldschool'
    },
    {
      name: 'SirPugger',
      platform: 'YouTube',
      description: 'Great beginner-friendly money making guides',
      link: 'https://youtube.com/@SirPugger'
    },
    {
      name: 'Theoatrix OSRS',
      platform: 'YouTube',
      description: 'Detailed guides and efficient money making methods',
      link: 'https://youtube.com/@Theoatrix'
    },
    {
      name: 'OSRS_Flipping',
      platform: 'Twitter',
      description: 'Daily market updates and profitable flips',
      link: 'https://twitter.com/OSRS_Flipping'
    }
  ]

  const exampleFlips = [
    { item: 'Dragon bones', buyPrice: '2,800', sellPrice: '2,850', profit: '50', volume: 'High' },
    { item: 'Rune scimitar', buyPrice: '14,800', sellPrice: '15,100', profit: '300', volume: 'Medium' },
    { item: 'Magic logs', buyPrice: '1,050', sellPrice: '1,080', profit: '30', volume: 'High' },
    { item: 'Prayer potion(4)', buyPrice: '9,800', sellPrice: '10,050', profit: '250', volume: 'Medium' }
  ]

  return (
    <Container size="lg" py="xl">
      <Group position="center" mb="xl">
        <ThemeIcon size="xl" radius="md" variant="filled" color="blue">
          <IconQuestionMark size={28} />
        </ThemeIcon>
        <Title order={1} align="center">
          GE Metrics Guide & FAQ
        </Title>
      </Group>

      <Text size="lg" color="dimmed" align="center" mb="xl">
        Everything you need to know about flipping, money making, and using GE Metrics effectively
      </Text>

      <Accordion
        multiple
        value={activeAccordion}
        onChange={(value) => setActiveAccordion(value ?? [])}
        variant="separated"
        radius="md"
      >
        {/* Website FAQ */}
        <Accordion.Item value="website-faq">
          <Accordion.Control icon={<IconInfoCircle size={20} />}>
            <Title order={3}>Website FAQ</Title>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack spacing="md">
              <Card withBorder p="md">
                <Title order={4} mb="sm">How often is data updated?</Title>
                <Text>
                  Our data is updated every 60 seconds for prices and every 5 minutes for volumes.
                  You can see the last update time at the top of each page showing "pulled X minutes ago".
                </Text>
              </Card>

              <Card withBorder p="md">
                <Title order={4} mb="sm">What is the difference between DMM and Normal mode?</Title>
                <Text>
                  • <strong>Normal Mode:</strong> Shows data from the main OSRS Grand Exchange<br/>
                  • <strong>DMM Mode:</strong> Shows data from Deadman Mode servers (when active)
                </Text>
              </Card>

              <Card withBorder p="md">
                <Title order={4} mb="sm">How accurate are the profit calculations?</Title>
                <Text>
                  All profits are calculated using the current 2% Grand Exchange tax.
                  The "After Tax" price shows what you'll actually receive when selling items.
                </Text>
              </Card>

              <Card withBorder p="md">
                <Title order={4} mb="sm">What do the volume alerts mean?</Title>
                <Text>
                  High volume alerts indicate items with unusually high trading activity.
                  This can signal market manipulation or trending items worth investigating.
                </Text>
              </Card>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Complete Flipping Guide */}
        <Accordion.Item value="complete-flipping">
          <Accordion.Control icon={<IconTrendingUp size={20} />}>
            <Title order={3}>Complete Flipping Guide</Title>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack spacing="xl">
              <Alert icon={<IconTarget size={16} />} title="What is Flipping?" color="blue">
                Flipping is buying items at low prices and selling them at higher prices on the Grand Exchange.
                It's the most consistent money-making method in OSRS that doesn't require high stats or quests.
              </Alert>

                            <Stack spacing="md">
                <Card p="md" withBorder>
                  <Group spacing="sm" mb="xs">
                    <ThemeIcon size="sm" color="blue" variant="light">
                      <IconCoin size={12} />
                    </ThemeIcon>
                    <Text weight={500}>Step 1: Choose Your Items</Text>
                  </Group>
                  <Text color="dimmed" size="sm">
                    Start with high-volume items like <Link to="/item/526">Dragon bones</Link>,
                    <Link to="/item/1515">Yew logs</Link>, or <Link to="/item/4587">Rune scimitar</Link>.
                    These items trade frequently and have predictable price patterns.
                  </Text>
                </Card>

                <Card p="md" withBorder>
                  <Group spacing="sm" mb="xs">
                    <ThemeIcon size="sm" color="green" variant="light">
                      <IconChartLine size={12} />
                    </ThemeIcon>
                    <Text weight={500}>Step 2: Research Margins</Text>
                  </Group>
                  <Text color="dimmed" size="sm">
                    Use our <Link to="/high-volumes">High Volumes</Link> page to find items with good profit margins.
                    Look for items with 2%+ margins and high trading volumes.
                  </Text>
                </Card>

                <Card p="md" withBorder>
                  <Group spacing="sm" mb="xs">
                    <ThemeIcon size="sm" color="orange" variant="light">
                      <IconTarget size={12} />
                    </ThemeIcon>
                    <Text weight={500}>Step 3: Test Small Amounts</Text>
                  </Group>
                  <Text color="dimmed" size="sm">
                    Start by buying 1-5 items to test the actual buy/sell prices.
                    Market prices can change quickly, so always verify before investing large amounts.
                  </Text>
                </Card>

                <Card p="md" withBorder>
                  <Group spacing="sm" mb="xs">
                    <ThemeIcon size="sm" color="red" variant="light">
                      <IconTrendingUp size={12} />
                    </ThemeIcon>
                    <Text weight={500}>Step 4: Scale Up Gradually</Text>
                  </Group>
                  <Text color="dimmed" size="sm">
                    Once you confirm profitable margins, gradually increase your investment.
                    Never risk more than 20% of your total wealth on a single flip.
                  </Text>
                </Card>
              </Stack>

              <Card withBorder p="md">
                <Title order={4} mb="md">Example Profitable Flips</Title>
                <SimpleGrid cols={2} spacing="sm">
                  {exampleFlips.map((flip, index) => (
                    <Card key={index} withBorder p="sm" sx={{ backgroundColor: 'rgba(0,0,0,0.1)' }}>
                      <Group position="apart" mb="xs">
                        <Text weight={500}>{flip.item}</Text>
                        <Badge color={flip.volume === 'High' ? 'green' : 'yellow'} size="sm">
                          {flip.volume} Vol
                        </Badge>
                      </Group>
                      <Text size="sm">Buy: {flip.buyPrice}gp</Text>
                      <Text size="sm">Sell: {flip.sellPrice}gp</Text>
                      <Text size="sm" color="green" weight={500}>Profit: {flip.profit}gp</Text>
                    </Card>
                  ))}
                </SimpleGrid>
              </Card>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Money Making Guides */}
        <Accordion.Item value="money-making">
          <Accordion.Control icon={<IconCoin size={20} />}>
            <Title order={3}>Money Making Guides</Title>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack spacing="md">
              <Card withBorder p="md">
                <Title order={4} mb="sm">🔥 Hot Money Making Methods (Updated)</Title>
                <List spacing="xs">
                  <List.Item>
                    <strong>Flipping Dragon bones:</strong> 2.8M/hr with 10M+ capital
                    <br />
                    <Text size="sm" color="dimmed">
                      Check <Link to="/item/526">Dragon bones</Link> current margins
                    </Text>
                  </List.Item>
                  <List.Item>
                    <strong>Herb cleaning:</strong> 500K-1M/hr, low requirements
                    <br />
                    <Text size="sm" color="dimmed">
                      View our <Link to="/market-watch/herbs">Herb Index</Link> for profitable herbs
                    </Text>
                  </List.Item>
                  <List.Item>
                    <strong>Potion flipping:</strong> 1-3M/hr depending on market
                    <br />
                    <Text size="sm" color="dimmed">
                      Check <Link to="/market-watch/potions">Potion Index</Link> for best margins
                    </Text>
                  </List.Item>
                  <List.Item>
                    <strong>High-volume items:</strong> Consistent 1-2M/hr
                    <br />
                    <Text size="sm" color="dimmed">
                      Browse our <Link to="/high-volumes">High Volumes</Link> page daily
                    </Text>
                  </List.Item>
                </List>
              </Card>

              <Card withBorder p="md">
                <Title order={4} mb="sm">💡 Pro Tips for Maximum Profit</Title>
                <List spacing="xs">
                  <List.Item>Use our <Link to="/watchlist">Watchlist</Link> to track your favorite items</List.Item>
                  <List.Item>Check <Link to="/market-watch/bot-farm">Bot Farm Index</Link> for stable, high-volume flips</List.Item>
                  <List.Item>Monitor <Link to="/market-watch/raids">Raids Index</Link> during peak raiding hours</List.Item>
                  <List.Item>Set up price alerts for items with volatile markets</List.Item>
                </List>
              </Card>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* F2P Guides */}
        <Accordion.Item value="f2p-guides">
          <Accordion.Control icon={<IconUsers size={20} />}>
            <Title order={3}>F2P Money Making & First Bond Guide</Title>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack spacing="md">
              <Alert icon={<IconTarget size={16} />} title="Goal: Your First Bond (6-8M GP)" color="green">
                This guide will help F2P players earn their first bond through efficient flipping and money making.
              </Alert>

              <Card withBorder p="md">
                <Title order={4} mb="sm">🎯 F2P Flipping Items (Tested & Profitable)</Title>
                <List spacing="xs">
                  <List.Item>
                    <strong>Iron ore:</strong> 200-300gp profit per ore, high volume
                    <br />
                    <Text size="sm" color="dimmed">
                      Check <Link to="/market-watch/metals">Metal Index</Link> for current margins
                    </Text>
                  </List.Item>
                  <List.Item>
                    <strong>Coal:</strong> 150-250gp profit, extremely high volume
                  </List.Item>
                  <List.Item>
                    <strong>Rune items:</strong> Rune scimitars, platelegs, plateskirts
                    <br />
                    <Text size="sm" color="dimmed">
                      Higher profit but requires more capital (50K+ per item)
                    </Text>
                  </List.Item>
                  <List.Item>
                    <strong>Food items:</strong> Lobsters, swordfish during peak hours
                    <br />
                    <Text size="sm" color="dimmed">
                      Check <Link to="/market-watch/food">Food Index</Link> for opportunities
                    </Text>
                  </List.Item>
                </List>
              </Card>

                              <Card withBorder p="md">
                  <Title order={4} mb="sm">📈 Progressive Strategy (10K → Bond)</Title>
                  <Stack spacing="sm">
                    <Box p="sm" sx={{ borderLeft: '3px solid #228be6', backgroundColor: 'rgba(34, 139, 230, 0.1)' }}>
                      <Text weight={500} size="sm" mb="xs">Start: 10K GP</Text>
                      <Text size="sm">Flip iron ore, coal, basic runes. Focus on 50-100gp margins.</Text>
                    </Box>
                    <Box p="sm" sx={{ borderLeft: '3px solid #40c057', backgroundColor: 'rgba(64, 192, 87, 0.1)' }}>
                      <Text weight={500} size="sm" mb="xs">50K GP</Text>
                      <Text size="sm">Move to rune weapons, arrows, basic armor pieces.</Text>
                    </Box>
                    <Box p="sm" sx={{ borderLeft: '3px solid #fd7e14', backgroundColor: 'rgba(253, 126, 20, 0.1)' }}>
                      <Text weight={500} size="sm" mb="xs">200K GP</Text>
                      <Text size="sm">Start flipping rune items, food in bulk during peak hours.</Text>
                    </Box>
                    <Box p="sm" sx={{ borderLeft: '3px solid #be4bdb', backgroundColor: 'rgba(190, 75, 219, 0.1)' }}>
                      <Text weight={500} size="sm" mb="xs">1M GP</Text>
                      <Text size="sm">Diversify into magic items, higher value flips.</Text>
                    </Box>
                    <Box p="sm" sx={{ borderLeft: '3px solid #51cf66', backgroundColor: 'rgba(81, 207, 102, 0.1)' }}>
                      <Text weight={500} size="sm" mb="xs">6M+ GP</Text>
                      <Text size="sm">Buy your first bond and access members content!</Text>
                    </Box>
                  </Stack>
                </Card>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Resources & Community */}
        <Accordion.Item value="resources">
          <Accordion.Control icon={<IconUsers size={20} />}>
            <Title order={3}>Recommended Resources & Community</Title>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack spacing="md">
              <Card withBorder p="md">
                <Title order={4} mb="md">📺 YouTube Channels</Title>
                <SimpleGrid cols={1} spacing="sm">
                  {flippingExperts.filter(expert => expert.platform === 'YouTube').map((expert, index) => (
                    <Group key={index} position="apart">
                      <div>
                        <Group spacing="xs">
                          <IconBrandYoutube size={16} color="red" />
                          <Text weight={500}>{expert.name}</Text>
                        </Group>
                        <Text size="sm" color="dimmed">{expert.description}</Text>
                      </div>
                      <Button
                        variant="outline"
                        size="xs"
                        rightIcon={<IconExternalLink size={12} />}
                        onClick={() => window.open(expert.link, '_blank')}
                      >
                        Visit
                      </Button>
                    </Group>
                  ))}
                </SimpleGrid>
              </Card>

              <Card withBorder p="md">
                <Title order={4} mb="md">🐦 Twitter Accounts</Title>
                <SimpleGrid cols={1} spacing="sm">
                  {flippingExperts.filter(expert => expert.platform === 'Twitter').map((expert, index) => (
                    <Group key={index} position="apart">
                      <div>
                        <Group spacing="xs">
                          <IconBrandTwitter size={16} color="blue" />
                          <Text weight={500}>{expert.name}</Text>
                        </Group>
                        <Text size="sm" color="dimmed">{expert.description}</Text>
                      </div>
                      <Button
                        variant="outline"
                        size="xs"
                        rightIcon={<IconExternalLink size={12} />}
                        onClick={() => window.open(expert.link, '_blank')}
                      >
                        Follow
                      </Button>
                    </Group>
                  ))}
                </SimpleGrid>
              </Card>

              <Card withBorder p="md">
                <Title order={4} mb="md">💬 Community & Discord</Title>
                <Group position="apart">
                  <div>
                    <Group spacing="xs">
                      <IconBrandDiscord size={16} color="indigo" />
                      <Text weight={500}>GE Metrics Discord</Text>
                    </Group>
                    <Text size="sm" color="dimmed">
                      Join our community for real-time market tips and flipping advice
                    </Text>
                  </div>
                  <Button
                    variant="filled"
                    color="indigo"
                    rightIcon={<IconExternalLink size={12} />}
                    onClick={() => window.open('https://discord.gg/BhN3sAGux7', '_blank')}
                  >
                    Join Discord
                  </Button>
                </Group>
              </Card>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Advanced Strategies */}
        <Accordion.Item value="advanced">
          <Accordion.Control icon={<IconChartLine size={20} />}>
            <Title order={3}>Advanced Flipping Strategies</Title>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack spacing="md">
              <Alert icon={<IconInfoCircle size={16} />} title="For Experienced Flippers" color="orange">
                These strategies require significant capital (10M+) and market knowledge.
              </Alert>

              <Card withBorder p="md">
                <Title order={4} mb="sm">🎯 Market Timing Strategies</Title>
                <List spacing="xs">
                  <List.Item>
                    <strong>Weekend Effect:</strong> Prices often drop Sunday evening, rise Monday morning
                  </List.Item>
                  <List.Item>
                    <strong>Update Speculation:</strong> Monitor OSRS updates for item demand changes
                  </List.Item>
                  <List.Item>
                    <strong>Seasonal Patterns:</strong> Holiday events affect specific item categories
                  </List.Item>
                  <List.Item>
                    <strong>PvP World Effects:</strong> PvP items surge during tournament announcements
                  </List.Item>
                </List>
              </Card>

              <Card withBorder p="md">
                <Title order={4} mb="sm">⚡ High-Value Item Categories</Title>
                <SimpleGrid cols={2} spacing="sm">
                  <div>
                    <Text weight={500} mb="xs">Raids Items</Text>
                    <Text size="sm" color="dimmed">
                      Check our <Link to="/market-watch/raids">Raids Index</Link> for Twisted bow,
                      Ancestral pieces, and other high-value raid rewards.
                    </Text>
                  </div>
                  <div>
                    <Text weight={500} mb="xs">Consumables</Text>
                    <Text size="sm" color="dimmed">
                      Monitor <Link to="/market-watch/potions">Potions</Link> and
                      <Link to="/market-watch/food"> Food</Link> during peak raiding hours.
                    </Text>
                  </div>
                </SimpleGrid>
              </Card>

              <Card withBorder p="md">
                <Title order={4} mb="sm">🔍 Using GE Metrics Advanced Features</Title>
                <List spacing="xs">
                  <List.Item>Set up <Link to="/watchlist">Watchlist alerts</Link> for margin opportunities</List.Item>
                  <List.Item>Monitor <Link to="/high-volumes">High Volume items</Link> for bulk flipping</List.Item>
                  <List.Item>Use <Link to="/combination-items">Item Sets</Link> for arbitrage opportunities</List.Item>
                  <List.Item>Track profit/loss on individual item pages</List.Item>
                </List>
              </Card>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <Divider my="xl" />

      <Card withBorder p="xl" mt="xl" sx={{ textAlign: 'center' }}>
        <Title order={3} mb="md">Ready to Start Flipping?</Title>
        <Text mb="lg" color="dimmed">
          Use GE Metrics' live data to find profitable opportunities right now
        </Text>
        <Group position="center" spacing="md">
          <Button component={Link} to="/high-volumes" variant="filled" color="blue">
            View High Volume Items
          </Button>
          <Button component={Link} to="/watchlist" variant="outline">
            Set Up Watchlist
          </Button>
        </Group>
      </Card>
    </Container>
  )
}
