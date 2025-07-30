import { useState } from 'react'
import {
  Modal,
  TextInput,
  NumberInput,
  Button,
  Group,
  Text,
  Image,
  ScrollArea,
  Divider,
  Stack,
  Alert,
  Switch,
  Tooltip,
  Anchor
} from '@mantine/core'
import { IconSearch, IconAlertCircle, IconEye, IconBrain, IconInfoCircle, IconSettings } from '@tabler/icons-react'
import { Link, useNavigate } from 'react-router-dom'

export default function AddToWatchlistModal ({ opened, setOpened, items, onAdd }) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)
  const [volumeThreshold, setVolumeThreshold] = useState(0)
  const [priceDropThreshold, setPriceDropThreshold] = useState(0)
  const [priceChangePercentage, setPriceChangePercentage] = useState(0)
  const [abnormalActivity, setAbnormalActivity] = useState(false)

  // Mock check for Mailchimp API key - in real app, get from user context
  const hasMailchimpKey = false // This should come from user context

  const filteredItems = items.filter(item =>
    item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.id?.toString().includes(searchQuery)
  ).slice(0, 50) // Limit to 50 results for performance

  const handleItemSelect = (item) => {
    setSelectedItem(item)
  }

  const handleAdd = () => {
    if (!selectedItem) return

    const watchlistData = {
      item_id: selectedItem.id,
      volume_threshold: volumeThreshold || null,
      price_drop_threshold: priceDropThreshold || null,
      price_change_percentage: priceChangePercentage || null,
      abnormal_activity: abnormalActivity
    }

    onAdd(watchlistData)

    // Reset form
    setSelectedItem(null)
    setVolumeThreshold(0)
    setPriceDropThreshold(0)
    setPriceChangePercentage(0)
    setAbnormalActivity(false)
    setSearchQuery('')
  }

  const handleClose = () => {
    setOpened(false)
    setSelectedItem(null)
    setVolumeThreshold(0)
    setPriceDropThreshold(0)
    setPriceChangePercentage(0)
    setAbnormalActivity(false)
    setSearchQuery('')
  }

  const formatVolume = (volume) => {
    if (!volume) return 'N/A'
    return new Intl.NumberFormat().format(volume)
  }

  const navigateToSettings = () => {
    handleClose()
    navigate('/settings')
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Add Item to Watchlist"
      size="lg"
    >
      <Stack spacing="md">
        <div>
          <Text size="sm" color="dimmed" mb="xs">
            Search for an item to add to your volume dump watchlist
          </Text>
          <TextInput
            placeholder="Search by item name or ID..."
            icon={<IconSearch size={16} />}
            value={searchQuery ?? ''}
            onChange={(e) => setSearchQuery(e.target.value ?? '')}
          />
        </div>

        {searchQuery && (
          <div>
            <Text size="sm" weight={500} mb="xs">
              Search Results ({filteredItems.length} items)
            </Text>
            <ScrollArea style={{ height: 200 }}>
              <Stack spacing="xs">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleItemSelect(item)}
                    style={{
                      padding: '8px',
                      border: selectedItem?.id === item.id ? '2px solid #339af0' : '1px solid #495057',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      backgroundColor: selectedItem?.id === item.id ? '#2b2c3d' : '#1d1e30'
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
                      <div style={{ flex: 1 }}>
                        <Text size="sm" weight={500}>{item.name}</Text>
                        <Text size="xs" color="dimmed">
                          ID: {item.id} | Volume: {formatVolume(item.volume)} | Price: {item.high || 'N/A'}
                        </Text>
                      </div>
                    </Group>
                  </div>
                ))}
                {filteredItems.length === 0 && (
                  <Text size="sm" color="dimmed" align="center" py="md">
                    No items found matching "{searchQuery}"
                  </Text>
                )}
              </Stack>
            </ScrollArea>
          </div>
        )}

        {selectedItem && (
          <>
            <Divider />
            <div>
              <Text size="sm" weight={500} mb="xs">Selected Item</Text>
              <Group spacing="sm" p="md" style={{ backgroundColor: '#2b2c3d', borderRadius: '4px' }}>
                <Image
                  src={selectedItem.img}
                  width={32}
                  height={32}
                  fit="contain"
                  withPlaceholder
                />
                <div>
                  <Text weight={500}>{selectedItem.name}</Text>
                  <Text size="xs" color="dimmed">
                    Current Volume: {formatVolume(selectedItem.volume)} | Price: {selectedItem.high || 'N/A'}
                  </Text>
                </div>
              </Group>
            </div>

            <div>
              <Text size="sm" weight={500} mb="xs">Alert Configuration</Text>
              <Stack spacing="sm">
                <Tooltip
                  label="AI-powered detection monitors trading patterns, volume spikes, and price volatility using historical data analysis. This uses machine learning to identify unusual market activity automatically."
                  multiline
                  width={300}
                  withArrow
                >
                  <div>
                    <Switch
                      label="Smart Abnormal Activity Detection"
                      description={
                        <Group spacing="xs" mt={2}>
                          <Text size="xs" color="dimmed">
                            Automatically detect unusual trading patterns using AI analysis
                          </Text>
                          <IconInfoCircle size={12} style={{ color: '#868e96' }} />
                        </Group>
                      }
                      checked={abnormalActivity}
                      onChange={(event) => setAbnormalActivity(event.currentTarget.checked)}
                      color="violet"
                      icon={<IconBrain size={16} />}
                    />
                  </div>
                </Tooltip>

                {!abnormalActivity && (
                  <>
                    <Divider label="Custom Thresholds" labelPosition="center" />
                    <NumberInput
                      label="Volume Alert Threshold"
                      description="Get alerted when volume exceeds this amount"
                      placeholder="e.g., 50000"
                      value={volumeThreshold}
                      defaultValue={0}
                      onChange={(value) => setVolumeThreshold(value ?? 0)}
                      min={0}
                      rightSection={<IconEye size={16} />}
                      parser={(value) => value ? value.replace(/\$\s?|(,*)/g, '') : '0'}
                      formatter={(value) => value ? `${Number(value).toLocaleString()}` : '0'}
                    />
                    <div>
                      <Text size="sm" weight={500} mb="xs">Price Change Alert</Text>
                      <Text size="xs" color="dimmed" mb="sm">
                        Get notified when price changes by this percentage (up or down)
                      </Text>
                      <NumberInput
                        label="Price Change Percentage (%)"
                        description="Alert when price changes by this % in either direction"
                        placeholder="e.g., 15"
                        value={priceChangePercentage}
                        defaultValue={0}
                        onChange={(value) => setPriceChangePercentage(value ?? 0)}
                        min={0}
                        max={100}
                        parser={(value) => value ? value.replace(/\$\s?|(,*)/g, '') : '0'}
                        formatter={(value) => value ? `${Number(value).toFixed(1)}` : '0'}
                      />
                    </div>
                    <NumberInput
                      label="Absolute Price Drop Threshold"
                      description="Alert when price drops below this absolute amount"
                      placeholder="e.g., 1000"
                      value={priceDropThreshold}
                      defaultValue={0}
                      onChange={(value) => setPriceDropThreshold(value ?? 0)}
                      min={0}
                      parser={(value) => value ? value.replace(/\$\s?|(,*)/g, '') : '0'}
                      formatter={(value) => value ? `${Number(value).toLocaleString()}` : '0'}
                    />
                  </>
                )}
              </Stack>
            </div>

            <Alert icon={<IconAlertCircle size={16} />} color={abnormalActivity ? 'violet' : 'blue'}>
              <Text size="sm">
                {abnormalActivity
                  ? (
                    <>
                      Smart detection monitors this item for unusual volume spikes, price dumps, and volatility patterns based on historical data analysis.
                      {' '}
                      <Anchor component={Link} to="/faq#smart-detection" color="violet">
                        Learn more about how this works →
                      </Anchor>
                    </>
                    )
                  : "You'll receive email alerts when this item meets your custom threshold conditions. Alerts trigger when ANY condition is met."
                }
                <br />
                {!hasMailchimpKey
                  ? (
                  <Group spacing="xs" mt="xs">
                    <Text size="sm" weight={500}>
                      ⚠️ Configure your Mailchimp API key to receive alerts.
                    </Text>
                    <Button
                      size="xs"
                      variant="subtle"
                      leftIcon={<IconSettings size={14} />}
                      onClick={navigateToSettings}
                    >
                      Go to Settings
                    </Button>
                  </Group>
                    )
                  : (
                  <Text size="sm" weight={500} color="green" mt="xs">
                    ✅ Email alerts are configured and ready
                  </Text>
                    )}
              </Text>
            </Alert>
          </>
        )}

        <Group position="right" mt="md">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!selectedItem}
          >
            Add to Watchlist
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
