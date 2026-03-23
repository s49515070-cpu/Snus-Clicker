// =====================================
// GAME ENGINE – SNUS CLICKER
// Core Logik & Game Loop
// =====================================

import { buildings, getPurchaseCost, getBuildingCps } from "./buildings.js";
import { getWorldById, worlds, isWorldUnlocked } from "./worlds.js";

export const PRESTIGE_THRESHOLD = 1_000_000;
export const PRESTIGE_STEP_COST = 250_000;
const ACTIVE_BOOST_DURATION_MS = 30_000;
const ACTIVE_BOOST_COOLDOWN_MS = 30_000;
const ACTIVE_BOOST_MULTIPLIER = 3;
const CLICK_BURST_MULTIPLIER = 4;
const DISCOUNT_BURST_RATIO = 0.25;
const GOLDEN_SNUS_DURATION_MS = 12_000;
const GOLDEN_SNUS_BASE_COOLDOWN_MS = 50_000;
const GOLDEN_SNUS_RANDOM_COOLDOWN_MS = 40_000;

export const AUTO_BUYER_UNLOCK_COST = 30_000;
const AUTO_BUYER_MAX_PURCHASES_PER_TICK = 3;
const OFFLINE_PROGRESS_RATIO = 0.3;
const ACTIVE_DAILY_QUEST_COUNT = 3;

export const AUTO_BUYER_STRATEGIES = ["value", "cheap"];

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
        rewardDiamonds: 5,
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
        rewardCookies: 120_000,
        rewardDiamonds: 4,
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
        rewardCookies: 5_000,
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
        rewardCookies: 10_000,
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
        rewardCookies: 45_000,
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


export const buildingSynergies = [
    { sourceId: "farm", targetId: "cursor", bonusPerSource: 0.005, maxBonus: 0.4 },
    { sourceId: "factory", targetId: "farm", bonusPerSource: 0.004, maxBonus: 0.5 },
    { sourceId: "temple", targetId: "factory", bonusPerSource: 0.0035, maxBonus: 0.45 },
    { sourceId: "lab", targetId: "temple", bonusPerSource: 0.003, maxBonus: 0.4 },
    { sourceId: "exchange", targetId: "lab", bonusPerSource: 0.0025, maxBonus: 0.35 },
    { sourceId: "orbital", targetId: "exchange", bonusPerSource: 0.002, maxBonus: 0.3 }
];

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
    milestonePerks: {},
    goldenSnusAvailableUntil: 0,
    goldenSnusCooldownUntil: 0,
    goldenSnusReward: 0,
    prestigeTrackClaimed: {}
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
    const availableUntil = Number(gameState.goldenSnusAvailableUntil || 0);
    if (availableUntil > 0 && now > availableUntil) {
        gameState.goldenSnusAvailableUntil = 0;
        gameState.goldenSnusReward = 0;
        scheduleNextGoldenSnus(now);
        return;
    }

    if (availableUntil > now) return;

    const cooldownUntil = Number(gameState.goldenSnusCooldownUntil || 0);
    if (cooldownUntil <= 0) {
        scheduleNextGoldenSnus(now);
        return;
    }

    if (now >= cooldownUntil) {
        gameState.goldenSnusReward = rollGoldenSnusReward();
        gameState.goldenSnusAvailableUntil = now + GOLDEN_SNUS_DURATION_MS;
        gameState.goldenSnusCooldownUntil = now + GOLDEN_SNUS_DURATION_MS;
    }
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

function resetPrestigeTrack() {
    gameState.prestigeTrackClaimed = {};
    prestigeTrackRewards.forEach((reward) => {
        gameState.prestigeTrackClaimed[reward.level] = false;
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
    gameState.milestonePerks = {};
    gameState.goldenSnusAvailableUntil = 0;
    gameState.goldenSnusCooldownUntil = 0;
    gameState.goldenSnusReward = 0;
    
    rotateDailyQuestsForToday();
    resetBuildingData();
    resetPrestigeUpgrades();
    resetPrestigeTrack();
    resetMilestones();
    resetQuests();
}

resetGameState();

function getUpgradeLevel(upgradeId) {
    const value = Number(gameState.prestigeUpgradeLevels[upgradeId] || 0);
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

export function getPrestigeMultiplierForLevel(prestigeLevel) {
    const safeLevel = Math.max(0, Math.floor(Number(prestigeLevel) || 0));
    return 1 + safeLevel * 0.01;
}

function getCpsUpgradeMultiplier() {
    const level = getUpgradeLevel("snusAlchemy");
    return 1 + level * 0.05;
}

function getClickUpgradeMultiplier() {
    const level = getUpgradeLevel("clickMastery");
    return 1 + level * 0.25;
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
            const rawBonus = sourceOwned * Number(entry.bonusPerSource || 0);
            return sum + Math.min(Number(entry.maxBonus || 0), Math.max(0, rawBonus));
        }, 0);

    return 1 + bonus;
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
        autoBuyerExtraPurchases: getUpgradeLevel("automationCore") + (gameState.milestonePerks?.autobuyer_speed ? 1 : 0),
        goldenSnusAvailable: Date.now() < Number(gameState.goldenSnusAvailableUntil || 0),
        goldenSnusReward: Math.max(0, Math.floor(Number(gameState.goldenSnusReward || 0)))
    };
}

export function getGoldenSnusState() {
    const now = Date.now();
    const availableUntil = Number(gameState.goldenSnusAvailableUntil || 0);
    const available = availableUntil > now;
    return {
        available,
        remainingMs: available ? Math.max(0, availableUntil - now) : 0,
        reward: Math.max(0, Math.floor(Number(gameState.goldenSnusReward || 0)))
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

    const candidates = buildings
        .map((building) => {
            const data = gameState.buildingData[building.id];
            if (!data) return null;

            const rawOwned = Number(data.owned);
            const owned = Number.isFinite(rawOwned) && rawOwned >= 0 ? Math.floor(rawOwned) : 0;
            const preview = getEffectivePurchasePreview(building, owned, 1, availableBudget);
            const cost = Number(preview.totalCost || 0);
            if (cost <= 0 || preview.quantity < 1 || cost > availableBudget) return null;

            const synergyBonusPercent = Math.max(0, Number(getBuildingSynergyBonusPercent(building.id) || 0));
            const cpsGain = building.baseCps * (1 + synergyBonusPercent / 100);
            const valueScore = cost > 0 && Number.isFinite(cpsGain) ? cpsGain / cost : 0;
            const affordabilityScore = cost > 0 ? 1 / cost : 0;
            const paybackSeconds = cpsGain > 0 ? cost / cpsGain : Number.POSITIVE_INFINITY;

            return {
                buildingId: building.id,
                cost,
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
        return candidates.reduce((best, candidate) => (
            isCandidateBetterForStrategy(candidate, best, strategy) ? candidate : best
        ), null);
    }

    return candidates.reduce((best, candidate) => {
        if (!best) return candidate;
        if (candidate.valueScore > best.valueScore) return candidate;
        if (candidate.valueScore < best.valueScore) return best;
        return isCandidateBetterForStrategy(candidate, best, strategy) ? candidate : best;
    }, null);
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
    const progress = getPrestigeProgressState();
    return progress.potentialGain;
}

export function getPrestigeCostForLevel(currentPrestigeLevel) {
    const level = Math.max(0, Math.floor(Number(currentPrestigeLevel) || 0));
    return PRESTIGE_THRESHOLD + (level * PRESTIGE_STEP_COST);
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
    return {
        lose: {
            cookies: Math.floor(gameState.cookies)
        },
        gain: {
            prestigeCookies: getPotentialPrestigeGain()
        }
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

    buildings.forEach((b) => {
        const rawOwned = Number(gameState.buildingData[b.id]?.owned);
        const owned = Number.isFinite(rawOwned) && rawOwned >= 0 ? Math.floor(rawOwned) : 0;
        const synergyMultiplier = getBuildingSynergyMultiplier(b.id);
        total += getBuildingCps(b, owned) * synergyMultiplier;
    });

    const worldModifiers = getWorldModifiers();
    total *= worldModifiers.worldMultiplier;
    total *= 1 + worldModifiers.cpsBonus;
    total *= gameState.prestigeMultiplier;
    total *= getCpsUpgradeMultiplier();
    total *= getActiveBoostMultiplier();

    return total;
}

function getLateGameClickShare() {
    const totalBuildings = getTotalBuildingsOwned();
    const prestigeLevel = Math.max(0, Math.floor(Number(gameState.prestigeCookies) || 0));
    const milestoneBonus = gameState.milestonePerks?.skill_power ? 0.005 : 0;
    const buildingShare = Math.min(0.03, totalBuildings * 0.00012);
    const prestigeShare = Math.min(0.02, prestigeLevel * 0.0007);

    return Math.min(0.06, 0.01 + buildingShare + prestigeShare + milestoneBonus);
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
        const rewardDiamonds = Number(milestone.rewardDiamonds || 0);

        if (rewardCookies > 0) {
            addCookies(rewardCookies);
        }

        if (rewardDiamonds > 0) {
            gameState.diamonds += rewardDiamonds;
        }

        if (milestone.rewardPerk) {
            gameState.milestonePerks[milestone.rewardPerk] = true;
        }

        claimedNow.push({ id: milestone.id, label: milestone.label, rewardCookies, rewardDiamonds });
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
    const delta = (now - lastUpdate) / 1000;
    lastUpdate = now;

    tickGoldenSnus(now);

    const cps = calculateCps();
    const production = cps * delta;

    addCookies(production);

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
    const worldModifiers = getWorldModifiers();
    const worldMultiplier = worldModifiers.worldMultiplier * (1 + worldModifiers.clickBonus);
    const crit = Math.random() < 0.12;
    const cpsSupport = calculateCps() * getLateGameClickShare();

    const base = gameState.clickPower * getClickUpgradeMultiplier() * worldMultiplier * gameState.prestigeMultiplier * getClickBurstMultiplier();
    const amount = (base + cpsSupport) * (crit ? 2 : 1);

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

    const preview = getEffectivePurchasePreview(building, owned, gameState.buyMode, gameState.cookies);
    const quantity = preview.quantity;
    const totalCost = preview.totalCost;
    
    if (gameState.cookies >= totalCost && quantity > 0) {
        gameState.cookies -= totalCost;
        data.owned = owned + quantity;
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
