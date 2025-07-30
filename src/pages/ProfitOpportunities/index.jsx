import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Group,
  Text,
  Badge,
  Button,
  Select,
  TextInput,
  Stack,
  Title,
  ActionIcon,
  Modal,
  Textarea,
  NumberInput,
  Switch,
  Alert,
  Progress,
  Tabs
} from '@mantine/core'
import {
  IconSearch,
  IconFilter,
  IconEye,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconTrendingUp,
  IconClock,
  IconStar,
  IconExternalLink
} from '@tabler/icons-react'

// Mock data - in real app this would come from API
const MOCK_OPPORTUNITIES = [
  {
    id: 1,
    item_name: 'Dragon Scimitar',
    item_id: 4587,
    source_type: 'reddit',
    source_url: 'https://reddit.com/r/2007scape/comments/123456',
    source_title: 'Dragon Scimitar getting buffed in next update',
    source_content: 'JMod confirmed Dragon Scimitar will receive a significant damage boost...',
    confidence_score: 0.85,
    profit_potential: 2500000,
    risk_level: 'low',
    category: 'combat',
    keywords: ['buff', 'dragon scimitar', 'combat'],
    created_at: '2024-01-15T10:30:00Z',
    status: 'active',
    verified: false,
    verified_profit: null,
    verified_at: null,
    notes: ''
  },
  {
    id: 2,
    item_name: 'Rune Essence',
    item_id: 1436,
    source_type: 'blog',
    source_url: 'https://oldschool.runescape.wiki/w/Update:New_Runecrafting_Methods',
    source_title: 'New Runecrafting methods introduced',
    source_content: 'New runecrafting methods will require more rune essence...',
    confidence_score: 0.72,
    profit_potential: 1500000,
    risk_level: 'medium',
    category: 'skilling',
    keywords: ['runecrafting', 'rune essence', 'new method'],
    created_at: '2024-01-15T09:15:00Z',
    status: 'active',
    verified: false,
    verified_profit: null,
    verified_at: null,
    notes: ''
  },
  {
    id: 3,
    item_name: 'Super Combat Potion',
    item_id: 12695,
    source_type: 'twitter',
    source_url: 'https://twitter.com/JagexAsh/status/123456789',
    source_title: 'Super Combat Potion recipe changes',
    source_content: 'Super Combat Potion will now require additional herbs...',
    confidence_score: 0.95,
    profit_potential: 5000000,
    risk_level: 'low',
    category: 'skilling',
    keywords: ['super combat', 'herbs', 'recipe'],
    created_at: '2024-01-15T08:45:00Z',
    status: 'active',
    verified: true,
    verified_profit: 4800000,
    verified_at: '2024-01-16T14:20:00Z',
    notes: 'Successfully flipped 1000 potions for 4.8M profit'
  }
]

export default function ProfitOpportunities () {
  const [opportunities, setOpportunities] = useState(MOCK_OPPORTUNITIES)
  const [filteredOpportunities, setFilteredOpportunities] = useState(MOCK_OPPORTUNITIES)
  const [searchTerm, setSearchTerm] = useState('')
  const [confidenceFilter, setConfidenceFilter] = useState('all')
  const [riskFilter, setRiskFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedOpportunity, setSelectedOpportunity] = useState(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [verifyModalOpen, setVerifyModalOpen] = useState(false)
  const [verificationData, setVerificationData] = useState({
    verified_profit: 0,
    notes: ''
  })

  useEffect(() => {
    filterOpportunities()
  }, [opportunities, searchTerm, confidenceFilter, riskFilter, categoryFilter, statusFilter])

  const filterOpportunities = () => {
    let filtered = opportunities

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(opp =>
        opp.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.source_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Confidence filter
    if (confidenceFilter !== 'all') {
      const minConfidence = parseFloat(confidenceFilter)
      filtered = filtered.filter(opp => opp.confidence_score >= minConfidence)
    }

    // Risk filter
    if (riskFilter !== 'all') {
      filtered = filtered.filter(opp => opp.risk_level === riskFilter)
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(opp => opp.category === categoryFilter)
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(opp => opp.status === statusFilter)
    }

    setFilteredOpportunities(filtered)
  }

  const handleVerifyOpportunity = (opportunity) => {
    setSelectedOpportunity(opportunity)
    setVerificationData({
      verified_profit: opportunity.verified_profit || 0,
      notes: opportunity.notes || ''
    })
    setVerifyModalOpen(true)
  }

  const saveVerification = () => {
    if (!selectedOpportunity) return

    const updatedOpportunities = opportunities.map(opp =>
      opp.id === selectedOpportunity.id
        ? {
            ...opp,
            verified: true,
            verified_profit: verificationData.verified_profit,
            verified_at: new Date().toISOString(),
            notes: verificationData.notes,
            status: 'completed'
          }
        : opp
    )

    setOpportunities(updatedOpportunities)
    setVerifyModalOpen(false)
    setSelectedOpportunity(null)
  }

  const markAsExpired = (opportunityId) => {
    const updatedOpportunities = opportunities.map(opp =>
      opp.id === opportunityId
        ? { ...opp, status: 'expired' }
        : opp
    )
    setOpportunities(updatedOpportunities)
  }

  const getConfidenceColor = (score) => {
    if (score >= 0.8) return 'green'
    if (score >= 0.6) return 'yellow'
    return 'red'
  }

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'low': return 'green'
      case 'medium': return 'yellow'
      case 'high': return 'red'
      default: return 'gray'
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US').format(value)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const stats = {
    total: opportunities.length,
    active: opportunities.filter(opp => opp.status === 'active').length,
    verified: opportunities.filter(opp => opp.verified).length,
    highConfidence: opportunities.filter(opp => opp.confidence_score >= 0.8).length,
    totalProfitPotential: opportunities.reduce((sum, opp) => sum + (opp.profit_potential || 0), 0),
    verifiedProfit: opportunities.reduce((sum, opp) => sum + (opp.verified_profit || 0), 0)
  }

  return (
    <div>
      <Title order={2} mb="lg">Profit Opportunities</Title>

      {/* Stats Cards */}
      <Group mb="lg">
        <Card withBorder p="md" style={{ flex: 1 }}>
          <Text size="sm" color="dimmed">Total Opportunities</Text>
          <Text size="xl" weight={700}>{stats.total}</Text>
        </Card>
        <Card withBorder p="md" style={{ flex: 1 }}>
          <Text size="sm" color="dimmed">Active</Text>
          <Text size="xl" weight={700} color="blue">{stats.active}</Text>
        </Card>
        <Card withBorder p="md" style={{ flex: 1 }}>
          <Text size="sm" color="dimmed">High Confidence</Text>
          <Text size="xl" weight={700} color="green">{stats.highConfidence}</Text>
        </Card>
        <Card withBorder p="md" style={{ flex: 1 }}>
          <Text size="sm" color="dimmed">Verified Profit</Text>
          <Text size="xl" weight={700} color="green">{formatCurrency(stats.verifiedProfit)} GP</Text>
        </Card>
      </Group>

      {/* Filters */}
      <Card withBorder p="md" mb="lg">
        <Group>
          <TextInput
            placeholder="Search items, titles, keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<IconSearch size={16} />}
            style={{ flex: 1 }}
          />
          <Select
            data={[
              { value: 'all', label: 'All Confidence' },
              { value: '0.8', label: '80%+' },
              { value: '0.6', label: '60%+' },
              { value: '0.4', label: '40%+' }
            ]}
            value={confidenceFilter}
            onChange={setConfidenceFilter}
            style={{ width: 150 }}
          />
          <Select
            data={[
              { value: 'all', label: 'All Risk' },
              { value: 'low', label: 'Low Risk' },
              { value: 'medium', label: 'Medium Risk' },
              { value: 'high', label: 'High Risk' }
            ]}
            value={riskFilter}
            onChange={setRiskFilter}
            style={{ width: 150 }}
          />
          <Select
            data={[
              { value: 'all', label: 'All Categories' },
              { value: 'combat', label: 'Combat' },
              { value: 'skilling', label: 'Skilling' },
              { value: 'quest', label: 'Quest' },
              { value: 'event', label: 'Event' },
              { value: 'update', label: 'Update' }
            ]}
            value={categoryFilter}
            onChange={setCategoryFilter}
            style={{ width: 150 }}
          />
          <Select
            data={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'completed', label: 'Completed' },
              { value: 'expired', label: 'Expired' }
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 150 }}
          />
        </Group>
      </Card>

      {/* Opportunities Table */}
      <Card withBorder>
        <Table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Source</th>
              <th>Confidence</th>
              <th>Profit Potential</th>
              <th>Risk</th>
              <th>Category</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOpportunities.map((opportunity) => (
              <tr key={opportunity.id}>
                <td>
                  <Text weight={500}>{opportunity.item_name}</Text>
                  <Text size="xs" color="dimmed">ID: {opportunity.item_id}</Text>
                </td>
                <td>
                  <Group spacing="xs">
                    <Badge size="sm" variant="light">
                      {opportunity.source_type}
                    </Badge>
                    <ActionIcon
                      size="sm"
                      onClick={() => window.open(opportunity.source_url, '_blank')}
                    >
                      <IconExternalLink size={14} />
                    </ActionIcon>
                  </Group>
                  <Text size="xs" color="dimmed" style={{ maxWidth: 200 }}>
                    {opportunity.source_title}
                  </Text>
                </td>
                <td>
                  <Group spacing="xs">
                    <Badge color={getConfidenceColor(opportunity.confidence_score)}>
                      {(opportunity.confidence_score * 100).toFixed(0)}%
                    </Badge>
                    <Progress
                      value={opportunity.confidence_score * 100}
                      size="sm"
                      style={{ width: 60 }}
                    />
                  </Group>
                </td>
                <td>
                  <Text weight={600} color="green">
                    {formatCurrency(opportunity.profit_potential)} GP
                  </Text>
                  {opportunity.verified_profit && (
                    <Text size="xs" color="dimmed">
                      Verified: {formatCurrency(opportunity.verified_profit)} GP
                    </Text>
                  )}
                </td>
                <td>
                  <Badge color={getRiskColor(opportunity.risk_level)}>
                    {opportunity.risk_level}
                  </Badge>
                </td>
                <td>
                  <Badge variant="outline">{opportunity.category}</Badge>
                </td>
                <td>
                  <Group spacing="xs">
                    {opportunity.verified && (
                      <IconCheck size={16} color="green" />
                    )}
                    <Badge
                      color={opportunity.status === 'active'
                        ? 'blue'
                        : opportunity.status === 'completed' ? 'green' : 'gray'}
                    >
                      {opportunity.status}
                    </Badge>
                  </Group>
                </td>
                <td>
                  <Group spacing="xs">
                    <ActionIcon
                      size="sm"
                      onClick={() => {
                        setSelectedOpportunity(opportunity)
                        setDetailModalOpen(true)
                      }}
                    >
                      <IconEye size={14} />
                    </ActionIcon>
                    {!opportunity.verified && opportunity.status === 'active' && (
                      <ActionIcon
                        size="sm"
                        color="green"
                        onClick={() => handleVerifyOpportunity(opportunity)}
                      >
                        <IconCheck size={14} />
                      </ActionIcon>
                    )}
                    {opportunity.status === 'active' && (
                      <ActionIcon
                        size="sm"
                        color="red"
                        onClick={() => markAsExpired(opportunity.id)}
                      >
                        <IconX size={14} />
                      </ActionIcon>
                    )}
                  </Group>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      {/* Detail Modal */}
      <Modal
        opened={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Opportunity Details"
        size="lg"
      >
        {selectedOpportunity && (
          <Stack spacing="md">
            <Group position="apart">
              <Title order={3}>{selectedOpportunity.item_name}</Title>
              <Badge color={getConfidenceColor(selectedOpportunity.confidence_score)}>
                {(selectedOpportunity.confidence_score * 100).toFixed(0)}% Confidence
              </Badge>
            </Group>

            <Group>
              <Badge color={getRiskColor(selectedOpportunity.risk_level)}>
                {selectedOpportunity.risk_level} Risk
              </Badge>
              <Badge variant="outline">{selectedOpportunity.category}</Badge>
              <Badge variant="light">{selectedOpportunity.source_type}</Badge>
            </Group>

            <div>
              <Text weight={500} mb="xs">Source</Text>
              <Text size="sm" color="dimmed" mb="xs">{selectedOpportunity.source_title}</Text>
              <Button
                size="xs"
                variant="light"
                leftIcon={<IconExternalLink size={14} />}
                onClick={() => window.open(selectedOpportunity.source_url, '_blank')}
              >
                View Source
              </Button>
            </div>

            <div>
              <Text weight={500} mb="xs">Content</Text>
              <Text size="sm">{selectedOpportunity.source_content}</Text>
            </div>

            <div>
              <Text weight={500} mb="xs">Keywords</Text>
              <Group spacing="xs">
                {selectedOpportunity.keywords.map((keyword, index) => (
                  <Badge key={index} size="sm" variant="light">{keyword}</Badge>
                ))}
              </Group>
            </div>

            <div>
              <Text weight={500} mb="xs">Profit Analysis</Text>
              <Group>
                <div>
                  <Text size="sm" color="dimmed">Estimated Potential</Text>
                  <Text weight={600} color="green">
                    {formatCurrency(selectedOpportunity.profit_potential)} GP
                  </Text>
                </div>
                {selectedOpportunity.verified_profit && (
                  <div>
                    <Text size="sm" color="dimmed">Verified Profit</Text>
                    <Text weight={600} color="green">
                      {formatCurrency(selectedOpportunity.verified_profit)} GP
                    </Text>
                  </div>
                )}
              </Group>
            </div>

            {selectedOpportunity.notes && (
              <div>
                <Text weight={500} mb="xs">Notes</Text>
                <Text size="sm">{selectedOpportunity.notes}</Text>
              </div>
            )}

            <Text size="xs" color="dimmed">
              Created: {formatDate(selectedOpportunity.created_at)}
              {selectedOpportunity.verified_at && (
                <span> • Verified: {formatDate(selectedOpportunity.verified_at)}</span>
              )}
            </Text>
          </Stack>
        )}
      </Modal>

      {/* Verification Modal */}
      <Modal
        opened={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        title="Verify Opportunity"
        size="md"
      >
        <Stack spacing="md">
          <Alert icon={<IconAlertTriangle size={16} />} color="blue">
            Record the actual profit you made from this opportunity to help improve future predictions.
          </Alert>

          <NumberInput
            label="Actual Profit (GP)"
            placeholder="Enter the profit you made"
            value={verificationData.verified_profit}
                          onChange={(value) => setVerificationData(prev => ({ ...prev, verified_profit: value ?? 0 }))}
            parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
            formatter={(value) =>
              !Number.isNaN(parseFloat(value))
                ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                : ''
            }
          />

          <Textarea
            label="Notes"
            placeholder="Add any notes about this opportunity..."
            value={verificationData.notes}
            onChange={(e) => setVerificationData(prev => ({ ...prev, notes: e.target.value }))}
            minRows={3}
          />

          <Group position="right">
            <Button variant="light" onClick={() => setVerifyModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveVerification}>
              Save Verification
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  )
}
