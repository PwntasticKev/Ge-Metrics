import React, { useMemo, useState } from 'react'
import { Alert, Center, Loader, ScrollArea, SegmentedControl, Table, Text } from '@mantine/core'
import { useFlipMarket } from '../../hooks/useFlipMarket.js'
import { buildRecipes, rankSetFlips } from '../../domain/flipping/index.js'
import { itemRecipes } from '../../components/Table/data/item-set-filters.jsx'
import FlipControls, { filterFlips } from '../../components/Flips/FlipControls.jsx'
import FlipPageHeader from '../../components/Flips/FlipPageHeader.jsx'
import PremiumPageWrapper from '../../components/PremiumPageWrapper'
import SetFlipRow from './components/SetFlipRow.jsx'

const RECIPES = buildRecipes(itemRecipes)

const KIND_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'ge-set', label: 'GE sets' },
  { value: 'combine', label: 'Crafted' }
]

export default function CombinationItems () {
  const { market, status, refreshFailed, updatedAt } = useFlipMarket()
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('potential')
  const [kind, setKind] = useState('all')
  const [hideStale, setHideStale] = useState(true)
  const [openId, setOpenId] = useState(null)

  const ranked = useMemo(() => (market ? rankSetFlips(RECIPES, market, { sortBy }) : []), [market, sortBy])
  const flips = useMemo(
    () => filterFlips(ranked, { search, hideStale }).filter(f => kind === 'all' || f.kind === kind),
    [ranked, search, hideStale, kind]
  )

  return (
    <PremiumPageWrapper>
      <FlipPageHeader
        title="Combination Sets"
        description="Buy at the left price, exchange, sell at the right price. Ranked by what you can make in one 4-hour buy-limit window, after GE tax. Prices are the latest trades, so offers can take time to fill."
        count={flips.length}
        updatedAt={updatedAt}
      />
      <FlipControls search={search} onSearch={setSearch} sortBy={sortBy} onSort={setSortBy} hideStale={hideStale} onHideStale={setHideStale}>
        <SegmentedControl value={kind} onChange={setKind} data={KIND_OPTIONS} aria-label="Set type" />
      </FlipControls>

      {status === 'error' && <Alert color="red" mb="md">Could not load prices from the OSRS Wiki. Retrying every minute.</Alert>}
      {status === 'success' && refreshFailed && <Alert color="orange" mb="md">Latest refresh failed. Showing prices from {updatedAt?.toLocaleTimeString()}; retrying every minute.</Alert>}
      {status === 'loading' && <Center h={240}><Loader /></Center>}
      {status === 'success' && flips.length === 0 && <Text color="dimmed" align="center" py="xl">No profitable sets match these filters right now.</Text>}

      {status === 'success' && flips.length > 0 && (
        <ScrollArea>
          <Table highlightOnHover verticalSpacing="sm" miw={860}>
            <thead>
              <tr>
                <th>Set</th>
                <th>Buy at</th>
                <th>Sell at</th>
                <th>Profit each</th>
                <th>Per 4h</th>
                <th>4h profit</th>
              </tr>
            </thead>
            <tbody>
              {flips.map(flip => (
                <SetFlipRow
                  key={flip.id}
                  flip={flip}
                  open={openId === flip.id}
                  onToggle={() => setOpenId(id => (id === flip.id ? null : flip.id))}
                />
              ))}
            </tbody>
          </Table>
        </ScrollArea>
      )}
    </PremiumPageWrapper>
  )
}
