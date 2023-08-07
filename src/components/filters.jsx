export default {
    filteredItems(filter, search, getItemSetProfit) {
        const itemSetData = [
            {filter: 'Venator', params: [27612, [27614], 0, {id: 27614, qty: 5}]},
            {filter: 'Justicar', params: [22438, [22326, 22327, 22328]]},
            {filter: 'Voidwaker', params: [27690, [27681, 27687, 27684], 500000]},
            {filter: 'Lance', params: [22978, [22966, 11889]]},
            {filter: 'Kodai Wand', params: [21006, [21043, 6914]]},
            {filter: 'Inquisitor', params: [24488, [24419, 24420, 24421]]},
            {filter: 'Ancestral', params: [21049, [21018, 21021, 21024]]},
            {filter: 'Dragonfire Ward', params: [22003, [22006, 1540]]},
            {filter: 'Dragonfire shield', params: [11284, [11286, 1540]]},
            {filter: 'Abyssal Dagger', params: [13271, [13265, 5940]]},
            {filter: 'Toxic Staff', params: [12902, [11791, 12932]]},
            {filter: 'Serpentine Helm', params: [12929, [12927]]},
            {filter: 'Blowpipe', params: [12924, [12922]]},
            {filter: 'Saturated Heart', params: [27641, [20724, 27616], null, {id: 27616, qty: 150000}]},
            {filter: 'Zaryte Crossbow', params: [26374, [11785, 26372, 26231], null, {id: 26231, qty: 250}]},
            {filter: 'Ursine Chainmace', params: [27657, [22542, 27667]]},
            {filter: 'Webweaver Bow', params: [27652, [22547, 27670]]},
            {filter: 'Elysian spirit shield', params: [12817, [12819, 12831]]},
            {filter: 'Arcane spirit shield', params: [12825, [12827, 12831]]},
            {filter: 'Spectral spirit shield', params: [12821, [12823, 12831]]},
            {filter: 'Ancient godsword', params: [26233, [26370, 11798]]},
            {filter: 'Bandos godsword', params: [11804, [11812, 11798]]},
            {filter: 'Armadyl godsword', params: [11802, [11810, 11798]]},
            {filter: 'Saradomin godsword', params: [11806, [11814, 11798]]},
            {filter: 'Zamorak godsword', params: [11808, [11816, 11798]]},
            {filter: 'Primordial boots', params: [13239, [13231, 11840]]},
            {filter: 'Masori Set (f)', params: [27355, [27235, 27238, 27241]]},
            {filter: 'Gilded SK (set)', params: [13038, [3486, 3481, 3485, 3488]]},
            {filter: 'Gilded LG (set)', params: [13036, [3486, 3481, 3483, 3488]]},
            {filter: 'Obsidian (set)', params: [21279, [21298, 21301, 21304]]},
            {filter: 'Super Potion Set', params: [13066, [2440, 2436, 2442]]},
            {filter: 'Cannon', params: [12863, [10, 8, 6, 12]]},
            {filter: 'Party Hat', params: [13173, [1044, 1042, 1038, 1046, 1048, 1040]]},
            {filter: 'Dagon Hai', params: [24333, [24288, 24291, 24294]]},
            {filter: 'Torva Helm', params: [26382, [26376, 26394], null, {id: 26394, qty: 1}]},
            {filter: 'Torva Plate', params: [26384, [26378, 26394], null, {id: 26394, qty: 2}]},
            {filter: 'Torva Legs', params: [26386, [26380, 26394], null, {id: 26394, qty: 2}]},
            {filter: 'Partyhat and Specs', params: [12399, [1042, 12399], 500]},
            {filter: 'Pirate Hat', params: [8928, [2651, 19724], 500]},
            12337
        ];

        const filteredData = itemSetData.find(data => data.filter === filter);

        if (filteredData) {
            const params = filteredData.params;
            return getItemSetProfit(...params);
        } else {
            return [];
        }
    },
};