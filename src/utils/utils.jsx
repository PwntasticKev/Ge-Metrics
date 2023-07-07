function pricingManipulation() {
    const allItems = (mapItems, pricesById) => {
        console.log(mapItems, pricesById, 'mapItems, pricesById')
        return mapItems.reduce((accumulated, item) => {
            const priceById = pricesById?.[item.id] || {};
            const profit =
                priceById.high !== undefined && priceById.low !== undefined
                    ? new Intl.NumberFormat().format(
                        Math.floor(Number(priceById.high) * 0.99 - Number(priceById.low))
                    )
                    : '';
            const low =
                priceById.low !== undefined
                    ? new Intl.NumberFormat().format(parseInt(priceById.low, 10))
                    : '';
            const high =
                priceById.high !== undefined
                    ? new Intl.NumberFormat().format(parseInt(priceById.high, 10))
                    : '';

            const newItem = {
                ...item,
                ...priceById,
                profit,
                low,
                high,
            };

            accumulated.push(newItem);
            return accumulated;
        }, []).sort((a, b) => {
            const has3rdInNameA = a.name.includes('3rd');
            const has3rdInNameB = b.name.includes('3rd');

            if (has3rdInNameA && has3rdInNameB) return 0;
            if (has3rdInNameA) return 1; // Move items with '3rd' in their name to the end
            if (has3rdInNameB) return -1; // Move items with '3rd' in their name to the end

            const profitA = parseInt(a.profit.replace(/,/g, ''), 10) || 0;
            const profitB = parseInt(b.profit.replace(/,/g, ''), 10) || 0;
            return profitB - profitA;
        });
    };


    const getItemsById = itemIds => {
        console.log(allItems, 'allitemsallitemsallitems')
        return itemIds.map(itemId => allItems().find(item => item.id === itemId))
    }


    const getItemSetProfit = (itemSet, itemsToCreateSet, conversionCost = 0, qty = {id: '', qty: 0}) => {
        const totalPrice = totalPriceConverted(
            itemSet,
            itemsToCreateSet,
            conversionCost,
            qty
        );
        const originalItem = allItems.find(item => item.id === itemSet);

        const modifiedItem = getModifiedItem(originalItem, totalPrice);

        return [modifiedItem, ...getItemsById(itemsToCreateSet)];
    };

    const getModifiedItem = (item, totalPrice) => {
        const highPriceWithoutCommas = item?.high
            ? parseInt(item.high.replace(/,/g, ''), 10)
            : 0;
        const formatter = new Intl.NumberFormat();

        if (item) {
            return {
                id: 'SET',
                name: `${item.name} (set)`,
                high: formatter.format(highPriceWithoutCommas),
                profit: formatter.format(
                    Math.floor(highPriceWithoutCommas * 0.99 - totalPrice)
                ),
            };
        }

        return undefined;
    };

    const totalPriceConverted = (itemSet, itemIds, conversionCost, qty = null) => {
        let total = 0;
        console.log(getItemsById([qty.id]), ' getItemsById([qty.id])')
        const qtyItemLow =
            qty && getItemsById([qty.id])
                ? String(getItemsById([qty.id]).low).replace(/,/g, '')
                : '0';

        const qtyItemNoCommas =
            parseInt(qtyItemLow, 10) * (qty && qty.qty ? qty.qty - 1 : 0);

        itemIds.forEach(itemId => {
            const lowPriceNoCommas = String(getItemsById([itemId])?.low).replace(/,/g, '');
            const price = lowPriceNoCommas ? parseInt(lowPriceNoCommas, 10) : 0;

            total += price;
        });

        return total + qtyItemNoCommas + conversionCost;
    }

    export default {
        allItems, getItemsById, getModifiedItem, getItemSetProfit, totalPriceConverted
    }
}