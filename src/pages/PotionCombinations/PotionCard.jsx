import React, { useState, useMemo } from 'react'
import { Card, Image, Badge, Text, Group, Tooltip, ActionIcon, Stack, Loader } from '@mantine/core'
import { Link } from 'react-router-dom'
import { IconChartLine, IconHeart, IconHeartFilled } from '@tabler/icons-react'
import { VolumeChartModal } from './components/VolumeChartModal'
import { useFavorites } from '../../contexts/FavoritesContext'

export function PotionCard ({ recipe, filterMode = 'volume+profit', volumeData }) {
  const [modalOpened, setModalOpened] = useState(false)
  const { isFavorite, toggleFavorite } = useFavorites()

  if (!recipe || !recipe.item4 || !recipe.combinations) {
    return null
  }

  const { name, item4 } = recipe

  // Determine which method to highlight based on filter mode
  const getBestMethod = () => {
    if (filterMode === 'dose1') {
      // Only highlight (1) dose method
      return recipe.combinations.find(combo => combo.dose === '1') || null
    } else if (filterMode === 'dose2') {
      // Only highlight (2) dose method
      return recipe.combinations.find(combo => combo.dose === '2') || null
    } else if (filterMode === 'dose3') {
      // Only highlight (3) dose method
      return recipe.combinations.find(combo => combo.dose === '3') || null
    } else if (filterMode === 'profit') {
      // Highlight method with best profit (ignore volume)
      return recipe.combinations.reduce((best, current) =>
        (current.profitPerPotion > (best?.profitPerPotion || -Infinity)) ? current : best
      )
    } else {
      // Default - use algorithm's best method
      return recipe.combinations.find(combo => combo.dose === recipe.bestMethodDose) || recipe.combinations[0]
    }
  }

  const bestMethod = getBestMethod()

  const bestMethodVolume = useMemo(() => {
    if (!bestMethod || !volumeData) return null
    const volumeInfo = volumeData[bestMethod.itemId]
    if (!volumeInfo) return 'N/A'
    return (volumeInfo.highPriceVolume + volumeInfo.lowPriceVolume).toLocaleString()
  }, [bestMethod, volumeData])

  return (
    <Card shadow="sm" p="sm" radius="md" withBorder>
      {/* Header: Image | Title (truncated) | Score */}
      <Group position="apart" align="flex-start" mb="xs" noWrap>
        <Group spacing="sm" align="center" style={{ minWidth: 0, flex: 1 }}>
          <Image src={item4.wikiImageUrl} width={28} height={28} alt={name} fit="contain" />
          <Link to={`/item/${item4.id}`} style={{ textDecoration: 'none', color: 'inherit', minWidth: 0, flex: 1 }}>
            <Text weight={500} size="sm" lineClamp={1} style={{ minWidth: 0 }}>{name}</Text>
          </Link>
        </Group>

        <Tooltip label="Profitability Score (1-10)" withArrow>
          <Badge color="yellow" variant="light" size="sm" style={{ flexShrink: 0 }}>
            {recipe.normalizedScore ? `${recipe.normalizedScore}/10` : 'N/A'}
          </Badge>
        </Tooltip>
      </Group>

      {/* Icons Row */}
      <Group spacing="xs" mb="sm">
        <ActionIcon size="sm" variant="light" onClick={() => setModalOpened(true)}>
          <IconChartLine size={14} />
        </ActionIcon>
        <ActionIcon
          size="sm"
          variant="light"
          color={isFavorite(name) ? 'red' : 'gray'}
          onClick={() => toggleFavorite(name)}
        >
          {isFavorite(name) ? <IconHeartFilled size={14} /> : <IconHeart size={14} />}
        </ActionIcon>
      </Group>

      {/* Profit Breakdown - Integrated */}
      <Stack spacing={0}>
        {recipe.combinations && [...recipe.combinations].sort((a, b) => parseInt(a.dose) - parseInt(b.dose)).map((combo) => {
          const isBest = bestMethod && combo.dose === bestMethod.dose
          const volumeInfo = volumeData ? volumeData[combo.itemId] : null
          const totalVolume = volumeInfo ? (volumeInfo.highPriceVolume + volumeInfo.lowPriceVolume).toLocaleString() : <Loader size="xs" />

          return (
            <div
              key={combo.dose}
              style={{
                padding: '6px 8px',
                borderRadius: '4px',
                backgroundColor: isBest ? 'rgba(76, 175, 80, 0.15)' : 'transparent',
                border: isBest ? '1px solid rgba(76, 175, 80, 0.3)' : '1px solid transparent'
              }}
            >
              <Group position="apart">
                <Stack spacing={0}>
                  <Text size="xs" weight={isBest ? 700 : 400}>
                    ({combo.dose}): {combo.cost !== null ? Math.round(combo.cost).toLocaleString() : 'N/A'}
                  </Text>
                  <Text size="xs" color="dimmed">
                    Vol 24h: {totalVolume}
                  </Text>
                </Stack>
                <Text size="xs" weight={isBest ? 700 : 400} color={combo.profitPerPotion > 0 ? 'green' : 'red'}>
                  {combo.profitPerPotion !== null ? `${Math.round(combo.profitPerPotion).toLocaleString()}/per` : 'N/A'}
                </Text>
              </Group>
            </div>
          )
        })}

        {/* Divider line */}
        <div style={{ borderTop: '1px solid #dee2e6', margin: '6px 0' }} />

        {/* (4) dose sell price */}
        <Group position="apart" py={4}>
          <Text size="xs" weight={500}>Sell (4):</Text>
          <Text size="xs" weight={500} color="green">
            {item4.high ? Math.round(parseFloat(item4.high.toString().replace(/,/g, '')) * 0.98).toLocaleString() : 'N/A'}
          </Text>
        </Group>
      </Stack>

      {modalOpened && <VolumeChartModal opened={modalOpened} onClose={() => setModalOpened(false)} recipe={recipe} />}
    </Card>
  )
}
