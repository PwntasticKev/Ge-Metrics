import {useEffect, useState} from 'react';
import {useQuery} from 'react-query';
import {getMappingData, getPricingData} from '../api/rs-wiki-api.jsx'
import {allItems, getItemSetProfit} from "../utils/utils.jsx";
import {itemRecipes} from "../components/Table/data/item-set-filters.jsx";

const ItemData = () => {
    const storedData = localStorage.getItem('mappingData');

    const {data: priceData, status: priceStatus} = useQuery({
        queryKey: ['priceData'],
        queryFn: async () => await getPricingData(),
        refetchInterval: 60 * 1000,
    });

    const {data: mapData, status: mapStatus} = useQuery(
        'mapData',
        getMappingData,
        {
            initialData: storedData ? JSON.parse(storedData) : undefined,
            onSuccess: (data) => {
                localStorage.setItem('mappingData', JSON.stringify(data));
            },
        }
    );

    const [mapItems, setMapItems] = useState([]);
    const [pricesById, setPricesById] = useState({});
    const [items, setAllItems] = useState([]);
    const [itemSets, setItemSets] = useState([])

    useEffect(() => {
        if (mapStatus === 'success') {
            setMapItems(mapData || []);
        }
    }, [mapData, mapStatus]);

    useEffect(() => {
        if (priceStatus === 'success' && priceData && priceData.data) {
            setPricesById(priceData.data);
        }
    }, [priceData, priceStatus]);

    useEffect(() => {
        if (
            mapItems.length &&
            priceStatus === 'success' &&
            priceData &&
            priceData.data
        ) {

            setAllItems(allItems(mapItems, pricesById.data));

            itemRecipes.forEach(recipe => {
                const result = getItemSetProfit(recipe)
                // this sends the data down in an array of array sets
                setItemSets(prev => [...result, ...prev])
            })
        }
    }, [pricesById]);

    return {
        priceStatus,
        mapStatus,
        items,
        itemSets
    };
};

export default ItemData;
