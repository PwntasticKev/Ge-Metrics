import React from 'react'
import { Badge, Group, Text, Title } from '@mantine/core'
import { IconClock } from '@tabler/icons-react'

export default function FlipPageHeader ({ title, description, count, updatedAt }) {
  return (
    <Group position="apart" align="flex-start" mb="md">
      <div>
        <Title order={2}>{title}</Title>
        <Text size="sm" color="dimmed" maw={640}>{description}</Text>
      </div>
      <Group spacing="xs">
        <Badge size="lg" color="yellow" variant="light">{count} profitable</Badge>
        {updatedAt && (
          <Badge size="lg" color="gray" variant="light" leftSection={<IconClock size={12} />}>
            {updatedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </Badge>
        )}
      </Group>
    </Group>
  )
}
