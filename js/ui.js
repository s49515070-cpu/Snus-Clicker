// =====================================
// UI SYSTEM – SNUS CLICKER
// Rendering & Interaktion
// =====================================


import { gameState, clickCookie, buyBuilding, setBuyMode, calculateCps, changeWorld, prestigeUpgrades, buyPrestigeUpgrade, getPrestigeUpgradeCost, getPrestigeEffects, getPotentialPrestigeGain, prestigeReset, milestones, getMilestoneProgress } from "./engine.js";
import { buildings, getBuildingCost, getPurchaseCost, getMaxAffordableSummary } from "./buildings.js";
import { worlds, getWorldById, isWorldUnlocked } from "./worlds.js";
import { createBuildingsUIController } from "./ui-buildings.js";
import { initToastSystem, showAutosave, showToast } from "./ui-toast.js";
import { createPrestigeUIController } from "./ui-prestige.js";
import { t } from "./i18n.js";
import { getBackgroundColor } from "./config.js";
import { playClickSound } from "./audio.js";

// DOM Elemente
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
const autosaveIndicator = document.getElementById("autosaveIndicator");

initToastSystem(autosaveIndicator);

const {
    renderBuildings,
    refreshBuildingsIfNeeded
} = createBuildingsUIController({
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

const {
    renderPrestigeUpgrades,
    refreshPrestigeUpgradesIfNeeded,
    updatePrestigeResetButtonState
} = createPrestigeUIController({
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
    onUpgradePurchased: () => {
        renderBuildings();
    },
    onPrestigeReset: () => {
        renderBuildings();
    }
});

// ===============================
// FORMATTER
// ===============================

function formatNumber(num) {
    if (!Number.isFinite(num)) return "0";

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
        title.textContent = milestone.label;

        const description = document.createElement("div");
        description.className = "milestone-description";
        description.textContent = milestone.description;

        const progress = document.createElement("div");
        progress.className = "milestone-progress";
        const current = Math.min(status.current, status.target);
        progress.textContent = `${Math.floor(current)} / ${Math.floor(status.target)}`;

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

// ===============================
// RENDER LOOP
// ===============================

export function renderUI() {

    if (!cookieCountEl || !cpsEl || !prestigeCountEl || !worldNameEl) {
        return;
    }

    cookieCountEl.textContent = formatNumber(gameState.cookies);
    cpsEl.textContent = formatNumber(calculateCps());
    prestigeCountEl.textContent = gameState.prestigeCookies;


const world = getWorldById(gameState.currentWorld);


    if (world) {
        worldNameEl.textContent = world.name;
    }
    if (nextWorldProgressEl) {
        const nextWorld = worlds.find((item) => item.id > gameState.currentWorld);
        if (!nextWorld) {
            nextWorldProgressEl.textContent = t("worldAllUnlocked");
        } else {
            const progress = Math.min(gameState.prestigeCookies, nextWorld.unlockCost);
            const remaining = Math.max(0, nextWorld.unlockCost - gameState.prestigeCookies);
            nextWorldProgressEl.textContent = t("worldUnlockProgress", {
                remaining: formatNumber(remaining),
                current: formatNumber(progress),
                target: formatNumber(nextWorld.unlockCost)
            });
        }
    }

    if (prestigeResetProgressEl) {
        const lifetimeTarget = 1000000;
        const progress = Math.min(gameState.lifetimeCookies, lifetimeTarget);
        const remaining = Math.max(0, lifetimeTarget - gameState.lifetimeCookies);
        prestigeResetProgressEl.textContent = remaining <= 0
            ? t("prestigeReady")
            : t("prestigeProgress", {
                remaining: formatNumber(remaining),
                current: formatNumber(progress),
                target: formatNumber(lifetimeTarget)
            });
    }

    
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
    renderUI();
}
export function applyStaticTranslations() {
    const mapping = [
        ["labelSnus", t("statsSnus")],
        ["labelCps", t("statsPerSecond")],
        ["labelPrestige", t("statsPrestigeSnus")],
        ["worldButton", t("worldSwitch")],
        ["settingsToggleButton", t("settingsOpen")],
        ["milestonesToggleButton", t("milestonesTitle")],
        ["settingsTitle", t("settingsTitle")],
        ["milestonesTitle", t("milestonesTitle")],
        ["settingSoundLabel", t("settingSound")],
        ["settingLanguageLabel", t("settingLanguage")],
        ["settingBackgroundLabel", t("settingBackground")],
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
    const closeButton = document.getElementById("settingsCloseButton");
    if (closeButton) {
        closeButton.textContent = "✕";
        closeButton.setAttribute("aria-label", t("close"));
        closeButton.setAttribute("title", t("close"));
    }

    const milestonesTitle = document.querySelector(".milestones-panel h3");
    if (milestonesTitle) milestonesTitle.textContent = t("milestonesTitle");

    const milestonesCloseButton = document.getElementById("milestonesCloseButton");
    if (milestonesCloseButton) {
        milestonesCloseButton.textContent = "✕";
        milestonesCloseButton.setAttribute("aria-label", t("close"));
        milestonesCloseButton.setAttribute("title", t("close"));
    }

    const prestigeTitle = document.querySelector(".prestige-panel h3");
    if (prestigeTitle) prestigeTitle.textContent = t("prestigeTitle");

    const languageSelect = document.getElementById("languageInput");
    if (languageSelect) {
        const germanOption = languageSelect.querySelector('option[value="de"]');
        const englishOption = languageSelect.querySelector('option[value="en"]');
        if (germanOption) germanOption.textContent = t("languageGerman");
        if (englishOption) englishOption.textContent = t("languageEnglish");
    }

    const soundSelect = document.getElementById("soundEnabledInput");
    if (soundSelect) {
        const onOption = soundSelect.querySelector('option[value="on"]');
        const offOption = soundSelect.querySelector('option[value="off"]');
        if (onOption) onOption.textContent = t("soundOn");
        if (offOption) offOption.textContent = t("soundOff");
    }
}

// ===============================
// CLICK EFFECT
// ===============================

function createClickEffectAt(x, y) {
    if (!clickEffectContainer) return;

    const amount = clickCookie();
    playClickSound();

    const effect = document.createElement("div");
    effect.className = "click-effect";
    effect.textContent = "+" + formatNumber(amount);


    effect.style.left = x + "px";
    effect.style.top = y + "px";

    clickEffectContainer.appendChild(effect);

    setTimeout(() => {
        effect.remove();
    }, 1000);
}

function handleCookiePointer(event) {
    if (!cookieClickArea) return;

    const rect = cookieClickArea.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    createClickEffectAt(x, y);
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

// ===============================
// BUY MODE BUTTONS
// ===============================


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

// ===============================
// WORLD SWITCH
// ===============================

if (worldButton && worldTransition) {
    worldButton.addEventListener("click", () => {

    let nextWorld = gameState.currentWorld + 1;
    if (nextWorld > worlds.length) nextWorld = 1;
    const world = getWorldById(nextWorld);
        
     if (!world || !isWorldUnlocked(world, gameState.prestigeCookies)) {
         showToast(t("worldLocked"), 1800, "warning");
            
            return;
        }


    
        worldTransition.classList.add("active");

   
        setTimeout(() => {
            const changed = changeWorld(nextWorld);

            if (changed) {
                applyWorldTheme();
            }
            worldTransition.classList.remove("active");
        }, 600);
    });
}

// ===============================
// WORLD THEME
// ===============================

export function applyWorldTheme() {

    const world = getWorldById(gameState.currentWorld);

    if (!world) {
        return;
    }

    if (!mainCookie) {
        return;
    }

    const customBackground = getBackgroundColor();
    document.body.style.background = customBackground || world.theme.background;
    mainCookie.src = world.cookieImage;
    mainCookie.style.filter = `drop-shadow(0 0 20px ${world.theme.glow})`;
}

export { showAutosave, showToast };
