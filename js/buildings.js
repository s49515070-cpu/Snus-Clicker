// =====================================
// BUILDINGS CONFIG – SNUS CLICKER
// Skalierend, Icon-ready, erweiterbar
// =====================================

export const buildings = [
    {
        id: "cursor",
        name: "Cursor",
        baseCost: 12,
        baseCps: 0.1,
        growth: 1.14,
        icon: "assets/buildings/cursor.png",
        side: "left"
    },
    {
        id: "farm",
        name: "Snus Farm",
        baseCost: 90,
        baseCps: 1,
        growth: 1.14,
        icon: "assets/buildings/farm.png",
        side: "right"
    },
    {
        id: "factory",
        name: "Snus Factory",
        baseCost: 950,
        baseCps: 8,
        growth: 1.14,
        icon: "assets/buildings/factory.png",
        side: "left"
    },
    {
        id: "temple",
        name: "Snus Temple",
        baseCost: 9000,
        baseCps: 47,
        growth: 1.14,
        icon: "assets/buildings/temple.png",
        side: "right"
            },
    {
        id: "lab",
        name: "Snus Lab",
        baseCost: 65000,
        baseCps: 220,
        growth: 1.145,
        icon: "assets/buildings/factory.png",
        side: "left"
    },
    {
        id: "exchange",
        name: "Snus Exchange",
        baseCost: 380000,
        baseCps: 1200,
        growth: 1.148,
        icon: "assets/buildings/temple.png",
        side: "right"
    },
    {
        id: "orbital",
        name: "Orbital Refinery",
        baseCost: 2500000,
        baseCps: 6800,
        growth: 1.152,
        icon: "assets/buildings/temple.png",
        side: "left"
    }
    
];


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
