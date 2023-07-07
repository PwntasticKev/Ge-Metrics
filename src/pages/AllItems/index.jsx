import {useEffect, useState} from 'react'
import AllItemsTable from '../../components/Table/all-items-table.jsx';
import {getMappingData, getPricingData} from '../../api/rs-wiki-api.jsx'
import {useQuery} from "react-query";
import {Box, Center, Loader} from '@mantine/core'
import {allItems} from "../../utils/utils.jsx";


export default function AllItems() {

    const storedData = localStorage.getItem("mappingData");

    const {data: priceData, status: priceStatus} = useQuery("priceData", getPricingData);
    const {data: mapData, status: mapStatus} = useQuery("mapData", getMappingData, {
        initialData: storedData ? JSON.parse(storedData) : undefined,
        onSuccess: (data) => {
            localStorage.setItem("mappingData", JSON.stringify(data));
        },
    });

    const [mapItems, setMapItems] = useState([]);
    const [pricesById, setPricesById] = useState({});
    const [items, setAllItems] = useState([])

    useEffect(() => {
        if (mapStatus === "success") {
            setMapItems(mapData || []);
        }
    }, [mapData, mapStatus]);

    useEffect(() => {
        if (priceStatus === "success" && priceData && priceData.data) {
            setPricesById(priceData.data);
        }
    }, [priceData, priceStatus]);

    useEffect(() => {
        if (mapItems.length && priceStatus === "success" && priceData && priceData.data) {
            setAllItems(allItems(mapItems, pricesById.data));
        }
    }, [pricesById]);


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