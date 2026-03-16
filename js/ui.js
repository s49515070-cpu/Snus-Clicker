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
    getPrestigeEffects,
    getPotentialPrestigeGain,
    prestigeReset,
    milestones,
    getMilestoneProgress,
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
    getAutoBuyerStatus,
    getPrestigePreview,
    PRESTIGE_THRESHOLD,
    AUTO_BUYER_UNLOCK_COST
} from "./engine.js";
import { buildings, getBuildingCost, getPurchaseCost, getMaxAffordableSummary } from "./buildings.js";
import { worlds, getWorldById, isWorldUnlocked, getWorldUnlockDetails } from "./worlds.js";
import { createBuildingsUIController } from "./ui-buildings.js";
import { initToastSystem, showAutosave, showToast } from "./ui-toast.js";
import { createPrestigeUIController } from "./ui-prestige.js";
import { t } from "./i18n.js";
import { getBackgroundColor, getNumberFormat, getHighContrast, getReducedMotion } from "./config.js";
import { playClickSound } from "./audio.js";

const cookieCountEl = document.getElementById("cookieCount");
const cpsEl = document.getElementById("cps");
const prestigeCountEl = document.getElementById("prestigeCount");
const worldNameEl = document.getElementById("worldName");
const worldButton = document.getElementById("worldButton");
const nextWorldProgressEl = document.getElementById("nextWorldProgress");
const prestigeButton = document.getElementById("prestigeButton");
const prestigeUpgradesEl = document.getElementById("prestigeUpgrades");
const prestigeSummaryEl = document.getElementById("prestigeSummary");
const prestigeResetProgressEl = document.getElementById("prestigeResetProgress");
const milestonesListEl = document.getElementById("milestonesList");
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
const goalHintsEl = document.getElementById("goalHints");
const activeBonusesPanelEl = document.getElementById("activeBonusesPanel");

initToastSystem(autosaveIndicator);

const { renderBuildings, refreshBuildingsIfNeeded } = createBuildingsUIController({
    gameState,
    buildings,
    getBuildingCost,
    getPurchaseCost,
    getMaxAffordableSummary,
    buyBuilding,
    formatNumber,
    t,
    leftColumn,
    rightColumn
});

const { renderPrestigeUpgrades, refreshPrestigeUpgradesIfNeeded, updatePrestigeResetButtonState } = createPrestigeUIController({
    gameState,
    prestigeUpgrades,
    prestigeUpgradesEl,
    prestigeSummaryEl,
    prestigeButton,
    getPrestigeUpgradeCost,
    getPrestigeEffects,
    getPotentialPrestigeGain,
    buyPrestigeUpgrade,
    prestigeReset,
    showToast,
    t,
    onUpgradePurchased: () => renderBuildings(),
    onPrestigeReset: () => renderBuildings()
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

function renderMilestones() {
    if (!milestonesListEl) return;
    milestonesListEl.innerHTML = "";

    milestones.forEach((milestone) => {
        const status = getMilestoneProgress(milestone.id);
        const item = document.createElement("div");
        item.className = "milestone-item";
        item.classList.toggle("is-complete", status.completed);
        item.classList.toggle("is-claimed", status.claimed);

        const title = document.createElement("div");
        title.className = "milestone-title";
        title.textContent = milestone.labelKey ? t(milestone.labelKey) : milestone.label;

        const description = document.createElement("div");
        description.className = "milestone-description";
        description.textContent = milestone.descriptionKey ? t(milestone.descriptionKey) : milestone.description;

        const progress = document.createElement("div");
        progress.className = "milestone-progress";
        progress.textContent = `${Math.floor(Math.min(status.current, status.target))} / ${Math.floor(status.target)}`;

        const reward = document.createElement("div");
        reward.className = "milestone-reward";
        const rewardParts = [];
        if (milestone.rewardCookies) rewardParts.push(`+${milestone.rewardCookies} ${t("snus")}`);
        if (milestone.rewardPrestigeCookies) rewardParts.push(`+${milestone.rewardPrestigeCookies} ${t("prestigeSnus")}`);
        reward.textContent = rewardParts.length > 0 ? `${t("reward")}: ${rewardParts.join(" | ")}` : `${t("reward")}: —`;

        item.append(title, description, progress, reward);
        milestonesListEl.appendChild(item);
    });
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
        item.innerHTML = `
            <div class="quest-title">${label}</div>
            <div class="quest-description">${description}</div>
            <div class="quest-progress">${Math.floor(Math.min(status.current, status.target))}/${status.target}</div>
        `;
        questListEl.appendChild(item);
    });
}

function renderBoostStatus() {
    if (!boostButton || !boostStatusEl) return;
    const status = getBoostStatus();
    boostButton.disabled = !status.ready;
    if (clickBurstButton) clickBurstButton.disabled = status.clickBurstCooldownMs > 0;
    if (discountBurstButton) discountBurstButton.disabled = status.discountBurstCooldownMs > 0;

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
        return;
    }

    autoBuyerButton.textContent = gameState.autoBuyerEnabled ? t("autoBuyerOn") : t("autoBuyerOff");
    autoBuyerButton.classList.toggle("is-active", gameState.autoBuyerEnabled);
    
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

function getNearestMilestoneGoal() {
    let best = null;
    milestones.forEach((milestone) => {
        const status = getMilestoneProgress(milestone.id);
        if (status.completed) return;
        const remaining = Math.max(0, status.target - status.current);
        if (!best || remaining < best.remaining) {
            const label = milestone.labelKey ? t(milestone.labelKey) : milestone.label;
            best = { remaining, text: `${label} (${formatNumber(remaining)} left)` };
        }
    });
    return best?.text || null;
}

function getNearestQuestGoal() {
    let best = null;
    quests.forEach((quest) => {
        const status = getQuestProgress(quest.id);
        if (status.completed) return;
        const remaining = Math.max(0, status.target - status.current);
        if (!best || remaining < best.remaining) {
            const label = quest.labelKey ? t(quest.labelKey) : quest.label;
            best = { remaining, text: `${label} (${formatNumber(remaining)} left)` };
        }
    });
    return best?.text || null;
}

function renderGoalHints() {
    if (!goalHintsEl) return;

    const lines = [];
    const nextWorld = worlds.find((item) => !isWorldPurchased(item.id));
    if (nextWorld) {
        const details = getWorldUnlockDetails(nextWorld, gameState.cookies, {
            lifetimeCookies: gameState.lifetimeCookies,
            totalBuildings: buildings.reduce((sum, b) => sum + Number(gameState.buildingData[b.id]?.owned || 0), 0)
        });
        const worldParts = [
            details.missingCost > 0 ? `${formatNumber(details.missingCost)} snus` : null,
            details.missingLifetime > 0 ? `${formatNumber(details.missingLifetime)} lifetime` : null,
            details.missingBuildings > 0 ? `${formatNumber(details.missingBuildings)} buildings` : null
        ].filter(Boolean);
        const worldText = worldParts.length > 0 ? worldParts.join(' · ') : t('worldReadyToUnlock');
        const worldEta = details.missingCost > 0 && calculateCps() > 0 ? ` · ETA ${formatEta(details.missingCost / calculateCps())}` : '';
        lines.push(t('goalWorld', { text: `${worldText}${worldEta}` }));
    }

    const milestoneGoal = getNearestMilestoneGoal();
    if (milestoneGoal) lines.push(t('goalMilestone', { text: milestoneGoal }));

    const questGoal = getNearestQuestGoal();
    if (questGoal) lines.push(t('goalQuest', { text: questGoal }));

    goalHintsEl.innerHTML = `
        <div class="goal-hints-title">${t('goalsTitle')}</div>
        <div class="goal-hints-list">${lines.map((line) => `<div>${line}</div>`).join('')}</div>
    `;
}

function renderDailySummary() {
    if (!dailySummaryEl) return;
    dailySummaryEl.textContent = t("dailySummary", {
        clicks: formatNumber(gameState.todayStats.clicks),
        earned: formatNumber(gameState.todayStats.earned)
    });
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

    activeBonusesPanelEl.innerHTML = `
        <div class="goal-hints-title">${t("activeBonuses")}</div>
        <div class="goal-hints-list">${(lines.length ? lines : [t("bonusNone")]).map((line) => `<div>${line}</div>`).join("")}</div>
    `;
}

export function renderUI() {
    if (!cookieCountEl || !cpsEl || !prestigeCountEl || !worldNameEl) return;
    
    const cpsValue = calculateCps();

    cookieCountEl.textContent = formatNumber(gameState.cookies);
    cpsEl.textContent = formatNumber(cpsValue);
    prestigeCountEl.textContent = gameState.prestigeCookies;

    const world = getWorldById(gameState.currentWorld);
    if (world) worldNameEl.textContent = world.name;

    if (nextWorldProgressEl) {
        const nextWorld = worlds.find((item) => !isWorldPurchased(item.id));
        if (!nextWorld) {
            nextWorldProgressEl.textContent = "";
            nextWorldProgressEl.hidden = true;
        } else {
            nextWorldProgressEl.hidden = false;
            const progress = Math.min(gameState.cookies, nextWorld.unlockCost);
            const remaining = Math.max(0, nextWorld.unlockCost - gameState.cookies);
            let worldProgressText = t("worldUnlockProgressSnus", {
                remaining: formatNumber(remaining),
                current: formatNumber(progress),
                target: formatNumber(nextWorld.unlockCost)
            });
            
            if (remaining > 0 && cpsValue > 0) {
                worldProgressText += ` ${t("worldUnlockEta", { eta: formatEta(remaining / cpsValue) })}`;
            }

            nextWorldProgressEl.textContent = worldProgressText;
        }
    }

    if (prestigeResetProgressEl) {
        const lifetimeTarget = PRESTIGE_THRESHOLD;
        const progress = Math.min(gameState.lifetimeCookies, lifetimeTarget);
        const remaining = Math.max(0, lifetimeTarget - gameState.lifetimeCookies);
        const preview = getPrestigePreview();
        if (remaining <= 0) {
            const lifetimeSinceLastPrestige = Math.max(0, gameState.lifetimeCookies - gameState.lifetimeCookiesAtLastPrestige);
            const progressInsideTier = lifetimeSinceLastPrestige % PRESTIGE_THRESHOLD;
            const remainingToNextPrestige = PRESTIGE_THRESHOLD - progressInsideTier;
            const etaToNextPrestige = cpsValue > 0 ? remainingToNextPrestige / cpsValue : Infinity;

            const recommendation = preview.gain.prestigeCookies >= 5
                ? t("prestigeSuggestGreat", { gain: preview.gain.prestigeCookies })
                : preview.gain.prestigeCookies >= 2
                    ? t("prestigeSuggestReset", { gain: preview.gain.prestigeCookies })
                    : Number.isFinite(etaToNextPrestige) && etaToNextPrestige <= 120
                        ? t("prestigeSuggestNextBetter", { eta: formatEta(etaToNextPrestige) })
                        : t("prestigeSuggestWait");

            prestigeResetProgressEl.textContent = `${t("prestigeReady")} ${t("prestigePreview", {
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

            prestigeResetProgressEl.textContent = prestigeProgressText;
        }
    }

    renderBoostStatus();
    renderQuests();
    renderDailySummary();
    renderGoalHints();
    renderActiveBonusesPanel();
    renderAutoBuyerState();
    refreshPrestigeUpgradesIfNeeded();
    updatePrestigeResetButtonState();
    renderMilestones();
}

export { renderBuildings, refreshBuildingsIfNeeded };
export { renderPrestigeUpgrades };

export function refreshAllUI() {
    applyStaticTranslations();
    applyWorldTheme();
    renderBuildings();
    renderPrestigeUpgrades();
    renderMilestones();
    renderQuests();
    renderUI();
}

export function applyStaticTranslations() {
    const mapping = [
        ["labelSnus", t("statsSnus")],
        ["labelCps", t("statsPerSecond")],
        ["labelPrestige", t("statsPrestigeSnus")],
        ["worldButton", t("worldSwitch")],
        ["worldPickerTitle", t("worldPickerTitle")],
        ["settingsToggleButton", t("settingsOpen")],
        ["milestonesToggleButton", t("milestonesTitle")],
        ["settingsTitle", t("settingsTitle")],
        ["milestonesTitle", t("milestonesTitle")],
        ["questTitle", t("questTitle")],
        ["settingSoundLabel", t("settingSound")],
        ["settingLanguageLabel", t("settingLanguage")],
        ["settingBackgroundLabel", t("settingBackground")],
        ["settingAutoBuyerStrategyLabel", t("settingAutoBuyerStrategy")],
        ["settingAutoBuyerValueWeightLabel", t("settingAutoBuyerValueWeight")],
        ["settingAutoBuyerCheapWeightLabel", t("settingAutoBuyerCheapWeight")],
        ["settingNumberFormatLabel", t("settingNumberFormat")],
        ["settingReducedMotionLabel", t("settingReducedMotion")],
        ["settingHighContrastLabel", t("settingHighContrast")],
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

function createClickEffectAt(x, y) {
    if (!clickEffectContainer) return;

    const click = clickCookie();
    const amount = click.amount;
    playClickSound();

    const effect = document.createElement("div");
    effect.className = "click-effect";
    if (click.crit) effect.classList.add("is-crit");
    effect.textContent = `${click.crit ? "CRIT " : ""}+${formatNumber(amount)}`;
    effect.style.left = `${x}px`;
    effect.style.top = `${y}px`;

    clickEffectContainer.appendChild(effect);

    if (click.crit) {
        cookieClickArea?.classList.add("is-crit-pulse");
        setTimeout(() => cookieClickArea?.classList.remove("is-crit-pulse"), 220);
    }

    setTimeout(() => effect.remove(), 1000);
}

function handleCookiePointer(event) {
    if (!cookieClickArea) return;
    const rect = cookieClickArea.getBoundingClientRect();
    createClickEffectAt(event.clientX - rect.left, event.clientY - rect.top);
}

if (cookieClickArea && clickEffectContainer) {
    cookieClickArea.addEventListener("pointerdown", handleCookiePointer);
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
    worldPickerModal.hidden = true;
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
        const unlockDetails = getWorldUnlockDetails(world, gameState.cookies, {
            lifetimeCookies: gameState.lifetimeCookies,
            totalBuildings: buildings.reduce((sum, b) => sum + Number(gameState.buildingData[b.id]?.owned || 0), 0)
        });
        const unlocked = purchased || isWorldUnlocked(world, gameState.cookies, {
            lifetimeCookies: gameState.lifetimeCookies,
            totalBuildings: buildings.reduce((sum, b) => sum + Number(gameState.buildingData[b.id]?.owned || 0), 0)
        });
        const missing = unlockDetails.missingCost;
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
                unlockDetails.missingBuildings > 0 ? t("worldMissingBuildings", { missing: formatNumber(unlockDetails.missingBuildings) }) : ""
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
                            unlockDetails.missingBuildings > 0 ? t("worldMissingBuildings", { missing: formatNumber(unlockDetails.missingBuildings) }) : ""
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
        worldPickerModal.hidden = false;
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
        if (activateProductionBoost()) showToast(t("boostActivated"), 1200, "success");
    });
}

if (clickBurstButton) {
    clickBurstButton.addEventListener("click", () => {
        if (activateClickBurst()) showToast(t("clickBurstActivated"), 1200, "success");
    });
}

if (discountBurstButton) {
    discountBurstButton.addEventListener("click", () => {
        if (activateDiscountBurst()) showToast(t("discountBurstActivated"), 1200, "success");
    });
}

if (autoBuyerButton) {
    autoBuyerButton.addEventListener("click", () => {
        if (!gameState.autoBuyerUnlocked) {
            const unlocked = unlockAutoBuyer();
            showToast(unlocked ? t("autoBuyerUnlocked") : t("autoBuyerNeedSnus", { cost: formatNumber(AUTO_BUYER_UNLOCK_COST) }), 1500, unlocked ? "success" : "warning");
            return;
        }
        setAutoBuyerEnabled(!gameState.autoBuyerEnabled);
    });
}

export function applyWorldTheme() {
    const world = getWorldById(gameState.currentWorld);
    if (!world || !mainCookie) return;

    const customBackground = getBackgroundColor();
    document.body.style.background = customBackground || world.theme.background;
    document.body.classList.toggle("reduced-motion", getReducedMotion());
    document.body.classList.toggle("high-contrast", getHighContrast());
    mainCookie.src = world.cookieImage;
    mainCookie.style.filter = `drop-shadow(0 0 20px ${world.theme.glow})`;
}

export { showAutosave, showToast };
