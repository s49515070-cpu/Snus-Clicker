import assert from 'node:assert/strict';

import {
  gameState,
  prestigeUpgrades,
  getPrestigeUpgradeCost,
  buyPrestigeUpgrade,
  setBuyMode,
  buyBuilding,
  getPotentialPrestigeGain,
  claimAvailableMilestones,
  milestones,
} from '../js/engine.js';

import { buildings, getMaxAffordable, getMaxAffordableSummary } from '../js/buildings.js';
import { createBuildingsUIController } from '../js/ui-buildings.js';
import { createPrestigeUIController } from '../js/ui-prestige.js';

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

function resetEngineState() {
  gameState.cookies = 0;
  gameState.lifetimeCookies = 0;
  gameState.prestigeCookies = 0;
  gameState.buyMode = 1;
  gameState.currentWorld = 1;
  gameState.prestigeMultiplier = 1;
  gameState.clickPower = 1;

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

  gameState.prestigeCookies = 100;
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

  assert.equal(buyPrestigeUpgrade(upgrade.id), false, 'cannot buy without enough prestige cookies');

  gameState.prestigeCookies = cost;
  assert.equal(buyPrestigeUpgrade(upgrade.id), true, 'can buy with enough prestige cookies');
  assert.equal(gameState.prestigeUpgradeLevels[upgrade.id], 1, 'purchase should increase level');
  assert.equal(gameState.prestigeCookies, 0, 'purchase should deduct cost');
}

function testPotentialPrestigeGain() {
  resetEngineState();
  gameState.lifetimeCookies = 2_750_000;

  assert.equal(getPotentialPrestigeGain(), 2, 'potential prestige gain should floor per million lifetime cookies');
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
    cookies: -5,
    lifetimeCookies: -10,
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
    }
  }));

  loadGame();

  assert.equal(gameState.cookies, 0, 'cookies should normalize to non-negative');
  assert.equal(gameState.currentWorld, 1, 'invalid world should fallback to 1');
  assert.equal(gameState.buyMode, 1, 'invalid buy mode should fallback to 1');
  assert.equal(gameState.prestigeMultiplier, 1, 'prestige multiplier should clamp to min 1');
  assert.equal(gameState.clickPower, 1, 'click power should clamp to min 1');
  assert.equal(gameState.buildingData.cursor.owned, 0, 'negative owned building count should clamp to 0');

  const clickMastery = prestigeUpgrades.find((u) => u.id === 'clickMastery');
  assert.equal(
    gameState.prestigeUpgradeLevels.clickMastery,
    clickMastery.maxLevel,
    'prestige levels should clamp to max level'
  );
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
    cookies: -1,
    lifetimeCookies: 12345,
    currentWorld: 999,
    buyMode: -3,
    buildingData: { cursor: { owned: -7 } }
  });

  const { importSave } = await import('../js/save.js');
  importSave();

  const stored = JSON.parse(localStorage.getItem('snus_clicker_save'));
  assert.equal(stored.cookies, 0, 'import should normalize cookies to non-negative');
  assert.equal(stored.currentWorld, 1, 'import should normalize invalid world to default');
  assert.equal(stored.buyMode, 1, 'import should normalize invalid buy mode');
  assert.equal(stored.buildingData.cursor.owned, 0, 'import should normalize negative building counts');
  assert.equal(gameState.cookies, 0, 'import should apply state immediately without reload');
  assert.equal(gameState.currentWorld, 1, 'applied imported world should be normalized');
}

async function testResetSaveAppliesWithoutReload() {
  resetEngineState();
  mockDomForUiImports();

  gameState.cookies = 1234;
  gameState.lifetimeCookies = 5678;
  localStorage.setItem('snus_clicker_save', JSON.stringify({ cookies: 999 }));

  globalThis.confirm = () => true;

  const { resetSave } = await import('../js/save.js');
  resetSave();

  assert.equal(gameState.cookies, 0, 'reset should apply immediately without reloading');
  assert.equal(gameState.lifetimeCookies, 0, 'reset should clear lifetime cookies');
  assert.equal(localStorage.getItem('snus_clicker_save'), null, 'reset should remove persisted save');
}

async function run() {
  testPrestigeCostsIncrease();
  testPrestigePurchaseRules();
  testPotentialPrestigeGain();
  testBuyModeSanitizing();
  testBuildingsControllerRendersAfterPurchase();
  testPrestigeControllerCallbacks();
  testBuyBuildingNormalizesOwnedType();
  testBuildingPurchaseNeedsValidId();
  testMaxAffordableSummaryMatchesCount();
  testMilestoneClaimingRewards();
  testConfigClampingAndPersistence();
  testConfigReset();
  await testUiBuyModeButtonActiveState();
  await testLoadGameNormalization();
  await testImportSaveUsesNormalization();
  await testExportSaveFallbackCopyPath();
  await testResetSaveAppliesWithoutReload();

  console.log('All tests passed.');
}

await run();
