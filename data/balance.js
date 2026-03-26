// =====================================
// BALANCE CONFIG – SNUS CLICKER
// Zentrale Werte für Economy, Progression & Skalierung
// =====================================

export const BUILDING_BALANCE = [
    { id: "cursor", name: "Cursor", baseCost: 10, baseCps: 0.095, growth: 1.155, icon: "assets/buildings/cursor.png", side: "left" },
    { id: "farm", name: "Snus Farm", baseCost: 90, baseCps: 0.9, growth: 1.185, icon: "assets/buildings/farm.png", side: "right" },
    { id: "factory", name: "Snus Factory", baseCost: 1_050, baseCps: 6.7, growth: 1.176, icon: "assets/buildings/factory.png", side: "left" },
    { id: "temple", name: "Snus Temple", baseCost: 13_500, baseCps: 57, growth: 1.186, icon: "assets/buildings/temple.png", side: "right" },
    { id: "lab", name: "Snus Lab", baseCost: 165_000, baseCps: 480, growth: 1.196, icon: "assets/buildings/factory.png", side: "left" },
    { id: "exchange", name: "Snus Exchange", baseCost: 2_150_000, baseCps: 3_550, growth: 1.206, icon: "assets/buildings/temple.png", side: "right" },
    { id: "orbital", name: "Orbital Refinery", baseCost: 30_000_000, baseCps: 25_500, growth: 1.216, icon: "assets/buildings/temple.png", side: "left" }
];

export const BUILDING_SYNERGY_BALANCE = [
    { sourceId: "farm", targetId: "cursor", bonusPerSource: 0.0035, maxBonus: 0.32 },
    { sourceId: "factory", targetId: "farm", bonusPerSource: 0.0032, maxBonus: 0.35 },
    { sourceId: "temple", targetId: "factory", bonusPerSource: 0.0029, maxBonus: 0.34 },
    { sourceId: "lab", targetId: "temple", bonusPerSource: 0.0025, maxBonus: 0.32 },
    { sourceId: "exchange", targetId: "lab", bonusPerSource: 0.0022, maxBonus: 0.3 },
    { sourceId: "orbital", targetId: "exchange", bonusPerSource: 0.0019, maxBonus: 0.26 }
];

export const WORLD_BALANCE = [
    {
        id: 1,
        name: "Golden Paradise",
        unlockCost: 0,
        multiplier: 1,
        cookieImage: "assets/cookies/world1.png",
        modifiers: { clickBonus: 0, cpsBonus: 0, buildingDiscount: 0 }
    },
    {
        id: 2,
        name: "Rainbow Heaven",
        unlockCost: 18_000,
        requirements: { lifetimeCookies: 140_000, totalBuildings: 35, prestigeCookies: 2 },
        multiplier: 1.06,
        cookieImage: "assets/cookies/world2.png",
        modifiers: { clickBonus: 0.06, cpsBonus: 0.01, buildingDiscount: 0.015 }
    },
    {
        id: 3,
        name: "Divine Realm",
        unlockCost: 350_000,
        requirements: { lifetimeCookies: 3_500_000, totalBuildings: 95, prestigeCookies: 6 },
        multiplier: 1.15,
        cookieImage: "assets/cookies/world3.png",
        modifiers: { clickBonus: 0.02, cpsBonus: 0.07, buildingDiscount: 0.012 }
    },
    {
        id: 4,
        name: "Cyber Bazaar",
        unlockCost: 4_800_000,
        requirements: { lifetimeCookies: 35_000_000, totalBuildings: 210, prestigeCookies: 14 },
        multiplier: 1.27,
        cookieImage: "assets/cookies/world2.png",
        modifiers: { clickBonus: 0.08, cpsBonus: 0.08, buildingDiscount: 0.03 }
    },
    {
        id: 5,
        name: "Astral Forge",
        unlockCost: 68_000_000,
        requirements: { lifetimeCookies: 520_000_000, totalBuildings: 520, prestigeCookies: 30 },
        multiplier: 1.42,
        cookieImage: "assets/cookies/world3.png",
        modifiers: { clickBonus: 0.05, cpsBonus: 0.11, buildingDiscount: 0.04 }
    }
];

export const ECONOMY_BALANCE = {
    prestigeThreshold: 3_500_000,
    prestigeStepCost: 1_200_000,
    prestigeCostGrowth: 1.175,
    prestigeLevelMultiplierLogFactor: 0.125,

    activeBoostMultiplier: 2.35,
    clickBurstMultiplier: 2.75,
    discountBurstRatio: 0.16,

    earlyRampMaxClicks: 260,
    earlyRampMaxMultiplier: 2.35,
    globalCpsMultiplier: 1.5,
    globalClickMultiplier: 1.95,

    comboBonusPerLevel: 0.015,
    comboBonusCap: 1,
    comboCritPerLevel: 0.0014,
    comboCritCap: 0.13,

    lateGameClickBaseShare: 0.014,
    lateGameClickBuildingSharePerBuilding: 0.00009,
    lateGameClickBuildingShareCap: 0.018,
    lateGameClickPrestigeSharePerLevel: 0.00035,
    lateGameClickPrestigeShareCap: 0.013,
    lateGameClickShareCap: 0.05,

    legacyRelevanceMaxBonus: 0.45,
    legacyRelevancePrestigeWeight: 0.012,
    legacyRelevanceTotalBuildingsWeight: 0.00125,

    buildingSoftcapStart: 35,
    buildingSoftcapStrength: 0.0065,
    buildingSoftcapMinMultiplier: 0.38,

    minBuildingDiscountMultiplier: 0.48
};

export const PRESTIGE_UPGRADE_BALANCE = {
    clickMastery: { baseCost: 6, growth: 2.05, maxLevel: 12 },
    snusAlchemy: { baseCost: 9, growth: 2.22, maxLevel: 12 },
    automationCore: { baseCost: 17, growth: 2.52, maxLevel: 7 },
    boostOverdrive: { baseCost: 20, growth: 2.45, maxLevel: 10 },
    worldAttunement: { baseCost: 26, growth: 2.5, maxLevel: 10 }
};
