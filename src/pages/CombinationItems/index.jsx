import {useEffect, useState} from 'react'
import {getMappingData, getPricingData} from '../../api/rs-wiki-api.jsx'
import {useQuery} from "react-query";
import {Box, Center, Loader} from '@mantine/core'
import {itemSets} from '../../components/Table/data/item-set-filters.jsx'


export default function CombinationItems() {

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
//get the data of everything then for each item in itemSets i need to pass in the functino
            // need to getItemSetProfit and pass in new table data. use the filters created that will build the data

            // I have pricing data and the mapped items
            const allItemSets = itemSets()
            // get the item sets I need from the filters, then run through getItemSetProfit passing the data
            // const pieces = currentPageData
            setAllItems(allItemSets);
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
                    {/*<CombinationItemsTable data={items}/>*/}
                </Box>
            )}

        </>
    )
}