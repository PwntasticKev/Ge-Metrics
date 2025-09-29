import React, { useState, useMemo } from 'react'
import {
  Card,
  Title,
  Text,
  NumberInput,
  Select,
  Button,
  Group,
  Stack,
  Alert,
  Divider,
  Box,
  ThemeIcon
} from '@mantine/core'
import { IconCalculator, IconCoins, IconTrendingUp, IconFlame } from '@tabler/icons-react'
import ItemData from '../../utils/item-data'

// Grand Exchange Tax Rate
const GE_TAX_RATE = 0.01

// Nature Rune Price (use live data if available, otherwise estimate)
const NATURE_RUNE_PRICE = 150

export function FlippingProfitCalculator () {
  const [buyPrice, setBuyPrice] = useState(1000)
  const [sellPrice, setSellPrice] = useState(1100)
  const [quantity, setQuantity] = useState(100)

  const { totalProfit, profitPerItem, taxAmount } = useMemo(() => {
    const revenue = (sellPrice || 0) * (quantity || 0)
    const cost = (buyPrice || 0) * (quantity || 0)
    const tax = Math.floor(revenue * GE_TAX_RATE)
    const profit = revenue - cost - tax
    const perItem = (quantity || 0) > 0 ? profit / (quantity || 0) : 0
    return {
      totalProfit: profit,
      profitPerItem: perItem,
      taxAmount: tax
    }
  }, [buyPrice, sellPrice, quantity])

  return (
    <Card withBorder p="md">
      <Group spacing="sm" mb="md">
        <ThemeIcon color="blue" variant="light"><IconTrendingUp size={18} /></ThemeIcon>
        <Title order={4}>Flipping Profit Calculator</Title>
      </Group>
      <Stack spacing="sm">
        <NumberInput
          label="Buy Price"
          value={buyPrice}
          onChange={(val) => setBuyPrice(val ?? 0)}
          min={0}
          step={1}
          icon={<IconCoins size={16} />}
        />
        <NumberInput
          label="Sell Price"
          value={sellPrice}
          onChange={(val) => setSellPrice(val ?? 0)}
          min={0}
          step={1}
          icon={<IconCoins size={16} />}
        />
        <NumberInput
          label="Quantity"
          value={quantity}
          onChange={(val) => setQuantity(val ?? 0)}
          min={0}
          step={10}
        />
        <Divider my="xs" />
        <Alert
          icon={<IconCalculator size={16} />}
          title="Potential Profit"
          color={totalProfit >= 0 ? 'green' : 'red'}
          variant="light"
        >
          <Text>Total Profit: <strong>{totalProfit.toLocaleString()} gp</strong></Text>
          <Text size="sm">Profit per Item: <strong>{profitPerItem.toFixed(2)} gp</strong></Text>
          <Text size="sm" color="dimmed">GE Tax: {taxAmount.toLocaleString()} gp</Text>
        </Alert>
      </Stack>
    </Card>
  )
}

export function HighAlchCalculator () {
  const { items, priceStatus } = ItemData()
  const [selectedItemId, setSelectedItemId] = useState(null)
  const [natureRunePrice, setNatureRunePrice] = useState(NATURE_RUNE_PRICE)

  const alchableItems = useMemo(() => {
    if (priceStatus !== 'success') return []
    return items
      .filter(item => item.highalch && item.highalch > 0 && item.tradeable)
      .map(item => ({
        value: item.id.toString(),
        label: item.name
      }))
  }, [items, priceStatus])

  const { profit, selectedItem } = useMemo(() => {
    const item = items.find(i => i.id === Number(selectedItemId))
    if (!item) return { profit: 0, selectedItem: null }

    const cost = (item.low || 0) + (natureRunePrice || 0)
    const revenue = item.highalch || 0
    const alchProfit = revenue - cost
    return { profit: alchProfit, selectedItem: item }
  }, [selectedItemId, items, natureRunePrice])

  return (
    <Card withBorder p="md">
      <Group spacing="sm" mb="md">
        <ThemeIcon color="orange" variant="light"><IconFlame size={18} /></ThemeIcon>
        <Title order={4}>High Alchemy Profit Calculator</Title>
      </Group>
      <Stack spacing="sm">
        <Select
          label="Select Item to Alchemize"
          placeholder="Search for an item..."
          searchable
          data={alchableItems}
          value={selectedItemId}
          onChange={setSelectedItemId}
          disabled={priceStatus !== 'success'}
        />
        <NumberInput
          label="Nature Rune Price"
          value={natureRunePrice}
          onChange={(val) => setNatureRunePrice(val ?? 0)}
          min={0}
          step={1}
        />
        {selectedItem && (
          <>
            <Divider my="xs" />
            <Alert
              icon={<IconCalculator size={16} />}
              title={`${selectedItem.name} Result`}
              color={profit >= 0 ? 'green' : 'red'}
              variant="light"
            >
              <Text>Alch Value: <strong>{selectedItem.highalch.toLocaleString()} gp</strong></Text>
              <Text>Item Cost (Low Price): <strong>{selectedItem.low.toLocaleString()} gp</strong></Text>
              <Text>Total Cost: <strong>{(selectedItem.low + natureRunePrice).toLocaleString()} gp</strong></Text>
              <Divider my="xs" variant="dashed"/>
              <Text weight={700}>Profit per Alch: <strong>{profit.toLocaleString()} gp</strong></Text>
            </Alert>
          </>
        )}
      </Stack>
    </Card>
  )
}
