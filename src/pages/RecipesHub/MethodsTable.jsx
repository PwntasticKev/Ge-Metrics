import { Anchor, Badge, Group, Image, ScrollArea, Stack, Table, Text, Tooltip } from '@mantine/core'
import { Link } from 'react-router-dom'
import { recipeMeta } from './methodCatalog.js'

const ICON_BASE = 'https://oldschool.runescape.wiki/images/'
export const iconUrl = icon => (icon ? `${ICON_BASE}${icon.replace(/ /g, '_')}` : null)

export const formatGp = n => {
  if (n === null || n === undefined || !Number.isFinite(n)) return '-'
  return Math.round(n).toLocaleString('en-US')
}

const formatQty = qty => (Number.isInteger(qty) ? `${qty}` : qty.toFixed(qty < 1 ? 3 : 2).replace(/0+$/, ''))
const profitColor = n => (n > 0 ? 'green' : n < 0 ? 'red' : 'dimmed')

function ItemLines ({ lines }) {
  return (
    <Stack spacing={2}>
      {lines.map(line => (
        <Group key={line.id} spacing={6} noWrap>
          {line.icon && <Image src={iconUrl(line.icon)} width={18} height={18} fit="contain" alt="" />}
          <Text size="xs" component={Link} to={`/item/${line.id}`} sx={{ whiteSpace: 'nowrap', '&:hover': { textDecoration: 'underline' } }}>
            {formatQty(line.qty)} × {line.name}
          </Text>
          <Text size="xs" color="dimmed" sx={{ whiteSpace: 'nowrap' }}>@ {formatGp(line.price)}</Text>
        </Group>
      ))}
    </Stack>
  )
}

function NameCell ({ flip }) {
  const meta = recipeMeta(flip.id)
  return (
    <Group spacing="sm" noWrap>
      {flip.icon && <Image src={iconUrl(flip.icon)} width={28} height={28} fit="contain" alt="" />}
      <div>
        {meta?.source
          ? <Anchor href={meta.source} target="_blank" rel="noopener noreferrer" size="sm" weight={600}>{flip.name}</Anchor>
          : <Text size="sm" weight={600}>{flip.name}</Text>}
        {meta && (
          <Text size="xs" color="dimmed">
            {[meta.skill, meta.location].filter(Boolean).join(' · ')}
          </Text>
        )}
        <Group spacing={4} mt={2}>
          {meta?.members === false && <Badge size="xs" color="teal" variant="light">F2P</Badge>}
          {flip.stale && (
            <Tooltip label="At least one price is over 6 hours old">
              <Badge size="xs" color="orange" variant="light">Stale price</Badge>
            </Tooltip>
          )}
          {flip.suspicious && (
            <Tooltip label="Margin this large is usually a one-off trade, not a real spread">
              <Badge size="xs" color="red" variant="light">Suspicious</Badge>
            </Tooltip>
          )}
        </Group>
      </div>
    </Group>
  )
}

export default function MethodsTable ({ flips, showPerHour }) {
  if (flips.length === 0) {
    return <Text color="dimmed" py="xl" align="center">No profitable recipes right now for this method and filter.</Text>
  }
  return (
    <ScrollArea>
      <Table highlightOnHover verticalSpacing="xs" fontSize="sm" sx={{ minWidth: 900 }}>
        <thead>
          <tr>
            <th>Recipe</th>
            <th>Buy</th>
            <th>Sell</th>
            <th style={{ textAlign: 'right' }}>Profit each</th>
            {showPerHour && <th style={{ textAlign: 'right' }}>GP/hour</th>}
            <th style={{ textAlign: 'right' }}>
              <Tooltip label="Profit for as many as the buy limits and 4h trade volume allow" multiline width={220}>
                <span>4h profit</span>
              </Tooltip>
            </th>
            <th style={{ textAlign: 'right' }}>ROI</th>
          </tr>
        </thead>
        <tbody>
          {flips.map(flip => (
            <tr key={flip.id}>
              <td><NameCell flip={flip} /></td>
              <td>
                <ItemLines lines={flip.buy} />
                {flip.coinCost > 0 && <Text size="xs" color="dimmed">+ {formatGp(flip.coinCost)} gp fee</Text>}
              </td>
              <td>
                <ItemLines lines={flip.sell} />
                {flip.coinRevenue > 0 && <Text size="xs" color="dimmed">+ {formatGp(flip.coinRevenue)} gp</Text>}
              </td>
              <td style={{ textAlign: 'right' }}>
                <Text size="sm" weight={600} color={profitColor(flip.profit)}>{formatGp(flip.profit)}</Text>
                <Text size="xs" color="dimmed">tax {formatGp(flip.tax)}</Text>
              </td>
              {showPerHour && (
                <td style={{ textAlign: 'right' }}>
                  <Text size="sm" color={profitColor(flip.perHour)}>{formatGp(flip.perHour)}</Text>
                </td>
              )}
              <td style={{ textAlign: 'right' }}>
                <Text size="sm">{formatGp(flip.potential)}</Text>
                {flip.maxActions !== null && <Text size="xs" color="dimmed">× {formatGp(flip.maxActions)}</Text>}
              </td>
              <td style={{ textAlign: 'right' }}>
                <Text size="sm">{(flip.roi * 100).toFixed(1)}%</Text>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </ScrollArea>
  )
}
