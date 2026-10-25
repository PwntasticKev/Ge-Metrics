import React from 'react'
import { Badge, Box, Group, Image, SimpleGrid, Stack, Text } from '@mantine/core'
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import { ageLabel, gpFull, gpShort, percent, wikiIconUrl } from '../../../components/Flips/format.js'

const PLAN_LABEL = {
  combine: 'Buy parts → sell set',
  split: 'Buy set → sell parts'
}

const EXCHANGE_STEP = {
  'ge-set': 'Exchange at a Grand Exchange clerk (right-click → Sets)',
  combine: 'Combine the parts'
}

function Icon ({ icon, size = 28 }) {
  return <Image src={wikiIconUrl(icon)} width={size} height={size} fit="contain" alt="" loading="lazy" style={{ imageRendering: 'pixelated' }} />
}

function LineList ({ title, lines, color }) {
  return (
    <Stack spacing={6}>
      <Text size="xs" weight={700} transform="uppercase" color={color}>{title}</Text>
      {lines.map(l => (
        <Group key={l.id} spacing="xs" noWrap position="apart">
          <Group spacing="xs" noWrap>
            <Icon icon={l.icon} size={22} />
            <Text size="sm">{l.name}{l.qty > 1 ? ` ×${l.qty}` : ''}</Text>
          </Group>
          <Text size="sm" weight={600} ff="monospace">{gpFull(l.price)}</Text>
        </Group>
      ))}
    </Stack>
  )
}

function Details ({ flip }) {
  return (
    <Box p="md" sx={theme => ({ background: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[0] })}>
      <SimpleGrid cols={3} breakpoints={[{ maxWidth: 'md', cols: 1 }]} spacing="lg">
        <LineList title={`1 · Buy at`} lines={flip.buy} color="yellow" />
        <Stack spacing={6}>
          <Text size="xs" weight={700} transform="uppercase" color="dimmed">2 · Exchange</Text>
          <Text size="sm">{EXCHANGE_STEP[flip.kind]}</Text>
          {flip.conversionCost > 0 && <Text size="sm" color="dimmed">Costs {gpFull(flip.conversionCost)} gp</Text>}
        </Stack>
        <LineList title={`3 · Sell at`} lines={flip.sell} color="green" />
      </SimpleGrid>
      <Group mt="md" spacing="xl">
        <Text size="sm">Cost <b>{gpFull(flip.cost)}</b></Text>
        <Text size="sm">Sells for <b>{gpFull(flip.revenue)}</b></Text>
        <Text size="sm">GE tax <b>-{gpFull(flip.tax)}</b></Text>
        <Text size="sm" color="green">Profit <b>{gpFull(flip.profit)}</b> each</Text>
        {flip.maxSets !== null && (
          <Text size="sm" color="green">×{flip.maxSets} per 4h = <b>{gpFull(flip.potential)}</b></Text>
        )}
        <Text size="xs" color={flip.stale ? 'orange' : 'dimmed'}>Prices {ageLabel(flip.ageSec)}</Text>
      </Group>
    </Box>
  )
}

export default function SetFlipRow ({ flip, open, onToggle }) {
  const Chevron = open ? IconChevronDown : IconChevronRight
  const partsLabel = n => `${n} part${n === 1 ? '' : 's'}`
  return (
    <>
      <tr onClick={onToggle} style={{ cursor: 'pointer' }} aria-expanded={open}>
        <td>
          <Group spacing="sm" noWrap>
            <Chevron size={14} />
            <Icon icon={flip.icon} />
            <div>
              <Text size="sm" weight={600}>{flip.name}{flip.variant ? <Text span size="xs" color="dimmed"> ({flip.variant})</Text> : null}</Text>
              <Group spacing={4}>
                <Badge size="xs" color={flip.direction === 'combine' ? 'violet' : 'cyan'} variant="light">{PLAN_LABEL[flip.direction]}</Badge>
                {flip.kind === 'combine' && <Badge size="xs" color="gray" variant="light">Crafted</Badge>}
                {flip.stale && <Badge size="xs" color="orange" variant="light">Stale</Badge>}
              </Group>
            </div>
          </Group>
        </td>
        <td>
          <Text size="sm" weight={600} ff="monospace">{gpFull(flip.cost)}</Text>
          <Text size="xs" color="dimmed">{flip.direction === 'combine' ? partsLabel(flip.buy.length) : 'the set'}</Text>
        </td>
        <td>
          <Text size="sm" weight={600} ff="monospace">{gpFull(flip.revenue)}</Text>
          <Text size="xs" color="dimmed">{flip.direction === 'split' ? partsLabel(flip.sell.length) : 'the set'}</Text>
        </td>
        <td>
          <Text size="sm" weight={700} color="green" ff="monospace">+{gpFull(flip.profit)}</Text>
          <Text size="xs" color="dimmed">{percent(flip.roi)}</Text>
        </td>
        <td><Text size="sm">{flip.maxSets ?? '–'}</Text></td>
        <td><Text size="md" weight={800} color="green">{flip.potential === null ? '–' : `+${gpShort(flip.potential)}`}</Text></td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6} style={{ padding: 0 }}>
            <Details flip={flip} />
          </td>
        </tr>
      )}
    </>
  )
}
