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

// DOM Elemente
const cookieCountEl = document.getElementById("cookieCount");
const cpsEl = document.getElementById("cps");
const prestigeCountEl = document.getElementById("prestigeCount");
const worldNameEl = document.getElementById("worldName");
const worldButton = document.getElementById("worldButton");
const prestigeButton = document.getElementById("prestigeButton");
const prestigeUpgradesEl = document.getElementById("prestigeUpgrades");
const prestigeSummaryEl = document.getElementById("prestigeSummary");
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
        if (milestone.rewardCookies) rewardParts.push(`+${milestone.rewardCookies} Cookies`);
        if (milestone.rewardPrestigeCookies) rewardParts.push(`+${milestone.rewardPrestigeCookies} Prestige`);
        reward.textContent = rewardParts.length > 0 ? `Belohnung: ${rewardParts.join(" | ")}` : "Belohnung: —";

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

    if (world) {
        worldNameEl.textContent = world.name;
    }

       
    refreshPrestigeUpgradesIfNeeded();
    updatePrestigeResetButtonState();
    renderMilestones();
}

       
export { renderBuildings, refreshBuildingsIfNeeded };

export { renderPrestigeUpgrades };

       
export function refreshAllUI() {
    applyWorldTheme();
    renderBuildings();
    renderPrestigeUpgrades();
    renderMilestones();
    renderUI();
}

// ===============================
// CLICK EFFECT
// ===============================

function createClickEffectAt(x, y) {
    if (!clickEffectContainer) return;

    const amount = clickCookie();

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

if (cookieClickArea && clickEffectContainer) {
    cookieClickArea.addEventListener("click", (e) => {
        createClickEffectAt(e.offsetX, e.offsetY);
    });

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
            showToast("🔒 Diese Welt ist noch gesperrt!", 1800, "warning");
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

    document.body.style.background = world.theme.background;
    mainCookie.src = world.cookieImage;
    mainCookie.style.filter = `drop-shadow(0 0 20px ${world.theme.glow})`;
}

export { showAutosave, showToast };
