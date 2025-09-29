import React, { useState } from 'react'
import {
  Box,
  Tabs,
  Loader,
  Center,
  Text,
  Group,
  Badge
} from '@mantine/core'
import {
  IconHeart,
  IconListDetails,
  IconBoxMultiple,
  IconPlant2,
  IconWash,
  IconClock
} from '@tabler/icons-react'
import AllItemsTable from '../../components/Table/all-items-table'
import ItemSetsTable from '../../components/Table/item-sets-table'
import ItemData from '../../utils/item-data'
import { trpc } from '../../utils/trpc.jsx'
import { useFavorites } from '../../hooks/useFavorites.js'
import { getRelativeTime } from '../../utils/utils'

export default function Favorites () {
  const { items, itemSets, mapStatus, priceStatus } = ItemData()
  const { favoriteItems, toggleFavorite, isLoadingFavorites } = useFavorites()
  const [lastFetchTime, setLastFetchTime] = useState(new Date())

  const filterFavorites = (type) => {
    const favoriteIdSet = new Set(
      favoriteItems
        .filter(fav => fav.itemType === type)
        .map(fav => fav.itemId)
    )
    if (type === 'item') {
      return items.filter(item => favoriteIdSet.has(item.id))
    }
    return itemSets.filter(item => favoriteIdSet.has(item.id))
  }

  const favoriteAllItems = filterFavorites('item')
  const favoriteCombinations = filterFavorites('combination')
  const favoriteSaplings = filterFavorites('sapling')
  const favoriteHerbs = filterFavorites('herb')

  const isLoading = mapStatus === 'loading' || priceStatus === 'loading' || isLoadingFavorites

  return (
    <Box sx={{ py: 4 }}>
      <Group position="apart" mb="md">
        <div>
          <Text size="xl" weight={700} color="white">Your Favorites</Text>
          <Text size="sm" color="dimmed">A personalized list of items and combinations you are tracking.</Text>
        </div>
        <Badge
          color="blue"
            size="lg"
          variant="filled"
          >
          <Group spacing="xs">
            <IconClock size={14} />
            <span>{getRelativeTime(lastFetchTime)}</span>
        </Group>
        </Badge>
      </Group>

      {isLoading
        ? (
        <Center style={{ height: 300 }}><Loader /></Center>
          )
        : (
        <Tabs defaultValue="all" color="blue">
          <Tabs.List>
            <Tabs.Tab value="all" icon={<IconHeart size="0.8rem" />}>All ({favoriteItems.length})</Tabs.Tab>
            <Tabs.Tab value="items" icon={<IconListDetails size="0.8rem" />}>Single Items ({favoriteAllItems.length})</Tabs.Tab>
            <Tabs.Tab value="combinations" icon={<IconBoxMultiple size="0.8rem" />}>Combinations ({favoriteCombinations.length})</Tabs.Tab>
            <Tabs.Tab value="saplings" icon={<IconPlant2 size="0.8rem" />}>Saplings ({favoriteSaplings.length})</Tabs.Tab>
            <Tabs.Tab value="herbs" icon={<IconWash size="0.8rem" />}>Herb Cleaning ({favoriteHerbs.length})</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="all" pt="xs">
            {favoriteAllItems.length > 0 && <AllItemsTable data={favoriteAllItems} favoriteItems={new Set(favoriteAllItems.map(i => i.id))} onToggleFavorite={(itemId) => toggleFavorite(itemId, 'item')} showFavoriteColumn />}
            {favoriteCombinations.length > 0 && <ItemSetsTable data={favoriteCombinations} favoriteItems={new Set(favoriteCombinations.map(i => i.id))} onToggleFavorite={(itemId) => toggleFavorite(itemId, 'combination')} />}
            {favoriteSaplings.length > 0 && <ItemSetsTable data={favoriteSaplings} favoriteItems={new Set(favoriteSaplings.map(i => i.id))} onToggleFavorite={(itemId) => toggleFavorite(itemId, 'sapling')} />}
            {favoriteHerbs.length > 0 && <ItemSetsTable data={favoriteHerbs} favoriteItems={new Set(favoriteHerbs.map(i => i.id))} onToggleFavorite={(itemId) => toggleFavorite(itemId, 'herb')} />}
            {favoriteItems.length === 0 && <Center style={{ height: 200 }}><Text color="dimmed">You haven't favorited anything yet.</Text></Center>}
          </Tabs.Panel>

          <Tabs.Panel value="items" pt="xs">
            <AllItemsTable data={favoriteAllItems} favoriteItems={new Set(favoriteAllItems.map(i => i.id))} onToggleFavorite={(itemId) => toggleFavorite(itemId, 'item')} showFavoriteColumn />
          </Tabs.Panel>

          <Tabs.Panel value="combinations" pt="xs">
            <ItemSetsTable data={favoriteCombinations} favoriteItems={new Set(favoriteCombinations.map(i => i.id))} onToggleFavorite={(itemId) => toggleFavorite(itemId, 'combination')} />
        </Tabs.Panel>

          <Tabs.Panel value="saplings" pt="xs">
            <ItemSetsTable data={favoriteSaplings} favoriteItems={new Set(favoriteSaplings.map(i => i.id))} onToggleFavorite={(itemId) => toggleFavorite(itemId, 'sapling')} />
        </Tabs.Panel>

          <Tabs.Panel value="herbs" pt="xs">
            <ItemSetsTable data={favoriteHerbs} favoriteItems={new Set(favoriteHerbs.map(i => i.id))} onToggleFavorite={(itemId) => toggleFavorite(itemId, 'herb')} />
        </Tabs.Panel>
      </Tabs>
          )}
    </Box>
  )
}
