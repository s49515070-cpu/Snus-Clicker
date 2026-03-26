// =====================================
// GAME ENGINE – SNUS CLICKER
// Core Logik & Game Loop
// =====================================

import { buildings, getPurchaseCost, getBuildingCps } from "./buildings.js";
import { getWorldById, worlds, isWorldUnlocked } from "./worlds.js";
import { inventoryItems } from "./items.js";
import { BUILDING_SYNERGY_BALANCE, ECONOMY_BALANCE, PRESTIGE_UPGRADE_BALANCE } from "../data/balance.js";

export const PRESTIGE_THRESHOLD = ECONOMY_BALANCE.prestigeThreshold;
export const PRESTIGE_STEP_COST = ECONOMY_BALANCE.prestigeStepCost;
const ACTIVE_BOOST_DURATION_MS = 30_000;
const ACTIVE_BOOST_COOLDOWN_MS = 30_000;
const ACTIVE_BOOST_MULTIPLIER = ECONOMY_BALANCE.activeBoostMultiplier;
const CLICK_BURST_MULTIPLIER = ECONOMY_BALANCE.clickBurstMultiplier;
const DISCOUNT_BURST_RATIO = ECONOMY_BALANCE.discountBurstRatio;
const CLICK_COMBO_WINDOW_MS = 900;
const CLICK_COMBO_MAX_LEVEL = 50;
const EARLY_RAMP_MAX_CLICKS = ECONOMY_BALANCE.earlyRampMaxClicks;
const EARLY_RAMP_MAX_MULTIPLIER = ECONOMY_BALANCE.earlyRampMaxMultiplier;
const GOLDEN_SNUS_DURATION_MS = 12_000;
const GOLDEN_SNUS_BASE_COOLDOWN_MS = 50_000;
const GOLDEN_SNUS_RANDOM_COOLDOWN_MS = 40_000;
const GAME_LOOP_MAX_DELTA_SECONDS = 0.5;

export const AUTO_BUYER_UNLOCK_COST = 30_000;
const AUTO_BUYER_MAX_PURCHASES_PER_TICK = 3;
const OFFLINE_PROGRESS_RATIO = 0.3;
const ACTIVE_DAILY_QUEST_COUNT = 3;

export const AUTO_BUYER_STRATEGIES = ["value", "cheap"];

export const prestigeUpgrades = [
    {
        id: "clickMastery",
        name: "Click Mastery",
        description: "+12% Klickstärke pro Level",
        baseCost: PRESTIGE_UPGRADE_BALANCE.clickMastery.baseCost,
        growth: PRESTIGE_UPGRADE_BALANCE.clickMastery.growth,
        maxLevel: PRESTIGE_UPGRADE_BALANCE.clickMastery.maxLevel,
        type: "click"
    },
    {
        id: "snusAlchemy",
        name: "Snus Alchemy",
        description: "+3% CPS pro Level",
        baseCost: PRESTIGE_UPGRADE_BALANCE.snusAlchemy.baseCost,
        growth: PRESTIGE_UPGRADE_BALANCE.snusAlchemy.growth,
        maxLevel: PRESTIGE_UPGRADE_BALANCE.snusAlchemy.maxLevel,
        type: "cps"
    },
    {
        id: "automationCore",
        name: "Automation Core",
        description: "+1 Auto-Buyer Kauf pro Tick",
        baseCost: PRESTIGE_UPGRADE_BALANCE.automationCore.baseCost,
        growth: PRESTIGE_UPGRADE_BALANCE.automationCore.growth,
        maxLevel: PRESTIGE_UPGRADE_BALANCE.automationCore.maxLevel,
        type: "automation"
    },
    {
        id: "boostOverdrive",
        name: "Boost Overdrive",
        description: "+6% Skillstärke pro Level",
        baseCost: PRESTIGE_UPGRADE_BALANCE.boostOverdrive.baseCost,
        growth: PRESTIGE_UPGRADE_BALANCE.boostOverdrive.growth,
        maxLevel: PRESTIGE_UPGRADE_BALANCE.boostOverdrive.maxLevel,
        type: "active"
    },
    {
        id: "worldAttunement",
        name: "World Attunement",
        description: "+2% Welteneffekte pro Level",
        baseCost: PRESTIGE_UPGRADE_BALANCE.worldAttunement.baseCost,
        growth: PRESTIGE_UPGRADE_BALANCE.worldAttunement.growth,
        maxLevel: PRESTIGE_UPGRADE_BALANCE.worldAttunement.maxLevel,
        type: "world"
    }
];

export const prestigeTalents = [
    { id: "click_node_1", name: "Fingerfitness I", description: "+8% Klickstärke", branch: "click", tier: 1, cost: 1 },
    { id: "click_node_2", name: "Fingerfitness II", description: "+12% Klickstärke", branch: "click", tier: 2, cost: 1 },
    { id: "click_node_3", name: "Kritische Technik", description: "+10% Klickstärke", branch: "click", tier: 3, cost: 2 },
    { id: "idle_node_1", name: "Passive Pipeline I", description: "+8% CPS", branch: "idle", tier: 1, cost: 1 },
    { id: "idle_node_2", name: "Passive Pipeline II", description: "+12% CPS", branch: "idle", tier: 2, cost: 1 },
    { id: "idle_node_3", name: "Factory Focus", description: "+10% CPS", branch: "idle", tier: 3, cost: 2 },
    { id: "hybrid_node_1", name: "Boost-Synergie I", description: "+6% Skillstärke", branch: "hybrid", tier: 1, cost: 1 },
    { id: "hybrid_node_2", name: "Boost-Synergie II", description: "+8% Skillstärke", branch: "hybrid", tier: 2, cost: 1 },
    { id: "hybrid_node_3", name: "Budget Tuning", description: "-3% Gebäudekosten", branch: "hybrid", tier: 3, cost: 2 }
];

const prestigeTrackMilestoneRewards = new Map([
    [1, { rewardDiamonds: 5, title: "Bronze Trophy" }],
    [2, { rewardDiamonds: 8, title: "Silver Trophy" }],
    [3, { rewardDiamonds: 12, title: "Gold Trophy" }],
    [5, { rewardDiamonds: 20, title: "Master Trophy" }],
    [8, { rewardDiamonds: 26, title: "Elite Trophy" }],
    [10, { rewardDiamonds: 32, title: "Hero Trophy" }],
    [12, { rewardDiamonds: 35, title: "Champion Trophy" }],
    [20, { rewardDiamonds: 56, title: "Legend Trophy" }],
    [25, { rewardDiamonds: 68, title: "Mythic Trophy" }],
    [30, { rewardDiamonds: 68, title: "Mythic Trophy" }],
    [35, { rewardDiamonds: 68, title: "Mythic Trophy" }],
    [40, { rewardDiamonds: 68, title: "Mythic Trophy" }],
    [45, { rewardDiamonds: 68, title: "Mythic Trophy" }],
    [50, { rewardDiamonds: 126, title: "Immortal Trophy" }],
    [60, { rewardDiamonds: 152, title: "Cosmic Trophy" }],
    [70, { rewardDiamonds: 182, title: "Transcendent Trophy" }],
    [80, { rewardDiamonds: 216, title: "Infinity Trophy" }],
    [90, { rewardDiamonds: 254, title: "Omega Trophy" }],
    [100, { rewardDiamonds: 30000, title: "Centurion Trophy" }]
]);

function isPrestigeTrackDiamondLevel(level) {
    if (level <= 10) return true;
    if (level <= 20) return level % 2 === 0;
    return level % 5 === 0;
}

function getGeneratedPrestigeTrackReward(level) {
    const previousLevel = Math.max(0, level - 1);
    return {
        rewardDiamonds: isPrestigeTrackDiamondLevel(level)
            ? Math.round(5 + (level * 2.1) + (previousLevel * 0.85))
            : 0,
        title: `Prestige ${level} Trophy`
    };
}

export const prestigeTrackRewards = Array.from({ length: 100 }, (_, index) => {
    const level = index + 1;
    const milestoneReward = prestigeTrackMilestoneRewards.get(level);

    return {
        level,
        ...(milestoneReward || getGeneratedPrestigeTrackReward(level))
    };
});

const ACHIEVEMENT_DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];

const achievementBlueprints = [
    {
        key: "lifetime_snus",
        icon: "💸",
        titleKey: "achievementLifetimeSnusTitle",
        descriptionKey: "achievementLifetimeSnusDescription",
        thresholds: [1_500_000, 15_000_000, 90_000_000],
        progress: (state) => Number(state.lifetimeCookies || 0)
    },
    {
        key: "total_clicks",
        icon: "🖱️",
        titleKey: "achievementTotalClicksTitle",
        descriptionKey: "achievementTotalClicksDescription",
        thresholds: [6_000, 35_000, 120_000],
        progress: (state) => Number(state.totalClicks || 0)
    },
    {
        key: "max_total_buildings",
        icon: "🏗️",
        titleKey: "achievementTotalBuildingsTitle",
        descriptionKey: "achievementTotalBuildingsDescription",
        thresholds: [80, 220, 420],
        progress: (state) => Number(state.achievementStats?.maxTotalBuildings || 0)
    },
    {
        key: "prestige_level",
        icon: "🌟",
        titleKey: "achievementPrestigeTitle",
        descriptionKey: "achievementPrestigeDescription",
        thresholds: [15, 40, 90],
        progress: (state) => Number(state.prestigeCookies || 0)
    },
    {
        key: "diamond_spender",
        icon: "💎",
        titleKey: "achievementDiamondSpendTitle",
        descriptionKey: "achievementDiamondSpendDescription",
        thresholds: [250, 1_200, 4_000],
        progress: (state) => Number(state.achievementStats?.diamondsSpent || 0)
    },
    {
        key: "upgrade_levels",
        icon: "⚙️",
        titleKey: "achievementUpgradesTitle",
        descriptionKey: "achievementUpgradesDescription",
        thresholds: [20, 50, 100],
        progress: (state) => Object.values(state.prestigeUpgradeLevels || {}).reduce((sum, level) => (
            sum + Math.max(0, Number(level) || 0)
        ), 0)
    },
    {
        key: "max_click_combo",
        icon: "🔥",
        titleKey: "achievementComboTitle",
        descriptionKey: "achievementComboDescription",
        thresholds: [40, 110, 220],
        progress: (state) => Number(state.maxClickCombo || 0)
    },
    {
        key: "unlocked_worlds",
        icon: "🌍",
        titleKey: "achievementWorldsTitle",
        descriptionKey: "achievementWorldsDescription",
        thresholds: [3, 4, 5],
        progress: (state) => (Array.isArray(state.unlockedWorldIds) ? state.unlockedWorldIds.length : 0)
    },
    {
        key: "claimed_trophies",
        icon: "🏆",
        titleKey: "achievementTrophiesTitle",
        descriptionKey: "achievementTrophiesDescription",
        thresholds: [8, 24, 55],
        progress: (state) => Object.values(state.prestigeTrackClaimed || {}).filter(Boolean).length
    }
];

export const achievements = achievementBlueprints.flatMap((blueprint) => (
    blueprint.thresholds.map((target, index) => ({
        id: `${blueprint.key}_tier_${index + 1}`,
        key: blueprint.key,
        icon: blueprint.icon,
        titleKey: blueprint.titleKey,
        descriptionKey: blueprint.descriptionKey,
        tier: index + 1,
        difficulty: ACHIEVEMENT_DIFFICULTIES[index],
        target,
        progress: blueprint.progress
    }))
));

const ACHIEVEMENT_RARITY_BY_TIER = {
    1: "common",
    2: "rare",
    3: "epic"
};

export function getAchievementRarity(achievement) {
    const tier = Number(achievement?.tier || 1);
    const difficulty = String(achievement?.difficulty || "").toUpperCase();
    if (tier >= 4 || difficulty === "LEGENDARY") return "legendary";
    if (difficulty === "HARD") return "epic";
    if (difficulty === "MEDIUM") return "rare";
    return ACHIEVEMENT_RARITY_BY_TIER[tier] || "common";
}

export function getAchievementRewardItems(achievementId) {
    return inventoryItems.filter((item) => item.unlockAchievementId === achievementId);
}

export function getAchievementDiamondReward(achievement) {
    const tier = Math.max(1, Number(achievement?.tier || 1));
    if (tier <= 1) return 0;
    return tier === 2 ? 25 : 80;
}

export const quests = [
    {
        id: "daily_clicks_200",
        labelKey: "questDailyClicks200Label",
        descriptionKey: "questDailyClicks200Description",
        label: "Daily: 200 Klicks",
        description: "Klicke heute 200x",
        target: 200,
        rewardCookies: 3_000,
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
        rewardCookies: 6_500,
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
        rewardCookies: 8_500,
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
        rewardCookies: 19_000,
        rewardDiamonds: 1,
        progress: (state) => state.todayStats.earned,
        isDaily: true
    },
    {
        id: "daily_clicks_1000",
        labelKey: "questDailyClicks1000Label",
        descriptionKey: "questDailyClicks1000Description",
        label: "Daily: 1.000 Klicks",
        description: "Klicke heute 1.000x",
        target: 1_000,
        rewardCookies: 15_000,
        rewardDiamonds: 1,
        progress: (state) => state.todayStats.clicks,
        isDaily: true
    },
    {
        id: "daily_earned_750k",
        labelKey: "questDailyEarn750kLabel",
        descriptionKey: "questDailyEarn750kDescription",
        label: "Daily: 750.000 Snus",
        description: "Verdiene heute 750.000 Snus",
        target: 750_000,
        rewardCookies: 35_000,
        rewardDiamonds: 2,
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
        rewardCookies: 150_000,
        rewardDiamonds: 5,
        progress: (state) => Number(state.weeklyStats?.earned || 0),
        isDaily: false
    },
    {
        id: "weekly_earn_15m",
        labelKey: "questWeeklyEarn15mLabel",
        descriptionKey: "questWeeklyEarn15mDescription",
        label: "Weekly: 15.000.000 Snus",
        description: "Verdiene diese Woche 15.000.000 Snus",
        target: 15_000_000,
        rewardCookies: 320_000,
        rewardDiamonds: 8,
        progress: (state) => Number(state.weeklyStats?.earned || 0),
        isDaily: false
    },
    {
        id: "long_buildings_25",
        labelKey: "questLongBuildings25Label",
        descriptionKey: "questLongBuildings25Description",
        label: "Long Run: 25 Gebäude",
        description: "Besitze insgesamt 25 Gebäude",
        target: 25,
        rewardCookies: 8_000,
        progress: (state) => buildings.reduce((sum, building) => sum + Number(state.buildingData[building.id]?.owned || 0), 0),
        isDaily: false
    },
    {
        id: "long_buildings_50",
        labelKey: "questLongBuildings50Label",
        descriptionKey: "questLongBuildings50Description",
        label: "Long Run: 50 Gebäude",
        description: "Besitze insgesamt 50 Gebäude",
        target: 50,
        rewardCookies: 12_500,
        rewardDiamonds: 1,
        progress: (state) => buildings.reduce((sum, building) => sum + Number(state.buildingData[building.id]?.owned || 0), 0),
        isDaily: false
    },
    {
        id: "long_clicks_5000",
        labelKey: "questLongClicks5000Label",
        descriptionKey: "questLongClicks5000Description",
        label: "Long Run: 5.000 Klicks",
        description: "Klicke insgesamt 5.000x",
        target: 5_000,
        rewardCookies: 13_000,
        rewardDiamonds: 2,
        progress: (state) => state.totalClicks,
        isDaily: false
    },
    {
        id: "long_clicks_20000",
        labelKey: "questLongClicks20000Label",
        descriptionKey: "questLongClicks20000Description",
        label: "Long Run: 20.000 Klicks",
        description: "Klicke insgesamt 20.000x",
        target: 20_000,
        rewardCookies: 52_000,
        rewardDiamonds: 4,
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
        rewardDiamonds: 2,
        progress: (state) => buildings.reduce((sum, building) => sum + Number(state.buildingData[building.id]?.owned || 0), 0),
        isDaily: false
    },
    {
        id: "long_buildings_250",
        labelKey: "questLongBuildings250Label",
        descriptionKey: "questLongBuildings250Description",
        label: "Long Run: 250 Gebäude",
        description: "Besitze insgesamt 250 Gebäude",
        target: 250,
        rewardCookies: 150_000,
        rewardDiamonds: 8,
        progress: (state) => buildings.reduce((sum, building) => sum + Number(state.buildingData[building.id]?.owned || 0), 0),
        isDaily: false
    },
    {
        id: "long_lifetime_250k",
        labelKey: "questLongLifetime250kLabel",
        descriptionKey: "questLongLifetime250kDescription",
        label: "Long Run: 250.000 Snus",
        description: "Erreiche insgesamt 250.000 Lifetime-Snus",
        target: 250_000,
        rewardCookies: 30_000,
        rewardDiamonds: 2,
        progress: (state) => state.lifetimeCookies,
        isDaily: false
    },
    {
        id: "long_lifetime_2m",
        labelKey: "questLongLifetime2mLabel",
        descriptionKey: "questLongLifetime2mDescription",
        label: "Long Run: 2.000.000 Snus",
        description: "Erreiche insgesamt 2.000.000 Lifetime-Snus",
        target: 2_000_000,
        rewardCookies: 250_000,
        rewardDiamonds: 10,
        progress: (state) => state.lifetimeCookies,
        isDaily: false
    }
];


export const buildingSynergies = BUILDING_SYNERGY_BALANCE.map((entry) => ({ ...entry }));

export const gameState = {
    cookies: 0,
    lifetimeCookies: 0,
    lifetimeCookiesAtLastPrestige: 0,
    prestigeCookies: 0,
    diamonds: 0,
    currentWorld: 1,
    unlockedWorldIds: [1],
    buyMode: 1,
    buildingData: {},
    prestigeMultiplier: 1,
    clickPower: 1,
    prestigeUpgradeLevels: {},
    prestigeTalentPoints: 0,
    prestigeTalentLevels: {},
    achievementsUnlocked: {},
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
    achievementStats: {
        maxTotalBuildings: 0,
        diamondsSpent: 0
    },
    goldenSnusAvailableUntil: 0,
    goldenSnusCooldownUntil: 0,
    goldenSnusReward: 0,
    prestigeTrackClaimed: {},
    inventoryUnlocked: {},
    inventoryConsumed: {},
    inventoryActiveUntil: {},
    inventoryCooldownUntil: {},
    clickCombo: 0,
    maxClickCombo: 0,
    lastClickAt: 0,
    onboardingHintsShown: {}
};

function getTodayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function parseDayKey(dayKey) {
    if (typeof dayKey !== "string") return null;

    const match = dayKey.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!match) return null;

    const [, yearRaw, monthRaw, dayRaw] = match;
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    const day = Number(dayRaw);
    const date = new Date(year, month - 1, day);

    if (
        Number.isNaN(date.getTime())
        || date.getFullYear() !== year
        || date.getMonth() !== month - 1
        || date.getDate() !== day
    ) {
        return null;
    }

    return date;
}

function getDayDifference(previousDayKey, currentDayKey) {
    const previousDate = parseDayKey(previousDayKey);
    const currentDate = parseDayKey(currentDayKey);
    if (!previousDate || !currentDate) return null;

    return Math.round((currentDate.getTime() - previousDate.getTime()) / (24 * 60 * 60 * 1000));
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
    if (pool.length <= ACTIVE_DAILY_QUEST_COUNT) {
        gameState.activeDailyQuestIds = pool.map((quest) => quest.id);
        return;
    }

    const key = getTodayKey();
    const seed = Array.from(key).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const ids = [];

    for (let offset = 0; ids.length < ACTIVE_DAILY_QUEST_COUNT && offset < pool.length * 2; offset += 1) {
        const index = (seed + offset + Math.floor((seed * (offset + 1)) / 7)) % pool.length;
        const questId = pool[index]?.id;
        if (questId && !ids.includes(questId)) {
            ids.push(questId);
        }
    }

    if (ids.length < ACTIVE_DAILY_QUEST_COUNT) {
        pool.forEach((quest) => {
            if (ids.length < ACTIVE_DAILY_QUEST_COUNT && !ids.includes(quest.id)) {
                ids.push(quest.id);
            }
        });
    }

    gameState.activeDailyQuestIds = ids;
}

export function getActiveQuests() {
    const activeDailyIds = Array.isArray(gameState.activeDailyQuestIds) ? gameState.activeDailyQuestIds : [];
    return quests.filter((quest) => !quest.isDaily || activeDailyIds.includes(quest.id));
}

function ensureDailyStats() {
    const key = getTodayKey();
    if (gameState.todayStats.resetDayKey !== key) {
        if (gameState.todayStats.resetDayKey) {
            const dayDiff = getDayDifference(gameState.todayStats.resetDayKey, key);
            gameState.dailyStreak = dayDiff === 1
                ? Number(gameState.dailyStreak || 0) + 1
                : 0;
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

function syncAchievementStatsFromState() {
    const currentTotalBuildings = getTotalBuildingsOwned();
    const previousMaxBuildings = Math.max(0, Number(gameState.achievementStats?.maxTotalBuildings || 0));

    gameState.achievementStats = {
        maxTotalBuildings: Math.max(previousMaxBuildings, currentTotalBuildings),
        diamondsSpent: Math.max(0, Number(gameState.achievementStats?.diamondsSpent || 0))
    };
}

function addCookies(amount, options = {}) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const { trackQuestProgress = true } = options;

    gameState.cookies += amount;
    gameState.lifetimeCookies += amount;
    if (trackQuestProgress) {
        ensureDailyStats();
        gameState.todayStats.earned += amount;
        gameState.weeklyStats.earned += amount;
    }
}

export function awardCookies(amount) {
    const safeAmount = Math.max(0, Number(amount) || 0);
    addCookies(safeAmount);
    return Math.max(0, gameState.cookies);
}

export function spendCookies(amount) {
    const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));
    if (safeAmount <= 0 || gameState.cookies < safeAmount) return 0;
    gameState.cookies -= safeAmount;
    return safeAmount;
}

export function awardDiamonds(amount) {
    const safeAmount = Math.max(0, Number(amount) || 0);
    gameState.diamonds = Math.max(0, Number(gameState.diamonds || 0)) + safeAmount;
    return Math.max(0, gameState.diamonds);
}

export function spendDiamonds(amount) {
    const safeAmount = Math.max(0, Number(amount) || 0);
    if (safeAmount <= 0 || Number(gameState.diamonds || 0) < safeAmount) return 0;
    gameState.diamonds = Number(gameState.diamonds || 0) - safeAmount;
    gameState.achievementStats.diamondsSpent = Math.max(0, Number(gameState.achievementStats?.diamondsSpent || 0)) + safeAmount;
    return safeAmount;
}

function scheduleNextGoldenSnus(now = Date.now()) {
    const randomPart = Math.floor(Math.random() * GOLDEN_SNUS_RANDOM_COOLDOWN_MS);
    gameState.goldenSnusCooldownUntil = now + GOLDEN_SNUS_BASE_COOLDOWN_MS + randomPart;
}

function rollGoldenSnusReward() {
    const cpsReward = calculateCps() * 25;
    const lifetimeFactor = Math.max(250, gameState.lifetimeCookies * 0.0025);
    const clickFactor = Math.max(180, gameState.clickPower * getClickUpgradeMultiplier() * 35);
    return Math.max(200, Math.floor(cpsReward + lifetimeFactor + clickFactor));
}

function tickGoldenSnus(now = Date.now()) {
    // Golden-Snus-Bonus deaktiviert.
    gameState.goldenSnusAvailableUntil = 0;
    gameState.goldenSnusCooldownUntil = 0;
    gameState.goldenSnusReward = 0;
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

function resetPrestigeTalents() {
    gameState.prestigeTalentPoints = 0;
    prestigeTalents.forEach((talent) => {
        gameState.prestigeTalentLevels[talent.id] = 0;
    });
}

function resetPrestigeTrack() {
    gameState.prestigeTrackClaimed = {};
    prestigeTrackRewards.forEach((reward) => {
        gameState.prestigeTrackClaimed[reward.level] = false;
    });
}

function resetInventory() {
    gameState.inventoryUnlocked = {};
    gameState.inventoryConsumed = {};
    gameState.inventoryActiveUntil = {};
    gameState.inventoryCooldownUntil = {};

    inventoryItems.forEach((item) => {
        gameState.inventoryUnlocked[item.id] = false;
        gameState.inventoryConsumed[item.id] = false;
        gameState.inventoryActiveUntil[item.id] = 0;
        gameState.inventoryCooldownUntil[item.id] = 0;
    });
}

function resetAchievements() {
    achievements.forEach((achievement) => {
        gameState.achievementsUnlocked[achievement.id] = false;
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
    gameState.diamonds = 0;
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
    gameState.achievementsUnlocked = {};
    gameState.achievementStats = {
        maxTotalBuildings: 0,
        diamondsSpent: 0
    };
    gameState.goldenSnusAvailableUntil = 0;
    gameState.goldenSnusCooldownUntil = 0;
    gameState.goldenSnusReward = 0;
    gameState.clickCombo = 0;
    gameState.maxClickCombo = 0;
    gameState.lastClickAt = 0;
    gameState.onboardingHintsShown = {};
    
    rotateDailyQuestsForToday();
    resetBuildingData();
    resetPrestigeUpgrades();
    resetPrestigeTalents();
    resetPrestigeTrack();
    resetInventory();
    resetAchievements();
    resetQuests();
}

resetGameState();

function getUpgradeLevel(upgradeId) {
    const value = Number(gameState.prestigeUpgradeLevels[upgradeId] || 0);
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function getTalentLevel(talentId) {
    const value = Number(gameState.prestigeTalentLevels?.[talentId] || 0);
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function getSpentTalentPoints() {
    return prestigeTalents.reduce((sum, talent) => {
        const level = getTalentLevel(talent.id);
        return sum + (level > 0 ? Number(talent.cost || 0) : 0);
    }, 0);
}

function getBranchSpentPoints(branch) {
    return prestigeTalents
        .filter((talent) => talent.branch === branch)
        .reduce((sum, talent) => sum + (getTalentLevel(talent.id) > 0 ? Number(talent.cost || 0) : 0), 0);
}

export function getPrestigeTalentEffects() {
    const has = (id) => getTalentLevel(id) > 0;

    return {
        clickBonusPercent: (has("click_node_1") ? 8 : 0) + (has("click_node_2") ? 12 : 0) + (has("click_node_3") ? 10 : 0),
        cpsBonusPercent: (has("idle_node_1") ? 8 : 0) + (has("idle_node_2") ? 12 : 0) + (has("idle_node_3") ? 10 : 0),
        skillPowerBonusPercent: (has("hybrid_node_1") ? 6 : 0) + (has("hybrid_node_2") ? 8 : 0),
        discountBonusPercent: has("hybrid_node_3") ? 3 : 0
    };
}

export function getPrestigeTalentStatus() {
    const spentPoints = getSpentTalentPoints();
    const availablePoints = Math.max(0, Math.floor(Number(gameState.prestigeTalentPoints || 0)) - spentPoints);

    const entries = prestigeTalents.map((talent) => {
        const owned = getTalentLevel(talent.id) > 0;
        const branchPoints = getBranchSpentPoints(talent.branch);
        const requiredPoints = Math.max(0, (Number(talent.tier) - 1) * 2);
        const unlocked = branchPoints >= requiredPoints || owned || Number(talent.tier) <= 1;
        const canBuy = !owned && unlocked && availablePoints >= Number(talent.cost || 0);
        return {
            ...talent,
            owned,
            unlocked,
            canBuy
        };
    });

    return {
        totalPoints: Math.max(0, Math.floor(Number(gameState.prestigeTalentPoints || 0))),
        spentPoints,
        availablePoints,
        entries
    };
}

export function buyPrestigeTalent(talentId) {
    const talent = prestigeTalents.find((entry) => entry.id === talentId);
    if (!talent) return false;
    if (getTalentLevel(talent.id) > 0) return false;

    const status = getPrestigeTalentStatus();
    const current = status.entries.find((entry) => entry.id === talent.id);
    if (!current?.canBuy) return false;

    gameState.prestigeTalentLevels[talent.id] = 1;
    return true;
}

export function getPrestigeMultiplierForLevel(prestigeLevel) {
    const safeLevel = Math.max(0, Math.floor(Number(prestigeLevel) || 0));
    return 1 + (Math.log10(1 + safeLevel) * ECONOMY_BALANCE.prestigeLevelMultiplierLogFactor);
}

function getCpsUpgradeMultiplier() {
    const level = getUpgradeLevel("snusAlchemy");
    return 1 + level * 0.03;
}

function getClickUpgradeMultiplier() {
    const level = getUpgradeLevel("clickMastery");
    return 1 + level * 0.12;
}

function getOwnedCount(buildingId) {
    const raw = Number(gameState.buildingData?.[buildingId]?.owned || 0);
    return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 0;
}

export function getBuildingSynergyBonusPercent(targetId) {
    return Math.round((getBuildingSynergyMultiplier(targetId) - 1) * 100);
}

function getBuildingSynergyMultiplier(targetId) {
    const bonus = buildingSynergies
        .filter((entry) => entry.targetId === targetId)
        .reduce((sum, entry) => {
            const sourceOwned = getOwnedCount(entry.sourceId);
            const maxBonus = Math.max(0, Number(entry.maxBonus || 0));
            const linearBonus = Math.max(0, sourceOwned * Number(entry.bonusPerSource || 0));
            const diminishingBonus = maxBonus <= 0
                ? 0
                : maxBonus * (1 - Math.exp(-(linearBonus / maxBonus)));
            return sum + diminishingBonus;
        }, 0);

    return 1 + bonus;
}

function getLegacyRelevanceMultiplier(buildingIndex) {
    const tierCount = Math.max(1, buildings.length - 1);
    const tierFactor = 1 - (Math.max(0, buildingIndex) / tierCount);
    const totalBuildings = getTotalBuildingsOwned();
    const prestigeLevel = Math.max(0, Math.floor(Number(gameState.prestigeCookies) || 0));
    const globalProgressBoost = (totalBuildings * ECONOMY_BALANCE.legacyRelevanceTotalBuildingsWeight)
        + (prestigeLevel * ECONOMY_BALANCE.legacyRelevancePrestigeWeight);
    const scaledBonus = Math.max(0, globalProgressBoost * tierFactor);
    return 1 + Math.min(ECONOMY_BALANCE.legacyRelevanceMaxBonus, scaledBonus);
}

function getBuildingSoftcapMultiplier(owned) {
    const safeOwned = Math.max(0, Math.floor(Number(owned) || 0));
    const softcapStart = Math.max(1, Number(ECONOMY_BALANCE.buildingSoftcapStart) || 35);
    const minMultiplier = Math.max(
        0.05,
        Math.min(1, Number(ECONOMY_BALANCE.buildingSoftcapMinMultiplier) || 0.38)
    );
    const strength = Math.max(0, Number(ECONOMY_BALANCE.buildingSoftcapStrength) || 0);

    if (safeOwned <= softcapStart || strength <= 0) return 1;
    const overCap = safeOwned - softcapStart;
    const diminishingPart = Math.exp(-overCap * strength);
    return minMultiplier + ((1 - minMultiplier) * diminishingPart);
}

function getWorldModifiers() {
    const world = getWorldById(gameState.currentWorld);
    const attunement = 1 + getUpgradeLevel("worldAttunement") * 0.02;

    return {
        worldMultiplier: world?.multiplier || 1,
        clickBonus: (world?.modifiers?.clickBonus || 0) * attunement,
        cpsBonus: (world?.modifiers?.cpsBonus || 0) * attunement,
        buildingDiscount: (world?.modifiers?.buildingDiscount || 0) * attunement
    };
}

function getSkillPowerMultiplier() {
    const level = getUpgradeLevel("boostOverdrive");
    const talentBonus = getPrestigeTalentEffects().skillPowerBonusPercent / 100;
    return 1 + level * 0.06 + talentBonus;
}

function computeComboMultiplier(comboLevel = Number(gameState.clickCombo || 0)) {
    const safeLevel = Math.max(0, Math.floor(Number(comboLevel) || 0));
    return 1 + Math.min(ECONOMY_BALANCE.comboBonusCap, safeLevel * ECONOMY_BALANCE.comboBonusPerLevel);
}

function computeComboCritBonus(comboLevel = Number(gameState.clickCombo || 0)) {
    const safeLevel = Math.max(0, Math.floor(Number(comboLevel) || 0));
    return Math.min(ECONOMY_BALANCE.comboCritCap, safeLevel * ECONOMY_BALANCE.comboCritPerLevel);
}

function getEarlyGameRampMultiplier() {
    const clicks = Math.max(0, Number(gameState.totalClicks || 0));
    if (clicks >= EARLY_RAMP_MAX_CLICKS) return 1;
    const progress = clicks / EARLY_RAMP_MAX_CLICKS;
    return 1 + ((1 - progress) * (EARLY_RAMP_MAX_MULTIPLIER - 1));
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

function getInventoryEffectBonuses(now = Date.now()) {
    const result = {
        incomeMultiplier: 1,
        critChanceBonus: 0,
        prestigeCostMultiplier: 1,
        upgradeDiscountRatio: 0
    };

    inventoryItems.forEach((item) => {
        const activeUntil = Number(gameState.inventoryActiveUntil?.[item.id] || 0);
        if (activeUntil <= now) return;

        const effect = item.effect || {};
        if (effect.type === "income_multiplier") {
            result.incomeMultiplier *= Math.max(1, Number(effect.multiplier || 1));
        }
        if (effect.type === "crit_chance_bonus") {
            result.critChanceBonus += Math.max(0, Number(effect.critBonus || 0));
        }
        if (effect.type === "prestige_cost_discount") {
            const discountRatio = Math.max(0, Math.min(0.8, Number(effect.discountPercent || 0) / 100));
            result.prestigeCostMultiplier *= Math.max(0.2, 1 - discountRatio);
        }
        if (effect.type === "upgrade_discount") {
            const discountRatio = Math.max(0, Math.min(0.8, Number(effect.discountPercent || 0) / 100));
            result.upgradeDiscountRatio += discountRatio;
        }
    });

    result.upgradeDiscountRatio = Math.min(0.8, result.upgradeDiscountRatio);
    return result;
}

function getBuildingDiscountMultiplier() {
    const worldDiscount = getWorldModifiers().buildingDiscount;
    const burstDiscount = isDiscountBurstActive() ? DISCOUNT_BURST_RATIO : 0;
    const talentDiscount = getPrestigeTalentEffects().discountBonusPercent / 100;
    const itemDiscount = getInventoryEffectBonuses().upgradeDiscountRatio;
    return Math.max(ECONOMY_BALANCE.minBuildingDiscountMultiplier, 1 - worldDiscount - burstDiscount - talentDiscount - itemDiscount);
}

export function getEffectivePurchasePreview(building, owned, mode, cookies = gameState.cookies) {
    const discountMultiplier = getBuildingDiscountMultiplier();

    if (mode === "max") {
        let count = 0;
        let totalCost = 0;
        let nextOwned = owned;

        while (true) {
            const baseCost = getPurchaseCost(building, nextOwned, 1);
            const discountedCost = Math.floor(baseCost * discountMultiplier);
            if (discountedCost <= 0 || totalCost + discountedCost > cookies) break;
            totalCost += discountedCost;
            count += 1;
            nextOwned += 1;
        }

        return {
            quantity: count,
            totalCost,
            discountPercent: Math.round((1 - discountMultiplier) * 100)
        };
    }

    const quantity = Number.isFinite(mode) ? Math.max(0, Math.floor(mode)) : 0;
    const baseCost = getPurchaseCost(building, owned, quantity);
    return {
        quantity,
        totalCost: Math.floor(baseCost * discountMultiplier),
        discountPercent: Math.round((1 - discountMultiplier) * 100)
    };
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
        autoBuyerExtraPurchases: getUpgradeLevel("automationCore"),
        goldenSnusAvailable: false,
        goldenSnusReward: 0,
        comboBonusPercent: Math.round((computeComboMultiplier() - 1) * 100),
        earlyGameBoostPercent: Math.max(0, Math.round((getEarlyGameRampMultiplier() - 1) * 100)),
        inventoryIncomeBoostPercent: Math.max(0, Math.round((getInventoryEffectBonuses().incomeMultiplier - 1) * 100)),
        inventoryCritBoostPercent: Math.max(0, Math.round(getInventoryEffectBonuses().critChanceBonus * 100))
    };
}

export function getClickComboState(now = Date.now()) {
    const elapsedSinceLastClick = Math.max(0, now - Number(gameState.lastClickAt || 0));
    const active = elapsedSinceLastClick <= CLICK_COMBO_WINDOW_MS;
    const comboLevel = active ? Math.max(0, Math.floor(Number(gameState.clickCombo) || 0)) : 0;
    const meterProgress = active ? Math.max(0, 1 - (elapsedSinceLastClick / CLICK_COMBO_WINDOW_MS)) : 0;
    return {
        comboLevel,
        multiplier: computeComboMultiplier(comboLevel),
        critBonusPercent: Math.round(computeComboCritBonus(comboLevel) * 100),
        meterProgress,
        maxCombo: Math.max(comboLevel, Math.floor(Number(gameState.maxClickCombo || 0)))
    };
}

export function getGoldenSnusState() {
    return {
        available: false,
        remainingMs: 0,
        reward: 0
    };
}

export function claimGoldenSnus() {
    const now = Date.now();
    const state = getGoldenSnusState();
    if (!state.available || state.reward <= 0) return 0;

    const reward = state.reward;
    addCookies(reward);
    gameState.goldenSnusAvailableUntil = 0;
    gameState.goldenSnusReward = 0;
    scheduleNextGoldenSnus(now);
    return reward;
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
    const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
    const aliases = {
        efficiency: "value",
        effizienz: "value",
        smart: "value",
        smartest: "value",
        schlauste: "value",
        cheapest: "cheap",
        günstigste: "cheap",
        guenstigste: "cheap",
        billig: "cheap",
        balanced: "value",
        reserve: "value",
        custom: "value"
    };
    const mapped = aliases[normalized] || normalized;
    return AUTO_BUYER_STRATEGIES.includes(mapped) ? mapped : "value";
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

function isCandidateBetterForStrategy(candidate, currentBest, strategy) {
    if (!currentBest) return true;

    const compareDescending = (left, right) => Number(left) - Number(right);
    const compareAscending = (left, right) => Number(right) - Number(left);

    const comparisons = strategy === "cheap"
        ? [
            compareAscending(candidate.cost, currentBest.cost),
            compareDescending(candidate.cpsGain, currentBest.cpsGain),
            compareDescending(candidate.valueScore, currentBest.valueScore)
        ]
        : [
            compareDescending(candidate.valueScore, currentBest.valueScore),
            compareDescending(candidate.cpsGain, currentBest.cpsGain),
            compareAscending(candidate.paybackSeconds, currentBest.paybackSeconds),
            compareAscending(candidate.cost, currentBest.cost)
        ];

    for (const result of comparisons) {
        if (result > 0) return true;
        if (result < 0) return false;
    }

    return false;
}

function getNormalizedCandidateScore(candidate, candidates, key) {
    const rawValues = candidates
        .map((entry) => Number(entry[key]))
        .filter((value) => Number.isFinite(value));

    if (!rawValues.length) return 0;

    const min = Math.min(...rawValues);
    const max = Math.max(...rawValues);
    const current = Number(candidate[key]);

    if (!Number.isFinite(current)) return 0;
    if (max === min) return 1;

    return (current - min) / (max - min);
}

function getAutoBuyerChoice() {
    const strategy = getAutoBuyerStrategy();
    const availableBudget = gameState.cookies;
    const baselineCps = calculateCps();

    const candidates = buildings
        .map((building) => {
            const data = gameState.buildingData[building.id];
            if (!data) return null;

            const rawOwned = Number(data.owned);
            const owned = Number.isFinite(rawOwned) && rawOwned >= 0 ? Math.floor(rawOwned) : 0;
            const preview = getEffectivePurchasePreview(building, owned, 1, availableBudget);
            const cost = Number(preview.totalCost || 0);
            if (cost <= 0 || preview.quantity < 1) return null;

            data.owned = owned + 1;
            const projectedCps = calculateCps();
            data.owned = owned;

            const cpsGain = Math.max(0, projectedCps - baselineCps);
            const valueScore = cost > 0 && Number.isFinite(cpsGain) ? cpsGain / cost : 0;
            const affordabilityScore = cost > 0 ? 1 / cost : 0;
            const paybackSeconds = cpsGain > 0 ? cost / cpsGain : Number.POSITIVE_INFINITY;

            return {
                buildingId: building.id,
                cost,
                affordable: cost <= availableBudget,
                owned,
                cpsGain,
                valueScore: Number.isFinite(valueScore) ? valueScore : 0,
                affordabilityScore: Number.isFinite(affordabilityScore) ? affordabilityScore : 0,
                paybackSeconds
            };
        })
        .filter(Boolean);

    if (!candidates.length) return null;

    if (strategy === "cheap") {
        const affordableCandidates = candidates.filter((candidate) => candidate.affordable);
        if (!affordableCandidates.length) return null;
        return affordableCandidates.reduce((best, candidate) => (
            isCandidateBetterForStrategy(candidate, best, strategy) ? candidate : best
        ), null);
    }

    const smartestCandidate = candidates.reduce((best, candidate) => {
        if (!best) return candidate;
        if (candidate.valueScore > best.valueScore) return candidate;
        if (candidate.valueScore < best.valueScore) return best;
        return isCandidateBetterForStrategy(candidate, best, strategy) ? candidate : best;
    }, null);

    if (!smartestCandidate || !smartestCandidate.affordable) return null;
    return smartestCandidate;
}

export function runAutoBuyerTick() {
    if (!gameState.autoBuyerUnlocked || !gameState.autoBuyerEnabled) return 0;

    let purchases = 0;
    const bonusPurchases = getUpgradeLevel("automationCore");
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
    const baseCost = Math.floor(upgrade.baseCost * Math.pow(upgrade.growth, level));
    const priceMultiplier = Math.max(0.2, 1 - getInventoryEffectBonuses().upgradeDiscountRatio);
    return Math.floor(baseCost * priceMultiplier);
}

export function getPotentialPrestigeGain() {
    const progress = getPrestigeProgressState();
    return progress.potentialGain;
}

export function getPrestigeCostForLevel(currentPrestigeLevel) {
    const level = Math.max(0, Math.floor(Number(currentPrestigeLevel) || 0));
    const growthMultiplier = Math.pow(ECONOMY_BALANCE.prestigeCostGrowth, level);
    const linearRamp = level * PRESTIGE_STEP_COST;
    const baseCost = Math.floor((PRESTIGE_THRESHOLD * growthMultiplier) + linearRamp);
    return Math.floor(baseCost * getInventoryEffectBonuses().prestigeCostMultiplier);
}

export function getPrestigeProgressState() {
    let availableLifetime = Math.max(0, gameState.lifetimeCookies - gameState.lifetimeCookiesAtLastPrestige);
    let simulatedPrestige = Math.max(0, Math.floor(Number(gameState.prestigeCookies) || 0));
    let spentLifetime = 0;
    let potentialGain = 0;

    while (true) {
        const nextCost = getPrestigeCostForLevel(simulatedPrestige);
        if (availableLifetime < nextCost) break;
        availableLifetime -= nextCost;
        spentLifetime += nextCost;
        simulatedPrestige += 1;
        potentialGain += 1;
    }

    const nextCost = getPrestigeCostForLevel(simulatedPrestige);
    const current = Math.min(nextCost, nextCost - Math.max(0, nextCost - availableLifetime));
    const remaining = Math.max(0, nextCost - availableLifetime);

    return {
        current,
        target: nextCost,
        remaining,
        potentialGain,
        spentLifetime,
        carryLifetime: availableLifetime
    };
}

export function getPrestigePreview() {
    const progress = getPrestigeProgressState();
    const cps = calculateCps();
    const etaToRecoverSeconds = cps > 0 ? Math.floor(gameState.cookies / cps) : Infinity;
    return {
        lose: {
            cookies: Math.floor(gameState.cookies)
        },
        gain: {
            prestigeCookies: progress.potentialGain,
            talentPoints: progress.potentialGain
        },
        etaToRecoverSeconds
    };
}

function claimPrestigeTrackRewards(previousLevel, newLevel) {
    const claimedNow = [];

    prestigeTrackRewards.forEach((reward) => {
        const isInRange = reward.level <= newLevel;
        const alreadyClaimed = Boolean(gameState.prestigeTrackClaimed[reward.level]);
        if (!isInRange || alreadyClaimed) return;

        gameState.prestigeTrackClaimed[reward.level] = true;
        if (reward.rewardDiamonds) gameState.diamonds += Number(reward.rewardDiamonds);
        claimedNow.push(reward);
    });

    return claimedNow;
}

export function getPrestigeTrackStatus() {
    return [...prestigeTrackRewards]
        .sort((a, b) => Number(a.level) - Number(b.level))
        .map((reward) => ({
            ...reward,
            rewardDiamonds: Number(reward.rewardDiamonds || 0),
            unlocked: gameState.prestigeCookies >= reward.level,
            claimed: Boolean(gameState.prestigeTrackClaimed[reward.level])
        }));
}

export function getClaimablePrestigeTrackRewards() {
    return getPrestigeTrackStatus().filter((reward) => reward.unlocked && !reward.claimed);
}

export function prestigeReset() {
    const currentPrestige = Math.max(0, Math.floor(Number(gameState.prestigeCookies) || 0));
    claimPrestigeTrackRewards(currentPrestige, currentPrestige);

    const progress = getPrestigeProgressState();
    const gained = progress.potentialGain;
    if (gained <= 0) return 0;

    const previousPrestige = gameState.prestigeCookies;
    gameState.prestigeCookies += gained;
    gameState.prestigeTalentPoints += gained;
    gameState.lifetimeCookiesAtLastPrestige += progress.spentLifetime
    gameState.prestigeMultiplier = getPrestigeMultiplierForLevel(gameState.prestigeCookies);
    claimPrestigeTrackRewards(previousPrestige, gameState.prestigeCookies);

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
    gameState.goldenSnusAvailableUntil = 0;
    gameState.goldenSnusCooldownUntil = 0;
    gameState.goldenSnusReward = 0;

    resetBuildingData();

    return gained;
}

export function buyPrestigeUpgrade(upgradeId) {
    const upgrade = prestigeUpgrades.find((item) => item.id === upgradeId);
    if (!upgrade) return false;

    const level = getUpgradeLevel(upgrade.id);
    if (level >= upgrade.maxLevel) return false;

    const cost = getPrestigeUpgradeCost(upgrade.id);
    if (gameState.diamonds < cost) return false;

    gameState.diamonds -= cost;
    gameState.prestigeUpgradeLevels[upgrade.id] = level + 1;
    return true;
}

export function calculateCps() {
    let total = 0;

    buildings.forEach((b, index) => {
        const rawOwned = Number(gameState.buildingData[b.id]?.owned);
        const owned = Number.isFinite(rawOwned) && rawOwned >= 0 ? Math.floor(rawOwned) : 0;
        const synergyMultiplier = getBuildingSynergyMultiplier(b.id);
        const legacyMultiplier = getLegacyRelevanceMultiplier(index);
        const softcapMultiplier = getBuildingSoftcapMultiplier(owned);
        total += getBuildingCps(b, owned) * synergyMultiplier * legacyMultiplier * softcapMultiplier;
    });

    const worldModifiers = getWorldModifiers();
    total *= worldModifiers.worldMultiplier;
    total *= 1 + worldModifiers.cpsBonus;
    total *= gameState.prestigeMultiplier;
    total *= getCpsUpgradeMultiplier();
    total *= getActiveBoostMultiplier();
    total *= 1 + (getPrestigeTalentEffects().cpsBonusPercent / 100);
    total *= getInventoryEffectBonuses().incomeMultiplier;

    return total;
}

function getLateGameClickShare() {
    const totalBuildings = getTotalBuildingsOwned();
    const prestigeLevel = Math.max(0, Math.floor(Number(gameState.prestigeCookies) || 0));
    const buildingShare = Math.min(
        ECONOMY_BALANCE.lateGameClickBuildingShareCap,
        totalBuildings * ECONOMY_BALANCE.lateGameClickBuildingSharePerBuilding
    );
    const prestigeShare = Math.min(
        ECONOMY_BALANCE.lateGameClickPrestigeShareCap,
        prestigeLevel * ECONOMY_BALANCE.lateGameClickPrestigeSharePerLevel
    );

    return Math.min(
        ECONOMY_BALANCE.lateGameClickShareCap,
        ECONOMY_BALANCE.lateGameClickBaseShare + buildingShare + prestigeShare
    );
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

export function getAchievementProgress(achievementId) {
    const achievement = achievements.find((entry) => entry.id === achievementId);
    if (!achievement) return null;

    const current = Math.max(0, Number(achievement.progress(gameState)) || 0);
    const target = Math.max(1, Number(achievement.target) || 1);
    const progressRatio = Math.min(1, current / target);
    const unlocked = Boolean(gameState.achievementsUnlocked[achievement.id]);
    const rewardDiamonds = getAchievementDiamondReward(achievement);

    return {
        ...achievement,
        current,
        target,
        progressRatio,
        unlocked,
        rarity: getAchievementRarity(achievement),
        rewardItems: getAchievementRewardItems(achievement.id),
        rewardDiamonds
    };
}

export function getAchievementsStatus() {
    syncAchievementStatsFromState();
    return achievements
        .map((achievement) => getAchievementProgress(achievement.id))
        .filter(Boolean);
}

function syncInventoryUnlocks() {
    inventoryItems.forEach((item) => {
        if (gameState.inventoryUnlocked[item.id]) return;
        if (gameState.achievementsUnlocked[item.unlockAchievementId]) {
            gameState.inventoryUnlocked[item.id] = true;
        }
    });
}

export function getInventoryStatus() {
    syncInventoryUnlocks();
    const now = Date.now();
    return inventoryItems.map((item) => {
        const activeMs = Math.max(0, Number(gameState.inventoryActiveUntil?.[item.id] || 0) - now);
        const cooldownMs = Math.max(0, Number(gameState.inventoryCooldownUntil?.[item.id] || 0) - now);
        const unlocked = Boolean(gameState.inventoryUnlocked?.[item.id]);
        const consumed = Boolean(gameState.inventoryConsumed?.[item.id]);
        const canUse = unlocked && !consumed && activeMs <= 0 && cooldownMs <= 0;
        return {
            ...item,
            unlocked,
            collected: unlocked,
            consumed,
            activeMs,
            cooldownMs,
            canUse
        };
    });
}

export function getActiveInventoryEffects() {
    return getInventoryStatus().filter((item) => item.activeMs > 0);
}

export function useInventoryItem(itemId) {
    const now = Date.now();
    const item = inventoryItems.find((entry) => entry.id === itemId);
    if (!item) return { success: false, reason: "missing" };
    syncInventoryUnlocks();

    if (!gameState.inventoryUnlocked[item.id] || gameState.inventoryConsumed[item.id]) {
        return { success: false, reason: "locked_or_consumed" };
    }

    const activeUntil = Number(gameState.inventoryActiveUntil?.[item.id] || 0);
    const cooldownUntil = Number(gameState.inventoryCooldownUntil?.[item.id] || 0);
    if (activeUntil > now || cooldownUntil > now) return { success: false, reason: "cooldown" };

    const effect = item.effect || {};
    if (effect.type === "instant_cookie_bonus") {
        const instantGain = Math.max(5_000, Math.floor((Number(gameState.cookies || 0) * 0.2) + (calculateCps() * 45)));
        addCookies(instantGain);
    } else {
        gameState.inventoryActiveUntil[item.id] = now + Math.max(0, Number(effect.durationMs || 0));
        gameState.inventoryCooldownUntil[item.id] = now + Math.max(0, Number(effect.cooldownMs || 0));
    }

    gameState.inventoryConsumed[item.id] = true;
    return { success: true, item };
}

export function unlockAvailableAchievements() {
    const unlockedNow = [];

    achievements.forEach((achievement) => {
        const progress = getAchievementProgress(achievement.id);
        if (!progress || progress.unlocked || progress.current < progress.target) return;
        gameState.achievementsUnlocked[achievement.id] = true;
        if (progress.rewardDiamonds > 0) {
            gameState.diamonds += progress.rewardDiamonds;
        }
        unlockedNow.push({
            ...progress,
            unlocked: true
        });
    });

    syncInventoryUnlocks();
    return unlockedNow;
}

export function claimAvailableQuests() {
    ensureDailyStats();
    const claimedNow = [];

    getActiveQuests().forEach((quest) => {
        const status = getQuestProgress(quest.id);
        if (!status.completed || status.claimed) return;

        gameState.questsClaimed[quest.id] = true;
        const rewardCookies = Number(quest.rewardCookies || 0);
        const rewardDiamonds = Number(quest.rewardDiamonds || 0);

        const streakBonus = Math.min(0.25, Number(gameState.dailyStreak || 0) * 0.01);
        if (rewardCookies > 0) addCookies(rewardCookies * (1 + streakBonus));
        if (rewardDiamonds > 0) gameState.diamonds += rewardDiamonds;

        claimedNow.push({ id: quest.id, label: quest.label, rewardCookies, rewardDiamonds });
    });

    return claimedNow;
}

let lastUpdate = Date.now();

export function gameLoop() {
    const now = Date.now();
    const rawDelta = (now - lastUpdate) / 1000;
    const delta = Number.isFinite(rawDelta)
        ? Math.max(0, Math.min(rawDelta, GAME_LOOP_MAX_DELTA_SECONDS))
        : 0;
    lastUpdate = now;

    tickGoldenSnus(now);

    const cps = calculateCps();
    const production = cps * delta;

    addCookies(production);
    if (now - Number(gameState.lastClickAt || 0) > CLICK_COMBO_WINDOW_MS) {
        gameState.clickCombo = 0;
    }

    requestAnimationFrame(gameLoop);
}

export function applyOfflineProgress(elapsedMs, capMs = 4 * 60 * 60 * 1000) {
    const safeElapsed = Math.max(0, Math.min(Number(elapsedMs) || 0, capMs));
    const baseEarned = calculateCps() * (safeElapsed / 1000);
    const gained = baseEarned * OFFLINE_PROGRESS_RATIO;
    addCookies(gained, { trackQuestProgress: false });
    return {
        gained,
        baseEarned,
        ratio: OFFLINE_PROGRESS_RATIO,
        elapsedMs: safeElapsed,
        capped: safeElapsed < (Number(elapsedMs) || 0)
    };
}

export function clickCookie() {
    ensureDailyStats();
    const now = Date.now();
    const elapsedSinceLastClick = Math.max(0, now - Number(gameState.lastClickAt || 0));
    if (elapsedSinceLastClick <= CLICK_COMBO_WINDOW_MS) {
        gameState.clickCombo = Math.min(CLICK_COMBO_MAX_LEVEL, Number(gameState.clickCombo || 0) + 1);
    } else {
        gameState.clickCombo = 1;
    }
    gameState.maxClickCombo = Math.max(Number(gameState.maxClickCombo || 0), Number(gameState.clickCombo || 0));
    gameState.lastClickAt = now;

    const comboMultiplier = computeComboMultiplier(gameState.clickCombo);
    const worldModifiers = getWorldModifiers();
    const worldMultiplier = worldModifiers.worldMultiplier * (1 + worldModifiers.clickBonus);
    const crit = Math.random() < Math.min(0.9, 0.12 + computeComboCritBonus(gameState.clickCombo) + getInventoryEffectBonuses().critChanceBonus);
    const cpsSupport = calculateCps() * getLateGameClickShare();

    const base = gameState.clickPower
        * getClickUpgradeMultiplier()
        * worldMultiplier
        * gameState.prestigeMultiplier
        * getClickBurstMultiplier()
        * comboMultiplier
        * getEarlyGameRampMultiplier()
        * (1 + (getPrestigeTalentEffects().clickBonusPercent / 100))
        * getInventoryEffectBonuses().incomeMultiplier;
    const amount = (base + cpsSupport) * (crit ? 2 : 1);

    addCookies(amount);
    gameState.totalClicks += 1;
    gameState.todayStats.clicks += 1;

    return { amount, crit, comboLevel: gameState.clickCombo, comboMultiplier };
}

export function buyBuilding(buildingId) {
    const building = buildings.find((b) => b.id === buildingId);
    const data = gameState.buildingData[buildingId];

    if (!building || !data) return false;

    const rawOwned = Number(data.owned);
    const owned = Number.isFinite(rawOwned) && rawOwned >= 0 ? Math.floor(rawOwned) : 0;
    if (data.owned !== owned) data.owned = owned;

    const preview = getEffectivePurchasePreview(building, owned, gameState.buyMode, gameState.cookies);
    const quantity = preview.quantity;
    const totalCost = preview.totalCost;
    
    if (gameState.cookies >= totalCost && quantity > 0) {
        gameState.cookies -= totalCost;
        data.owned = owned + quantity;
        syncAchievementStatsFromState();
        return true;
    }

    return false;
}

export function setBuyMode(mode) {
    if (mode === "max") {
        gameState.buyMode = "max";
        return;
    }

    const normalizedMode = Number.isFinite(mode) ? Math.floor(mode) : 1;
    gameState.buyMode = normalizedMode > 0 ? normalizedMode : 1;
}

export function buyWorld(worldId) {
    const world = getWorldById(worldId);
    if (!world) return false;
    if (gameState.unlockedWorldIds.includes(worldId)) return true;

    const canUnlock = isWorldUnlocked(world, gameState.cookies, {
        lifetimeCookies: gameState.lifetimeCookies,
        totalBuildings: getTotalBuildingsOwned(),
        prestigeCookies: gameState.prestigeCookies
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
