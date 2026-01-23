import React, { useState } from 'react'
import {
  Box,
  Tabs,
  Loader,
  Center,
  Text,
  Group,
  Badge,
  Card
} from '@mantine/core'
import {
  IconHeart,
  IconListDetails,
  IconBoxMultiple,
  IconPlant2,
  IconWash,
  IconClock,
  IconTrash
} from '@tabler/icons-react'
import AllItemsTable from '../../components/Table/all-items-table'
import ItemSetsTable from '../../components/Table/item-sets-table'
import ItemData from '../../utils/item-data'
import { trpc } from '../../utils/trpc.jsx'
import { useFavorites } from '../../hooks/useFavorites.js'
import { useTrashScoring } from '../../hooks/useTrashScoring.js'
import { getRelativeTime } from '../../utils/utils'
import GraphModal from '../../shared/modals/graph-modal.jsx'
import PremiumPageWrapper from '../../components/PremiumPageWrapper'

export default function Favorites () {
  const { items, itemSets, mapStatus, priceStatus } = ItemData()
  const { favoriteItems, toggleFavorite, isLoadingFavorites } = useFavorites()
  const { userTrashItems, toggleTrashVote } = useTrashScoring()
  const [lastFetchTime, setLastFetchTime] = useState(new Date())
  const [graphInfo, setGraphInfo] = useState({
    itemId: null,
    isSet: false,
    isOpen: false
  })

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

  // Filter trash items to match with actual items data
  const trashItemsWithData = userTrashItems.map(trashItem => {
    const itemData = items.find(item => item.id === trashItem.itemId)
    return itemData ? { ...itemData, trashVoteDate: trashItem.createdAt } : null
  }).filter(Boolean)

  const isLoading = mapStatus === 'loading' || priceStatus === 'loading' || isLoadingFavorites

  return (
    <PremiumPageWrapper>
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
              {trashItemsWithData.length > 0 && (
                <Tabs.Tab value="trash" icon={<IconTrash size="0.8rem" />}>Trashed Items ({trashItemsWithData.length})</Tabs.Tab>
              )}
            </Tabs.List>

            <Tabs.Panel value="all" pt="xs">
              {favoriteAllItems.length > 0 && <AllItemsTable data={favoriteAllItems} favoriteItems={new Set(favoriteAllItems.map(i => i.id))} onToggleFavorite={(itemId) => toggleFavorite(itemId, 'item')} showFavoriteColumn setGraphInfo={setGraphInfo} />}
              {favoriteCombinations.length > 0 && <ItemSetsTable data={favoriteCombinations} favoriteItems={new Set(favoriteCombinations.map(i => i.id))} onToggleFavorite={(itemId) => toggleFavorite(itemId, 'combination')} setGraphInfo={setGraphInfo} />}
              {favoriteSaplings.length > 0 && <ItemSetsTable data={favoriteSaplings} favoriteItems={new Set(favoriteSaplings.map(i => i.id))} onToggleFavorite={(itemId) => toggleFavorite(itemId, 'sapling')} setGraphInfo={setGraphInfo} />}
              {favoriteHerbs.length > 0 && <ItemSetsTable data={favoriteHerbs} favoriteItems={new Set(favoriteHerbs.map(i => i.id))} onToggleFavorite={(itemId) => toggleFavorite(itemId, 'herb')} setGraphInfo={setGraphInfo} />}
              {favoriteItems.length === 0 && <Center style={{ height: 200 }}><Text color="dimmed">You haven't favorited anything yet.</Text></Center>}
            </Tabs.Panel>

            <Tabs.Panel value="items" pt="xs">
              {favoriteAllItems.length > 0 ? (
                <AllItemsTable data={favoriteAllItems} favoriteItems={new Set(favoriteAllItems.map(i => i.id))} onToggleFavorite={(itemId) => toggleFavorite(itemId, 'item')} showFavoriteColumn setGraphInfo={setGraphInfo} />
              ) : (
                <Center style={{ height: 200 }}><Text color="dimmed">No favorite items yet.</Text></Center>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="combinations" pt="xs">
              {favoriteCombinations.length > 0 ? (
                <ItemSetsTable data={favoriteCombinations} favoriteItems={new Set(favoriteCombinations.map(i => i.id))} onToggleFavorite={(itemId) => toggleFavorite(itemId, 'combination')} setGraphInfo={setGraphInfo} />
              ) : (
                <Center style={{ height: 200 }}><Text color="dimmed">No favorite combinations yet.</Text></Center>
              )}
          </Tabs.Panel>

            <Tabs.Panel value="saplings" pt="xs">
              {favoriteSaplings.length > 0 ? (
                <ItemSetsTable data={favoriteSaplings} favoriteItems={new Set(favoriteSaplings.map(i => i.id))} onToggleFavorite={(itemId) => toggleFavorite(itemId, 'sapling')} setGraphInfo={setGraphInfo} />
              ) : (
                <Center style={{ height: 200 }}><Text color="dimmed">No favorite saplings yet.</Text></Center>
              )}
          </Tabs.Panel>

            <Tabs.Panel value="herbs" pt="xs">
              {favoriteHerbs.length > 0 ? (
                <ItemSetsTable data={favoriteHerbs} favoriteItems={new Set(favoriteHerbs.map(i => i.id))} onToggleFavorite={(itemId) => toggleFavorite(itemId, 'herb')} setGraphInfo={setGraphInfo} />
              ) : (
                <Center style={{ height: 200 }}><Text color="dimmed">No favorite herbs yet.</Text></Center>
              )}
          </Tabs.Panel>

          <Tabs.Panel value="trash" pt="xs">
            {trashItemsWithData.length > 0 ? (
              <Card withBorder radius="md" p="md" mb="md">
                <Text size="sm" color="orange" mb="md">
                  Items you've marked as unreliable or problematic. Click the trash icon to unmark.
                </Text>
                <AllItemsTable 
                  data={trashItemsWithData} 
                  favoriteItems={new Set()} 
                  onToggleFavorite={null}
                  showFavoriteColumn={false}
                  setGraphInfo={setGraphInfo}
                  onToggleTrash={toggleTrashVote}
                  showTrashColumn={true}
                />
              </Card>
            ) : (
              <Center style={{ height: 200 }}>
                <Text color="dimmed">No items marked as trash yet.</Text>
              </Center>
            )}
          </Tabs.Panel>
        </Tabs>
            )}
        <GraphModal
          opened={graphInfo.isOpen}
          setOpened={(isOpen) => setGraphInfo({ ...graphInfo, isOpen })}
          id={graphInfo.itemId}
          items={graphInfo.isSet ? itemSets : items}
        />
      </Box>
    </PremiumPageWrapper>
  )
}
