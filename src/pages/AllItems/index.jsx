import AllItemsTable from '../../components/Table/all-items-table.jsx';
import {allItems, getMappingData, getPricingData} from "../../utils/utils.jsx";
import {useQuery} from "react-query";
import {Box, Center, Loader} from '@mantine/core'

//

export default function AllItems() {

    const {status: mapStatus} = useQuery("mapData", getMappingData);
    const {status: priceStatus} = useQuery("priceData", getPricingData);

    return (
        <>
            {mapStatus === "error" || priceStatus === "error" && <p>Error fetching data</p>}
            {
                mapStatus === "loading" || priceStatus === "loading" &&
                <Center maw={400} h={100} mx="auto">
                    <Loader/>
                </Center>
            }
            {priceStatus === "success" && (
                <Box sx={{py: 4}}>
                    <AllItemsTable data={allItems()}/>
                </Box>
            )}

        </>
    )
}