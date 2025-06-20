import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  Text,
  Group,
  Stack,
  Badge,
  Table,
  Avatar,
  Tabs,
  Button,
  Modal,
  TextInput,
  Select,
  ActionIcon,
  Progress,
  Alert,
  SimpleGrid,
  Paper,
  Center,
  Loader,
  Tooltip,
  UnstyledButton,
  NumberInput,
  Textarea,
  Autocomplete,
  Image,
  ScrollArea
} from '@mantine/core'
import {
  IconTrophy,
  IconUsers,
  IconPlus,
  IconMail,
  IconCrown,
  IconSword,
  IconShield,
  IconStar,
  IconDiamond,
  IconFlame,
  IconBolt,
  IconTarget,
  IconChevronUp,
  IconChevronDown,
  IconMedal,
  IconCoin,
  IconReceipt,
  IconSearch
} from '@tabler/icons-react'
import ItemData from '../../utils/item-data.jsx'
import tradeService from '../../services/tradeService.js'
import { showNotification } from '@mantine/notifications'

// Ranking system configuration
const RANKING_TIERS = [
  { name: 'Bronze', threshold: 10000000, icon: IconMedal, color: '#CD7F32' },
  { name: 'Iron', threshold: 30000000, icon: IconSword, color: '#C0C0C0' },
  { name: 'Steel', threshold: 50000000, icon: IconShield, color: '#8B98A8' },
  { name: 'Mithril', threshold: 70000000, icon: IconStar, color: '#7B68EE' },
  { name: 'Adamant', threshold: 90000000, icon: IconDiamond, color: '#50C878' },
  { name: 'Rune', threshold: 130000000, icon: IconFlame, color: '#4169E1' },
  { name: 'Dragon', threshold: 190000000, icon: IconBolt, color: '#DC143C' },
  { name: 'Barrows', threshold: 270000000, icon: IconCrown, color: '#800080' },
  { name: 'Torva', threshold: 370000000, icon: IconTarget, color: '#6C757D' }
]

const getRankInfo = (totalProfit) => {
  const profit = totalProfit || 0
  for (let i = RANKING_TIERS.length - 1; i >= 0; i--) {
    if (profit >= RANKING_TIERS[i].threshold) {
      return {
        ...RANKING_TIERS[i],
        nextTier: i < RANKING_TIERS.length - 1 ? RANKING_TIERS[i + 1] : null,
        progress: i < RANKING_TIERS.length - 1
          ? ((profit - RANKING_TIERS[i].threshold) / (RANKING_TIERS[i + 1].threshold - RANKING_TIERS[i].threshold)) * 100
          : 100
      }
    }
  }
  return {
    name: 'Unranked',
    threshold: 0,
    icon: IconMedal,
    color: '#666666',
    nextTier: RANKING_TIERS[0],
    progress: (profit / RANKING_TIERS[0].threshold) * 100
  }
}

// Mock data - in real app, this would come from your API
const mockGlobalLeaderboard = [
  { id: 1, username: 'FlipMaster', totalProfit: 850000000, weeklyProfit: 12500000, rank: 1, clanName: 'Elite Flippers' },
  { id: 2, username: 'GEKing', totalProfit: 720000000, weeklyProfit: 8300000, rank: 2, clanName: 'Market Makers' },
  { id: 3, username: 'ProfitWizard', totalProfit: 650000000, weeklyProfit: 9100000, rank: 3, clanName: 'Elite Flippers' },
  { id: 4, username: 'TradeGuru', totalProfit: 580000000, weeklyProfit: 7800000, rank: 4, clanName: null },
  { id: 5, username: 'FlipLord', totalProfit: 520000000, weeklyProfit: 6900000, rank: 5, clanName: 'Golden Traders' },
  { id: 6, username: 'MarketWhale', totalProfit: 480000000, weeklyProfit: 5200000, rank: 6, clanName: 'Market Makers' },
  { id: 7, username: 'CoinCollector', totalProfit: 420000000, weeklyProfit: 4800000, rank: 7, clanName: 'Golden Traders' },
  { id: 8, username: 'GPHunter', totalProfit: 380000000, weeklyProfit: 4100000, rank: 8, clanName: null },
  { id: 9, username: 'FlipProdigy', totalProfit: 340000000, weeklyProfit: 3900000, rank: 9, clanName: 'Elite Flippers' },
  { id: 10, username: 'TradeExpert', totalProfit: 320000000, weeklyProfit: 3500000, rank: 10, clanName: 'Market Makers' }
]

const mockClans = [
  {
    id: 1,
    name: 'Elite Flippers',
    memberCount: 24,
    totalProfit: 2100000000,
    weeklyProfit: 45000000,
    leader: 'FlipMaster',
    description: 'Top-tier flippers with proven strategies',
    isPrivate: true,
    rank: 1
  },
  {
    id: 2,
    name: 'Market Makers',
    memberCount: 18,
    totalProfit: 1800000000,
    weeklyProfit: 38000000,
    leader: 'GEKing',
    description: 'Professional traders focused on high-volume items',
    isPrivate: false,
    rank: 2
  },
  {
    id: 3,
    name: 'Golden Traders',
    memberCount: 31,
    totalProfit: 1650000000,
    weeklyProfit: 42000000,
    leader: 'FlipLord',
    description: 'Beginner-friendly clan welcoming all skill levels',
    isPrivate: false,
    rank: 3
  }
]

export default function CommunityLeaderboard () {
  const { items, mapStatus, priceStatus } = ItemData()
  const [activeTab, setActiveTab] = useState('global')
  const [inviteModalOpened, setInviteModalOpened] = useState(false)
  const [createClanModalOpened, setCreateClanModalOpened] = useState(false)
  const [addTradeModalOpened, setAddTradeModalOpened] = useState(false)
  const [selectedClan, setSelectedClan] = useState(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [newClanName, setNewClanName] = useState('')
  const [newClanDescription, setNewClanDescription] = useState('')
  const [clanPrivacy, setClanPrivacy] = useState('public')
  const [loading, setLoading] = useState(false)

  // Add Trade modal state
  const [selectedItem, setSelectedItem] = useState(null)
  const [itemSearchQuery, setItemSearchQuery] = useState('')
  const [tradeType, setTradeType] = useState('buy')
  const [tradeBuyPrice, setTradeBuyPrice] = useState(0)
  const [tradeSellPrice, setTradeSellPrice] = useState(0)
  const [tradeQuantity, setTradeQuantity] = useState(1)
  const [tradeNotes, setTradeNotes] = useState('')

  // Filter items based on search query
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
    item.id.toString().includes(itemSearchQuery)
  ).slice(0, 20) // Limit to 20 results for performance

  // Mock current user data
  const currentUser = {
    id: 999,
    username: 'CurrentUser',
    totalProfit: 45000000,
    weeklyProfit: 850000,
    rank: 156,
    clanId: null,
    clanName: null
  }

  const currentUserRankInfo = getRankInfo(currentUser.totalProfit)

  const handleInviteFriend = async () => {
    if (!inviteEmail.trim()) return

    setLoading(true)
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      // In real app, make API call to send invite
      console.log('Inviting:', inviteEmail, 'to clan:', selectedClan?.name || 'user\'s clan')

      setInviteEmail('')
      setInviteModalOpened(false)
    } catch (error) {
      console.error('Failed to send invite:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateClan = async () => {
    if (!newClanName.trim()) return

    setLoading(true)
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      // In real app, make API call to create clan
      console.log('Creating clan:', {
        name: newClanName,
        description: newClanDescription,
        isPrivate: clanPrivacy === 'private'
      })

      setNewClanName('')
      setNewClanDescription('')
      setClanPrivacy('public')
      setCreateClanModalOpened(false)
    } catch (error) {
      console.error('Failed to create clan:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTrade = async () => {
    if (!selectedItem || !tradeQuantity) return

    const price = tradeType === 'buy' ? tradeBuyPrice : tradeSellPrice
    if (!price || price <= 0) return

    setLoading(true)
    try {
      const tradeData = {
        item_id: selectedItem.id,
        item_name: selectedItem.name,
        trade_type: tradeType,
        quantity: tradeQuantity,
        price_per_item: price,
        notes: tradeNotes,
        trade_date: new Date()
      }

      const result = tradeService.addTrade(1, tradeData) // Current user ID

      if (result.success) {
        showNotification({
          title: 'Success',
          message: 'Trade record added successfully',
          color: 'green'
        })

        // Reset form
        setSelectedItem(null)
        setItemSearchQuery('')
        setTradeType('buy')
        setTradeBuyPrice(0)
        setTradeSellPrice(0)
        setTradeQuantity(1)
        setTradeNotes('')
        setAddTradeModalOpened(false)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: error.message || 'Failed to add trade',
        color: 'red'
      })
    } finally {
      setLoading(false)
    }
  }

  const RankBadge = ({ rankInfo, size = 'sm' }) => {
    const IconComponent = rankInfo.icon
    return (
      <Badge
        size={size}
        leftIcon={<IconComponent size={size === 'lg' ? 18 : 14} />}
        style={{ backgroundColor: rankInfo.color }}
      >
        {rankInfo.name}
      </Badge>
    )
  }

  const LeaderboardTable = ({ data, showClan = true }) => (
    <Table highlightOnHover>
      <thead>
        <tr>
          <th>Rank</th>
          <th>Player</th>
          <th>Total Profit</th>
          <th>Weekly Profit</th>
          <th>Tier</th>
          {showClan && <th>Clan</th>}
        </tr>
      </thead>
      <tbody>
        {data.map((player) => {
          const rankInfo = getRankInfo(player.totalProfit)
          return (
            <tr key={player.id}>
              <td>
                <Group spacing="xs">
                  <Text weight={500}>#{player.rank}</Text>
                  {player.rank <= 3 && (
                    <IconTrophy
                      size={16}
                      color={player.rank === 1 ? '#FFD700' : player.rank === 2 ? '#C0C0C0' : '#CD7F32'}
                    />
                  )}
                </Group>
              </td>
              <td>
                <Group spacing="sm">
                  <Avatar size="sm" color="blue">{player.username[0]}</Avatar>
                  <Text weight={500}>{player.username}</Text>
                </Group>
              </td>
              <td>
                <Text color="green" weight={500}>
                  {((player.totalProfit || 0) / 1000000).toFixed(1)}M GP
                </Text>
              </td>
              <td>
                <Text color="blue" weight={500}>
                  {((player.weeklyProfit || 0) / 1000000).toFixed(1)}M GP
                </Text>
              </td>
              <td>
                <RankBadge rankInfo={rankInfo} />
              </td>
              {showClan && (
                <td>
                  {player.clanName
                    ? (
                    <Badge variant="light">{player.clanName}</Badge>
                      )
                    : (
                    <Text size="sm" color="dimmed">No clan</Text>
                      )}
                </td>
              )}
            </tr>
          )
        })}
      </tbody>
    </Table>
  )

  const ClanCard = ({ clan }) => (
    <Card withBorder p="md">
      <Group position="apart" mb="sm">
        <Group>
          <Text weight={600} size="lg">{clan.name}</Text>
          <Badge color="gold">#{clan.rank}</Badge>
          {clan.isPrivate && <Badge color="red" size="xs">Private</Badge>}
        </Group>
        <Group spacing="xs">
          <IconUsers size={16} />
          <Text size="sm">{clan.memberCount} members</Text>
        </Group>
      </Group>

      <Text size="sm" color="dimmed" mb="md">
        {clan.description}
      </Text>

      <SimpleGrid cols={2} spacing="xs" mb="md">
        <Paper p="xs" withBorder>
          <Text size="xs" color="dimmed">Total Profit</Text>
          <Text weight={500} color="green">
            {((clan.totalProfit || 0) / 1000000).toFixed(0)}M GP
          </Text>
        </Paper>
        <Paper p="xs" withBorder>
          <Text size="xs" color="dimmed">Weekly Profit</Text>
          <Text weight={500} color="blue">
            {((clan.weeklyProfit || 0) / 1000000).toFixed(0)}M GP
          </Text>
        </Paper>
      </SimpleGrid>

      <Group position="apart">
        <Text size="xs" color="dimmed">
          Leader: <Text component="span" weight={500}>{clan.leader}</Text>
        </Text>
        <Button size="xs" variant="light">
          {clan.isPrivate ? 'Request Join' : 'Join Clan'}
        </Button>
      </Group>
    </Card>
  )

  return (
    <Box p="md">
      {/* Header with User Stats */}
      <Card withBorder p="lg" mb="xl">
        <Group position="apart">
          <Group>
            <Avatar size="lg" color="blue">{currentUser.username[0]}</Avatar>
            <Stack spacing="xs">
              <Text size="xl" weight={700}>{currentUser.username}</Text>
              <Group spacing="md">
                <RankBadge rankInfo={currentUserRankInfo} size="lg" />
                <Text color="dimmed">Global Rank #{currentUser.rank}</Text>
              </Group>
            </Stack>
          </Group>

          <Stack spacing="sm" align="end">
            <Group spacing="xl">
              <Stack spacing="xs" align="center">
                <Text size="xs" color="dimmed">Total Profit</Text>
                <Text size="lg" weight={700} color="green">
                  {((currentUser.totalProfit || 0) / 1000000).toFixed(1)}M GP
                </Text>
              </Stack>
              <Stack spacing="xs" align="center">
                <Text size="xs" color="dimmed">Weekly Profit</Text>
                <Text size="lg" weight={700} color="blue">
                  {((currentUser.weeklyProfit || 0) / 1000000).toFixed(1)}M GP
                </Text>
              </Stack>
              <Button
                leftIcon={<IconReceipt size={16} />}
                variant="gradient"
                gradient={{ from: 'green', to: 'blue' }}
                onClick={() => setAddTradeModalOpened(true)}
              >
                Add Trade
              </Button>
            </Group>

            {/* Rank Progress */}
            {currentUserRankInfo.nextTier && (
              <Stack spacing="xs" style={{ minWidth: 200 }}>
                <Group position="apart">
                  <Text size="xs">Progress to {currentUserRankInfo.nextTier.name}</Text>
                  <Text size="xs" weight={500}>
                    {Math.round(currentUserRankInfo.progress)}%
                  </Text>
                </Group>
                <Progress
                  value={currentUserRankInfo.progress}
                  color={currentUserRankInfo.nextTier.color}
                  size="sm"
                />
              </Stack>
            )}
          </Stack>
        </Group>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onTabChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="global" icon={<IconTrophy size={16} />}>
            Global Leaderboard
          </Tabs.Tab>
          <Tabs.Tab value="clans" icon={<IconUsers size={16} />}>
            Clan Rankings
          </Tabs.Tab>
          <Tabs.Tab value="my-clan" icon={<IconShield size={16} />}>
            My Clan
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="global" pt="md">
          <Card withBorder>
            <Group position="apart" mb="md">
              <Text size="lg" weight={600}>Top Players</Text>
              <Button
                leftIcon={<IconMail size={16} />}
                onClick={() => {
                  setSelectedClan(null)
                  setInviteModalOpened(true)
                }}
              >
                Invite Friend
              </Button>
            </Group>
            <LeaderboardTable data={mockGlobalLeaderboard} />
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="clans" pt="md">
          <Stack spacing="md">
            <Group position="apart">
              <Text size="lg" weight={600}>Top Clans</Text>
              <Button
                leftIcon={<IconPlus size={16} />}
                onClick={() => setCreateClanModalOpened(true)}
              >
                Create Clan
              </Button>
            </Group>

            <SimpleGrid cols={1} spacing="md">
              {mockClans.map((clan) => (
                <ClanCard key={clan.id} clan={clan} />
              ))}
            </SimpleGrid>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="my-clan" pt="md">
          {currentUser.clanName
            ? (
            <Card withBorder>
              <Text size="lg" weight={600} mb="md">
                {currentUser.clanName} - Members
              </Text>
              <LeaderboardTable
                data={mockGlobalLeaderboard.filter(p => p.clanName === currentUser.clanName)}
                showClan={false}
              />
            </Card>
              )
            : (
            <Alert icon={<IconUsers size={16} />} title="No Clan" color="blue">
              <Text mb="md">
                You're not part of any clan yet. Join or create a clan to compete with friends!
              </Text>
              <Group>
                <Button onClick={() => setCreateClanModalOpened(true)}>
                  Create Clan
                </Button>
                <Button variant="light" onClick={() => setActiveTab('clans')}>
                  Browse Clans
                </Button>
              </Group>
            </Alert>
              )}
        </Tabs.Panel>
      </Tabs>

      {/* Invite Modal */}
      <Modal
        opened={inviteModalOpened}
        onClose={() => setInviteModalOpened(false)}
        title="Invite Friend"
      >
        <Stack spacing="md">
          <TextInput
            label="Email Address"
            placeholder="friend@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
          />
          {selectedClan && (
            <Alert color="blue">
              Inviting to clan: <strong>{selectedClan.name}</strong>
            </Alert>
          )}
          <Group position="right">
            <Button variant="light" onClick={() => setInviteModalOpened(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleInviteFriend}
              loading={loading}
              disabled={!inviteEmail.trim()}
            >
              Send Invite
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Create Clan Modal */}
      <Modal
        opened={createClanModalOpened}
        onClose={() => setCreateClanModalOpened(false)}
        title="Create New Clan"
        size="md"
      >
        <Stack spacing="md">
          <TextInput
            label="Clan Name"
            placeholder="Enter clan name"
            value={newClanName}
            onChange={(e) => setNewClanName(e.target.value)}
            required
          />
          <TextInput
            label="Description"
            placeholder="Describe your clan"
            value={newClanDescription}
            onChange={(e) => setNewClanDescription(e.target.value)}
          />
          <Select
            label="Privacy"
            value={clanPrivacy}
            onChange={setClanPrivacy}
            data={[
              { value: 'public', label: 'Public - Anyone can join' },
              { value: 'private', label: 'Private - Invite only' }
            ]}
          />
          <Group position="right">
            <Button variant="light" onClick={() => setCreateClanModalOpened(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateClan}
              loading={loading}
              disabled={!newClanName.trim()}
            >
              Create Clan
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Add Trade Modal */}
      <Modal
        opened={addTradeModalOpened}
        onClose={() => setAddTradeModalOpened(false)}
        title="Add Trade Record"
        size="lg"
      >
        <Stack spacing="md">
          {/* Item Selection */}
          <div>
            <Text size="sm" weight={500} mb="xs">Select Item</Text>
            <TextInput
              placeholder="Search for an item..."
              icon={<IconSearch size={16} />}
              value={itemSearchQuery}
              onChange={(e) => setItemSearchQuery(e.target.value)}
              mb="xs"
            />

            {itemSearchQuery && (
              <ScrollArea style={{ height: 200 }}>
                <Stack spacing="xs">
                  {filteredItems.map((item) => (
                    <UnstyledButton
                      key={item.id}
                      onClick={() => {
                        setSelectedItem(item)
                        setItemSearchQuery(item.name)
                      }}
                      style={{
                        padding: '8px',
                        border: selectedItem?.id === item.id ? '2px solid #339af0' : '1px solid #495057',
                        borderRadius: '4px',
                        backgroundColor: selectedItem?.id === item.id ? '#2b2c3d' : '#1d1e30',
                        width: '100%'
                      }}
                    >
                      <Group spacing="sm">
                        <Image
                          src={item.img}
                          width={24}
                          height={24}
                          fit="contain"
                          withPlaceholder
                        />
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <Text size="sm" weight={500}>{item.name}</Text>
                          <Text size="xs" color="dimmed">
                            ID: {item.id} | Current Price: {item.high ? `${item.high.toLocaleString()} GP` : 'N/A'}
                          </Text>
                        </div>
                      </Group>
                    </UnstyledButton>
                  ))}
                  {filteredItems.length === 0 && (
                    <Text size="sm" color="dimmed" align="center" py="md">
                      No items found matching "{itemSearchQuery}"
                    </Text>
                  )}
                </Stack>
              </ScrollArea>
            )}

            {selectedItem && (
              <Alert color="blue" mt="xs">
                Selected: <strong>{selectedItem.name}</strong> (ID: {selectedItem.id})
              </Alert>
            )}
          </div>

          {/* Trade Type */}
          <Select
            label="Trade Type"
            value={tradeType}
            onChange={setTradeType}
            data={[
              { value: 'buy', label: 'Buy' },
              { value: 'sell', label: 'Sell' }
            ]}
            required
          />

          {/* Price and Quantity */}
          <Group grow>
            <NumberInput
              label={`${tradeType === 'buy' ? 'Buy' : 'Sell'} Price (GP)`}
              placeholder="0"
              value={tradeType === 'buy' ? tradeBuyPrice : tradeSellPrice}
              defaultValue={0}
              onChange={tradeType === 'buy' ? setTradeBuyPrice : setTradeSellPrice}
              min={0}
              required
              hideControls
              parser={(value) => value ? value.replace(/\$\s?|(,*)/g, '') : '0'}
              formatter={(value) => value ? `${Number(value).toLocaleString()}` : '0'}
            />
            <NumberInput
              label="Quantity"
              placeholder="1"
              value={tradeQuantity || 1}
              defaultValue={1}
              onChange={setTradeQuantity}
              min={1}
              required
              parser={(value) => value ? value.replace(/\$\s?|(,*)/g, '') : '1'}
              formatter={(value) => value ? `${Number(value).toLocaleString()}` : '1'}
            />
          </Group>

          {/* Profit Calculator (only show for completed buy/sell pairs) */}
          {tradeBuyPrice > 0 && tradeSellPrice > 0 && tradeQuantity && (
            <Alert color="green" icon={<IconCoin size={16} />}>
              <Text weight={500}>
                Profit: {((Number(tradeSellPrice) - Number(tradeBuyPrice)) * Number(tradeQuantity)).toLocaleString()} GP
              </Text>
            </Alert>
          )}

          <Textarea
            label="Notes (Optional)"
            placeholder="Add any notes about this trade..."
            value={tradeNotes}
            onChange={(e) => setTradeNotes(e.target.value)}
            rows={3}
          />

          <Group position="right">
            <Button variant="light" onClick={() => setAddTradeModalOpened(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddTrade}
              loading={loading}
              disabled={!selectedItem || !tradeQuantity || (tradeType === 'buy' ? !tradeBuyPrice : !tradeSellPrice)}
              leftIcon={<IconReceipt size={16} />}
            >
              Add Trade
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  )
}
