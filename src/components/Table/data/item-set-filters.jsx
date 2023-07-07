import React from 'react'
import {getItemSetProfit} from "../../../utils/utils.jsx";

export const itemSets = () => {
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
