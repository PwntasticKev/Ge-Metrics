import {useEffect, useState} from 'react';
import {useQuery} from 'react-query';
import {getDmmPricingData, getMappingData, getPricingData} from '../api/rs-wiki-api.jsx'
import {allItems, getItemSetProfit} from "../utils/utils.jsx";
import {itemRecipes} from "../components/Table/data/item-set-filters.jsx";

const ItemData = () => {
    const storedData = localStorage.getItem('mappingData');
    const gameMode = localStorage.getItem('gameMode')

    const {data: priceData, status: priceStatus} = useQuery({
        queryKey: ['priceData', gameMode],
        queryFn: async () => JSON.parse(gameMode) === 'dmm' ? await getDmmPricingData() : await getPricingData(),
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
    const [itemSets, setItemSets] = useState([]);
    const [deathsCofferItems, setDeathsCofferItems] = useState([]);

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

            const itemSets = itemRecipes.map(recipe => {
                return getItemSetProfit(recipe);
            }).sort((a, b) => a.profit - b.profit);

            setItemSets([...itemSets]);
        }
    }, [priceData, pricesById]);

    useEffect(() => {
        if (items.length > 0) {
            const allItemsByDeathsCoffer = items.reduce((accumulated, item) => {
                const priceById = pricesById?.[item.id] || {};
                const natureRune = pricesById?.[561] || {};
console.log('priceById', priceById, natureRune)
                const profit =
                    priceById.highalch !== undefined && priceById.low !== undefined
                        ? new Intl.NumberFormat().format(
                            Math.floor(Number(priceById.highalch) - Number(priceById.low) - natureRune.low)
                        )
                        : '';
                const low =
                    priceById.low !== undefined
                        ? new Intl.NumberFormat().format(parseInt(priceById.low, 10))
                        : '';

                const newItem = {
                    ...item,
                    ...priceById,
                    profit,
                    low,
                };

                accumulated.push(newItem);
                return accumulated;
            }, []); // Provide an empty array as the initial value for 'accumulated'
            setDeathsCofferItems(allItemsByDeathsCoffer);
        }
    }, [priceData, pricesById, items]);


    // useEffect(() => {
    //     const allItemsByHighAlch = mapItems.reduce((accumulated, item) => {
    //         const priceById = pricesById?.[item.id] || {};
    //         const profit =
    //             priceById.highalch !== undefined && priceById.low !== undefined
    //                 ? new Intl.NumberFormat().format(
    //                     Math.floor(Number(priceById.highalch) - Number(priceById.low))
    //                 )
    //                 : '';
    //         const low =
    //             priceById.low !== undefined
    //                 ? new Intl.NumberFormat().format(parseInt(priceById.low, 10))
    //                 : '';
    //
    //         const newItem = {
    //             ...item,
    //             ...priceById,
    //             profit,
    //             low,
    //         };
    //
    //         accumulated.push(newItem);
    //         return accumulated;
    //     })
    //     setDeathsCofferItems(allItemsByHighAlch)
    // }, [priceData, pricesById]);

    return {
        priceStatus,
        mapStatus,
        items,
        itemSets,
        deathsCofferItems
    };
};

export default ItemData;
