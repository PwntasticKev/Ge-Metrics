import React from 'react'
import { Card, Image, Badge, Text, Group, Tooltip } from '@mantine/core'
import { Link } from 'react-router-dom'
import { IconInfoCircle } from '@tabler/icons-react'

export function PotionCard ({ recipe }) {
  if (!recipe || !recipe.item4 || !recipe.combinations) {
    return null
  }

  const { name, item4, combinations } = recipe

  const formatProfit = (profit) => {
    if (typeof profit !== 'number' || isNaN(profit)) {
      return <Text color="gray">N/A</Text>
    }
    const color = profit > 0 ? 'green' : profit < 0 ? 'red' : 'gray'
    const sign = profit > 0 ? '+' : ''
    return (
      <Text color={color} weight={700}>
        {sign}{profit.toLocaleString()} gp
      </Text>
    )
  }

  const formatCost = (cost) => {
    if (typeof cost !== 'number' || isNaN(cost)) {
      return 'N/A'
    }
    return `${cost.toLocaleString()} gp`
  }

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
            <Link to={`/item/${item4.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <Text weight={500} size="sm" mb="sm" lineClamp={1}>{name}</Text>
            </Link>
            <Tooltip label="Profitability Score = Best Profit * Volume" withArrow>
              <Badge color="yellow" variant="light" size="sm">
                {recipe.profitabilityScore !== null ? recipe.profitabilityScore.toLocaleString() : 'N/A'}
              </Badge>
            </Tooltip>
          </Group>

          {/* Show equivalent costs per (4) dose */}
          {recipe.equivalentCosts && recipe.equivalentCosts.map((cost, index) => {
            const isBest = cost.profit === recipe.maxProfit
            return (
              <Group
                position="apart"
                key={index}
                mb="xs"
                p={4}
                style={{
                  borderRadius: '4px',
                  backgroundColor: isBest ? 'rgba(76, 175, 80, 0.1)' : 'transparent'
                }}
              >
                <Text size="xs" weight={isBest ? 700 : 400}>Buy ({cost.dose})</Text>
                <Text size="xs" weight={isBest ? 700 : 400}>
                  {cost.costPer4Dose !== null ? `${cost.costPer4Dose.toLocaleString()} gp` : 'N/A'}
                </Text>
              </Group>
            )
          })}

          {/* Divider line */}
          <div style={{ borderTop: '1px solid #dee2e6', margin: '8px 0' }} />

          {/* (4) dose sell price */}
          <Group position="apart" mb="xs">
            <Text size="xs" weight={500}>(4)</Text>
            <Text size="xs" weight={500} color="green">{item4.high ? item4.high.toLocaleString() : 'N/A'}</Text>
          </Group>

          {/* Best profit */}
          <Group position="apart">
            <Text size="xs" weight={600}>Best Profit:</Text>
            <Text size="xs" weight={600} color={recipe.maxProfit > 0 ? 'green' : (recipe.maxProfit < 0 ? 'red' : 'gray')}>
              {recipe.maxProfit !== null
                ? `${recipe.maxProfit > 0 ? '+' : ''}${recipe.maxProfit.toLocaleString()}`
                : 'N/A'
              }
            </Text>
          </Group>
        </div>
      </Group>
    </Card>
  )
}
