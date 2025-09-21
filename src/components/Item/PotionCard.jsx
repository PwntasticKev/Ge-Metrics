import React from 'react'
import { Card, Text, Group, Badge, Image } from '@mantine/core'
import { IconChartBar } from '@tabler/icons-react'

const PotionCard = ({ potionFamily, volumeData }) => {
  const { baseName, doses, calculations } = potionFamily

  // Function to calculate score based on profit and volume
  const calculateScore = (profit, itemId) => {
    if (!volumeData || !volumeData.has(itemId)) return 1 // Default score
    const volumeInfo = volumeData.get(itemId)
    const totalVolume = volumeInfo.highPriceVolume + volumeInfo.lowPriceVolume

    // Simple scoring algorithm: profit * log(volume)
    // This gives weight to volume but doesn't let it completely dominate profit
    const score = (profit / 1000) * Math.log10(totalVolume + 1)

    // Normalize score to a 1-10 scale (this is a simplified example)
    const normalizedScore = Math.min(10, Math.max(1, Math.round(score)))
    return normalizedScore
  }

  if (!calculations || !calculations.bestProfit) {
    return (
      <Card withBorder shadow="sm" p="lg">
        <Text weight={500}>{baseName}</Text>
        <Text size="sm" color="dimmed">No profitable combinations found.</Text>
      </Card>
    )
  }

  const { bestProfit } = calculations
  const fourDoseItem = doses.find(d => d.dose === 4)
  const imageUrl = fourDoseItem ? `https://oldschool.runescape.wiki/images/${fourDoseItem.name.replace(/ /g, '_')}.png` : ''

  // Recalculate score with volume data
  bestProfit.score = calculateScore(bestProfit.profit, bestProfit.itemId)

  return (
    <Card withBorder shadow="sm" p="lg">
      <Group position="apart" mb="xs">
        <Text weight={500}>{baseName}</Text>
        <Badge color="pink" variant="light">
          Score: {bestProfit.score}/10
        </Badge>
      </Group>

      <Card.Section>
        <Image src={imageUrl} height={60} alt={baseName} fit="contain" />
      </Card.Section>

      <Text size="sm" color="dimmed" mt="md">
        Best profit from combining <strong>{bestProfit.method}</strong> doses.
      </Text>

      <Group position="apart" mt="md">
        <div>
          <Text size="lg" weight={700}>{bestProfit.profit.toLocaleString()} gp</Text>
          <Text size="xs" color="dimmed">Profit per 4-dose</Text>
        </div>
        <div>
          <IconChartBar size={24} />
          <Text size="xs">Vol: {(volumeData && volumeData.has(bestProfit.itemId)) ? (volumeData.get(bestProfit.itemId).highPriceVolume + volumeData.get(bestProfit.itemId).lowPriceVolume).toLocaleString() : 'N/A'}</Text>
        </div>
      </Group>

      <Text size="xs" color="dimmed" align="right" mt="sm">
        Ingredient Volume (24h): {(volumeData && volumeData.has(bestProfit.itemId)) ? (volumeData.get(bestProfit.itemId).highPriceVolume + volumeData.get(bestProfit.itemId).lowPriceVolume).toLocaleString() : 'N/A'}
      </Text>
    </Card>
  )
}

export default PotionCard
