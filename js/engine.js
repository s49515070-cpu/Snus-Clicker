// =====================================
// GAME ENGINE – SNUS CLICKER
// Core Logik & Game Loop
// =====================================

import { buildings, getPurchaseCost, getBuildingCps, getMaxAffordableSummary } from "./buildings.js";
import { getWorldById, worlds, isWorldUnlocked } from "./worlds.js";

export const PRESTIGE_THRESHOLD = 1_000_000;
const ACTIVE_BOOST_DURATION_MS = 30_000;
const ACTIVE_BOOST_COOLDOWN_MS = 30_000;
const ACTIVE_BOOST_MULTIPLIER = 3;
const CLICK_BURST_MULTIPLIER = 4;
const DISCOUNT_BURST_RATIO = 0.25;

export const AUTO_BUYER_UNLOCK_COST = 30_000;
const AUTO_BUYER_MAX_PURCHASES_PER_TICK = 3;

export const AUTO_BUYER_STRATEGIES = ["value", "cheap", "balanced", "reserve", "custom"];
const AUTO_BUYER_RESERVE_RATIO = 0.2;

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
    },
    {
        id: "automationCore",
        name: "Automation Core",
        description: "+1 Auto-Buyer Kauf pro Tick",
        baseCost: 15,
        growth: 2.25,
        maxLevel: 6,
        type: "automation"
    },
    {
        id: "boostOverdrive",
        name: "Boost Overdrive",
        description: "+10% Skillstärke pro Level",
        baseCost: 18,
        growth: 2.3,
        maxLevel: 8,
        type: "active"
    },
    {
        id: "worldAttunement",
        name: "World Attunement",
        description: "+3% Welteneffekte pro Level",
        baseCost: 22,
        growth: 2.35,
        maxLevel: 8,
        type: "world"
    }
];

export const milestones = [
    {
        id: "lifetime_10k",
        labelKey: "milestoneRookieLabel",
        descriptionKey: "milestoneRookieDescription",
        label: "Rookie Roller",
        description: "Erreiche 10.000 Lifetime-Snus",
        target: 10_000,
        rewardCookies: 1_000,
        progress: (state) => state.lifetimeCookies
    },
    {
        id: "buildings_25",
        labelKey: "milestoneForemanLabel",
        descriptionKey: "milestoneForemanDescription",
        label: "Factory Foreman",
        description: "Besitze insgesamt 25 Gebäude",
        target: 25,
        rewardCookies: 5_000,
        rewardPerk: "discount_3",
        progress: (state) => buildings.reduce((sum, building) => sum + Number(state.buildingData[building.id]?.owned || 0), 0)
    },
    {
        id: "lifetime_100k",
        labelKey: "milestoneSeasonedLabel",
        descriptionKey: "milestoneSeasonedDescription",
        label: "Seasoned Roller",
        description: "Erreiche 100.000 Lifetime-Snus",
        target: 100_000,
        rewardCookies: 20_000,
        progress: (state) => state.lifetimeCookies
    },
    {
        id: "buildings_75",
        labelKey: "milestoneIndustrialistLabel",
        descriptionKey: "milestoneIndustrialistDescription",
        label: "Industrialist",
        description: "Besitze insgesamt 75 Gebäude",
        target: 75,
        rewardCookies: 35_000,
        rewardPrestigeCookies: 1,
        rewardPerk: "autobuyer_speed",
        progress: (state) => buildings.reduce((sum, building) => sum + Number(state.buildingData[building.id]?.owned || 0), 0)
    },
    {
        id: "lifetime_1m",
        labelKey: "milestoneTycoonLabel",
        descriptionKey: "milestoneTycoonDescription",
        label: "Snus Tycoon",
        description: "Erreiche 1.000.000 Lifetime Snus",
        target: 1_000_000,
        rewardCookies: 100_000,
        rewardPrestigeCookies: 1,
        rewardPerk: "skill_power",
        progress: (state) => state.lifetimeCookies
    }
];

export const quests = [
    {
        id: "daily_clicks_200",
        labelKey: "questDailyClicks200Label",
        descriptionKey: "questDailyClicks200Description",
        label: "Daily: 200 Klicks",
        description: "Klicke heute 200x",
        target: 200,
        rewardCookies: 2_500,
        progress: (state) => state.todayStats.clicks,
        isDaily: true
    },
    {
        id: "daily_earned_50k",
        labelKey: "questDailyEarn50kLabel",
        descriptionKey: "questDailyEarn50kDescription",
        label: "Daily: 50.000 Snus",
        description: "Verdiene heute 50.000 Snus",
        target: 50_000,
        rewardCookies: 6_000,
        progress: (state) => state.todayStats.earned,
        isDaily: true
    },
    {
        id: "daily_clicks_500",
        labelKey: "questDailyClicks500Label",
        descriptionKey: "questDailyClicks500Description",
        label: "Daily: 500 Klicks",
        description: "Klicke heute 500x",
        target: 500,
        rewardCookies: 6_500,
        progress: (state) => state.todayStats.clicks,
        isDaily: true
    },
    {
        id: "daily_earned_200k",
        labelKey: "questDailyEarn200kLabel",
        descriptionKey: "questDailyEarn200kDescription",
        label: "Daily: 200.000 Snus",
        description: "Verdiene heute 200.000 Snus",
        target: 200_000,
        rewardCookies: 16_000,
        rewardPrestigeCookies: 1,
        progress: (state) => state.todayStats.earned,
        isDaily: true
    },
    {
        id: "weekly_earn_5m",
        labelKey: "questWeeklyEarn5mLabel",
        descriptionKey: "questWeeklyEarn5mDescription",
        label: "Weekly: 5.000.000 Snus",
        description: "Verdiene diese Woche 5.000.000 Snus",
        target: 5_000_000,
        rewardCookies: 120_000,
        rewardPrestigeCookies: 3,
        progress: (state) => Number(state.weeklyStats?.earned || 0),
        isDaily: false
    },
    {
        id: "long_clicks_5000",
        labelKey: "questLongClicks5000Label",
        descriptionKey: "questLongClicks5000Description",
        label: "Long Run: 5.000 Klicks",
        description: "Klicke insgesamt 5.000x",
        target: 5_000,
        rewardCookies: 10_000,
        rewardPrestigeCookies: 1,
        progress: (state) => state.totalClicks,
        isDaily: false
    },
    {
        id: "long_buildings_100",
        labelKey: "questLongBuildings100Label",
        descriptionKey: "questLongBuildings100Description",
        label: "Long Run: 100 Gebäude",
        description: "Besitze insgesamt 100 Gebäude",
        target: 100,
        rewardCookies: 25_000,
        rewardPrestigeCookies: 1,
        progress: (state) => buildings.reduce((sum, building) => sum + Number(state.buildingData[building.id]?.owned || 0), 0),
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
    clickBurstUntil: 0,
    clickBurstCooldownUntil: 0,
    discountBurstUntil: 0,
    discountBurstCooldownUntil: 0,
    totalClicks: 0,
    autoBuyerUnlocked: false,
    autoBuyerEnabled: false,
    autoBuyerStrategy: "value",
    autoBuyerWeights: { value: 0.75, cheap: 0.25 },
    autoBuyerLastDecision: "",
    activeDailyQuestIds: [],
    dailyStreak: 0,
    todayStats: {
        clicks: 0,
        earned: 0,
        resetDayKey: ""
    },
    weeklyStats: {
        earned: 0,
        resetWeekKey: ""
    },
    milestonePerks: {}
};

function getTodayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function getWeekKey() {
    const now = new Date();
    const firstJan = new Date(now.getFullYear(), 0, 1);
    const dayMs = 24 * 60 * 60 * 1000;
    const week = Math.ceil((((now - firstJan) / dayMs) + firstJan.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${week}`;
}


function getDailyQuestPool() {
    return quests.filter((quest) => quest.isDaily);
}

function rotateDailyQuestsForToday() {
    const pool = getDailyQuestPool();
    if (pool.length <= 2) {
        gameState.activeDailyQuestIds = pool.map((quest) => quest.id);
        return;
    }

    const key = getTodayKey();
    const seed = Array.from(key).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const firstIndex = seed % pool.length;
    const secondIndex = (seed + 1 + Math.floor(seed / 3)) % pool.length;

    const ids = [pool[firstIndex].id, pool[secondIndex].id];
    gameState.activeDailyQuestIds = Array.from(new Set(ids));

    if (gameState.activeDailyQuestIds.length < 2) {
        const fallback = pool.find((quest) => !gameState.activeDailyQuestIds.includes(quest.id));
        if (fallback) gameState.activeDailyQuestIds.push(fallback.id);
    }
}

export function getActiveQuests() {
    const activeDailyIds = Array.isArray(gameState.activeDailyQuestIds) ? gameState.activeDailyQuestIds : [];
    return quests.filter((quest) => !quest.isDaily || activeDailyIds.includes(quest.id));
}

function ensureDailyStats() {
    const key = getTodayKey();
    if (gameState.todayStats.resetDayKey !== key) {
        if (gameState.todayStats.resetDayKey) {
            gameState.dailyStreak = Number(gameState.dailyStreak || 0) + 1;
        }
        gameState.todayStats.resetDayKey = key;
        gameState.todayStats.clicks = 0;
        gameState.todayStats.earned = 0;
        
        rotateDailyQuestsForToday();
        getDailyQuestPool().forEach((quest) => {
            gameState.questsClaimed[quest.id] = false;
        });
    }

    if (!gameState.weeklyStats || gameState.weeklyStats.resetWeekKey !== getWeekKey()) {
        gameState.weeklyStats = {
            earned: 0,
            resetWeekKey: getWeekKey()
        };
    }
}

function getTotalBuildingsOwned() {
    return buildings.reduce((sum, building) => sum + Number(gameState.buildingData[building.id]?.owned || 0), 0);
}

function addCookies(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    gameState.cookies += amount;
    gameState.lifetimeCookies += amount;
    ensureDailyStats();
    gameState.todayStats.earned += amount;
    gameState.weeklyStats.earned += amount;
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
    getActiveQuests().forEach((quest) => {
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
    gameState.clickBurstUntil = 0;
    gameState.clickBurstCooldownUntil = 0;
    gameState.discountBurstUntil = 0;
    gameState.discountBurstCooldownUntil = 0;
    gameState.totalClicks = 0;
    gameState.autoBuyerUnlocked = false;
    gameState.autoBuyerEnabled = false;
    gameState.autoBuyerStrategy = "value";
    gameState.autoBuyerWeights = { value: 0.75, cheap: 0.25 };
    gameState.autoBuyerLastDecision = "";
    gameState.activeDailyQuestIds = [];
    gameState.dailyStreak = 0;
    gameState.todayStats = {
        clicks: 0,
        earned: 0,
        resetDayKey: getTodayKey()
    };
    gameState.weeklyStats = {
        earned: 0,
        resetWeekKey: getWeekKey()
    };
    gameState.milestonePerks = {};
    
    rotateDailyQuestsForToday();
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

function getWorldModifiers() {
    const world = getWorldById(gameState.currentWorld);
    const attunement = 1 + getUpgradeLevel("worldAttunement") * 0.03;

    return {
        worldMultiplier: world?.multiplier || 1,
        clickBonus: (world?.modifiers?.clickBonus || 0) * attunement,
        cpsBonus: (world?.modifiers?.cpsBonus || 0) * attunement,
        buildingDiscount: (world?.modifiers?.buildingDiscount || 0) * attunement
    };
}

function getSkillPowerMultiplier() {
    const level = getUpgradeLevel("boostOverdrive");
    const perkBonus = gameState.milestonePerks?.skill_power ? 0.08 : 0;
    return 1 + level * 0.1 + perkBonus;
}

function isBoostActive() {
    return Date.now() < Number(gameState.activeBoostUntil || 0);
}

function getActiveBoostMultiplier() {
    return isBoostActive() ? ACTIVE_BOOST_MULTIPLIER * getSkillPowerMultiplier() : 1;
}

function isClickBurstActive() {
    return Date.now() < Number(gameState.clickBurstUntil || 0);
}

function isDiscountBurstActive() {
    return Date.now() < Number(gameState.discountBurstUntil || 0);
}

function getClickBurstMultiplier() {
    return isClickBurstActive() ? CLICK_BURST_MULTIPLIER * getSkillPowerMultiplier() : 1;
}

function getBuildingDiscountMultiplier() {
    const worldDiscount = getWorldModifiers().buildingDiscount;
    const burstDiscount = isDiscountBurstActive() ? DISCOUNT_BURST_RATIO : 0;
    const perkDiscount = gameState.milestonePerks?.discount_3 ? 0.03 : 0;
    return Math.max(0.55, 1 - worldDiscount - burstDiscount - perkDiscount);
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
        multiplier: getActiveBoostMultiplier(),
        clickBurstActiveMs: Math.max(0, Number(gameState.clickBurstUntil || 0) - now),
        clickBurstCooldownMs: Math.max(0, Number(gameState.clickBurstCooldownUntil || 0) - now),
        discountBurstActiveMs: Math.max(0, Number(gameState.discountBurstUntil || 0) - now),
        discountBurstCooldownMs: Math.max(0, Number(gameState.discountBurstCooldownUntil || 0) - now)
    };
}

export function getActiveBonuses() {
    const worldModifiers = getWorldModifiers();
    const streakBonus = Math.min(0.25, Number(gameState.dailyStreak || 0) * 0.01);
    const isBoostNow = isBoostActive();
    const clickBurstNow = isClickBurstActive();
    const discountBurstNow = isDiscountBurstActive();

    return {
        worldClickBonusPercent: Math.round(worldModifiers.clickBonus * 100),
        worldCpsBonusPercent: Math.round(worldModifiers.cpsBonus * 100),
        worldDiscountPercent: Math.round((1 - getBuildingDiscountMultiplier()) * 100),
        activeBoostMultiplier: isBoostNow ? getActiveBoostMultiplier() : 1,
        clickBurstMultiplier: clickBurstNow ? getClickBurstMultiplier() : 1,
        discountBurstActive: discountBurstNow,
        streakBonusPercent: Math.round(streakBonus * 100),
        skillPowerPercent: Math.round((getSkillPowerMultiplier() - 1) * 100),
        autoBuyerExtraPurchases: getUpgradeLevel("automationCore") + (gameState.milestonePerks?.autobuyer_speed ? 1 : 0)
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

export function activateClickBurst() {
    const now = Date.now();
    if (now < Number(gameState.clickBurstCooldownUntil || 0)) return false;

    gameState.clickBurstUntil = now + ACTIVE_BOOST_DURATION_MS;
    gameState.clickBurstCooldownUntil = now + ACTIVE_BOOST_DURATION_MS + ACTIVE_BOOST_COOLDOWN_MS;
    return true;
}

export function activateDiscountBurst() {
    const now = Date.now();
    if (now < Number(gameState.discountBurstCooldownUntil || 0)) return false;

    gameState.discountBurstUntil = now + ACTIVE_BOOST_DURATION_MS;
    gameState.discountBurstCooldownUntil = now + ACTIVE_BOOST_DURATION_MS + ACTIVE_BOOST_COOLDOWN_MS;
    return true;
}

export function unlockAutoBuyer(cost = AUTO_BUYER_UNLOCK_COST) {
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

function normalizeAutoBuyerStrategy(value) {
    return AUTO_BUYER_STRATEGIES.includes(value) ? value : "value";
}

export function setAutoBuyerStrategy(strategy) {
    gameState.autoBuyerStrategy = normalizeAutoBuyerStrategy(strategy);
    return gameState.autoBuyerStrategy;
}

export function getAutoBuyerStrategy() {
    return normalizeAutoBuyerStrategy(gameState.autoBuyerStrategy);
}

export function setAutoBuyerWeights(valueWeight, cheapWeight) {
    const value = Number(valueWeight);
    const cheap = Number(cheapWeight);

    gameState.autoBuyerWeights = {
        value: Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.75,
        cheap: Number.isFinite(cheap) ? Math.max(0, Math.min(1, cheap)) : 0.25
    };

    return { ...gameState.autoBuyerWeights };
}

export function getAutoBuyerWeights() {
    return {
        value: Number(gameState.autoBuyerWeights?.value || 0.75),
        cheap: Number(gameState.autoBuyerWeights?.cheap || 0.25)
    };
}

export function getAutoBuyerStatus() {
    return {
        decision: gameState.autoBuyerLastDecision || "—"
    };
}

function getAutoBuyerChoice() {
    let best = null;

    buildings.forEach((building) => {
        const data = gameState.buildingData[building.id];
        if (!data) return;

        const rawOwned = Number(data.owned);
        const owned = Number.isFinite(rawOwned) && rawOwned >= 0 ? Math.floor(rawOwned) : 0;
        const cost = getPurchaseCost(building, owned, 1);
        if (cost <= 0 || cost > gameState.cookies) return;

        const valueScore = building.baseCps / cost;
        const strategy = getAutoBuyerStrategy();
        const availableBudget = strategy === "reserve"
            ? Math.max(0, gameState.cookies * (1 - AUTO_BUYER_RESERVE_RATIO))
            : gameState.cookies;
        if (cost > availableBudget) return;

        const score = strategy === "cheap"
            ? -cost
            : strategy === "balanced"
                ? (valueScore * 0.75 + (building.baseCps / 1000) * 0.25)
                : strategy === "custom"
                    ? (valueScore * Number(gameState.autoBuyerWeights?.value || 0.75) + ((-cost / 10000) * Number(gameState.autoBuyerWeights?.cheap || 0.25)))
                : valueScore;

        if (!best || score > best.score || (score === best.score && cost < best.cost)) {
            best = { buildingId: building.id, score, cost, owned };
        }
    });

    return best;
}

export function runAutoBuyerTick() {
    if (!gameState.autoBuyerUnlocked || !gameState.autoBuyerEnabled) return 0;

    let purchases = 0;
    const bonusPurchases = getUpgradeLevel("automationCore") + (gameState.milestonePerks?.autobuyer_speed ? 1 : 0);
    const purchaseCap = AUTO_BUYER_MAX_PURCHASES_PER_TICK + bonusPurchases;

    while (purchases < purchaseCap) {
        const choice = getAutoBuyerChoice();
        if (!choice) break;

        gameState.cookies -= choice.cost;
        gameState.buildingData[choice.buildingId].owned = choice.owned + 1;
        gameState.autoBuyerLastDecision = `${choice.buildingId} (${choice.cost})`;
        purchases += 1;
    }

    return purchases;
}

export function getPrestigeEffects() {
    const clickLevel = getUpgradeLevel("clickMastery");
    const cpsLevel = getUpgradeLevel("snusAlchemy");
    const automationLevel = getUpgradeLevel("automationCore");
    const activeLevel = getUpgradeLevel("boostOverdrive");
    const worldLevel = getUpgradeLevel("worldAttunement");

    return {
        clickLevel,
        cpsLevel,
        clickMultiplier: getClickUpgradeMultiplier(),
        cpsMultiplier: getCpsUpgradeMultiplier(),
        clickBonusPercent: Math.round((getClickUpgradeMultiplier() - 1) * 100),
        cpsBonusPercent: Math.round((getCpsUpgradeMultiplier() - 1) * 100),
        automationLevel,
        activeLevel,
        worldLevel
    };
}

export function getPrestigeUpgradeCost(upgradeId) {
    const upgrade = prestigeUpgrades.find((item) => item.id === upgradeId);
    if (!upgrade) return Infinity;

    const level = getUpgradeLevel(upgrade.id);
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.growth, level));
}

export function getPotentialPrestigeGain() {
    const lifetimeSinceLastPrestige = Math.max(0, gameState.lifetimeCookies - gameState.lifetimeCookiesAtLastPrestige);
    return Math.floor(lifetimeSinceLastPrestige / PRESTIGE_THRESHOLD);
}

export function getPrestigePreview() {
    return {
        lose: {
            cookies: Math.floor(gameState.cookies)
        },
        gain: {
            prestigeCookies: getPotentialPrestigeGain()
        }
    };
}

export function prestigeReset() {
    const gained = getPotentialPrestigeGain();
    if (gained <= 0) return 0;

    gameState.prestigeCookies += gained;
    gameState.lifetimeCookiesAtLastPrestige = gameState.lifetimeCookies;
    gameState.prestigeMultiplier = 1 + gameState.prestigeCookies * 0.01;

    gameState.cookies = 0;
    gameState.currentWorld = 1;
    gameState.unlockedWorldIds = [1];
    gameState.buyMode = 1;
    gameState.activeBoostUntil = 0;
    gameState.activeBoostCooldownUntil = 0;
    gameState.clickBurstUntil = 0;
    gameState.clickBurstCooldownUntil = 0;
    gameState.discountBurstUntil = 0;
    gameState.discountBurstCooldownUntil = 0;
    gameState.autoBuyerEnabled = false;
    gameState.autoBuyerUnlocked = false;
    gameState.autoBuyerLastDecision = "";

    resetBuildingData();

    return gained;
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

    const worldModifiers = getWorldModifiers();
    total *= worldModifiers.worldMultiplier;
    total *= 1 + worldModifiers.cpsBonus;
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

    if (!gameState.milestonePerks || typeof gameState.milestonePerks !== "object") {
        gameState.milestonePerks = {};
    }

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

        if (milestone.rewardPerk) {
            gameState.milestonePerks[milestone.rewardPerk] = true;
        }

        claimedNow.push({ id: milestone.id, label: milestone.label, rewardCookies, rewardPrestigeCookies });
    });

    return claimedNow;
}

export function claimAvailableQuests() {
    ensureDailyStats();
    const claimedNow = [];

    getActiveQuests().forEach((quest) => {
        const status = getQuestProgress(quest.id);
        if (!status.completed || status.claimed) return;

        gameState.questsClaimed[quest.id] = true;
        const rewardCookies = Number(quest.rewardCookies || 0);
        const rewardPrestigeCookies = Number(quest.rewardPrestigeCookies || 0);

        const streakBonus = Math.min(0.25, Number(gameState.dailyStreak || 0) * 0.01);
        if (rewardCookies > 0) addCookies(rewardCookies * (1 + streakBonus));
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
    const worldModifiers = getWorldModifiers();
    const worldMultiplier = worldModifiers.worldMultiplier * (1 + worldModifiers.clickBonus);
    const crit = Math.random() < 0.12;

    const base = gameState.clickPower * getClickUpgradeMultiplier() * worldMultiplier * gameState.prestigeMultiplier * getClickBurstMultiplier();
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

    totalCost = Math.floor(totalCost * getBuildingDiscountMultiplier());

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

export function buyWorld(worldId) {
    const world = getWorldById(worldId);
    if (!world) return false;
    if (gameState.unlockedWorldIds.includes(worldId)) return true;

    const canUnlock = isWorldUnlocked(world, gameState.cookies, {
        lifetimeCookies: gameState.lifetimeCookies,
        totalBuildings: getTotalBuildingsOwned()
    });

    if (!canUnlock) return false;

    gameState.cookies -= world.unlockCost;
    gameState.unlockedWorldIds.push(worldId);
    gameState.unlockedWorldIds = Array.from(new Set(gameState.unlockedWorldIds));

    return true;
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
