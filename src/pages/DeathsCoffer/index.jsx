import {Box, Center, Loader} from '@mantine/core'
import DeathsCofferTable from "../../components/Table/deaths-coffer-table.jsx";
import ItemData from "../../utils/item-data.jsx";


export default function DeathsCoffer() {
    const {deathsCofferItems, mapStatus, priceStatus} = ItemData();

    return (
        <>
            {mapStatus === "error" || priceStatus === "error" && <p>Error fetching data</p>}
            {
                mapStatus === "loading" || priceStatus === "loading" &&
                <Center maw={400} h={300} mx="auto">
                    <Loader/>
                </Center>
            }
            {priceStatus === "success" && deathsCofferItems.length > 0 && (
                <Box sx={{py: 4}}>
                    <DeathsCofferTable data={deathsCofferItems}/>
                </Box>
            )}

        </>
    )
}