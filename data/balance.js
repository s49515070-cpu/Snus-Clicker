// =====================================
// BALANCE CONFIG – SNUS CLICKER
// Zentrale Werte für Economy, Progression & Skalierung
// =====================================

export const BUILDING_BALANCE = [
    { id: "cursor", name: "Cursor", baseCost: 8, baseCps: 0.14, growth: 1.148, icon: "assets/buildings/cursor.png", side: "left" },
    { id: "farm", name: "Snus Farm", baseCost: 72, baseCps: 1.35, growth: 1.175, icon: "assets/buildings/farm.png", side: "right" },
    { id: "factory", name: "Snus Factory", baseCost: 860, baseCps: 10.4, growth: 1.17, icon: "assets/buildings/factory.png", side: "left" },
    { id: "temple", name: "Snus Temple", baseCost: 10_900, baseCps: 88, growth: 1.178, icon: "assets/buildings/temple.png", side: "right" },
    { id: "lab", name: "Snus Lab", baseCost: 132_000, baseCps: 760, growth: 1.188, icon: "assets/buildings/factory.png", side: "left" },
    { id: "exchange", name: "Snus Exchange", baseCost: 1_720_000, baseCps: 5_900, growth: 1.198, icon: "assets/buildings/temple.png", side: "right" },
    { id: "orbital", name: "Orbital Refinery", baseCost: 22_000_000, baseCps: 44_500, growth: 1.208, icon: "assets/buildings/temple.png", side: "left" }
];

export const BUILDING_SYNERGY_BALANCE = [
    { sourceId: "farm", targetId: "cursor", bonusPerSource: 0.0046, maxBonus: 0.46 },
    { sourceId: "factory", targetId: "farm", bonusPerSource: 0.0042, maxBonus: 0.48 },
    { sourceId: "temple", targetId: "factory", bonusPerSource: 0.0038, maxBonus: 0.5 },
    { sourceId: "lab", targetId: "temple", bonusPerSource: 0.0034, maxBonus: 0.5 },
    { sourceId: "exchange", targetId: "lab", bonusPerSource: 0.003, maxBonus: 0.52 },
    { sourceId: "orbital", targetId: "exchange", bonusPerSource: 0.0027, maxBonus: 0.55 }
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

    activeBoostMultiplier: 2.6,
    clickBurstMultiplier: 3.1,
    discountBurstRatio: 0.16,

    earlyRampMaxClicks: 420,
    earlyRampMaxMultiplier: 2.6,
    globalCpsMultiplier: 1.85,
    globalClickMultiplier: 2.45,

    clickMasteryLinearStep: 0.1,
    clickMasteryScaleStep: 0.018,
    clickMasteryScaleExponent: 1.35,
    snusAlchemyLinearStep: 0.05,
    snusAlchemyScaleStep: 0.01,
    snusAlchemyScaleExponent: 1.28,

    cpsMilestoneEveryOwned: 25,
    cpsMilestoneStep: 0.03,
    cpsMilestoneCap: 1.2,

    comboBonusPerLevel: 0.015,
    comboBonusCap: 1,
    comboCritPerLevel: 0.0014,
    comboCritCap: 0.13,

    lateGameClickBaseShare: 0.02,
    lateGameClickBuildingSharePerBuilding: 0.00013,
    lateGameClickBuildingShareCap: 0.03,
    lateGameClickPrestigeSharePerLevel: 0.0005,
    lateGameClickPrestigeShareCap: 0.02,
    lateGameClickShareCap: 0.08,

    legacyRelevanceMaxBonus: 0.58,
    legacyRelevancePrestigeWeight: 0.015,
    legacyRelevanceTotalBuildingsWeight: 0.0015,

    buildingSoftcapStart: 60,
    buildingSoftcapStrength: 0.005,
    buildingSoftcapMinMultiplier: 0.6,

    minBuildingDiscountMultiplier: 0.48
};

export const PRESTIGE_UPGRADE_BALANCE = {
    clickMastery: { baseCost: 6, growth: 2.05, maxLevel: 12 },
    snusAlchemy: { baseCost: 9, growth: 2.22, maxLevel: 12 },
    automationCore: { baseCost: 17, growth: 2.52, maxLevel: 7 },
    boostOverdrive: { baseCost: 20, growth: 2.45, maxLevel: 10 },
    worldAttunement: { baseCost: 26, growth: 2.5, maxLevel: 10 }
};
