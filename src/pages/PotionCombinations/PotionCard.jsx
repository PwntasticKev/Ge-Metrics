import React from 'react'
import { Card, Image, Text, Table, Group, Badge } from '@mantine/core'
import { Link } from 'react-router-dom'

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
          <Link to={`/item/${item4.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <Text weight={500} size="sm" mb="sm">{name}</Text>
          </Link>

          {/* Show equivalent costs per (4) dose */}
          {recipe.equivalentCosts && recipe.equivalentCosts.map((cost, index) => (
            <Group position="apart" key={index} mb="xs">
              <Text size="xs">Buy ({cost.dose})</Text>
              <Text size="xs">
                {cost.costPer4Dose !== null ? `${cost.costPer4Dose.toLocaleString()} gp` : 'N/A'}
              </Text>
            </Group>
          ))}

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
