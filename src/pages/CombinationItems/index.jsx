import { Box, Center, Loader } from '@mantine/core'
import ItemSetsTable from '../../components/Table/item-sets-table.jsx'
import ItemData from '../../utils/item-data.jsx'

export default function CombinationItems () {
  const { items, itemSets, mapStatus, priceStatus } = ItemData()
  return (
        <>
            {mapStatus === 'error' || priceStatus === 'error' && <p>Error fetching data</p>}
            {
                mapStatus === 'loading' || priceStatus === 'loading' &&
                <Center maw={400} h={300} mx="auto">
                    <Loader/>
                </Center>
            }
            {priceStatus === 'success' && items.length > 0 && (
                <Box sx={{ py: 4 }}>
                    <ItemSetsTable data={itemSets}/>
                </Box>
            )}

        </>
  )
}
