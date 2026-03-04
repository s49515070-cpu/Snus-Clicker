// =====================================
// GAME ENGINE – SNUS CLICKER
// Core Logik & Game Loop
// =====================================

import { buildings, getPurchaseCost, getBuildingCps, getMaxAffordableSummary } from "./buildings.js";
import { getWorldById } from "./worlds.js";

export const prestigeUpgrades = [
    {
        id: "clickMastery",
        name: "Click Mastery",
        description: "+25% Klickstärke pro Level",
        baseCost: 5,
        growth: 1.9,
        maxLevel: 10,
        type: "click"
    },
    {
        id: "snusAlchemy",
        name: "Snus Alchemy",
        description: "+5% CPS pro Level",
        baseCost: 8,
        growth: 2.1,
        maxLevel: 10,
        type: "cps"
    }
];

export const milestones = [
    {
        id: "lifetime_10k",
        label: "Rookie Roller",
        description: "Erreiche 10.000 Lifetime-Snus",
        target: 10_000,
        rewardCookies: 1_000,
        progress: (state) => state.lifetimeCookies
    },
    {
        id: "buildings_25",
        label: "Factory Foreman",
        description: "Besitze insgesamt 25 Gebäude",
        target: 25,
        rewardCookies: 5_000,
        progress: (state) => buildings.reduce((sum, building) => sum + Number(state.buildingData[building.id]?.owned || 0), 0)
    },
    {
        id: "lifetime_1m",
        label: "Snus Tycoon",
        description: "Erreiche 1.000.000 Lifetime Snus",
        target: 1_000_000,
        rewardCookies: 100_000,
        rewardPrestigeCookies: 1,
        progress: (state) => state.lifetimeCookies
    }
];

// ===============================
// GAME STATE
// ===============================

export const gameState = {
    cookies: 0,
    lifetimeCookies: 0,
    prestigeCookies: 0,
    currentWorld: 1,
    buyMode: 1,
    buildingData: {},
    prestigeMultiplier: 1,
    clickPower: 1,
    prestigeUpgradeLevels: {},
    milestonesClaimed: {}
};


function resetBuildingData() {
    buildings.forEach((building) => {
        gameState.buildingData[building.id] = {
            owned: 0
        };
    });
}

function resetPrestigeUpgrades() {
    prestigeUpgrades.forEach((upgrade) => {
        gameState.prestigeUpgradeLevels[upgrade.id] = 0;
    });
}

function resetMilestones() {
    milestones.forEach((milestone) => {
        gameState.milestonesClaimed[milestone.id] = false;
    });
}

export function resetGameState() {
    gameState.cookies = 0;
    gameState.lifetimeCookies = 0;
    gameState.prestigeCookies = 0;
    gameState.currentWorld = 1;
    gameState.buyMode = 1;
    gameState.prestigeMultiplier = 1;
    gameState.clickPower = 1;

    resetBuildingData();
    resetPrestigeUpgrades();
    resetMilestones();
}

resetGameState();

// ===============================
// PRODUCTION BERECHNUNG
// ===============================

function getUpgradeLevel(upgradeId) {
    const value = Number(gameState.prestigeUpgradeLevels[upgradeId] || 0);
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function getCpsUpgradeMultiplier() {
    const level = getUpgradeLevel("snusAlchemy");
    return 1 + level * 0.05;
}

function getClickUpgradeMultiplier() {
    const level = getUpgradeLevel("clickMastery");
    return 1 + level * 0.25;
}

export function getPrestigeEffects() {
    const clickLevel = getUpgradeLevel("clickMastery");
    const cpsLevel = getUpgradeLevel("snusAlchemy");

    return {
        clickLevel,
        cpsLevel,
        clickMultiplier: getClickUpgradeMultiplier(),
        cpsMultiplier: getCpsUpgradeMultiplier(),
        clickBonusPercent: Math.round((getClickUpgradeMultiplier() - 1) * 100),
        cpsBonusPercent: Math.round((getCpsUpgradeMultiplier() - 1) * 100)
    };
}

export function getPrestigeUpgradeCost(upgradeId) {
    const upgrade = prestigeUpgrades.find((item) => item.id === upgradeId);
    if (!upgrade) return Infinity;

    const level = getUpgradeLevel(upgrade.id);
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.growth, level));
}

export function buyPrestigeUpgrade(upgradeId) {
    const upgrade = prestigeUpgrades.find((item) => item.id === upgradeId);
    if (!upgrade) return false;

    const level = getUpgradeLevel(upgrade.id);
    if (level >= upgrade.maxLevel) return false;

    const cost = getPrestigeUpgradeCost(upgrade.id);
    if (gameState.prestigeCookies < cost) return false;

    gameState.prestigeCookies -= cost;
    gameState.prestigeUpgradeLevels[upgrade.id] = level + 1;
    return true;
}

export function calculateCps() {
    let total = 0;

    buildings.forEach((b) => {
        const rawOwned = Number(gameState.buildingData[b.id]?.owned);
        const owned = Number.isFinite(rawOwned) && rawOwned >= 0 ? Math.floor(rawOwned) : 0;
        total += getBuildingCps(b, owned);
    });

    const world = getWorldById(gameState.currentWorld);

    if (world) {
        total *= world.multiplier;
    }
    total *= gameState.prestigeMultiplier;
    total *= getCpsUpgradeMultiplier();

    return total;
}

export function getMilestoneProgress(milestoneId) {
    const milestone = milestones.find((entry) => entry.id === milestoneId);
    if (!milestone) return { current: 0, target: 0, completed: false, claimed: false };

    const current = Number(milestone.progress(gameState)) || 0;
    const target = milestone.target;
    const completed = current >= target;
    const claimed = Boolean(gameState.milestonesClaimed[milestone.id]);

    return {
        current,
        target,
        completed,
        claimed
    };
}

export function claimAvailableMilestones() {
    const claimedNow = [];

    milestones.forEach((milestone) => {
        const status = getMilestoneProgress(milestone.id);
        if (!status.completed || status.claimed) {
            return;
        }

        gameState.milestonesClaimed[milestone.id] = true;
        const rewardCookies = Number(milestone.rewardCookies || 0);
        const rewardPrestigeCookies = Number(milestone.rewardPrestigeCookies || 0);

        if (rewardCookies > 0) {
            gameState.cookies += rewardCookies;
            gameState.lifetimeCookies += rewardCookies;
        }

        if (rewardPrestigeCookies > 0) {
            gameState.prestigeCookies += rewardPrestigeCookies;
        }

        claimedNow.push({
            id: milestone.id,
            label: milestone.label,
            rewardCookies,
            rewardPrestigeCookies
        });
    });

    return claimedNow;
}

// ===============================
// GAME LOOP
// ===============================

let lastUpdate = Date.now();

export function gameLoop() {
    const now = Date.now();
    const delta = (now - lastUpdate) / 1000;
    lastUpdate = now;

    const cps = calculateCps();
    const production = cps * delta;

    gameState.cookies += production;
    gameState.lifetimeCookies += production;

    requestAnimationFrame(gameLoop);
}

// ===============================
// CLICK SYSTEM
// ===============================

export function clickCookie() {
    const world = getWorldById(gameState.currentWorld);
    const worldMultiplier = world ? world.multiplier : 1;

    const amount = gameState.clickPower * getClickUpgradeMultiplier() * worldMultiplier * gameState.prestigeMultiplier;

    gameState.cookies += amount;
    gameState.lifetimeCookies += amount;

    return amount;
}

// ===============================
// BUILDING KAUF
// ===============================

export function buyBuilding(buildingId) {

    const building = buildings.find((b) => b.id === buildingId);
    const data = gameState.buildingData[buildingId];

    if (!building || !data) {
        return false;
    }
    const rawOwned = Number(data.owned);
    const owned = Number.isFinite(rawOwned) && rawOwned >= 0 ? Math.floor(rawOwned) : 0;
    if (data.owned !== owned) {
        data.owned = owned;
    }

    let quantity = gameState.buyMode;
    let totalCost = 0;

    if (quantity === "max") {
        const summary = getMaxAffordableSummary(building, owned, gameState.cookies);
        quantity = summary.count;
        totalCost = summary.totalCost;
    } else {
        totalCost = getPurchaseCost(building, owned, quantity);
    }

    if (gameState.cookies >= totalCost && quantity > 0) {
        gameState.cookies -= totalCost;
        data.owned = owned + quantity;
        return true;
    }

    return false;
}

// ===============================
// BUY MODE SETZEN
// ===============================

export function setBuyMode(mode) {
    gameState.buyMode = mode === "max" ? "max" : Number.isFinite(mode) && mode > 0 ? mode : 1;
}

// ===============================
// WELT WECHSEL
// ===============================

export function changeWorld(worldId) {
    const world = getWorldById(worldId);
    if (!world) return false;

    gameState.currentWorld = worldId;
    return true;
}

// ===============================
// PRESTIGE RESET
// ===============================

export function getPotentialPrestigeGain() {
    return Math.floor(gameState.lifetimeCookies / 1000000);
}

export function prestigeReset() {

    const earned = getPotentialPrestigeGain();


    if (earned <= 0) return 0;

    gameState.prestigeCookies += earned;
    gameState.prestigeMultiplier += earned * 0.1;

    // Reset normale Werte
    gameState.cookies = 0;
    gameState.currentWorld = 1;

    buildings.forEach((building) => {
        gameState.buildingData[building.id].owned = 0;
    });

    return earned;
}
