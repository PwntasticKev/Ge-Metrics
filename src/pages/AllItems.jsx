import TableSort from '../components/Table/TableSort.jsx';
import {allItems, getMappingData, getPricingData} from "../utils/utils.jsx";
import {useQuery} from "react-query";
import {Box, Center, Loader} from '@mantine/core'

//

export default function AllItems() {

    useQuery("mapData", getMappingData);
    const {status: priceStatus} = useQuery("priceData", getPricingData);

    return (
        <>
            {priceStatus === "error" && <p>Error fetching data</p>}
            {
                priceStatus === "loading" &&
                <Center maw={400} h={100} mx="auto">
                    <Loader/>
                </Center>
            }
            {priceStatus === "success" && (
                <Box sx={{py: 4}}>
                    <TableSort data={allItems()}/>
                </Box>
            )}

        </>
    )
}