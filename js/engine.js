// =====================================
// GAME ENGINE – SNUS CLICKER
// Core Logik & Game Loop
// =====================================

import { buildings, getPurchaseCost, getBuildingCps, getMaxAffordableSummary } from "./buildings.js";
import { getWorldById, worlds } from "./worlds.js";

const PRESTIGE_THRESHOLD = 1_000_000;
const ACTIVE_BOOST_DURATION_MS = 30_000;
const ACTIVE_BOOST_COOLDOWN_MS = 30_000;
const ACTIVE_BOOST_MULTIPLIER = 3;

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

export const quests = [
    {
        id: "daily_clicks_200",
        label: "Daily: 200 Klicks",
        description: "Klicke heute 200x",
        target: 200,
        rewardCookies: 2_500,
        progress: (state) => state.todayStats.clicks,
        isDaily: true
    },
    {
        id: "long_clicks_5000",
        label: "Long Run: 5.000 Klicks",
        description: "Klicke insgesamt 5.000x",
        target: 5_000,
        rewardCookies: 10_000,
        rewardPrestigeCookies: 1,
        progress: (state) => state.totalClicks,
        isDaily: false
    }
];

export const gameState = {
    cookies: 0,
    lifetimeCookies: 0,
    lifetimeCookiesAtLastPrestige: 0,
    prestigeCookies: 0,
    currentWorld: 1,
    unlockedWorldIds: [1],
    buyMode: 1,
    buildingData: {},
    prestigeMultiplier: 1,
    clickPower: 1,
    prestigeUpgradeLevels: {},
    milestonesClaimed: {},
    questsClaimed: {},
    activeBoostUntil: 0,
    activeBoostCooldownUntil: 0,
    totalClicks: 0,
    autoBuyerUnlocked: false,
    autoBuyerEnabled: false,
    todayStats: {
        clicks: 0,
        earned: 0,
        resetDayKey: ""
    }
};

function getTodayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function ensureDailyStats() {
    const key = getTodayKey();
    if (gameState.todayStats.resetDayKey !== key) {
        gameState.todayStats.resetDayKey = key;
        gameState.todayStats.clicks = 0;
        gameState.todayStats.earned = 0;

        quests
            .filter((quest) => quest.isDaily)
            .forEach((quest) => {
                gameState.questsClaimed[quest.id] = false;
            });
    }
}

function addCookies(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    gameState.cookies += amount;
    gameState.lifetimeCookies += amount;
    ensureDailyStats();
    gameState.todayStats.earned += amount;
}

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

function resetQuests() {
    quests.forEach((quest) => {
        gameState.questsClaimed[quest.id] = false;
    });
}

export function resetGameState() {
    gameState.cookies = 0;
    gameState.lifetimeCookies = 0;
    gameState.lifetimeCookiesAtLastPrestige = 0;
    gameState.prestigeCookies = 0;
    gameState.currentWorld = 1;
    gameState.unlockedWorldIds = [1];
    gameState.buyMode = 1;
    gameState.prestigeMultiplier = 1;
    gameState.clickPower = 1;
    gameState.activeBoostUntil = 0;
    gameState.activeBoostCooldownUntil = 0;
    gameState.totalClicks = 0;
    gameState.autoBuyerUnlocked = false;
    gameState.autoBuyerEnabled = false;
    gameState.todayStats = {
        clicks: 0,
        earned: 0,
        resetDayKey: getTodayKey()
    };

    resetBuildingData();
    resetPrestigeUpgrades();
    resetMilestones();
    resetQuests();
}

resetGameState();

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

function isBoostActive() {
    return Date.now() < Number(gameState.activeBoostUntil || 0);
}

function getActiveBoostMultiplier() {
    return isBoostActive() ? ACTIVE_BOOST_MULTIPLIER : 1;
}

export function getBoostStatus() {
    const now = Date.now();
    const activeMs = Math.max(0, Number(gameState.activeBoostUntil || 0) - now);
    const cooldownMs = Math.max(0, Number(gameState.activeBoostCooldownUntil || 0) - now);
    return {
        active: activeMs > 0,
        ready: cooldownMs <= 0,
        activeMs,
        cooldownMs,
        multiplier: getActiveBoostMultiplier()
    };
}

export function activateProductionBoost() {
    const now = Date.now();
    if (now < Number(gameState.activeBoostCooldownUntil || 0)) {
        return false;
    }

    gameState.activeBoostUntil = now + ACTIVE_BOOST_DURATION_MS;
    gameState.activeBoostCooldownUntil = now + ACTIVE_BOOST_DURATION_MS + ACTIVE_BOOST_COOLDOWN_MS;
    return true;
}

export function unlockAutoBuyer(cost = 50_000) {
    if (gameState.autoBuyerUnlocked) return true;
    if (gameState.cookies < cost) return false;
    gameState.cookies -= cost;
    gameState.autoBuyerUnlocked = true;
    gameState.autoBuyerEnabled = true;
    return true;
}

export function setAutoBuyerEnabled(enabled) {
    if (!gameState.autoBuyerUnlocked) return false;
    gameState.autoBuyerEnabled = Boolean(enabled);
    return true;
}

export function runAutoBuyerTick() {
    if (!gameState.autoBuyerUnlocked || !gameState.autoBuyerEnabled) return 0;

    let purchases = 0;
    buildings.forEach((building) => {
        const bought = buyBuilding(building.id);
        if (bought) purchases += 1;
    });

    return purchases;
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
    total *= getActiveBoostMultiplier();

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

export function getQuestProgress(questId) {
    ensureDailyStats();
    const quest = quests.find((entry) => entry.id === questId);
    if (!quest) return { current: 0, target: 0, completed: false, claimed: false };

    const current = Number(quest.progress(gameState)) || 0;
    const target = quest.target;
    const completed = current >= target;
    const claimed = Boolean(gameState.questsClaimed[quest.id]);

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
        if (!status.completed || status.claimed) return;

        gameState.milestonesClaimed[milestone.id] = true;
        const rewardCookies = Number(milestone.rewardCookies || 0);
        const rewardPrestigeCookies = Number(milestone.rewardPrestigeCookies || 0);

        if (rewardCookies > 0) {
            addCookies(rewardCookies);
        }

        if (rewardPrestigeCookies > 0) {
            gameState.prestigeCookies += rewardPrestigeCookies;
        }

        claimedNow.push({ id: milestone.id, label: milestone.label, rewardCookies, rewardPrestigeCookies });
    });

    return claimedNow;
}

export function claimAvailableQuests() {
    ensureDailyStats();
    const claimedNow = [];

    quests.forEach((quest) => {
        const status = getQuestProgress(quest.id);
        if (!status.completed || status.claimed) return;

        gameState.questsClaimed[quest.id] = true;
        const rewardCookies = Number(quest.rewardCookies || 0);
        const rewardPrestigeCookies = Number(quest.rewardPrestigeCookies || 0);

        if (rewardCookies > 0) addCookies(rewardCookies);
        if (rewardPrestigeCookies > 0) gameState.prestigeCookies += rewardPrestigeCookies;

        claimedNow.push({ id: quest.id, label: quest.label, rewardCookies, rewardPrestigeCookies });
    });

    return claimedNow;
}

let lastUpdate = Date.now();

export function gameLoop() {
    const now = Date.now();
    const delta = (now - lastUpdate) / 1000;
    lastUpdate = now;

    const cps = calculateCps();
    const production = cps * delta;

    addCookies(production);

    requestAnimationFrame(gameLoop);
}

export function applyOfflineProgress(elapsedMs, capMs = 4 * 60 * 60 * 1000) {
    const safeElapsed = Math.max(0, Math.min(Number(elapsedMs) || 0, capMs));
    const gained = calculateCps() * (safeElapsed / 1000);
    addCookies(gained);
    return { gained, elapsedMs: safeElapsed, capped: safeElapsed < (Number(elapsedMs) || 0) };
}

export function clickCookie() {
    ensureDailyStats();
    const world = getWorldById(gameState.currentWorld);
    const worldMultiplier = world ? world.multiplier : 1;
    const crit = Math.random() < 0.12;

    const base = gameState.clickPower * getClickUpgradeMultiplier() * worldMultiplier * gameState.prestigeMultiplier;
    const amount = base * (crit ? 2 : 1);

    addCookies(amount);
    gameState.totalClicks += 1;
    gameState.todayStats.clicks += 1;

    return { amount, crit };
}

export function buyBuilding(buildingId) {
    const building = buildings.find((b) => b.id === buildingId);
    const data = gameState.buildingData[buildingId];

    if (!building || !data) return false;

    const rawOwned = Number(data.owned);
    const owned = Number.isFinite(rawOwned) && rawOwned >= 0 ? Math.floor(rawOwned) : 0;
    if (data.owned !== owned) data.owned = owned;

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

export function setBuyMode(mode) {
    gameState.buyMode = mode === "max" ? "max" : Number.isFinite(mode) && mode > 0 ? mode : 1;
}

export function changeWorld(worldId) {
    const world = getWorldById(worldId);
    if (!world) return false;
    if (!gameState.unlockedWorldIds.includes(worldId)) return false;

    gameState.currentWorld = worldId;
    return true;
}

export function isWorldPurchased(worldId) {
    return gameState.unlockedWorldIds.includes(worldId);
}

export function buyWorld(worldId) {
    const world = getWorldById(worldId);
    if (!world) return false;
    if (isWorldPurchased(worldId)) return true;

    if (gameState.cookies < world.unlockCost) return false;

    gameState.cookies -= world.unlockCost;
    gameState.unlockedWorldIds.push(worldId);
    gameState.unlockedWorldIds = Array.from(new Set(gameState.unlockedWorldIds))
        .filter((id) => worlds.some((entry) => entry.id === id))
        .sort((a, b) => a - b);

    return true;
}

export function getPotentialPrestigeGain() {
    const lifetime = Number(gameState.lifetimeCookies) || 0;
    const lifetimeAtLastPrestige = Number(gameState.lifetimeCookiesAtLastPrestige) || 0;
    const eligibleLifetime = Math.max(0, lifetime - lifetimeAtLastPrestige);
    return Math.floor(eligibleLifetime / PRESTIGE_THRESHOLD);
}

export function getPrestigePreview() {
    const earned = getPotentialPrestigeGain();
    return {
        lose: {
            cookies: gameState.cookies,
            buildings: buildings.reduce((sum, building) => sum + Number(gameState.buildingData[building.id]?.owned || 0), 0),
            worlds: Math.max(0, gameState.unlockedWorldIds.length - 1)
        },
        gain: {
            prestigeCookies: earned,
            multiplierIncrease: earned * 0.1
        },
        keep: {
            prestigeCookies: gameState.prestigeCookies,
            prestigeUpgrades: { ...gameState.prestigeUpgradeLevels }
        }
    };
}

export function prestigeReset() {
    const earned = getPotentialPrestigeGain();
    if (earned <= 0) return 0;

    gameState.prestigeCookies += earned;
    gameState.prestigeMultiplier += earned * 0.1;
    gameState.lifetimeCookiesAtLastPrestige += earned * PRESTIGE_THRESHOLD;

    gameState.cookies = 0;
    gameState.currentWorld = 1;
    gameState.unlockedWorldIds = [1];
    gameState.autoBuyerEnabled = false;

    buildings.forEach((building) => {
        gameState.buildingData[building.id].owned = 0;
    });

    return earned;
}
