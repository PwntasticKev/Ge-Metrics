import React, { useState } from 'react'
import { Card, Image, Badge, Text, Group, Tooltip, ActionIcon } from '@mantine/core'
import { Link } from 'react-router-dom'
import { IconChartLine } from '@tabler/icons-react'
import { VolumeChartModal } from './components/VolumeChartModal'

export function PotionCard ({ recipe }) {
  const [modalOpened, setModalOpened] = useState(false)

  if (!recipe || !recipe.item4 || !recipe.combinations) {
    return null
  }

  const { name, item4 } = recipe

  return (
    <Card shadow="sm" p="sm" radius="md" withBorder>
      <Group align="flex-start" spacing="md">
        {/* Left: Image and Badge */}
        <div style={{ flexShrink: 0, textAlign: 'center' }}>
          <Image src={item4.img} width={40} height={40} alt={name} fit="contain" />
          <Badge color="blue" variant="light" size="xs" mt="xs">
            Potion
          </Badge>
        </div>

        {/* Right: Content */}
        <div style={{ flex: 1 }}>
          <Group position="apart" noWrap>
            <Group spacing="xs" align="center">
              <Link to={`/item/${item4.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <Text weight={500} size="sm" lineClamp={1}>{name}</Text>
              </Link>
              <ActionIcon size="xs" variant="transparent" onClick={() => setModalOpened(true)}>
                <IconChartLine size={14} />
              </ActionIcon>
            </Group>
            <Tooltip label="Profitability Score (1-10)" withArrow>
              <Badge color="yellow" variant="light" size="sm">
                {recipe.normalizedScore ? `${recipe.normalizedScore} / 10` : 'N/A'}
              </Badge>
            </Tooltip>
          </Group>

          {/* Show method costs and profits */}
          {recipe.combinations && recipe.combinations.map((combo) => {
            const isBest = combo.dose === recipe.bestMethodDose
            return (
              <Group
                position="apart"
                key={combo.dose}
                mb="xs"
                p={4}
                style={{
                  borderRadius: '4px',
                  backgroundColor: isBest ? 'rgba(76, 175, 80, 0.1)' : 'transparent'
                }}
              >
                <Text size="xs" weight={isBest ? 700 : 400}>
                  ({combo.dose}): {combo.cost !== null ? Math.round(combo.cost).toLocaleString() : 'N/A'}
                </Text>
                <Text size="xs" weight={isBest ? 700 : 400} color={combo.profitPerPotion > 0 ? 'green' : 'red'}>
                  {combo.profitPerPotion !== null ? `${Math.round(combo.profitPerPotion).toLocaleString()}/per` : 'N/A'}
                </Text>
              </Group>
            )
          })}

          {/* Divider line */}
          <div style={{ borderTop: '1px solid #dee2e6', margin: '8px 0' }} />

          {/* (4) dose sell price */}
          <Group position="apart">
            <Text size="xs" weight={500}>Sell (4):</Text>
            <Text size="xs" weight={500} color="green">
              {item4.high ? Math.round(parseFloat(item4.high.toString().replace(/,/g, '')) * 0.98).toLocaleString() : 'N/A'}
            </Text>
          </Group>
        </div>
      </Group>
      {modalOpened && <VolumeChartModal opened={modalOpened} onClose={() => setModalOpened(false)} recipe={recipe} />}
    </Card>
  )
}
