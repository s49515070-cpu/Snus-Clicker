// =====================================
// UI SYSTEM – SNUS CLICKER
// Rendering & Interaktion
// =====================================

import {
    gameState,
    clickCookie,
    buyBuilding,
    setBuyMode,
    calculateCps,
    changeWorld,
    isWorldPurchased,
    buyWorld,
    prestigeUpgrades,
    buyPrestigeUpgrade,
    getPrestigeUpgradeCost,
    getPotentialPrestigeGain,
    getPrestigeTrackStatus,
    prestigeReset,
    getAchievementsStatus,
    quests,
    getQuestProgress,
    getActiveQuests,
    getBoostStatus,
    getActiveBonuses,
    activateProductionBoost,
    activateClickBurst,
    activateDiscountBurst,
    unlockAutoBuyer,
    setAutoBuyerEnabled,
    setAutoBuyerStrategy,
    getAutoBuyerStrategy,
    getAutoBuyerStatus,
    getPrestigePreview,
    getPrestigeTalentStatus,
    buyPrestigeTalent,
    getBuildingSynergyBonusPercent,
    getEffectivePurchasePreview,
    getGoldenSnusState,
    claimGoldenSnus,
    getClickComboState,
    getPrestigeProgressState,
    AUTO_BUYER_UNLOCK_COST,
    getInventoryStatus,
    getActiveInventoryEffects,
    useInventoryItem
} from "./engine.js";
import { buildings, getBuildingCost, getPurchaseCost, getMaxAffordableSummary } from "./buildings.js";
import { worlds, getWorldById, isWorldUnlocked, getWorldUnlockDetails } from "./worlds.js";
import { createBuildingsUIController } from "./ui-buildings.js";
import { initToastSystem, showAutosave, showToast } from "./ui-toast.js";
import { createTrophyPathController } from "./ui-trophy.js";
import { createDiamondShopController } from "./ui-shop.js";
import { t } from "./i18n.js";
import { getBackgroundColor, getBackgroundImage, getNumberFormat, getHighContrast, getReducedMotion, getOnboardingHintsEnabled } from "./config.js";
import { playClickSound } from "./audio.js";

const cookieCountEl = document.getElementById("cookieCount");
const cpsEl = document.getElementById("cps");
const prestigeCountEl = document.getElementById("prestigeCount");
const diamondCountEl = document.getElementById("diamondCount");
const worldNameEl = document.getElementById("worldName");
const worldButton = document.getElementById("worldButton");
const trophyPrestigeProgressEl = document.getElementById("trophyPrestigeProgress");
const trophyPrestigePreviewEl = document.getElementById("trophyPrestigePreview");
const prestigeTalentPointsEl = document.getElementById("prestigeTalentPoints");
const prestigeTalentTreeEl = document.getElementById("prestigeTalentTree");
const diamondShopListEl = document.getElementById("diamondShopList");
const diamondShopBalanceEl = document.getElementById("diamondShopBalance");
const achievementsListEl = document.getElementById("achievementsList");
const inventoryListEl = document.getElementById("inventoryList");
const inventoryActiveEffectsEl = document.getElementById("inventoryActiveEffects");
const leftColumn = document.getElementById("leftBuildings");
const rightColumn = document.getElementById("rightBuildings");
const cookieClickArea = document.getElementById("cookieClickArea");
const clickEffectContainer = document.getElementById("clickEffectContainer");
const mainCookie = document.getElementById("mainCookie");
const worldTransition = document.getElementById("worldTransition");
const worldPickerModal = document.getElementById("worldPickerModal");
const worldPickerList = document.getElementById("worldPickerList");
const worldPickerClose = document.getElementById("worldPickerClose");
const autosaveIndicator = document.getElementById("autosaveIndicator");
const boostButton = document.getElementById("boostButton");
const clickBurstButton = document.getElementById("clickBurstButton");
const discountBurstButton = document.getElementById("discountBurstButton");
const boostStatusEl = document.getElementById("boostStatus");
const questListEl = document.getElementById("questList");
const dailySummaryEl = document.getElementById("dailySummary");
const autoBuyerButton = document.getElementById("autoBuyerButton");
const autoBuyerStatusEl = document.getElementById("autoBuyerStatus");
const autoBuyerModeControls = document.getElementById("autoBuyerModeControls");
const autoBuyerModeLabelEl = document.getElementById("autoBuyerModeLabel");
const autoBuyerValueModeButton = document.getElementById("autoBuyerValueModeButton");
const autoBuyerCheapModeButton = document.getElementById("autoBuyerCheapModeButton");
const activeBonusesPanelEl = document.getElementById("activeBonusesPanel");
const goldenSnusButton = document.getElementById("goldenSnusButton");
const trophyPathListEl = document.getElementById("trophyPathList");
const comboHudEl = document.getElementById("comboHud");
const comboValueEl = document.getElementById("comboValue");
const comboBarFillEl = document.getElementById("comboBarFill");
const comboHintEl = document.getElementById("comboHint");

initToastSystem(autosaveIndicator);

let wasGoldenSnusAvailable = false;
let lastSlowPanelRenderAt = 0;
const SLOW_PANEL_REFRESH_MS = 600;
const clickEffectPool = [];
const activeClickEffects = new Set();
const pendingActionButtons = new WeakSet();

const { renderBuildings, refreshBuildingsIfNeeded } = createBuildingsUIController({
    gameState,
    buildings,
    getBuildingCost,
    getPurchaseCost,
    getMaxAffordableSummary,
    getEffectivePurchasePreview,
    buyBuilding,
    formatNumber,
    t,
    leftColumn,
    rightColumn,
    getBuildingSynergyBonusPercent
});

const { renderTrophyPath } = createTrophyPathController({
    trophyPathListEl,
    getPrestigeTrackStatus,
    t
});


const animatedStatState = new WeakMap();

function renderAnimatedStat(element, nextValue, formatter, durationMs = 320) {
    if (!element) return;

    const numericTarget = Number(nextValue);
    if (!Number.isFinite(numericTarget)) {
        element.textContent = formatter(nextValue);
        return;
    }

    const prefersReducedMotion = document.body.classList.contains("reduced-motion");
    const existing = animatedStatState.get(element);
    const fromValue = existing && Number.isFinite(existing.current) ? existing.current : numericTarget;

    if (prefersReducedMotion || Math.abs(numericTarget - fromValue) < 0.5) {
        if (existing?.frameId) window.cancelAnimationFrame(existing.frameId);
        element.textContent = formatter(numericTarget);
        animatedStatState.set(element, { current: numericTarget, frameId: null });
        return;
    }

    if (existing?.frameId) window.cancelAnimationFrame(existing.frameId);

    const startedAt = performance.now();
    const duration = Math.max(120, durationMs);
    const tick = (timestamp) => {
        const progress = Math.min(1, (timestamp - startedAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = fromValue + ((numericTarget - fromValue) * eased);
        element.textContent = formatter(current);
        if (progress < 1) {
            const frameId = window.requestAnimationFrame(tick);
            animatedStatState.set(element, { current, frameId });
            return;
        }
        animatedStatState.set(element, { current: numericTarget, frameId: null });
    };

    const frameId = window.requestAnimationFrame(tick);
    animatedStatState.set(element, { current: fromValue, frameId });
}

const { renderDiamondShop } = createDiamondShopController({
    gameState,
    prestigeUpgrades,
    diamondShopListEl,
    diamondShopBalanceEl,
    getPrestigeUpgradeCost,
    buyPrestigeUpgrade,
    t,
    onPurchased: () => renderBuildings()
});

function formatNumber(num) {
    if (!Number.isFinite(num)) return "0";
    if (getNumberFormat() === "full") {
        return Math.floor(num).toLocaleString(getNumberFormat() === "full" ? "de-DE" : undefined);
    }
    const sign = num < 0 ? "-" : "";
    const abs = Math.abs(num);
    if (abs < 1000) return sign + abs.toFixed(0);
    const suffixes = ["K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
    const tier = Math.min(Math.floor(Math.log10(abs) / 3) - 1, suffixes.length - 1);
    const scaled = abs / Math.pow(1000, tier + 1);
    const decimals = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
    return `${sign}${scaled.toFixed(decimals)}${suffixes[tier]}`;
}

function renderAchievements() {
    if (!achievementsListEl) return;
    achievementsListEl.innerHTML = "";

    getAchievementsStatus().forEach((achievement) => {
        const item = document.createElement("article");
        item.className = `achievement-item rarity-${achievement.rarity}`;
        item.classList.toggle("is-unlocked", achievement.unlocked);
        item.classList.toggle("is-locked", !achievement.unlocked);

        const current = Math.floor(Math.min(achievement.current, achievement.target));
        const target = Math.floor(achievement.target);

        item.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-content">
                <div class="achievement-top-row">
                    <div class="achievement-title">${t(achievement.titleKey)}</div>
                    <div class="achievement-status">${achievement.unlocked ? t("achievementStatusUnlocked") : t("achievementStatusLocked")}</div>
                </div>
                <div class="achievement-description">${t(achievement.descriptionKey, { target })}</div>
                <div class="achievement-meta">
                    <span class="achievement-tier">${t("achievementTierLabel", { tier: achievement.tier })}</span>
                    <span class="achievement-difficulty rarity-${achievement.rarity}">${t(`achievementRarity${achievement.rarity[0].toUpperCase()}${achievement.rarity.slice(1)}`)}</span>
                </div>
                <div class="achievement-reward-preview">
                    ${achievement.rewardItems.length > 0
                        ? achievement.rewardItems.map((reward) => `<span class="achievement-reward-chip">${reward.icon} ${t(reward.nameKey)}</span>`).join("")
                        : `<span class="achievement-reward-chip is-empty">${t("achievementRewardNone")}</span>`}
                </div>
                <div class="achievement-progress-row">
                    <div class="achievement-progress">${current} / ${target}</div>
                    <div class="achievement-progress-bar"><span style="width: ${Math.round(achievement.progressRatio * 100)}%"></span></div>
                </div>
            </div>
        `;

        achievementsListEl.appendChild(item);
    });
}

function renderInventory() {
    if (!inventoryListEl) return;

    const items = getInventoryStatus();
    inventoryListEl.innerHTML = "";

    items.forEach((item) => {
        const entry = document.createElement("article");
        entry.className = "achievement-item inventory-item";
        entry.classList.toggle("is-unlocked", item.unlocked);
        entry.classList.toggle("is-locked", !item.unlocked);
        entry.classList.toggle("is-consumed", item.consumed);
        entry.dataset.itemId = item.id;

        let status = t("inventoryLocked");
        if (item.activeMs > 0) {
            status = t("inventoryActive", { seconds: Math.ceil(item.activeMs / 1000) });
        } else if (item.consumed) {
            status = t("inventoryConsumed");
        } else if (item.cooldownMs > 0) {
            status = t("inventoryCooldown", { seconds: Math.ceil(item.cooldownMs / 1000) });
        } else if (item.canUse) {
            status = t("inventoryReady");
        }

        entry.innerHTML = `
            <div class="achievement-icon">${item.icon}</div>
            <div class="achievement-content">
                <div class="achievement-top-row">
                    <div class="achievement-title">${t(item.nameKey)}</div>
                    <div class="achievement-status">${status}</div>
                </div>
                <div class="achievement-description">${t(item.descriptionKey)}</div>
                <div class="achievement-meta">
                    <span class="achievement-tier">${t("inventoryEffectLabel")}</span>
                    <span class="achievement-difficulty">${t(item.effectTextKey)}</span>
                </div>
                <div class="inventory-actions">
                    <button class="inventory-use-button" type="button" data-item-id="${item.id}" ${item.canUse ? "" : "disabled"}>${t("inventoryUseButton")}</button>
                </div>
            </div>
        `;

        inventoryListEl.appendChild(entry);
    });

    if (inventoryActiveEffectsEl) {
        const activeEffects = getActiveInventoryEffects();
        if (activeEffects.length === 0) {
            inventoryActiveEffectsEl.textContent = t("inventoryNoActiveEffects");
        } else {
            inventoryActiveEffectsEl.textContent = activeEffects
                .map((item) => `${item.icon} ${t(item.nameKey)} (${Math.ceil(item.activeMs / 1000)}s)`)
                .join(" • ");
        }
    }
}

function renderQuests() {
    if (!questListEl) return;
    questListEl.innerHTML = "";

    getActiveQuests().forEach((quest) => {
        const status = getQuestProgress(quest.id);
        const item = document.createElement("div");
        item.className = "quest-item";
        item.classList.toggle("is-complete", status.completed);
        item.classList.toggle("is-claimed", status.claimed);
        const label = quest.labelKey ? t(quest.labelKey) : quest.label;
        const description = quest.descriptionKey ? t(quest.descriptionKey) : quest.description;
        const rewards = [];
        if (quest.rewardCookies) rewards.push(`+${Math.floor(quest.rewardCookies)} ${t("snus")}`);
        if (quest.rewardDiamonds) rewards.push(`💎 +${Math.floor(quest.rewardDiamonds)} ${t("diamonds")}`);
        item.innerHTML = `
            <div class="quest-title">${label}</div>
            <div class="quest-description">${description}</div>
            <div class="quest-progress">${Math.floor(Math.min(status.current, status.target))}/${status.target}</div>
            <div class="quest-reward">${t("reward")}: ${rewards.join(" | ") || "—"}</div>
        `;
        questListEl.appendChild(item);
    });
}

function renderBoostStatus() {
    if (!boostButton || !boostStatusEl) return;
    const status = getBoostStatus();
    boostButton.disabled = !status.ready;
    boostButton.classList.toggle("is-active", status.active);
    boostButton.classList.toggle("is-cooldown", !status.ready || status.active);
    boostButton.classList.toggle("is-disabled", pendingActionButtons.has(boostButton));

    if (clickBurstButton) {
        const clickActive = status.clickBurstActiveMs > 0;
        const clickCooldown = status.clickBurstCooldownMs > 0;
        clickBurstButton.disabled = clickCooldown;
        clickBurstButton.classList.toggle("is-active", clickActive);
        clickBurstButton.classList.toggle("is-cooldown", clickCooldown || clickActive);
        clickBurstButton.classList.toggle("is-disabled", pendingActionButtons.has(clickBurstButton));
        if (clickActive) {
            clickBurstButton.textContent = t("clickBurstButtonActive", { seconds: Math.ceil(status.clickBurstActiveMs / 1000) });
        } else if (clickCooldown) {
            clickBurstButton.textContent = t("clickBurstButtonCooldown", { seconds: Math.ceil(status.clickBurstCooldownMs / 1000) });
        } else {
            clickBurstButton.textContent = t("clickBurstButton");
        }
    }

    if (discountBurstButton) {
        const discountActive = status.discountBurstActiveMs > 0;
        const discountCooldown = status.discountBurstCooldownMs > 0;
        discountBurstButton.disabled = discountCooldown;
        discountBurstButton.classList.toggle("is-active", discountActive);
        discountBurstButton.classList.toggle("is-cooldown", discountCooldown || discountActive);
        discountBurstButton.classList.toggle("is-disabled", pendingActionButtons.has(discountBurstButton));
        if (discountActive) {
            discountBurstButton.textContent = t("discountBurstButtonActive", { seconds: Math.ceil(status.discountBurstActiveMs / 1000) });
        } else if (discountCooldown) {
            discountBurstButton.textContent = t("discountBurstButtonCooldown", { seconds: Math.ceil(status.discountBurstCooldownMs / 1000) });
        } else {
            discountBurstButton.textContent = t("discountBurstButton");
        }
    }
    if (status.active) {
        boostStatusEl.textContent = t("boostActive", { seconds: Math.ceil(status.activeMs / 1000) });
    } else if (!status.ready) {
        boostStatusEl.textContent = t("boostCooldown", { seconds: Math.ceil(status.cooldownMs / 1000) });
    } else {
        const extras = [];
        if (status.clickBurstActiveMs > 0) extras.push(t("clickBurstActive", { seconds: Math.ceil(status.clickBurstActiveMs / 1000) }));
        if (status.discountBurstActiveMs > 0) extras.push(t("discountBurstActive", { seconds: Math.ceil(status.discountBurstActiveMs / 1000) }));
        boostStatusEl.textContent = extras.length ? extras.join(" · ") : t("boostReady");
    }
}

function renderAutoBuyerState() {
    if (!autoBuyerButton) return;

    if (!gameState.autoBuyerUnlocked) {
        autoBuyerButton.textContent = t("autoBuyerUnlock", { cost: formatNumber(AUTO_BUYER_UNLOCK_COST) });
        autoBuyerButton.classList.remove("is-active");
        autoBuyerButton.classList.toggle("is-disabled", pendingActionButtons.has(autoBuyerButton));
        if (autoBuyerModeControls) autoBuyerModeControls.hidden = true;
        return;
    }

    autoBuyerButton.textContent = gameState.autoBuyerEnabled ? t("autoBuyerOn") : t("autoBuyerOff");
    autoBuyerButton.classList.toggle("is-active", gameState.autoBuyerEnabled);
    autoBuyerButton.classList.toggle("is-disabled", pendingActionButtons.has(autoBuyerButton));

    const strategy = getAutoBuyerStrategy();
    if (autoBuyerModeControls) autoBuyerModeControls.hidden = false;
    if (autoBuyerModeLabelEl) autoBuyerModeLabelEl.textContent = t("autoBuyerModeLabel");
    if (autoBuyerValueModeButton) {
        autoBuyerValueModeButton.textContent = t("autoBuyerStrategyValue");
        autoBuyerValueModeButton.classList.toggle("is-selected", strategy === "value");
    }
    if (autoBuyerCheapModeButton) {
        autoBuyerCheapModeButton.textContent = t("autoBuyerStrategyCheap");
        autoBuyerCheapModeButton.classList.toggle("is-selected", strategy === "cheap");
    }
    
    if (autoBuyerStatusEl) {
        autoBuyerStatusEl.textContent = t("autoBuyerDecision", { decision: getAutoBuyerStatus().decision });
    }
}

function formatEta(seconds) {
    const safeSeconds = Number(seconds);
    if (!Number.isFinite(safeSeconds) || safeSeconds <= 0) return "0s";

    const total = Math.ceil(safeSeconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
}

function renderDailySummary() {
    if (!dailySummaryEl) return;
    dailySummaryEl.textContent = t("dailySummary", {
        clicks: formatNumber(gameState.todayStats.clicks),
        earned: formatNumber(gameState.todayStats.earned)
    });
}

function maybeShowOnboardingHint() {
    if (!getOnboardingHintsEnabled()) return;

    if (!gameState.onboardingHintsShown || typeof gameState.onboardingHintsShown !== "object") {
        gameState.onboardingHintsShown = {};
    }

    const hints = gameState.onboardingHintsShown;
    const totalBuildingsOwned = buildings.reduce((sum, building) => sum + Number(gameState.buildingData?.[building.id]?.owned || 0), 0);
    const clicksPerBuilding = totalBuildingsOwned > 0 ? gameState.totalClicks / totalBuildingsOwned : gameState.totalClicks;
    const prefersClicking = clicksPerBuilding >= 25;
    const nextAffordableBuilding = buildings
        .map((building) => {
            const owned = Number(gameState.buildingData?.[building.id]?.owned || 0);
            const preview = getEffectivePurchasePreview(building, owned, 1, gameState.cookies);
            const cpsGain = building.baseCps * Math.max(1, preview.quantity || 1);
            const roi = preview.totalCost > 0 ? (cpsGain / preview.totalCost) : 0;
            return {
                building,
                affordable: preview.totalCost > 0 && gameState.cookies >= preview.totalCost,
                roi,
                cost: preview.totalCost
            };
        })
        .filter((entry) => entry.affordable)
        .sort((a, b) => b.roi - a.roi || a.cost - b.cost)[0];

    if (!hints.first_clicks && gameState.totalClicks >= 20) {
        hints.first_clicks = true;
        showToast(prefersClicking
            ? "💡 Du klickst stark aktiv. Nutze Combo + Klickrausch für schnellen Push."
            : "💡 Tipp: Jetzt lohnt sich ein erstes Gebäude für stabilen CPS.", 2400, "info");
        return;
    }

    if (!hints.first_building && totalBuildingsOwned >= 1) {
        hints.first_building = true;
        showToast("🚀 Stark! Kombiniere jetzt Klicks + Gebäude für maximalen Start-Boost.", 2400, "success");
        return;
    }

    if (!hints.first_world_goal && gameState.lifetimeCookies >= 1500) {
        hints.first_world_goal = true;
        const recommendation = nextAffordableBuilding
            ? ` Nächster Kauf-Tipp: ${nextAffordableBuilding.building.name}.`
            : "";
        showToast(`🌍 Du bist nah an der nächsten Welt – achte auf den Fortschritt oben.${recommendation}`, 2600, "info");
        return;
    }

    if (!hints.first_prestige_goal && gameState.lifetimeCookies >= 300000) {
        hints.first_prestige_goal = true;
        showToast("✨ Prestige wird bald relevant – plane deinen Reset für einen großen Schub.", 2600, "info");
    }
}

function renderGoldenSnusButton() {
    if (!goldenSnusButton) return;

    const state = getGoldenSnusState();
    goldenSnusButton.hidden = !state.available;

    if (state.available) {
        goldenSnusButton.textContent = `🍀 +${formatNumber(state.reward)} (${Math.ceil(state.remainingMs / 1000)}s)`;
    }

     if (state.available && !wasGoldenSnusAvailable) {
        showToast(t("goldenSnusSpawned"), 1400, "info");
    }
    wasGoldenSnusAvailable = state.available;
}

function renderActiveBonusesPanel() {
    if (!activeBonusesPanelEl) return;

    const bonuses = getActiveBonuses();
    const lines = [];

    if (bonuses.worldClickBonusPercent > 0) lines.push(t("bonusWorldClick", { percent: bonuses.worldClickBonusPercent }));
    if (bonuses.worldCpsBonusPercent > 0) lines.push(t("bonusWorldCps", { percent: bonuses.worldCpsBonusPercent }));
    if (bonuses.worldDiscountPercent > 0) lines.push(t("bonusWorldDiscount", { percent: bonuses.worldDiscountPercent }));
    if (bonuses.activeBoostMultiplier > 1) lines.push(t("bonusBoost", { value: bonuses.activeBoostMultiplier.toFixed(2) }));
    if (bonuses.clickBurstMultiplier > 1) lines.push(t("bonusClickBurst", { value: bonuses.clickBurstMultiplier.toFixed(2) }));
    if (bonuses.discountBurstActive) lines.push(t("bonusDiscountBurst"));
    if (bonuses.streakBonusPercent > 0) lines.push(t("bonusDailyStreak", { percent: bonuses.streakBonusPercent }));
    if (bonuses.skillPowerPercent > 0) lines.push(t("bonusSkillPower", { percent: bonuses.skillPowerPercent }));
    if (bonuses.autoBuyerExtraPurchases > 0) lines.push(t("bonusAutoBuyerCap", { value: bonuses.autoBuyerExtraPurchases }));
    if (bonuses.goldenSnusAvailable && bonuses.goldenSnusReward > 0) lines.push(t("bonusGoldenSnusReady", { reward: formatNumber(bonuses.goldenSnusReward) }));
    if (bonuses.comboBonusPercent > 0) lines.push(`🔥 Hype-Combo +${bonuses.comboBonusPercent}%`);
    if (bonuses.earlyGameBoostPercent > 0) lines.push(`🚀 Start-Boost +${bonuses.earlyGameBoostPercent}%`);
    if (bonuses.inventoryIncomeBoostPercent > 0) lines.push(`🎒 Item: Einkommen +${bonuses.inventoryIncomeBoostPercent}%`);
    if (bonuses.inventoryCritBoostPercent > 0) lines.push(`🎒 Item: Crit +${bonuses.inventoryCritBoostPercent}%`);

    activeBonusesPanelEl.innerHTML = `
        <div class="goal-hints-title">${t("activeBonuses")}</div>
        <div class="goal-hints-list">${(lines.length ? lines : [t("bonusNone")]).map((line) => `<div>${line}</div>`).join("")}</div>
    `;
}

function renderComboHud() {
    if (!comboHudEl || !comboValueEl || !comboBarFillEl || !comboHintEl) return;

    const combo = getClickComboState();
    comboHudEl.classList.toggle("is-active", combo.comboLevel > 0);
    comboHudEl.classList.toggle("is-hot", combo.comboLevel >= 15);
    comboValueEl.textContent = `x${combo.multiplier.toFixed(2)}`;
    comboBarFillEl.style.width = `${Math.round(combo.meterProgress * 100)}%`;
    comboHintEl.textContent = combo.comboLevel > 0
        ? `Combo ${combo.comboLevel} · Crit +${combo.critBonusPercent}%`
        : "Schnell klicken für mehr Multiplikator.";
}

function renderPrestigePreview() {
    if (!trophyPrestigePreviewEl) return;
    const preview = getPrestigePreview();
    const etaToRecoverText = Number.isFinite(preview.etaToRecoverSeconds)
        ? formatEta(preview.etaToRecoverSeconds)
        : "∞";
    trophyPrestigePreviewEl.textContent = `Vorschau: +${preview.gain.prestigeCookies} Prestige | +${preview.gain.talentPoints} Talentpunkte | Verlust ${formatNumber(preview.lose.cookies)} Snus | Aufholzeit ${etaToRecoverText}`;
}

function renderPrestigeTalentTree() {
    if (!prestigeTalentTreeEl) return;
    const status = getPrestigeTalentStatus();
    if (prestigeTalentPointsEl) {
        prestigeTalentPointsEl.textContent = `Talentpunkte: ${status.availablePoints} frei (${status.spentPoints}/${status.totalPoints} genutzt)`;
    }

    prestigeTalentTreeEl.innerHTML = "";
    const rows = [
        status.entries.filter((entry) => entry.tier === 1),
        status.entries.filter((entry) => entry.tier === 2),
        status.entries.filter((entry) => entry.tier === 3)
    ];

    rows.forEach((rowEntries, rowIndex) => {
        const rowEl = document.createElement("div");
        rowEl.className = "prestige-talent-row";
        rowEl.dataset.tier = String(rowIndex + 1);

        rowEntries.forEach((entry) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "prestige-talent-node";
            button.dataset.talentId = entry.id;
            button.classList.toggle("is-owned", entry.owned);
            button.classList.toggle("is-locked", !entry.unlocked && !entry.owned);
            button.classList.toggle("is-affordable", entry.canBuy);
            button.disabled = entry.owned || !entry.unlocked || !entry.canBuy;

            const branchIcon = entry.branch === "click" ? "🖱️" : entry.branch === "idle" ? "🏭" : "⚖️";
            button.innerHTML = `
                <div class="prestige-talent-title">${branchIcon} ${entry.name}</div>
                <div class="prestige-talent-description">${entry.description}</div>
                <div class="prestige-talent-meta">${entry.owned ? "Gekauft" : !entry.unlocked ? "Gesperrt" : `Kosten: ${entry.cost}`}</div>
            `;
            rowEl.appendChild(button);
        });

        prestigeTalentTreeEl.appendChild(rowEl);
    });
}

export function renderUI(options = {}) {
    if (!cookieCountEl || !cpsEl || !prestigeCountEl || !worldNameEl) return;
    const now = Number(options.timestamp) || Date.now();
    const forceFull = Boolean(options.forceFull);
    const shouldRenderSlowPanels = forceFull || (now - lastSlowPanelRenderAt >= SLOW_PANEL_REFRESH_MS);

    const cpsValue = calculateCps();

    renderAnimatedStat(cookieCountEl, gameState.cookies, formatNumber, 340);
    renderAnimatedStat(cpsEl, cpsValue, formatNumber, 280);
    renderAnimatedStat(prestigeCountEl, gameState.prestigeCookies, (value) => formatNumber(value), 340);
    if (diamondCountEl) renderAnimatedStat(diamondCountEl, gameState.diamonds || 0, formatNumber, 340);

    const world = getWorldById(gameState.currentWorld);
    if (world) worldNameEl.textContent = world.name;

    if (trophyPrestigeProgressEl) {
        const prestigeProgress = getPrestigeProgressState();
        const progress = prestigeProgress.current;
        const lifetimeTarget = prestigeProgress.target;
        const remaining = prestigeProgress.remaining;
        const preview = getPrestigePreview();
        if (remaining <= 0) {
            const remainingToNextPrestige = prestigeProgress.target;
            const etaToNextPrestige = cpsValue > 0 ? remainingToNextPrestige / cpsValue : Infinity;

            const recommendation = preview.gain.prestigeCookies >= 5
                ? t("prestigeSuggestGreat", { gain: preview.gain.prestigeCookies })
                : preview.gain.prestigeCookies >= 2
                    ? t("prestigeSuggestReset", { gain: preview.gain.prestigeCookies })
                    : Number.isFinite(etaToNextPrestige) && etaToNextPrestige <= 120
                        ? t("prestigeSuggestNextBetter", { eta: formatEta(etaToNextPrestige) })
                        : t("prestigeSuggestWait");

            trophyPrestigeProgressEl.textContent = `${t("prestigeReady")} ${t("prestigePreview", {
                lose: formatNumber(preview.lose.cookies),
                gain: preview.gain.prestigeCookies
            })} ${recommendation}`;
        } else {
            let prestigeProgressText = t("prestigeProgress", {
                remaining: formatNumber(remaining),
                current: formatNumber(progress),
                target: formatNumber(lifetimeTarget)
            });
            
            if (cpsValue > 0) {
                const etaText = formatEta(remaining / cpsValue);
                prestigeProgressText += ` ${t("prestigeEta", { eta: etaText })}`;
                if ((remaining / cpsValue) <= 60) {
                    prestigeProgressText += ` ${t("prestigeSuggestSoon", { eta: etaText })}`;
                }
            }

            trophyPrestigeProgressEl.textContent = prestigeProgressText;
        }
    }

    renderPrestigePreview();
    renderGoldenSnusButton();
    renderComboHud();
    renderBoostStatus();
    renderAutoBuyerState();

    if (shouldRenderSlowPanels) {
        renderQuests();
        renderDailySummary();
        maybeShowOnboardingHint();
        renderActiveBonusesPanel();
        renderDiamondShop();
        renderAchievements();
        renderInventory();
        renderTrophyPath();
        renderPrestigeTalentTree();
        lastSlowPanelRenderAt = now;
    }

    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("snus:ui-rendered"));
    }
}

export { renderBuildings, refreshBuildingsIfNeeded };
export { renderTrophyPath, renderDiamondShop };

export function refreshAllUI() {
    applyStaticTranslations();
    applyWorldTheme();
    renderBuildings();
    renderDiamondShop();
    renderAchievements();
    renderInventory();
    renderQuests();
    renderTrophyPath();
    renderUI({ forceFull: true });
}

export function applyStaticTranslations() {
    const mapping = [
        ["labelSnus", t("statsSnus")],
        ["labelCps", t("statsPerSecond")],
        ["labelPrestige", t("statsPrestigeSnus")],
        ["labelDiamonds", t("diamonds")],
        ["worldButton", t("worldSwitch")],
        ["worldPickerTitle", t("worldPickerTitle")],
        ["settingsToggleButton", t("settingsOpen")],
        ["achievementsToggleButton", t("achievementsTitle")],
        ["inventoryToggleButton", t("inventoryTitle")],
        ["settingsTitle", t("settingsTitle")],
        ["achievementsTitle", t("achievementsTitle")],
        ["inventoryTitle", t("inventoryTitle")],
        ["questTitle", t("questTitle")],
        ["trophyPathButton", t("trophyPathButton")],
        ["trophyPathTitle", t("trophyPathTitle")],
        ["trophyPathIntro", t("trophyPathIntro")],
        ["inventoryIntro", t("inventoryIntro")],
        ["trophyResetWarning", t("trophyResetWarning")],
        ["trophyPrestigeButton", t("trophyPrestigeButton")],
        ["diamondShopTitle", t("diamondShopTitle")],
        ["settingSoundLabel", t("settingSound")],
        ["settingLanguageLabel", t("settingLanguage")],
        ["settingBackgroundLabel", t("settingBackground")],
        ["backgroundImageSelectButton", t("selectBackgroundImage")],
        ["backgroundImageResetButton", t("resetBackground")],
        ["settingCookieHorizontalOffsetLabel", t("settingCookieHorizontalOffset")],
        ["settingAutosaveIntervalLabel", t("settingAutosaveInterval")],
        ["settingUiRefreshIntervalLabel", t("settingUiRefreshInterval")],
        ["autoBuyerModeLabel", t("autoBuyerModeLabel")],
        ["settingNumberFormatLabel", t("settingNumberFormat")],
        ["settingReducedMotionLabel", t("settingReducedMotion")],
        ["settingHighContrastLabel", t("settingHighContrast")],
        ["settingOnboardingHintsLabel", t("settingOnboardingHints")],
        ["exportSaveButton", t("exportSave")],
        ["importSaveButton", t("importSave")],
        ["resetSaveButton", t("resetSave")],
        ["resetSaveHint", t("resetSaveHint")],
        ["resetSettingsButton", t("resetSettings")]
    ];
    mapping.forEach(([id, text]) => {
        const node = document.getElementById(id);
        if (node) node.textContent = text;
    });

    const clickButton = document.getElementById("clickBurstButton");
    const discountButton = document.getElementById("discountBurstButton");
    if (clickButton) clickButton.textContent = t("clickBurstButton");
    if (discountButton) discountButton.textContent = t("discountBurstButton");
}


function setAnimatedModalState(modalEl, open, durationMs = 220) {
    if (!modalEl) return;

    if (open) {
        modalEl.hidden = false;
        
        const raf = typeof globalThis.requestAnimationFrame === "function"
            ? globalThis.requestAnimationFrame.bind(globalThis)
            : null;
        if (raf) {
            raf(() => modalEl.classList.add("is-open"));
        } else {
            modalEl.classList.add("is-open");
        }
        return;
    }

    modalEl.classList.remove("is-open");
    window.setTimeout(() => {
        if (!modalEl.classList.contains("is-open")) {
            modalEl.hidden = true;
        }
    }, durationMs);
}

function createClickEffectAt(x, y) {
    if (!clickEffectContainer) return;

    const click = clickCookie();
    const amount = click.amount;
    playClickSound();

    const effect = clickEffectPool.pop() || document.createElement("div");
    effect.className = "click-effect";
    effect.hidden = false;
    if (click.crit) effect.classList.add("is-crit");
    if (click.comboLevel >= 10) effect.classList.add("is-combo");
    effect.textContent = `${click.crit ? "CRIT " : ""}+${formatNumber(amount)}`;
    effect.style.left = `${x}px`;
    effect.style.top = `${y}px`;
    effect.style.animation = "none";
    effect.offsetHeight;
    effect.style.animation = "";

    clickEffectContainer.appendChild(effect);

    if (click.crit) {
        cookieClickArea?.classList.add("is-crit-pulse");
        setTimeout(() => cookieClickArea?.classList.remove("is-crit-pulse"), 220);
    }

    activeClickEffects.add(effect);
    setTimeout(() => {
        effect.classList.remove("is-crit", "is-combo");
        effect.textContent = "";
        effect.hidden = true;
        activeClickEffects.delete(effect);
        clickEffectPool.push(effect);
    }, 1000);
}

function handleCookiePointer(event) {
    if (!cookieClickArea) return;
    const rect = cookieClickArea.getBoundingClientRect();
    createClickEffectAt(event.clientX - rect.left, event.clientY - rect.top);
}

if (cookieClickArea && clickEffectContainer) {
    if (typeof window !== "undefined" && typeof window.PointerEvent === "function") {
        cookieClickArea.addEventListener("pointerdown", handleCookiePointer);
    } else {
        cookieClickArea.addEventListener("click", handleCookiePointer);
    }
    cookieClickArea.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        const rect = cookieClickArea.getBoundingClientRect();
        createClickEffectAt(rect.width / 2, rect.height / 2);
    });
}

const buyModeButtons = Array.from(document.querySelectorAll(".buy-options button"));

function updateBuyModeButtonState() {
    buyModeButtons.forEach((btn) => {
        const mode = btn.dataset.buy;
        const isActive = mode === String(gameState.buyMode);
        btn.classList.toggle("active", isActive);
        btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
}

buyModeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
        const mode = btn.dataset.buy;
        const parsed = Number.parseInt(mode, 10);
        setBuyMode(mode === "max" ? "max" : parsed);
        updateBuyModeButtonState();
        renderBuildings();
    });
});
updateBuyModeButtonState();

function closeWorldPicker() {
    if (!worldPickerModal) return;
    setAnimatedModalState(worldPickerModal, false, 220);
}

function switchToWorld(worldId) {
    if (!worldTransition) return;
    worldTransition.classList.add("active");
    setTimeout(() => {
        const changed = changeWorld(worldId);
        if (changed) {
            applyWorldTheme();
            renderUI();
        }
        worldTransition.classList.remove("active");
    }, 600);
}

function renderWorldPicker() {
    if (!worldPickerList) return;
    worldPickerList.innerHTML = "";

    worlds.forEach((world) => {
        const purchased = isWorldPurchased(world.id);
        const totalBuildings = buildings.reduce((sum, b) => sum + Number(gameState.buildingData[b.id]?.owned || 0), 0);
        const worldProgress = {
            lifetimeCookies: gameState.lifetimeCookies,
            totalBuildings,
            prestigeCookies: gameState.prestigeCookies
        };
        const unlockDetails = getWorldUnlockDetails(world, gameState.cookies, {
            ...worldProgress
        });
        const unlocked = purchased || isWorldUnlocked(world, gameState.cookies, {
            ...worldProgress
        });
        const button = document.createElement("button");
        button.type = "button";
        button.className = "world-picker-item";
        button.classList.toggle("is-current", world.id === gameState.currentWorld);
        button.classList.toggle("is-locked", !unlocked);

        button.innerHTML = `
            <div class="world-picker-item-title">${unlocked ? "🌍" : "🔒"} ${world.name}</div>
            <div class="world-picker-item-cost">${t("worldUnlockCostSnus", { cost: formatNumber(world.unlockCost) })}</div>
            <div class="world-picker-item-status">${purchased ? (world.id === gameState.currentWorld ? t("worldCurrent") : t("worldUnlocked")) : unlockDetails.unlocked ? t("worldReadyToUnlock") : [
                unlockDetails.missingCost > 0 ? t("worldMissingSnus", { missing: formatNumber(unlockDetails.missingCost) }) : "",
                unlockDetails.missingLifetime > 0 ? t("worldMissingLifetime", { missing: formatNumber(unlockDetails.missingLifetime) }) : "",
                unlockDetails.missingBuildings > 0 ? t("worldMissingBuildings", { missing: formatNumber(unlockDetails.missingBuildings) }) : "",
                unlockDetails.missingPrestige > 0 ? t("worldMissingPrestige", { missing: formatNumber(unlockDetails.missingPrestige) }) : ""
            ].filter(Boolean).join(" · ")}</div>
        `;

        button.addEventListener("click", () => {
            if (!purchased) {
                const bought = buyWorld(world.id);
                if (!bought) {
                    showToast(t("worldLockedNeedProgress", {
                        reasons: [
                            unlockDetails.missingCost > 0 ? t("worldMissingSnus", { missing: formatNumber(unlockDetails.missingCost) }) : "",
                            unlockDetails.missingLifetime > 0 ? t("worldMissingLifetime", { missing: formatNumber(unlockDetails.missingLifetime) }) : "",
                            unlockDetails.missingBuildings > 0 ? t("worldMissingBuildings", { missing: formatNumber(unlockDetails.missingBuildings) }) : "",
                            unlockDetails.missingPrestige > 0 ? t("worldMissingPrestige", { missing: formatNumber(unlockDetails.missingPrestige) }) : ""
                        ].filter(Boolean).join(" · ")
                    }), 2000, "warning");
                    return;
                }
                showToast(t("worldPurchased", { name: world.name }), 1600, "success");
            }
            closeWorldPicker();
            if (world.id !== gameState.currentWorld) switchToWorld(world.id);
        });

        worldPickerList.appendChild(button);
    });
}

if (worldButton && worldPickerModal) {
    worldButton.addEventListener("click", () => {
        renderWorldPicker();
        setAnimatedModalState(worldPickerModal, true, 220);
    });
}
if (worldPickerClose) worldPickerClose.addEventListener("click", closeWorldPicker);
if (worldPickerModal) worldPickerModal.addEventListener("click", (event) => {
    if (event.target === worldPickerModal) closeWorldPicker();
});
if (typeof document.addEventListener === "function") {
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeWorldPicker();
    });
}

if (boostButton) {
    boostButton.addEventListener("click", () => {
        if (pendingActionButtons.has(boostButton)) return;
        pendingActionButtons.add(boostButton);
        if (activateProductionBoost()) showToast(t("boostActivated"), 1200, "success");
        renderUI();
        setTimeout(() => pendingActionButtons.delete(boostButton), 180);
    });
}

if (clickBurstButton) {
    clickBurstButton.addEventListener("click", () => {
        if (pendingActionButtons.has(clickBurstButton)) return;
        pendingActionButtons.add(clickBurstButton);
        if (activateClickBurst()) showToast(t("clickBurstActivated"), 1200, "success");
        renderUI();
        setTimeout(() => pendingActionButtons.delete(clickBurstButton), 180);
    });
}

if (discountBurstButton) {
    discountBurstButton.addEventListener("click", () => {
        if (pendingActionButtons.has(discountBurstButton)) return;
        pendingActionButtons.add(discountBurstButton);
        if (activateDiscountBurst()) showToast(t("discountBurstActivated"), 1200, "success");
        renderUI();
        setTimeout(() => pendingActionButtons.delete(discountBurstButton), 180);
    });
}

if (autoBuyerButton) {
    autoBuyerButton.addEventListener("click", () => {
        if (pendingActionButtons.has(autoBuyerButton)) return;
        pendingActionButtons.add(autoBuyerButton);
        if (!gameState.autoBuyerUnlocked) {
            const unlocked = unlockAutoBuyer();
            showToast(unlocked ? t("autoBuyerUnlocked") : t("autoBuyerNeedSnus", { cost: formatNumber(AUTO_BUYER_UNLOCK_COST) }), 1500, unlocked ? "success" : "warning");
            renderUI();
            setTimeout(() => pendingActionButtons.delete(autoBuyerButton), 180);
            return;
        }
        setAutoBuyerEnabled(!gameState.autoBuyerEnabled);
        renderUI();
        setTimeout(() => pendingActionButtons.delete(autoBuyerButton), 180);
    });
}

[autoBuyerValueModeButton, autoBuyerCheapModeButton].forEach((button) => {
    if (!button) return;

    button.addEventListener("click", () => {
        if (!gameState.autoBuyerUnlocked) return;

        const strategy = button === autoBuyerCheapModeButton ? "cheap" : "value";
        const appliedStrategy = setAutoBuyerStrategy(strategy);
        const strategyLabelKey = appliedStrategy === "cheap" ? "autoBuyerStrategyCheap" : "autoBuyerStrategyValue";
        showToast(t("autoBuyerStrategyUpdated", { strategy: t(strategyLabelKey) }), 1300, "info");
        renderUI();
    });
});

if (goldenSnusButton) {
    goldenSnusButton.addEventListener("click", () => {
        const reward = claimGoldenSnus();
        if (reward > 0) {
            showToast(t("goldenSnusClaimed", { reward: formatNumber(reward) }), 1500, "success");
            renderUI();
        }
    });
}

if (inventoryListEl) {
    inventoryListEl.addEventListener("click", (event) => {
        const target = event.target instanceof Element ? event.target.closest(".inventory-use-button") : null;
        const itemId = target?.dataset.itemId;
        if (!itemId) return;

        const used = useInventoryItem(itemId);
        if (!used.success) {
            showToast(t("inventoryCannotUse"), 1200, "warning");
            return;
        }

        showToast(t("inventoryActivated", { item: t(used.item.nameKey) }), 1500, "success");
        renderUI({ forceFull: true });
    });
}

if (prestigeTalentTreeEl) {
    prestigeTalentTreeEl.addEventListener("click", (event) => {
        const target = event.target instanceof Element ? event.target.closest(".prestige-talent-node") : null;
        const talentId = target?.dataset.talentId;
        if (!talentId) return;

        const bought = buyPrestigeTalent(talentId);
        if (!bought) {
            showToast("Talent konnte nicht gekauft werden.", 1400, "warning");
            return;
        }

        showToast("✅ Talent freigeschaltet.", 1400, "success");
        renderUI({ forceFull: true });
    });
}

export function applyCookieHorizontalOffset() {
    document.documentElement.style.setProperty("--cookie-horizontal-offset", "0px");
}

export function applyWorldTheme() {
    const world = getWorldById(gameState.currentWorld);
    if (!world || !mainCookie) return;

    const customBackground = getBackgroundColor();
    const customBackgroundImage = getBackgroundImage();
    document.body.style.background = customBackground || world.theme.background;
    if (customBackgroundImage) {
        document.body.style.backgroundImage = `url("${customBackgroundImage}")`;
        document.body.style.backgroundPosition = "center";
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundRepeat = "no-repeat";
    } else {
        document.body.style.backgroundImage = "";
        document.body.style.backgroundPosition = "";
        document.body.style.backgroundSize = "";
        document.body.style.backgroundRepeat = "";
    }
    document.body.classList.toggle("reduced-motion", getReducedMotion());
    document.body.classList.toggle("high-contrast", getHighContrast());
    applyCookieHorizontalOffset();
    mainCookie.src = world.cookieImage;
    mainCookie.style.filter = "none";
}

export { showAutosave, showToast };
