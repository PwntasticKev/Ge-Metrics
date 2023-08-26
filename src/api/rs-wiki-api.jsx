import axios from "axios";

export const getPricingData = () => {
    return (async () => {
        try {
            return axios.get(
                'https://prices.runescape.wiki/api/v1/osrs/latest'
            )
        } catch (error) {
            console.error('Error fetching Pricing data:', error);
        }
    })();
};

export const getDmmPricingData = () => {
    return (async () => {
        try {
            return axios.get(
                'prices.runescape.wiki/api/v1/dmm/latest'
            )
        } catch (error) {
            console.error('Error fetching Pricing data for DMM:', error);
        }
    })();
};

export const getMappingData = () => {
    return axios.get(
        'https://prices.runescape.wiki/api/v1/osrs/mapping'
    ).then(res => {
        // Cache items when first grabbing and add images for performance
        return res.data.map(item => ({
            ...item,
            img: `https://oldschool.runescape.wiki/images/c/c1/${item.name.replace(/\s+/g, '_')}.png?${item.id}b`
        }));
    });

}

export const getItemHistoryById = (time, itemId) => {
    return (async () => {
        try {
            return axios.get(
                `https://prices.runescape.wiki/api/v1/osrs/timeseries?timestep=${time}&id=${itemId}`
            )
        } catch (error) {
            console.error('Error fetching item History:', error);
        }
    })();
}
