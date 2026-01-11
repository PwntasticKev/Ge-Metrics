import React, { useState, useMemo } from 'react'
import { Card, Image, Badge, Text, Group, Tooltip, ActionIcon, Stack, Loader } from '@mantine/core'
import { Link } from 'react-router-dom'
import { IconChartLine, IconHeart, IconHeartFilled } from '@tabler/icons-react'
import GraphModal from '../../shared/modals/graph-modal.jsx'

export function PotionCard ({ recipe, item, allItems, filterMode = 'volume+profit', volumeData, isFavorite, onToggleFavorite, isDecantMode = false }) {
  const [graphInfo, setGraphInfo] = useState({ open: false, item: null })

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
        <ActionIcon size="sm" variant="light" onClick={() => setGraphInfo({ open: true, item: { id: item4.id, items: allItems } })}>
          <IconChartLine size={14} />
        </ActionIcon>
        <ActionIcon
          size="sm"
          variant="light"
          color={isFavorite ? 'red' : 'gray'}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (onToggleFavorite) {
              onToggleFavorite()
            }
          }}
        >
          {isFavorite ? <IconHeartFilled size={14} /> : <IconHeart size={14} />}
        </ActionIcon>
      </Group>

      {/* Profit Breakdown - Integrated */}
      <Stack spacing={0}>
        {isDecantMode ? (
          <>
            {/* Decant mode: Show Buy (4) at top */}
            <Group position="apart" py={4} mb="xs" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <Text size="xs" weight={500}>Buy (4):</Text>
              <Text size="xs" weight={500}>
                {recipe.item4?.low ? Number(recipe.item4.low.toString().replace(/,/g, '')).toLocaleString() : 'N/A'}
              </Text>
            </Group>
            
            {/* Then show Sell (3/2/1) with profit */}
            {recipe.combinations && [...recipe.combinations].sort((a, b) => parseInt(a.dose) - parseInt(b.dose)).map((combo) => {
              const isBest = bestMethod && combo.dose === bestMethod.dose
              const volumeInfo = volumeData ? volumeData[combo.itemId] : null
              let totalVolume
              if (volumeData === undefined) {
                totalVolume = <Loader size="xs" />
              } else if (volumeInfo && (volumeInfo.highPriceVolume != null || volumeInfo.lowPriceVolume != null)) {
                const high = volumeInfo.highPriceVolume ?? 0
                const low = volumeInfo.lowPriceVolume ?? 0
                totalVolume = high + low
              } else {
                totalVolume = 0
              }
              const totalVolumeDisplay = typeof totalVolume === 'number' ? totalVolume.toLocaleString() : totalVolume

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
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <Text size="xs" weight={isBest ? 700 : 400}>
                          Sell ({combo.dose}): {combo.high !== null && combo.high !== undefined ? Number(combo.high.toString().replace(/,/g, '')).toLocaleString() : 'N/A'}
                        </Text>
                        {combo.high && (
                          <Text 
                            size="xs" 
                            color="red" 
                            style={{ 
                              position: 'absolute', 
                              top: '100%', 
                              left: '0', 
                              whiteSpace: 'nowrap', 
                              fontSize: '8px', 
                              pointerEvents: 'none',
                              marginTop: '-2px'
                            }}
                          >
                            (-{new Intl.NumberFormat().format(Math.floor(Number(combo.high.toString().replace(/,/g, '')) * 0.02))} tax)
                          </Text>
                        )}
                      </div>
                      <Text size="xs" color="dimmed" mt={combo.high ? 8 : 0}>
                        Vol 24h: {totalVolumeDisplay}
                      </Text>
                    </Stack>
                    <Text size="xs" weight={isBest ? 700 : 400} color={combo.profitPerPotion > 0 ? 'green' : 'red'}>
                      {combo.profitPerPotion !== null ? `${Math.round(combo.profitPerPotion).toLocaleString()}/per` : 'N/A'}
                    </Text>
                  </Group>
                </div>
              )
            })}
          </>
        ) : (
          <>
            {/* Regular mode: existing display */}
            {recipe.combinations && [...recipe.combinations].sort((a, b) => parseInt(a.dose) - parseInt(b.dose)).map((combo) => {
              const isBest = bestMethod && combo.dose === bestMethod.dose
              const volumeInfo = volumeData ? volumeData[combo.itemId] : null
              // Calculate total volume - handle null/undefined values properly
              let totalVolume
              if (volumeData === undefined) {
                // Still loading
                totalVolume = <Loader size="xs" />
              } else if (volumeInfo && (volumeInfo.highPriceVolume != null || volumeInfo.lowPriceVolume != null)) {
                // We have volume data - sum it up (treat null as 0)
                const high = volumeInfo.highPriceVolume ?? 0
                const low = volumeInfo.lowPriceVolume ?? 0
                totalVolume = high + low
              } else {
                // No volume data for this item
                totalVolume = 0
              }
              const totalVolumeDisplay = typeof totalVolume === 'number' ? totalVolume.toLocaleString() : totalVolume

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
                        ({combo.dose}): {combo.low !== null && combo.low !== undefined ? Number(combo.low.toString().replace(/,/g, '')).toLocaleString() : 'N/A'}
                      </Text>
                      <Text size="xs" color="dimmed">
                        Vol 24h: {totalVolumeDisplay}
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

            {/* (4) dose sell price - show actual high price to match All Items page */}
            <Group position="apart" py={4}>
              <Text size="xs" weight={500}>Sell (4):</Text>
              <div style={{ position: 'relative', display: 'inline-block', textAlign: 'right' }}>
                <Text size="xs" weight={500} color="green">
                  {item4.high ? Number(item4.high.toString().replace(/,/g, '')).toLocaleString() : 'N/A'}
                </Text>
                {item4.high && (
                  <Text 
                    size="xs" 
                    color="red" 
                    style={{ 
                      position: 'absolute', 
                      top: '100%', 
                      right: '0', 
                      whiteSpace: 'nowrap', 
                      fontSize: '8px', 
                      pointerEvents: 'none'
                    }}
                  >
                    (-{new Intl.NumberFormat().format(Math.floor(Number(item4.high.toString().replace(/,/g, '')) * 0.02))} tax)
                  </Text>
                )}
              </div>
            </Group>
          </>
        )}
      </Stack>

      <GraphModal
        opened={graphInfo.open}
        onClose={() => setGraphInfo({ open: false, item: null })}
        item={graphInfo.item}
      />
    </Card>
  )
}
