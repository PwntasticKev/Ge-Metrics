import React from 'react'
import {getItemSetProfit} from "../../../utils/utils.jsx";

export const itemSets = (items) => {
    const abyssalDagger = getItemSetProfit(13271, [13265, 5940]);
    const ancientGodsword = getItemSetProfit(26233, [26370, 11798]);
    const ancestral = getItemSetProfit(21049, [21018, 21021, 21024]);
    const arcaneSpiritShield = getItemSetProfit(12825, [12827, 12831]);
    const armadylGodsword = getItemSetProfit(11802, [11810, 11798]);
    const bandosGodsword = getItemSetProfit(11804, [11812, 11798]);
    const blowpipe = getItemSetProfit(12924, [12922]);
    const dragonfireShield = getItemSetProfit(22003, [11286, 1540]);
    const dragonfireWard = getItemSetProfit(22003, [22006, 1540]);
    const elysianSpiritShield = getItemSetProfit(12817, [12819, 12831]);
    const inquisitor = getItemSetProfit(24488, [24419, 24420, 24421]);
    const justicar = getItemSetProfit(22438, [22326, 22327, 22328]);
    const kodaiWand = getItemSetProfit(21006, [21043, 6914]);
    const lance = getItemSetProfit(22978, [22966, 11889]);
    const maledictionWard = getItemSetProfit(11924, [11931, 11932, 11933]);
    const masoriChapsF = getItemSetProfit(27232, [27232, 27269]);
    const masoriHelmF = getItemSetProfit(27226, [27226, 27269]);
    const masoriPlateF = getItemSetProfit(27229, [27229, 27269]);
    const masoriSetF = getItemSetProfit(27355, [27235, 27238, 27241]);
    const primordialBoots = getItemSetProfit(13239, [13231, 11840]);
    const saturatedHeart = getItemSetProfit(27641, [20724, 27616], null, {id: 27616, qty: 150000});
    const saradominGodsword = getItemSetProfit(11806, [11814, 11798]);
    const serpentineHelm = getItemSetProfit(12929, [12927]);
    const spectralSpiritShield = getItemSetProfit(12821, [12823, 12831]);
    const torvaHelm = getItemSetProfit(26382, [26376, 26394], null, {id: 26394, qty: 1});
    const torvaLegs = getItemSetProfit(26386, [26380, 26394], null, {id: 26394, qty: 2});
    const torvaPlate = getItemSetProfit(26384, [26378, 26394], null, {id: 26394, qty: 2});
    const toxicStaff = getItemSetProfit(12902, [11791, 12932]);
    const venator = getItemSetProfit(27612, [27614], 0, {id: 27614, qty: 5});
    const voidwaker = getItemSetProfit(27690, [27681, 27687, 27684], 500000);
    const zaryteCrossbow = getItemSetProfit(26374, [11785, 26372, 26231], null, {id: 26231, qty: 250});

    const mergedResults = [
        abyssalDagger,
        ancientGodsword,
        ancestral,
        arcaneSpiritShield,
        armadylGodsword,
        bandosGodsword,
        blowpipe,
        dragonfireShield,
        dragonfireWard,
        elysianSpiritShield,
        inquisitor,
        justicar,
        kodaiWand,
        lance,
        maledictionWard,
        masoriHelmF,
        masoriPlateF,
        masoriChapsF,
        masoriSetF,
        primordialBoots,
        saturatedHeart,
        saradominGodsword,
        serpentineHelm,
        spectralSpiritShield,
        torvaHelm,
        torvaPlate,
        torvaLegs,
        toxicStaff,
        venator,
        voidwaker,
        zaryteCrossbow,
    ];

    return mergedResults;
}


export const itemRecipes = [
    {
        name: 'abyssalDagger',
        itemSet: 13271,
        itemsToCreateSet: [13265, 5940]
    },
    {
        name: 'ancientGodsword',
        itemSet: 26233,
        itemsToCreateSet: [26370, 11798]
    },
    {
        name: 'ancestral',
        itemSet: 21049,
        itemsToCreateSet: [21018, 21021, 21024]
    },
    {
        name: 'arcaneSpiritShield',
        itemSet: 12825,
        itemsToCreateSet: [12827, 12831]
    },
    {
        name: 'armadylGodsword',
        itemSet: 11802,
        itemsToCreateSet: [11810, 11798]
    },
    {
        name: 'bandosGodsword',
        itemSet: 11804,
        itemsToCreateSet: [11812, 11798]
    },
    {
        name: 'blowpipe',
        itemSet: 12924,
        itemsToCreateSet: [12922]
    },
    {
        name: 'dragonfireShield',
        itemSet: 22003,
        itemsToCreateSet: [11286, 1540]
    },
    {
        name: 'dragonfireWard',
        itemSet: 22003,
        itemsToCreateSet: [22006, 1540]
    },
    {
        name: 'elysianSpiritShield',
        itemSet: 12817,
        itemsToCreateSet: [12819, 12831]
    },
    {
        name: 'inquisitor',
        itemSet: 24488,
        itemsToCreateSet: [24419, 24420, 24421]
    },
    {
        name: 'justicar',
        itemSet: 22438,
        itemsToCreateSet: [22326, 22327, 22328]
    },
    {
        name: 'kodaiWand',
        itemSet: 21006,
        itemsToCreateSet: [21043, 6914]
    },
    {
        name: 'lance',
        itemSet: 22978,
        itemsToCreateSet: [22966, 11889]
    },
    {
        name: 'maledictionWard',
        itemSet: 11924,
        itemsToCreateSet: [11931, 11932, 11933]
    },
    {
        name: 'masoriChapsF',
        itemSet: 27232,
        itemsToCreateSet: [27232, 27269]
    },
    {
        name: 'masoriHelmF',
        itemSet: 27226,
        itemsToCreateSet: [27226, 27269]
    },
    {
        name: 'masoriPlateF',
        itemSet: 27229,
        itemsToCreateSet: [27229, 27269]
    },
    {
        name: 'masoriSetF',
        itemSet: 27355,
        itemsToCreateSet: [27235, 27238, 27241]
    },
    {
        name: 'primordialBoots',
        itemSet: 13239,
        itemsToCreateSet: [13231, 11840]
    },
    {
        name: 'saturatedHeart',
        itemSet: 27641,
        itemsToCreateSet: [20724, 27616],
        qty: {id: 27616, qty: 150000}
    },
    {
        name: 'saradominGodsword',
        itemSet: 11806,
        itemsToCreateSet: [11814, 11798]
    },
    {
        name: 'serpentineHelm',
        itemSet: 12929,
        itemsToCreateSet: [12927]
    },
    {
        name: 'spectralSpiritShield',
        itemSet: 12821,
        itemsToCreateSet: [12823, 12831]
    },
    {
        name: 'torvaHelm',
        itemSet: 26382,
        itemsToCreateSet: [26376, 26394],
        qty: {id: 26394, qty: 1}
    },
    {
        name: 'torvaLegs',
        itemSet: 26386,
        itemsToCreateSet: [26380, 26394],
        qty: {id: 26394, qty: 2}
    },
    {
        name: 'torvaPlate',
        itemSet: 26384,
        itemsToCreateSet: [26378, 26394],
        qty: {id: 26394, qty: 2}
    },
    {
        name: 'toxicStaff',
        itemSet: 12902,
        itemsToCreateSet: [11791, 12932]
    },
    {
        name: 'venator',
        itemSet: 27612,
        itemsToCreateSet: [27614],
        conversionCost: 0,
        qty: {id: 27614, qty: 5}
    },
    {
        name: 'voidwaker',
        itemSet: 27690,
        itemsToCreateSet: [27681, 27687, 27684],
        conversionCost: 500000
    },
    {
        name: 'zaryteCrossbow',
        itemSet: 26374,
        itemsToCreateSet: [11785, 26372, 26231],
        qty: {id: 26231, qty: 250}
    }
]

