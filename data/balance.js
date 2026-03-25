// =====================================
// BALANCE CONFIG – SNUS CLICKER
// Zentrale Werte für Economy, Progression & Skalierung
// =====================================

export const BUILDING_BALANCE = [
    { id: "cursor", name: "Cursor", baseCost: 10, baseCps: 0.11, growth: 1.145, icon: "assets/buildings/cursor.png", side: "left" },
    { id: "farm", name: "Snus Farm", baseCost: 85, baseCps: 0.95, growth: 1.152, icon: "assets/buildings/farm.png", side: "right" },
    { id: "factory", name: "Snus Factory", baseCost: 950, baseCps: 8.2, growth: 1.158, icon: "assets/buildings/factory.png", side: "left" },
    { id: "temple", name: "Snus Temple", baseCost: 10_800, baseCps: 72, growth: 1.163, icon: "assets/buildings/temple.png", side: "right" },
    { id: "lab", name: "Snus Lab", baseCost: 120_000, baseCps: 620, growth: 1.168, icon: "assets/buildings/factory.png", side: "left" },
    { id: "exchange", name: "Snus Exchange", baseCost: 1_450_000, baseCps: 4_900, growth: 1.172, icon: "assets/buildings/temple.png", side: "right" },
    { id: "orbital", name: "Orbital Refinery", baseCost: 17_500_000, baseCps: 37_000, growth: 1.176, icon: "assets/buildings/temple.png", side: "left" }
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
    clickBurstMultiplier: 2.9,
    discountBurstRatio: 0.18,

    earlyRampMaxClicks: 220,
    earlyRampMaxMultiplier: 1.8,

    comboBonusPerLevel: 0.013,
    comboBonusCap: 0.62,
    comboCritPerLevel: 0.0014,
    comboCritCap: 0.13,

    lateGameClickBaseShare: 0.008,
    lateGameClickBuildingSharePerBuilding: 0.00008,
    lateGameClickBuildingShareCap: 0.018,
    lateGameClickPrestigeSharePerLevel: 0.00032,
    lateGameClickPrestigeShareCap: 0.012,
    lateGameClickShareCap: 0.03,

    legacyRelevanceMaxBonus: 0.55,
    legacyRelevancePrestigeWeight: 0.015,
    legacyRelevanceTotalBuildingsWeight: 0.0015,

    minBuildingDiscountMultiplier: 0.48
};

export const PRESTIGE_UPGRADE_BALANCE = {
    clickMastery: { baseCost: 6, growth: 2.05, maxLevel: 12 },
    snusAlchemy: { baseCost: 9, growth: 2.22, maxLevel: 12 },
    automationCore: { baseCost: 17, growth: 2.52, maxLevel: 7 },
    boostOverdrive: { baseCost: 20, growth: 2.45, maxLevel: 10 },
    worldAttunement: { baseCost: 26, growth: 2.5, maxLevel: 10 }
};
