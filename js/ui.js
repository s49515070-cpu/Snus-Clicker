// =====================================
// UI SYSTEM – SNUS CLICKER
// Rendering & Interaktion
// =====================================

import { gameState, clickCookie, buyBuilding, setBuyMode, calculateCps, changeWorld, prestigeReset } from "./engine.js";
import { buildings } from "./buildings.js";
import { worlds, getWorldById, isWorldUnlocked } from "./worlds.js";

// DOM Elemente
const cookieCountEl = document.getElementById("cookieCount");
const cpsEl = document.getElementById("cps");
const prestigeCountEl = document.getElementById("prestigeCount");
const worldNameEl = document.getElementById("worldName");
const worldButton = document.getElementById("worldButton");
const prestigeButton = document.getElementById("prestigeButton");
const leftColumn = document.getElementById("leftBuildings");
const rightColumn = document.getElementById("rightBuildings");
const cookieClickArea = document.getElementById("cookieClickArea");
const clickEffectContainer = document.getElementById("clickEffectContainer");
const mainCookie = document.getElementById("mainCookie");
const worldTransition = document.getElementById("worldTransition");
const autosaveIndicator = document.getElementById("autosaveIndicator");

// ===============================
// FORMATTER
// ===============================

function formatNumber(num) {
    if (num < 1000) return num.toFixed(0);
    if (num < 1000000) return (num / 1000).toFixed(1) + "K";
    if (num < 1000000000) return (num / 1000000).toFixed(1) + "M";
    return (num / 1000000000).toFixed(1) + "B";
}

// ===============================
// RENDER LOOP
// ===============================

export function renderUI() {

    cookieCountEl.textContent = formatNumber(gameState.cookies);
    cpsEl.textContent = formatNumber(calculateCps());
    prestigeCountEl.textContent = gameState.prestigeCookies;

    const world = getWorldById(gameState.currentWorld);
    worldNameEl.textContent = world.name;
}

// ===============================
// BUILDINGS RENDER
// ===============================

export function renderBuildings() {

    leftColumn.innerHTML = "";
    rightColumn.innerHTML = "";

    buildings.forEach(building => {

        const owned = gameState.buildingData[building.id].owned;
        const cost = Math.floor(building.baseCost * Math.pow(building.growth, owned));

        const card = document.createElement("div");
        card.className = "building-card";
        card.innerHTML = `
            <img src="${building.icon}" alt="">
            <div>
                <div><strong>${building.name}</strong> (${owned})</div>
                <div>Kosten: ${formatNumber(cost)}</div>
            </div>
        `;

        card.addEventListener("click", () => {
            buyBuilding(building.id);
        });

        if (building.side === "left") {
            leftColumn.appendChild(card);
        } else {
            rightColumn.appendChild(card);
        }
    });
}

// ===============================
// CLICK EFFECT
// ===============================

cookieClickArea.addEventListener("click", (e) => {

    const amount = clickCookie();

    const effect = document.createElement("div");
    effect.className = "click-effect";
    effect.textContent = "+" + formatNumber(amount);

    effect.style.left = e.offsetX + "px";
    effect.style.top = e.offsetY + "px";

    clickEffectContainer.appendChild(effect);

    setTimeout(() => {
        effect.remove();
    }, 1000);
});

// ===============================
// BUY MODE BUTTONS
// ===============================

document.querySelectorAll(".buy-options button").forEach(btn => {
    btn.addEventListener("click", () => {
        const mode = btn.dataset.buy;
        setBuyMode(mode === "max" ? "max" : parseInt(mode));
    });
});

// ===============================
// PRESTIGE
// ===============================

prestigeButton.addEventListener("click", () => {
    const earned = prestigeReset();
    if (earned > 0) {
        alert("Du hast " + earned + " Prestige Cookies erhalten!");
        renderBuildings();
    }
});

// ===============================
// WORLD SWITCH
// ===============================

worldButton.addEventListener("click", () => {

    let nextWorld = gameState.currentWorld + 1;
    if (nextWorld > worlds.length) nextWorld = 1;

    const world = getWorldById(nextWorld);

    if (!isWorldUnlocked(world, gameState.prestigeCookies)) {
        alert("Diese Welt ist noch gesperrt!");
        return;
    }

    worldTransition.classList.add("active");

    setTimeout(() => {
        changeWorld(nextWorld);
        applyWorldTheme();
        worldTransition.classList.remove("active");
    }, 600);
});

// ===============================
// WORLD THEME
// ===============================

export function applyWorldTheme() {

    const world = getWorldById(gameState.currentWorld);

    document.body.style.background = world.theme.background;
    mainCookie.src = world.cookieImage;
    mainCookie.style.filter = `drop-shadow(0 0 20px ${world.theme.glow})`;
}

// ===============================
// AUTOSAVE ANZEIGE
// ===============================

export function showAutosave() {
    autosaveIndicator.classList.add("show");
    setTimeout(() => {
        autosaveIndicator.classList.remove("show");
    }, 1000);
}
