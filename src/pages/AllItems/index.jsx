import AllItemsTable from '../../components/Table/all-items-table.jsx';
import {Box, Center, Loader} from '@mantine/core'
import ItemData from '../../utils/item-data.jsx'


export default function AllItems() {
    const {items, mapStatus, priceStatus} = ItemData();


    return (
        <>
            {mapStatus === "error" || priceStatus === "error" && <p>Error fetching data</p>}
            {
                mapStatus === "loading" || priceStatus === "loading" &&
                <Center maw={400} h={300} mx="auto">
                    <Loader/>
                </Center>
            }
            {priceStatus === "success" && items.length > 0 && (
                <Box sx={{py: 4}}>
                    <AllItemsTable data={items}/>
                </Box>
            )}

        </>
    )
}