// =====================================
// BUILDINGS CONFIG – SNUS CLICKER
// Skalierend, Icon-ready, erweiterbar
// =====================================

import { BUILDING_BALANCE } from "../data/balance.js";

export const buildings = BUILDING_BALANCE.map((building) => ({ ...building }));


// =====================================
// BUILDING FUNCTIONS
// =====================================

// Kosten berechnen (exponentielle Skalierung)
export function getBuildingCost(building, owned) {
    return Math.floor(building.baseCost * Math.pow(building.growth, owned));
}
function getCostSeed(building, owned) {
    return building.baseCost * Math.pow(building.growth, owned);
}

export function getPurchaseCost(building, owned, quantity) {
    if (!Number.isFinite(quantity) || quantity <= 0) {
        return 0;
    }

    let totalCost = 0;
    let nextCostSeed = getCostSeed(building, owned);

    for (let i = 0; i < quantity; i++) {
        totalCost += Math.floor(nextCostSeed);
        nextCostSeed *= building.growth;
    }

    return totalCost;
}

// Produktion berechnen
export function getBuildingCps(building, owned) {
    return building.baseCps * owned;
}

// MAX Kauf berechnen
export function getMaxAffordable(building, owned, cookies) {
    return getMaxAffordableSummary(building, owned, cookies).count;
}

export function getMaxAffordableSummary(building, owned, cookies) {
    if (!Number.isFinite(cookies) || cookies <= 0) {
        return { count: 0, totalCost: 0 };
    }


    let count = 0;
    let totalCost = 0;
    let nextCostSeed = getCostSeed(building, owned);

    while (true) {
        const cost = Math.floor(nextCostSeed);
        if (totalCost + cost > cookies) break;
        totalCost += cost;
        count++;
        nextCostSeed *= building.growth;
    }


    return { count, totalCost };
}
