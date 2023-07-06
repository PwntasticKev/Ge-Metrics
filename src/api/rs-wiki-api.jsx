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


export const getMappingData = () => {
    return axios.get(
        'https://prices.runescape.wiki/api/v1/osrs/mapping'
    ).then(res => {

        // Cache items when first grabbing and add images for performance
        const itemsWithImages = res.data.map(item => ({
            ...item,
            img: `https://oldschool.runescape.wiki/images/c/c1/${item.name.replace(/\s+/g, '_')}.png?${item.id}b`
        }));

        localStorage.setItem('mappingData', JSON.stringify(itemsWithImages));

        return itemsWithImages
    });

}