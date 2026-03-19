import assert from 'node:assert/strict';

import {
  gameState,
  prestigeUpgrades,
  getPrestigeUpgradeCost,
  buyPrestigeUpgrade,
  setBuyMode,
  buyBuilding,
  getPotentialPrestigeGain,
  prestigeReset,
  getPrestigeTrackStatus,
  prestigeTrackRewards,
  buyWorld,
  changeWorld,
  isWorldPurchased,
  claimAvailableMilestones,
  claimAvailableQuests,
  milestones,
  quests,
  getActiveQuests,
  runAutoBuyerTick,
  setAutoBuyerStrategy,
  setAutoBuyerWeights,
  getAutoBuyerWeights,
  getAutoBuyerStatus,
  getActiveBonuses,
  claimGoldenSnus,
  getGoldenSnusState,
  calculateCps,
  getBuildingSynergyBonusPercent,
  getEffectivePurchasePreview,
  activateDiscountBurst,
} from '../js/engine.js';

import { buildings, getMaxAffordable, getMaxAffordableSummary } from '../js/buildings.js';
import { getWorldById, getWorldUnlockDetails } from '../js/worlds.js';
import { createBuildingsUIController } from '../js/ui-buildings.js';
import { createPrestigeUIController } from '../js/ui-prestige.js';
import {
  WORD_LENGTH,
  applyKeyInput,
  buildBoard,
  createDailySeed,
  createInitialGameState,
  evaluateGuess,
  submitGuess,
} from '../js/wordle-logic.js';

const localStorageMock = (() => {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    }
  };
})();

globalThis.localStorage = localStorageMock;

const configModule = await import('../js/config.js');
const {
  runtimeConfig,
  loadConfig,
  updateAutosaveInterval,
  updateUiRefreshInterval,
  getAutosaveInterval,
  getUiRefreshInterval,
  resetRuntimeConfig,
} = configModule;
const { updateLanguage, getLanguage } = configModule;
const { t } = await import('../js/i18n.js');

function resetEngineState() {
  gameState.cookies = 0;
  gameState.lifetimeCookies = 0;
  gameState.lifetimeCookiesAtLastPrestige = 0;
  gameState.prestigeCookies = 0;
  gameState.diamonds = 0;
  gameState.buyMode = 1;
  gameState.currentWorld = 1;
  gameState.unlockedWorldIds = [1];
  gameState.prestigeMultiplier = 1;
  gameState.clickPower = 1;
  gameState.activeDailyQuestIds = quests.filter((quest) => quest.isDaily).slice(0, 2).map((quest) => quest.id);
  gameState.goldenSnusAvailableUntil = 0;
  gameState.goldenSnusCooldownUntil = 0;
  gameState.goldenSnusReward = 0;

  Object.keys(gameState.buildingData).forEach((id) => {
    gameState.buildingData[id].owned = 0;
  });

  Object.keys(gameState.prestigeUpgradeLevels).forEach((id) => {
    gameState.prestigeUpgradeLevels[id] = 0;
  });

  Object.keys(gameState.milestonesClaimed || {}).forEach((id) => {
    gameState.milestonesClaimed[id] = false;
  });
}

function mockDomForUiImports() {
  globalThis.document = {
    body: { style: {} },
    getElementById() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    createElement() {
      return {
        className: '',
        textContent: '',
        style: {},
        dataset: {},
        append() {},
        appendChild() {},
        setAttribute() {},
        classList: { toggle() {}, add() {}, remove() {} }
      };
    }
  };
}

function createMockElement(tag = 'div') {
  return {
    tag,
    className: '',
    textContent: '',
    innerHTML: '',
    style: {},
    dataset: {},
    disabled: false,
    children: [],
    listeners: {},
    append(...items) {
      this.children.push(...items);
    },
    appendChild(item) {
      this.children.push(item);
    },
    setAttribute() {},
    addEventListener(event, handler) {
      this.listeners[event] = handler;
    },
    classList: {
      toggle() {},
      add() {},
      remove() {}
    }
  };
}

function installControllerDocumentMock() {
  globalThis.Element = class {};
  globalThis.document = {
    createElement(tag) {
      return createMockElement(tag);
    }
  };
}

function testBuildingsControllerRendersAfterPurchase() {
  resetEngineState();
  installControllerDocumentMock();

  const leftColumn = createMockElement('section');
  const rightColumn = createMockElement('section');

  const controller = createBuildingsUIController({
    gameState,
    buildings,
    getBuildingCost: (building, owned) => Math.floor(building.baseCost * Math.pow(building.growth, owned)),
    getPurchaseCost: (building, owned, quantity) => {
      let total = 0;
      for (let i = 0; i < quantity; i += 1) {
        total += Math.floor(building.baseCost * Math.pow(building.growth, owned + i));
      }
      return total;
    },
    getMaxAffordableSummary: (building, owned, cookies) => {
      let count = 0;
      let totalCost = 0;
      while (true) {
        const cost = Math.floor(building.baseCost * Math.pow(building.growth, owned + count));
        if (totalCost + cost > cookies) break;
        totalCost += cost;
        count += 1;
      }
      return { count, totalCost };
    },
    buyBuilding,
    formatNumber: (n) => String(Math.floor(n)),
    leftColumn,
    rightColumn
  });

  gameState.cookies = 1000;
  gameState.buyMode = 1;
  gameState.buildingData.cursor.owned = '0';

  controller.renderBuildings();

  const clickHandler = leftColumn.listeners.click;
  assert.equal(typeof clickHandler, 'function', 'building click handler should be registered');

  const buildingTarget = new Element();
  buildingTarget.closest = () => ({ dataset: { buildingId: 'cursor' } });
  clickHandler({ target: buildingTarget });

  assert.equal(gameState.buildingData.cursor.owned, 1, 'building purchase via controller should update owned count immediately');
}


function testBuildingsControllerMarksBestBuy() {
  resetEngineState();
  installControllerDocumentMock();

  const leftColumn = createMockElement('section');
  const rightColumn = createMockElement('section');

  const controller = createBuildingsUIController({
    gameState,
    buildings,
    getBuildingCost: (building, owned) => Math.floor(building.baseCost * Math.pow(building.growth, owned)),
    getPurchaseCost: (building, owned, quantity) => {
      let total = 0;
      for (let i = 0; i < quantity; i += 1) {
        total += Math.floor(building.baseCost * Math.pow(building.growth, owned + i));
      }
      return total;
    },
    getMaxAffordableSummary: (building, owned, cookies) => {
      let count = 0;
      let totalCost = 0;
      while (true) {
        const cost = Math.floor(building.baseCost * Math.pow(building.growth, owned + count));
        if (totalCost + cost > cookies) break;
        totalCost += cost;
        count += 1;
      }
      return { count, totalCost };
    },
    buyBuilding,
    formatNumber: (n) => String(Math.floor(n)),
    t: (key) => (key === 'bestBuy' ? 'Best Buy' : key),
    leftColumn,
    rightColumn
  });

  controller.renderBuildings();

  const farmCard = rightColumn.children.find((card) => card.dataset?.buildingId === 'farm');
  assert.ok(farmCard, 'farm card should be rendered');

  const titleNode = farmCard.children?.[1]?.children?.[0];
  assert.ok(String(titleNode?.innerHTML || '').includes('Best Buy'), 'best value building should be marked in title');
}

function testBuildingsControllerRoiUsesMaxQuantity() {
  resetEngineState();
  installControllerDocumentMock();

  const leftColumn = createMockElement('section');
  const rightColumn = createMockElement('section');

  const controller = createBuildingsUIController({
    gameState,
    buildings,
    getBuildingCost: (building, owned) => Math.floor(building.baseCost * Math.pow(building.growth, owned)),
    getPurchaseCost: (building, owned, quantity) => {
      let total = 0;
      for (let i = 0; i < quantity; i += 1) {
        total += Math.floor(building.baseCost * Math.pow(building.growth, owned + i));
      }
      return total;
    },
    getMaxAffordableSummary: (building, owned, cookies) => {
      let count = 0;
      let totalCost = 0;
      while (true) {
        const cost = Math.floor(building.baseCost * Math.pow(building.growth, owned + count));
        if (totalCost + cost > cookies) break;
        totalCost += cost;
        count += 1;
      }
      return { count, totalCost };
    },
    buyBuilding,
    formatNumber: (n) => String(Math.floor(n)),
    leftColumn,
    rightColumn
  });

  gameState.cookies = 1000;
  gameState.buyMode = 'max';

  controller.renderBuildings();

  const farmCard = rightColumn.children.find((card) => card.dataset?.buildingId === 'farm');
  assert.ok(farmCard, 'farm card should be rendered');

  const forecastNode = farmCard.children?.[1]?.children?.[5];
  assert.ok(String(forecastNode?.textContent || '').includes('ROI:'), 'ROI forecast should be rendered for MAX mode');
  assert.ok(String(forecastNode?.textContent || '').includes('SPS: +'), 'SPS gain should be shown in building info');
  assert.equal(String(forecastNode?.textContent || '').includes('—'), false, 'ROI should be numeric in MAX mode when purchases are possible');
}

function testBuyModeSanitizesFractionalValues() {
  resetEngineState();

  gameState.cookies = 100;
  setBuyMode(1.7);
  const purchased = buyBuilding('cursor');

  assert.equal(purchased, true, 'purchase should still succeed with fractional buy mode input');
  assert.equal(gameState.buyMode, 1, 'setBuyMode should normalize fractional mode values to whole numbers');
  assert.equal(gameState.buildingData.cursor.owned, 1, 'fractional buy mode must not create partial building ownership');
}

function testPrestigeControllerCallbacks() {
  resetEngineState();
  installControllerDocumentMock();

  const prestigeUpgradesEl = createMockElement('section');
  const prestigeButton = createMockElement('button');
  const prestigeSummaryEl = createMockElement('div');

  let upgradePurchasedCalls = 0;
  let prestigeResetCalls = 0;

  const controller = createPrestigeUIController({
    gameState,
    prestigeUpgrades,
    prestigeUpgradesEl,
    prestigeSummaryEl,
    prestigeButton,
    getPrestigeUpgradeCost,
    getPrestigeEffects: () => ({ clickBonusPercent: 0, cpsBonusPercent: 0 }),
    getPotentialPrestigeGain: () => 2,
    buyPrestigeUpgrade,
    prestigeReset: () => 2,
    showToast: () => {},
    onUpgradePurchased: () => {
      upgradePurchasedCalls += 1;
    },
    onPrestigeReset: () => {
      prestigeResetCalls += 1;
    }
  });

  gameState.diamonds = 100;
  controller.renderPrestigeUpgrades();

  const upgradeClickHandler = prestigeUpgradesEl.listeners.click;
  assert.equal(typeof upgradeClickHandler, 'function', 'prestige upgrade click handler should be registered');

  const prestigeTarget = new Element();
  prestigeTarget.closest = () => ({ dataset: { upgradeId: prestigeUpgrades[0].id } });
  upgradeClickHandler({ target: prestigeTarget });

  assert.equal(upgradePurchasedCalls, 1, 'upgrade purchase callback should be called once');

  const resetClickHandler = prestigeButton.listeners.click;
  assert.equal(typeof resetClickHandler, 'function', 'prestige reset click handler should be registered');
  resetClickHandler();

  assert.equal(prestigeResetCalls, 1, 'prestige reset callback should be called once');
}

function testPrestigeCostsIncrease() {
  resetEngineState();

  const upgrade = prestigeUpgrades[0];
  const c1 = getPrestigeUpgradeCost(upgrade.id);
  gameState.prestigeUpgradeLevels[upgrade.id] = 1;
  const c2 = getPrestigeUpgradeCost(upgrade.id);

  assert.ok(c2 > c1, 'prestige upgrade cost should increase with level');
}

function testPrestigePurchaseRules() {
  resetEngineState();

  const upgrade = prestigeUpgrades[0];
  const cost = getPrestigeUpgradeCost(upgrade.id);

  assert.equal(buyPrestigeUpgrade(upgrade.id), false, 'cannot buy without enough diamonds');

  gameState.diamonds = cost;
  assert.equal(buyPrestigeUpgrade(upgrade.id), true, 'can buy with enough diamonds');
  assert.equal(gameState.prestigeUpgradeLevels[upgrade.id], 1, 'purchase should increase level');
  assert.equal(gameState.diamonds, 0, 'purchase should deduct cost');
}

function testPotentialPrestigeGain() {
  resetEngineState();
  gameState.lifetimeCookies = 2_750_000;
  gameState.lifetimeCookiesAtLastPrestige = 1_000_000;

  assert.equal(getPotentialPrestigeGain(), 1, 'potential prestige gain should only count lifetime gained since last prestige');
}

function testPotentialPrestigeGainCannotBeClaimedTwice() {
  resetEngineState();
  gameState.lifetimeCookies = 2_750_000;

  const firstGain = getPotentialPrestigeGain();
  assert.equal(firstGain, 2, 'first prestige gain should be based on eligible lifetime cookies');

  const earned = prestigeReset();
  assert.equal(earned, 2, 'prestige reset should award expected amount once');
  assert.equal(getPotentialPrestigeGain(), 0, 'prestige should not be re-claimable without new lifetime progress');
}



function testPrestigeTrackAwardsBacklogDiamonds() {
  resetEngineState();

  gameState.prestigeCookies = 3;
  gameState.diamonds = 0;
  gameState.prestigeTrackClaimed = {};

  const earned = prestigeReset();
  const claimedRewards = getPrestigeTrackStatus().filter((entry) => entry.claimed);

  assert.equal(earned, 0, 'prestige reset should not run when no new prestige is available');
  assert.equal(gameState.diamonds, 25, 'already reached trophy levels should still grant missing diamond rewards');
  assert.deepEqual(
    claimedRewards.map((entry) => entry.level),
    [1, 2, 3],
    'rewards up to current prestige level should be marked as claimed'
  );
}

function testPrestigeTrackExtendsToLevelHundred() {
  assert.equal(prestigeTrackRewards.length, 100, 'trophy path should define rewards through level 100');
  assert.equal(prestigeTrackRewards[0].level, 1, 'trophy path should start at level 1');
  assert.equal(prestigeTrackRewards.at(-1)?.level, 100, 'trophy path should end at level 100');
  assert.ok(
    prestigeTrackRewards.every((entry, index) => entry.level === index + 1),
    'trophy path should include every level without gaps'
  );
}

function testPrestigeTrackDiamondCadence() {
  const rewardLevels = prestigeTrackRewards
    .filter((entry) => entry.rewardDiamonds > 0)
    .map((entry) => entry.level);

  assert.deepEqual(
    rewardLevels.slice(0, 16),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 25],
    'trophy path should reward every level to 10, every 2 levels to 20, then every 5 levels'
  );
  assert.equal(rewardLevels.at(-1), 100, 'trophy path should keep diamond rewards through level 100');
  assert.equal(prestigeTrackRewards.find((entry) => entry.level === 11)?.rewardDiamonds, 0, 'level 11 should not grant diamonds');
  assert.equal(prestigeTrackRewards.find((entry) => entry.level === 21)?.rewardDiamonds, 0, 'level 21 should not grant diamonds');
}

function testWorldMustBePurchasedBeforeSwitch() {
  resetEngineState();

  gameState.cookies = 300;
  gameState.lifetimeCookies = 1_999;
  gameState.buildingData.cursor.owned = 15;
  assert.equal(buyWorld(2), false, 'world purchase should fail when lifetime requirement is not met');
  assert.equal(changeWorld(2), false, 'cannot switch to locked world without purchasing');

  gameState.lifetimeCookies = 2_000;
  assert.equal(buyWorld(2), true, 'world purchase should succeed when cost and requirements are met');
  assert.equal(isWorldPurchased(2), true, 'purchased world should be persisted in unlocked list');
  assert.equal(gameState.cookies, 50, 'buying a world should deduct unlock cost from current cookies');

  assert.equal(changeWorld(2), true, 'can switch after world is purchased');
  assert.equal(gameState.currentWorld, 2, 'current world should update after successful switch');
}


function testWorldThreeNeedsBuildingRequirement() {
  resetEngineState();
  const worldThree = getWorldById(3);
  assert.ok(worldThree, 'world 3 should exist');

  gameState.cookies = 6_000;
  gameState.lifetimeCookies = 150_000;
  gameState.buildingData.cursor.owned = 59;

  assert.equal(buyWorld(3), false, 'world purchase should fail when building requirement is missing');

  gameState.buildingData.cursor.owned = 60;
  assert.equal(buyWorld(3), true, 'world purchase should succeed once building requirement is met');
}


function testWorldUnlockDetailsReportsMissingProgress() {
  const worldTwo = getWorldById(2);
  assert.ok(worldTwo, 'world 2 should exist');

  const details = getWorldUnlockDetails(worldTwo, 100, { lifetimeCookies: 1000, totalBuildings: 5 });
  assert.equal(details.unlocked, false, 'unlock details should report locked when requirements are missing');
  assert.ok(details.missingCost > 0, 'unlock details should report missing cost');
  assert.ok(details.missingLifetime > 0, 'unlock details should report missing lifetime');
  assert.ok(details.missingBuildings > 0, 'unlock details should report missing buildings');
}

function testBuyModeSanitizing() {
  resetEngineState();

  setBuyMode(-10);
  assert.equal(gameState.buyMode, 1, 'negative buy mode should fallback to 1');

  setBuyMode('max');
  assert.equal(gameState.buyMode, 'max', 'max buy mode should be accepted');

  setBuyMode(10);
  assert.equal(gameState.buyMode, 10, 'positive numeric buy mode should be accepted');
}

function testMaxAffordableSummaryMatchesCount() {
  const cursor = buildings.find((b) => b.id === 'cursor');
  assert.ok(cursor, 'cursor building should exist');

  const owned = 35;
  const cookies = 5_000_000;

  const summary = getMaxAffordableSummary(cursor, owned, cookies);
  const count = getMaxAffordable(cursor, owned, cookies);

  assert.equal(summary.count, count, 'summary count should match getMaxAffordable');
  assert.ok(summary.totalCost >= 0, 'summary total cost should be non-negative');
  assert.ok(summary.totalCost <= cookies, 'summary total cost should never exceed available cookies');
}

function testBuyBuildingNormalizesOwnedType() {
  resetEngineState();
  gameState.cookies = 1000;
  gameState.buyMode = 1;
  gameState.buildingData.cursor.owned = '0';

  const purchased = buyBuilding('cursor');

  assert.equal(purchased, true, 'purchase should succeed with numeric-string owned value');
  assert.equal(gameState.buildingData.cursor.owned, 1, 'owned should be normalized to number and incremented');
}

function testBuildingPurchaseNeedsValidId() {
  resetEngineState();
  gameState.cookies = 1000;

  assert.equal(buyBuilding('not_a_building'), false, 'invalid building ids should not purchase');
}


function testMilestoneClaimingRewards() {
  resetEngineState();
  gameState.cookies = 0;
  gameState.lifetimeCookies = 12_000;

  const claims = claimAvailableMilestones();
  const rookie = milestones.find((m) => m.id === 'lifetime_10k');

  assert.ok(rookie, 'rookie milestone should exist');
  assert.ok(claims.some((m) => m.id === rookie.id), 'milestone should be claimed when target is met');
  assert.equal(gameState.milestonesClaimed[rookie.id], true, 'claimed milestone should persist in state');
  assert.ok(gameState.cookies >= rookie.rewardCookies, 'milestone claim should reward cookies');
}


function testMidgameQuestClaimingRewards() {
  resetEngineState();
  gameState.cookies = 0;
  gameState.todayStats.earned = 60_000;
  gameState.activeDailyQuestIds = ['daily_earned_50k'];

  const claims = claimAvailableQuests();
  const dailyEarn = quests.find((q) => q.id === 'daily_earned_50k');

  assert.ok(dailyEarn, 'daily earned quest should exist');
  assert.ok(claims.some((q) => q.id === dailyEarn.id), 'daily earned quest should be claimable when target is met');
  assert.equal(gameState.questsClaimed[dailyEarn.id], true, 'claimed daily quest should persist in state');
  assert.ok(gameState.cookies >= dailyEarn.rewardCookies, 'claimed daily quest should grant cookie reward');
}


function testAutoBuyerPrioritizesBestValuePurchases() {
  resetEngineState();
  gameState.cookies = 1000;
  gameState.autoBuyerUnlocked = true;
  gameState.autoBuyerEnabled = true;

  const purchases = runAutoBuyerTick();

  assert.equal(purchases, 3, 'auto-buyer should execute up to its per-tick purchase limit');
  assert.equal(gameState.buildingData.farm.owned, 3, 'auto-buyer should prioritize best cps-per-cost purchases first');
  assert.equal(gameState.buildingData.cursor.owned, 0, 'lower-value buildings should not be bought while better options are affordable');
}


function testAutoBuyerStrategyCheapPrefersLowCost() {
  resetEngineState();
  gameState.cookies = 50;
  gameState.autoBuyerUnlocked = true;
  gameState.autoBuyerEnabled = true;
  setAutoBuyerStrategy('cheap');

  const purchases = runAutoBuyerTick();

  assert.equal(purchases, 3, 'cheap strategy should still honor purchase limit when affordable');
  assert.equal(gameState.buildingData.cursor.owned, 3, 'cheap strategy should prioritize lower-cost buildings');
}


function testAutoBuyerStrategyReserveKeepsSavings() {
  resetEngineState();
  gameState.cookies = 100;
  gameState.autoBuyerUnlocked = true;
  gameState.autoBuyerEnabled = true;
  setAutoBuyerStrategy('reserve');

  const purchases = runAutoBuyerTick();

  assert.ok(purchases >= 1, 'reserve strategy should still buy when budget allows');
  assert.ok(gameState.cookies >= 20, 'reserve strategy should keep about 20% of cookies unspent');
}

function testAutoBuyerStrategyCustomUsesWeightsAndPersistsDecision() {
  resetEngineState();
  gameState.cookies = 60;
  gameState.autoBuyerUnlocked = true;
  gameState.autoBuyerEnabled = true;
  setAutoBuyerStrategy('custom');
  setAutoBuyerWeights(0, 1);

  const purchases = runAutoBuyerTick();
  const weights = getAutoBuyerWeights();
  const status = getAutoBuyerStatus();

  assert.equal(purchases, 3, 'custom strategy should still run purchase loop');
  assert.equal(gameState.buildingData.cursor.owned, 3, 'custom strategy with cheap weight should prefer cursor');
  assert.ok(weights.value >= 0 && weights.value <= 1, 'custom value weight should be clamped to [0,1]');
  assert.ok(weights.cheap >= 0 && weights.cheap <= 1, 'custom cheap weight should be clamped to [0,1]');
  assert.ok(String(status.decision).includes('cursor'), 'auto-buyer should store last decision for UI transparency');
}

function testBuyBuildingAppliesWorldDiscountModifier() {
  resetEngineState();
  gameState.cookies = 100;
  gameState.currentWorld = 2;
  gameState.unlockedWorldIds = [1, 2];
  gameState.buyMode = 1;

  const before = gameState.cookies;
  const purchased = buyBuilding('farm');

  assert.equal(purchased, true, 'farm should be purchasable in world 2 with discount and 100 cookies');
  assert.ok(gameState.cookies > before - 90, 'world discount should reduce effective building cost');
}

function testActiveBonusesExposeWorldAndAutomationState() {
  resetEngineState();
  gameState.currentWorld = 2;
  gameState.unlockedWorldIds = [1, 2];
  gameState.dailyStreak = 5;
  gameState.autoBuyerUnlocked = true;
  gameState.autoBuyerEnabled = true;
  gameState.prestigeUpgradeLevels.automationCore = 2;
  gameState.milestonePerks.autobuyer_speed = true;

  const bonuses = getActiveBonuses();

  assert.ok(bonuses.worldClickBonusPercent > 0, 'world click bonus should be surfaced in active bonuses');
  assert.ok(bonuses.worldDiscountPercent > 0, 'world discount should be surfaced in active bonuses');
  assert.equal(bonuses.streakBonusPercent, 5, 'daily streak bonus should be reflected in active bonuses');
  assert.equal(bonuses.autoBuyerExtraPurchases, 3, 'automation level + perk should affect auto-buyer cap preview');
}


function testDailyQuestRotationMaintainsActiveSubset() {
  resetEngineState();

  const active = getActiveQuests().filter((quest) => quest.isDaily);
  assert.equal(active.length, 2, 'daily rotation should keep exactly two active daily quests');

  active.forEach((quest) => {
    assert.equal(quest.isDaily, true, 'active rotated daily entries should be daily quests');
  });
}

function testConfigReset() {
  localStorage.clear();

  updateAutosaveInterval(60000);
  updateUiRefreshInterval(250);

  const defaults = resetRuntimeConfig();

  assert.equal(defaults.autosaveIntervalMs, 5000, 'reset should restore default autosave interval');
  assert.equal(defaults.uiRefreshIntervalMs, 100, 'reset should restore default ui refresh interval');

  runtimeConfig.autosaveIntervalMs = 12345;
  runtimeConfig.uiRefreshIntervalMs = 123;
  loadConfig();

  assert.equal(getAutosaveInterval(), 5000, 'reset defaults should persist to storage');
  assert.equal(getUiRefreshInterval(), 100, 'reset defaults should persist to storage');
}

function testLocalizedContentKeysForMilestonesAndQuests() {
  updateLanguage('en');
  assert.equal(t('questDailyClicks200Label'), 'Daily: 200 clicks', 'quest label should be translated in english');
  assert.equal(t('milestoneRookieDescription'), 'Reach 10,000 lifetime snus', 'milestone description should be translated in english');
  assert.equal(t('saveMigrated', { version: 3 }), '💾 Save was migrated to version 3.', 'save migration message should be translated in english');

  updateLanguage('de');
  assert.equal(t('questDailyClicks200Label'), 'Daily: 200 Klicks', 'quest label should be translated in german');
  assert.equal(t('milestoneRookieDescription'), 'Erreiche 10.000 Lifetime-Snus', 'milestone description should be translated in german');
  assert.equal(t('saveMigrated', { version: 3 }), '💾 Spielstand wurde auf Version 3 migriert.', 'save migration message should be translated in german');

  assert.equal(getLanguage(), 'de', 'language should be reset to default test language after assertions');
}

function testConfigClampingAndPersistence() {
  localStorage.clear();
  runtimeConfig.autosaveIntervalMs = 5000;
  runtimeConfig.uiRefreshIntervalMs = 100;

  const autosave = updateAutosaveInterval(999999);
  const uiRefresh = updateUiRefreshInterval(1);

  assert.equal(autosave, 60000, 'autosave interval should clamp to max');
  assert.equal(uiRefresh, 16, 'ui refresh interval should clamp to min');

  runtimeConfig.autosaveIntervalMs = 5000;
  runtimeConfig.uiRefreshIntervalMs = 100;
  loadConfig();

  assert.equal(getAutosaveInterval(), 60000, 'persisted autosave interval should reload from storage');
  assert.equal(getUiRefreshInterval(), 16, 'persisted ui refresh interval should reload from storage');
}

async function testLoadGameNormalization() {
  resetEngineState();
  mockDomForUiImports();

  const { loadGame } = await import('../js/save.js');

  localStorage.setItem('snus_clicker_save', JSON.stringify({
    saveVersion: 1,
    cookies: -5,
    lifetimeCookies: -10,
    lifetimeCookiesAtLastPrestige: 999, 
    prestigeCookies: 3,
    currentWorld: 999,
    buyMode: -2,
    prestigeMultiplier: -1,
    clickPower: -4,
    buildingData: {
      cursor: { owned: -20 }
    },
    prestigeUpgradeLevels: {
      clickMastery: 999
    },
    dailyStats: {
      clicks: 12,
      earned: 345,
      resetDayKey: 'old-day-key'
    },
    autoBuyerWeight: 0.6,
    autoBuyerWeights: { value: 5, cheap: -3 },
    milestonePeks: {
      discount_3: true
    }
  }));

  loadGame();

  assert.equal(gameState.cookies, 0, 'cookies should normalize to non-negative');
  assert.equal(gameState.lifetimeCookiesAtLastPrestige, 0, 'last prestige lifetime should clamp to valid range');
  assert.equal(gameState.currentWorld, 1, 'invalid world should fallback to 1');
  assert.deepEqual(gameState.unlockedWorldIds, [1], 'unlocked worlds should normalize and always keep world 1');
  assert.equal(gameState.buyMode, 1, 'invalid buy mode should fallback to 1');
  assert.equal(gameState.prestigeMultiplier, 1, 'prestige multiplier should clamp to min 1');
  assert.equal(gameState.clickPower, 1, 'click power should clamp to min 1');
  assert.equal(gameState.buildingData.cursor.owned, 0, 'negative owned building count should clamp to 0');
  assert.equal(gameState.saveVersion, 3, 'save should be migrated to current save version');
  assert.equal(gameState.milestonePerks.discount_3, true, 'legacy milestonePeks field should migrate to milestonePerks');
  assert.equal(gameState.todayStats.clicks, 12, 'legacy dailyStats should migrate to todayStats');
  assert.equal(gameState.autoBuyerWeights.value, 1, 'autoBuyerWeights value should clamp and normalize');
  assert.equal(gameState.autoBuyerWeights.cheap, 0, 'autoBuyerWeights cheap should clamp and normalize');
  assert.equal(Array.isArray(gameState.migrationMeta.steps), true, 'migration metadata should include migration steps');
  assert.ok(gameState.migrationMeta.steps.includes('v1_to_v2'), 'migration metadata should record applied migration step');
  assert.ok(gameState.migrationMeta.steps.includes('v2_to_v3'), 'migration metadata should record v2 to v3 migration step');
  assert.ok(typeof gameState.migrationMeta.migratedAt === 'string' && gameState.migrationMeta.migratedAt.length > 0, 'migration metadata should include timestamp when migrated');
  assert.equal(gameState.migrationMeta.futureVersionDetected, false, 'normal migration should not set future version flag');
  assert.equal(gameState.migrationMeta.reason, 'migrated', 'normal migration should set migrated reason');

  const clickMastery = prestigeUpgrades.find((u) => u.id === 'clickMastery');
  assert.equal(
    gameState.prestigeUpgradeLevels.clickMastery,
    clickMastery.maxLevel,
    'prestige levels should clamp to max level'
  );
  
  const persisted = JSON.parse(localStorage.getItem('snus_clicker_save'));
  assert.equal(persisted.saveVersion, 3, 'migrated save should be persisted with current save version');
  assert.equal(persisted.migrationMeta.previousVersion, 1, 'persisted migration metadata should track previous version');
  assert.equal(persisted.migrationMeta.noticeShown, true, 'migration notice should be marked as shown after first migrated load');
  assert.equal('dailyStats' in persisted, false, 'migration should remove deprecated dailyStats field from persisted save');
  assert.equal('autoBuyerWeight' in persisted, false, 'migration should remove deprecated autoBuyerWeight field from persisted save');
  assert.equal('milestonePeks' in persisted, false, 'migration should remove deprecated milestonePeks field from persisted save');
}


async function testLoadGamePreservesFutureSaveVersion() {
  resetEngineState();
  mockDomForUiImports();

  const { loadGame } = await import('../js/save.js');

  localStorage.setItem('snus_clicker_save', JSON.stringify({
    saveVersion: 99,
    cookies: 10,
    autoBuyerWeights: { value: 0.9, cheap: 0.1 }
  }));

  loadGame();

  assert.equal(gameState.saveVersion, 99, 'future save versions should be preserved and not downgraded');

  const persisted = JSON.parse(localStorage.getItem('snus_clicker_save'));
  assert.equal(persisted.saveVersion, 99, 'persisted payload should keep future save version');
  assert.equal(Array.isArray(persisted.migrationMeta.steps), true, 'future save metadata should include steps array');
  assert.equal(persisted.migrationMeta.steps.length, 0, 'future save metadata should not report fake migration steps');
  assert.equal(persisted.migrationMeta.currentVersion, 99, 'future save metadata should track current version as-is');
  assert.equal(persisted.migrationMeta.futureVersionDetected, true, 'future save metadata should mark future version detection');
  assert.equal(persisted.migrationMeta.reason, 'future_version', 'future save metadata should set future_version reason');
  assert.equal(persisted.migrationMeta.migratedAt, '', 'future save metadata should not set migrated timestamp');
  assert.equal(persisted.migrationMeta.noticeShown, undefined, 'future save flow should not mark migration notice as shown');
}


async function testLoadGameCurrentVersionHasNoMigrationSteps() {
  resetEngineState();
  mockDomForUiImports();

  const { loadGame } = await import('../js/save.js');

  localStorage.setItem('snus_clicker_save', JSON.stringify({
    saveVersion: 3,
    cookies: 55
  }));

  loadGame();

  assert.equal(gameState.saveVersion, 3, 'current-version saves should keep current version');
  assert.equal(gameState.migrationMeta.futureVersionDetected, false, 'current-version saves should not set future flag');
  assert.equal(gameState.migrationMeta.reason, 'none', 'current-version saves should set reason none');
  assert.equal(gameState.migrationMeta.migratedAt, '', 'current-version saves should not set migrated timestamp');
  assert.equal(gameState.migrationMeta.steps.length, 0, 'current-version saves should not add migration steps');
}

async function testUiBuyModeButtonActiveState() {
  resetEngineState();

  function createMockButton(mode) {
    return {
      dataset: { buy: String(mode) },
      listeners: {},
      ariaPressed: 'false',
      active: false,
      classList: {
        toggle(className, value) {
          if (className === 'active') {
            this.__owner.active = Boolean(value);
          }
        },
        __owner: null
      },
      setAttribute(name, value) {
        if (name === 'aria-pressed') {
          this.ariaPressed = value;
        }
      },
      addEventListener(event, handler) {
        this.listeners[event] = handler;
      }
    };
  }

  const b1 = createMockButton(1);
  const b10 = createMockButton(10);
  const bMax = createMockButton('max');
  [b1, b10, bMax].forEach((btn) => {
    btn.classList.__owner = btn;
  });

  globalThis.document = {
    body: { style: {} },
    getElementById() {
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '.buy-options button') {
        return [b1, b10, bMax];
      }
      return [];
    },
    createElement(tag) {
      return createMockElement(tag);
    }
  };

  await import(`../js/ui.js?buymode-test=${Date.now()}`);

  assert.equal(b1.ariaPressed, 'true', 'default buy mode button should be active');
  assert.equal(b10.ariaPressed, 'false', 'non-active buy mode button should start inactive');
  assert.equal(bMax.ariaPressed, 'false', 'max buy mode button should start inactive');

  bMax.listeners.click();

  assert.equal(gameState.buyMode, 'max', 'clicking max button should set buy mode to max');
  assert.equal(b1.ariaPressed, 'false', 'old active button should be deactivated');
  assert.equal(bMax.ariaPressed, 'true', 'newly clicked button should be active');
}

async function testExportSaveFallbackCopyPath() {
  resetEngineState();
  mockDomForUiImports();

  localStorage.setItem('snus_clicker_save', JSON.stringify({ cookies: 42 }));

  let appendCalled = false;
  let removeCalled = false;
  let execCommandCalled = false;

  const mockTextarea = {
    value: '',
    style: {},
    setAttribute() {},
    select() {},
    setSelectionRange() {}
  };

  globalThis.document = {
    body: {
      appendChild(node) {
        appendCalled = node === mockTextarea;
      },
      removeChild(node) {
        removeCalled = node === mockTextarea;
      }
    },
    createElement(tag) {
      return tag === 'textarea' ? mockTextarea : createMockElement(tag);
    },
    execCommand(command) {
      execCommandCalled = command === 'copy';
      return true;
    },
    getElementById() {
      return null;
    },
    querySelectorAll() {
      return [];
    }
  };

  Object.defineProperty(globalThis, 'navigator', {
    value: {},
    configurable: true,
    writable: true
  });

  const { exportSave } = await import('../js/save.js');
  exportSave();

  assert.equal(execCommandCalled, true, 'fallback copy should call document.execCommand("copy")');
  assert.equal(appendCalled, true, 'fallback copy should append textarea to document body');
  assert.equal(removeCalled, true, 'fallback copy should remove textarea from document body');
}

async function testImportSaveUsesNormalization() {
  resetEngineState();
  localStorage.clear();
  mockDomForUiImports();

  globalThis.prompt = () => JSON.stringify({
    saveVersion: 1,
    cookies: -1,
    lifetimeCookies: 12345,
    currentWorld: 999,
    buyMode: -3,
    buildingData: { cursor: { owned: -7 } },
    dailyStats: { clicks: 5, earned: 55, resetDayKey: 'legacy-day' },
    autoBuyerWeight: 0.25,
    autoBuyerWeights: { value: 0.2, cheap: 0.2 },
    milestonePeks: { skill_power: true }
  });

  const { importSave } = await import('../js/save.js');
  importSave();

  const stored = JSON.parse(localStorage.getItem('snus_clicker_save'));
  assert.equal(stored.cookies, 0, 'import should normalize cookies to non-negative');
  assert.equal(stored.currentWorld, 1, 'import should normalize invalid world to default');
  assert.equal(stored.buyMode, 1, 'import should normalize invalid buy mode');
  assert.equal(stored.buildingData.cursor.owned, 0, 'import should normalize negative building counts');
  assert.equal(stored.saveVersion, 3, 'imported saves should be rewritten with current save version');
  assert.equal(stored.milestonePerks.skill_power, true, 'import should migrate legacy milestonePeks field');
  assert.equal(stored.todayStats.clicks, 5, 'import should migrate legacy dailyStats to todayStats');
  assert.equal(stored.autoBuyerWeights.value, 0.5, 'import should normalize explicit autoBuyerWeights value share');
  assert.equal(stored.autoBuyerWeights.cheap, 0.5, 'import should normalize explicit autoBuyerWeights cheap share');
  assert.ok(stored.migrationMeta.steps.includes('v1_to_v2'), 'import migration metadata should contain applied migration step');
  assert.ok(stored.migrationMeta.steps.includes('v2_to_v3'), 'import migration metadata should contain v2 to v3 migration step');
  assert.equal(stored.migrationMeta.noticeShown, true, 'imported migrated save should mark notice as shown');
  assert.equal(stored.migrationMeta.futureVersionDetected, false, 'normal import migration should not set future version flag');
  assert.equal(stored.migrationMeta.reason, 'migrated', 'normal import migration should set migrated reason');
  assert.equal(gameState.cookies, 0, 'import should apply state immediately without reload');
  assert.equal(gameState.currentWorld, 1, 'applied imported world should be normalized');
}

async function testImportSavePreservesFutureSaveVersion() {
  resetEngineState();
  localStorage.clear();
  mockDomForUiImports();

  globalThis.prompt = () => JSON.stringify({
    saveVersion: 77,
    cookies: 42,
    autoBuyerWeights: { value: 0.4, cheap: 0.6 }
  });

  const { importSave } = await import('../js/save.js');
  importSave();

  assert.equal(gameState.saveVersion, 77, 'future import should keep higher save version');

  const stored = JSON.parse(localStorage.getItem('snus_clicker_save'));
  assert.equal(stored.saveVersion, 77, 'persisted import should keep higher save version');
  assert.equal(stored.migrationMeta.futureVersionDetected, true, 'future import should mark future version detection');
  assert.equal(stored.migrationMeta.reason, 'future_version', 'future import should set future_version reason');
  assert.equal(stored.migrationMeta.migratedAt, '', 'future import should not set migrated timestamp');
  assert.equal(stored.migrationMeta.steps.length, 0, 'future import should not add fake migration steps');
  assert.equal(stored.migrationMeta.noticeShown, undefined, 'future import flow should not mark migration notice as shown');
}


async function testImportSaveCanBeCancelledByPreviewConfirm() {
  resetEngineState();
  localStorage.clear();
  mockDomForUiImports();

  localStorage.setItem('snus_clicker_save', JSON.stringify({ saveVersion: 3, cookies: 7 }));

  globalThis.prompt = () => JSON.stringify({ saveVersion: 3, cookies: 999 });
  globalThis.confirm = () => false;

  const { importSave } = await import('../js/save.js');
  importSave();

  const stored = JSON.parse(localStorage.getItem('snus_clicker_save'));
  assert.equal(stored.cookies, 7, 'cancelled import should keep existing persisted save');
  assert.equal(gameState.cookies, 0, 'cancelled import should not apply imported state');
}

async function testSaveBackupsRotateOnImportOverwrite() {
  resetEngineState();
  localStorage.clear();
  mockDomForUiImports();

  localStorage.setItem('snus_clicker_save', JSON.stringify({ saveVersion: 3, cookies: 10 }));

  const { importSave } = await import('../js/save.js');

  globalThis.confirm = () => true;
  globalThis.prompt = () => JSON.stringify({ saveVersion: 3, cookies: 20 });
  importSave();

  let backup1 = JSON.parse(localStorage.getItem('snus_clicker_save_backup_1'));
  assert.equal(backup1.cookies, 10, 'first overwrite should store previous save in backup slot 1');

  globalThis.prompt = () => JSON.stringify({ saveVersion: 3, cookies: 30 });
  importSave();

  backup1 = JSON.parse(localStorage.getItem('snus_clicker_save_backup_1'));
  const backup2 = JSON.parse(localStorage.getItem('snus_clicker_save_backup_2'));

  assert.equal(backup1.cookies, 20, 'latest previous save should rotate into backup slot 1');
  assert.equal(backup2.cookies, 10, 'older save should rotate into backup slot 2');
}


async function testRestoreBackupAppliesSelectedSlot() {
  resetEngineState();
  localStorage.clear();
  mockDomForUiImports();

  localStorage.setItem('snus_clicker_save_backup_1', JSON.stringify({ saveVersion: 3, cookies: 111 }));
  localStorage.setItem('snus_clicker_save_backup_2', JSON.stringify({ saveVersion: 3, cookies: 222 }));

  globalThis.confirm = () => true;

  const { restoreBackup } = await import('../js/save.js');
  const restored = restoreBackup(2);

  assert.equal(restored, true, 'restoreBackup should return true on successful restore');
  assert.equal(gameState.cookies, 222, 'restoreBackup should apply selected backup slot state');

  const stored = JSON.parse(localStorage.getItem('snus_clicker_save'));
  assert.equal(stored.cookies, 222, 'restoreBackup should persist restored state as current save');
}

async function testRestoreBackupCanBeCancelled() {
  resetEngineState();
  localStorage.clear();
  mockDomForUiImports();

  localStorage.setItem('snus_clicker_save', JSON.stringify({ saveVersion: 3, cookies: 50 }));
  localStorage.setItem('snus_clicker_save_backup_1', JSON.stringify({ saveVersion: 3, cookies: 999 }));

  globalThis.confirm = () => false;

  const { restoreBackup } = await import('../js/save.js');
  const restored = restoreBackup(1);

  assert.equal(restored, false, 'restoreBackup should return false when user cancels');

  const stored = JSON.parse(localStorage.getItem('snus_clicker_save'));
  assert.equal(stored.cookies, 50, 'cancelled restore should keep existing current save');
}


async function testResetSaveAppliesWithoutReload() {
  resetEngineState();
  mockDomForUiImports();

  gameState.cookies = 1234;
  gameState.lifetimeCookies = 5678;
  localStorage.setItem('snus_clicker_save', JSON.stringify({ cookies: 999 }));
  localStorage.setItem('snus_clicker_save_backup_1', JSON.stringify({ cookies: 123 }));
  localStorage.setItem('snus_clicker_save_backup_2', JSON.stringify({ cookies: 456 }));

  globalThis.confirm = () => true;

  const { resetSave } = await import('../js/save.js');
  resetSave();

  assert.equal(gameState.cookies, 0, 'reset should apply immediately without reloading');
  assert.equal(gameState.lifetimeCookies, 0, 'reset should clear lifetime cookies');
  assert.equal(localStorage.getItem('snus_clicker_save'), null, 'reset should remove persisted save');
  assert.equal(localStorage.getItem('snus_clicker_save_backup_1'), null, 'reset should remove backup saves');
  assert.equal(localStorage.getItem('snus_clicker_save_backup_2'), null, 'reset should remove all backup slots');
}




function testDiscountBurstAppliesToPricePreviewAndMaxBuy() {
  resetEngineState();

  const cursor = buildings.find((entry) => entry.id === 'cursor');
  assert.ok(cursor, 'cursor building should exist');

  gameState.cookies = 120;
  gameState.buyMode = 'max';
  gameState.discountBurstCooldownUntil = 0;
  gameState.discountBurstUntil = 0;

  const basePreview = getEffectivePurchasePreview(cursor, 0, 'max', gameState.cookies);
  const activated = activateDiscountBurst();
  assert.equal(activated, true, 'discount burst should activate when off cooldown');

  const discountedPreview = getEffectivePurchasePreview(cursor, 0, 'max', gameState.cookies);
  assert.ok(discountedPreview.discountPercent >= 25, 'discount preview should expose discount percentage');
  assert.ok(discountedPreview.quantity >= basePreview.quantity, 'discounted max buy should afford at least as many buildings');
}

function testBuildingSynergyBoostsCps() {
  resetEngineState();

  gameState.buildingData.cursor.owned = 10;
  gameState.buildingData.farm.owned = 20;

  const synergyBonus = getBuildingSynergyBonusPercent('cursor');
  const cps = calculateCps();

  assert.ok(synergyBonus > 0, 'cursor should receive synergy bonus from farms');
  assert.ok(cps > 1, 'synergy should increase total cps beyond raw cursor cps');
}


function testWordleEvaluationHandlesDuplicateLetters() {
  const result = evaluateGuess('LEVEL', 'HELLO');
  assert.deepEqual(
    result.map((tile) => tile.state),
    ['present', 'correct', 'absent', 'absent', 'present'],
    'wordle evaluation should consume duplicate letters correctly'
  );
}

function testWordleSubmitGuessTracksWinAndStatistics() {
  let state = createInitialGameState('APFEL');
  state = { ...state, currentGuess: 'APFEL' };
  const result = submitGuess(state, new Set(['APFEL']));

  assert.equal(result.accepted, true, 'valid wordle guess should be accepted');
  assert.equal(result.state.status, 'won', 'matching solution should end the game as won');
  assert.equal(result.state.statistics.played, 1, 'winning should increment played count');
  assert.equal(result.state.statistics.wins, 1, 'winning should increment wins count');
  assert.equal(result.state.statistics.distribution[0], 1, 'distribution should record first-try win');
}

function testWordleDailySeedUsesLocalCalendarDay() {
  const lateEvening = new Date(2024, 0, 1, 23, 30);
  const shortlyAfterMidnight = new Date(2024, 0, 2, 0, 30);

  assert.equal(
    createDailySeed(lateEvening),
    0,
    'daily seed should still point to the current puzzle before the local midnight rollover'
  );
  assert.equal(
    createDailySeed(shortlyAfterMidnight),
    1,
    'daily seed should advance as soon as the local calendar day changes'
  );
}

function testWordleBoardReflectsDraftInput() {
  let state = createInitialGameState('APFEL');
  state = applyKeyInput(state, 'A');
  state = applyKeyInput(state, 'P');

  const board = buildBoard(state);
  assert.equal(board.length, 6, 'wordle board should always expose six rows');
  assert.equal(board[0][0].letter, 'A', 'draft board should show typed letters');
  assert.equal(board[0][1].letter, 'P', 'draft board should show consecutive typed letters');
  assert.equal(board[0][2].state, 'empty', 'remaining tiles should stay empty before submission');
  assert.equal(WORD_LENGTH, 5, 'wordle should stay configured to five letters');
}

function testGoldenSnusClaimRewardsCookies() {
  resetEngineState();
  const now = Date.now();
  gameState.goldenSnusAvailableUntil = now + 5000;
  gameState.goldenSnusReward = 1234;
  gameState.goldenSnusCooldownUntil = now;

  const before = gameState.cookies;
  const reward = claimGoldenSnus();
  const state = getGoldenSnusState();

  assert.equal(reward, 1234, 'golden snus should return configured reward');
  assert.equal(gameState.cookies, before + 1234, 'golden snus claim should add cookies');
  assert.equal(state.available, false, 'golden snus should no longer be available after claim');
}

async function run() {
  testPrestigeCostsIncrease();
  testPrestigePurchaseRules();
  testPotentialPrestigeGain();
  testPotentialPrestigeGainCannotBeClaimedTwice();
  testPrestigeTrackAwardsBacklogDiamonds();
  testPrestigeTrackExtendsToLevelHundred();
  testPrestigeTrackDiamondCadence();
  testWorldMustBePurchasedBeforeSwitch();
  testWorldThreeNeedsBuildingRequirement();
  testWorldUnlockDetailsReportsMissingProgress();
  testBuyModeSanitizing();
testBuildingsControllerRendersAfterPurchase();
testBuildingsControllerMarksBestBuy();
testBuildingsControllerRoiUsesMaxQuantity();
testBuyModeSanitizesFractionalValues();;
  testPrestigeControllerCallbacks();
  testBuyBuildingNormalizesOwnedType();
  testWordleDailySeedUsesLocalCalendarDay();
  testBuildingPurchaseNeedsValidId();
  testMaxAffordableSummaryMatchesCount();
  testMilestoneClaimingRewards();
  testMidgameQuestClaimingRewards();
  testDailyQuestRotationMaintainsActiveSubset();
  testAutoBuyerPrioritizesBestValuePurchases();
  testAutoBuyerStrategyCheapPrefersLowCost();
  testAutoBuyerStrategyReserveKeepsSavings();
  testAutoBuyerStrategyCustomUsesWeightsAndPersistsDecision();
  testBuyBuildingAppliesWorldDiscountModifier();
  testActiveBonusesExposeWorldAndAutomationState();
  testBuildingSynergyBoostsCps();
  testDiscountBurstAppliesToPricePreviewAndMaxBuy();
  testWordleEvaluationHandlesDuplicateLetters();
  testWordleSubmitGuessTracksWinAndStatistics();
  testWordleBoardReflectsDraftInput();
  testGoldenSnusClaimRewardsCookies();
  testConfigClampingAndPersistence();
  testConfigReset();
  testLocalizedContentKeysForMilestonesAndQuests();
  await testUiBuyModeButtonActiveState();
  await testLoadGameNormalization();
  await testLoadGamePreservesFutureSaveVersion();
  await testLoadGameCurrentVersionHasNoMigrationSteps();
  await testImportSaveUsesNormalization();
  await testImportSavePreservesFutureSaveVersion();
  await testImportSaveCanBeCancelledByPreviewConfirm();
  await testSaveBackupsRotateOnImportOverwrite();
  await testRestoreBackupAppliesSelectedSlot();
  await testRestoreBackupCanBeCancelled();
  await testExportSaveFallbackCopyPath();
  await testResetSaveAppliesWithoutReload();
  
  console.log('All tests passed.');
}

await run();
