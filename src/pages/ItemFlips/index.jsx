import React, { useMemo, useState } from 'react'
import { Alert, Anchor, Badge, Center, Group, Image, Loader, ScrollArea, Table, Text } from '@mantine/core'
import { Link } from 'react-router-dom'
import { useFlipMarket } from '../../hooks/useFlipMarket.js'
import { rankItemFlips } from '../../domain/flipping/index.js'
import FlipControls, { filterFlips } from '../../components/Flips/FlipControls.jsx'
import FlipPageHeader from '../../components/Flips/FlipPageHeader.jsx'
import { gpFull, gpShort, percent, wikiIconUrl } from '../../components/Flips/format.js'
import PremiumPageWrapper from '../../components/PremiumPageWrapper'

// Rendering thousands of rows is slow and nobody scrolls that far.
const MAX_ROWS = 200

function ItemFlipRow ({ flip }) {
  return (
    <tr>
      <td>
        <Group spacing="sm" noWrap>
          <Image src={wikiIconUrl(flip.icon)} width={28} height={28} fit="contain" alt="" loading="lazy" style={{ imageRendering: 'pixelated' }} />
          <div>
            <Anchor component={Link} to={`/item/${flip.id}`} size="sm" weight={600}>{flip.name}</Anchor>
            <Group spacing={4}>
              <Text size="xs" color="dimmed">limit {flip.limit}{flip.limitAssumed ? ' (assumed)' : ''}</Text>
              {flip.stale && <Badge size="xs" color="orange" variant="light">Stale</Badge>}
            </Group>
          </div>
        </Group>
      </td>
      <td><Text size="sm" weight={600} ff="monospace">{gpFull(flip.buyAt)}</Text></td>
      <td><Text size="sm" weight={600} ff="monospace">{gpFull(flip.sellAt)}</Text></td>
      <td>
        <Text size="sm" weight={700} color="green" ff="monospace">+{gpFull(flip.profit)}</Text>
        <Text size="xs" color="dimmed">{percent(flip.roi)} · tax {gpShort(flip.tax)}</Text>
      </td>
      <td><Text size="sm">{flip.maxQty === null ? '–' : flip.maxQty.toLocaleString('en-US')}</Text></td>
      <td><Text size="md" weight={800} color="green">{flip.potential === null ? '–' : `+${gpShort(flip.potential)}`}</Text></td>
    </tr>
  )
}

export default function ItemFlips () {
  const { market, status, refreshFailed, updatedAt } = useFlipMarket()
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('potential')
  const [hideStale, setHideStale] = useState(true)

  const ranked = useMemo(() => (market ? rankItemFlips(market, { sortBy }) : []), [market, sortBy])
  const flips = useMemo(() => filterFlips(ranked, { search, hideStale }), [ranked, search, hideStale])

  return (
    <PremiumPageWrapper>
      <FlipPageHeader
        title="Item Flips"
        description="Buy at the left price, sell at the right price. Ranked by what you can make in one 4-hour buy-limit window, after GE tax. Prices are the latest trades, so offers can take time to fill. Fluke trades are filtered out."
        count={flips.length}
        updatedAt={updatedAt}
      />
      <FlipControls search={search} onSearch={setSearch} sortBy={sortBy} onSort={setSortBy} hideStale={hideStale} onHideStale={setHideStale} />

      {status === 'error' && <Alert color="red" mb="md">Could not load prices from the OSRS Wiki. Retrying every minute.</Alert>}
      {status === 'success' && refreshFailed && <Alert color="orange" mb="md">Latest refresh failed. Showing prices from {updatedAt?.toLocaleTimeString()}; retrying every minute.</Alert>}
      {status === 'loading' && <Center h={240}><Loader /></Center>}
      {status === 'success' && flips.length === 0 && <Text color="dimmed" align="center" py="xl">No profitable items match these filters right now.</Text>}

      {status === 'success' && flips.length > 0 && (
        <ScrollArea>
          <Table highlightOnHover verticalSpacing="sm" miw={820}>
            <thead>
              <tr>
                <th>Item</th>
                <th>Buy at</th>
                <th>Sell at</th>
                <th>Profit each</th>
                <th>Qty / 4h</th>
                <th>4h profit</th>
              </tr>
            </thead>
            <tbody>
              {flips.slice(0, MAX_ROWS).map(flip => <ItemFlipRow key={flip.id} flip={flip} />)}
            </tbody>
          </Table>
          {flips.length > MAX_ROWS && (
            <Text size="sm" color="dimmed" align="center" py="md">Showing top {MAX_ROWS} of {flips.length}. Search to find others.</Text>
          )}
        </ScrollArea>
      )}
    </PremiumPageWrapper>
  )
}
