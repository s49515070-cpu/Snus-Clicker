// =====================================
// GAME ENGINE – SNUS CLICKER
// Core Logik & Game Loop
// =====================================

import { buildings, getBuildingCost, getBuildingCps, getMaxAffordable } from "./buildings.js";
import { worlds, getWorldById } from "./worlds.js";

// ===============================
// GAME STATE
// ===============================

export const gameState = {
    cookies: 0,
    lifetimeCookies: 0,
    prestigeCookies: 0,
    currentWorld: 1,
    buyMode: 1,
    buildingData: {},
    prestigeMultiplier: 1,
    clickPower: 1
};

// Initialisiere Gebäude
buildings.forEach(b => {
    gameState.buildingData[b.id] = {
        owned: 0
    };
});

// ===============================
// PRODUCTION BERECHNUNG
// ===============================

export function calculateCps() {
    let total = 0;

    buildings.forEach(b => {
        const owned = gameState.buildingData[b.id].owned;
        total += getBuildingCps(b, owned);
    });

    const world = getWorldById(gameState.currentWorld);

    total *= world.multiplier;
    total *= gameState.prestigeMultiplier;

    return total;
}

// ===============================
// GAME LOOP
// ===============================

let lastUpdate = Date.now();

export function gameLoop() {
    const now = Date.now();
    const delta = (now - lastUpdate) / 1000;
    lastUpdate = now;

    const cps = calculateCps();
    const production = cps * delta;

    gameState.cookies += production;
    gameState.lifetimeCookies += production;

    requestAnimationFrame(gameLoop);
}

// ===============================
// CLICK SYSTEM
// ===============================

export function clickCookie() {
    const world = getWorldById(gameState.currentWorld);

    const amount = gameState.clickPower * world.multiplier * gameState.prestigeMultiplier;

    gameState.cookies += amount;
    gameState.lifetimeCookies += amount;

    return amount;
}

// ===============================
// BUILDING KAUF
// ===============================

export function buyBuilding(buildingId) {

    const building = buildings.find(b => b.id === buildingId);
    const data = gameState.buildingData[buildingId];

    let quantity = gameState.buyMode;

    if (quantity === "max") {
        quantity = getMaxAffordable(building, data.owned, gameState.cookies);
    }

    let totalCost = 0;

    for (let i = 0; i < quantity; i++) {
        totalCost += getBuildingCost(building, data.owned + i);
    }

    if (gameState.cookies >= totalCost && quantity > 0) {
        gameState.cookies -= totalCost;
        data.owned += quantity;
        return true;
    }

    return false;
}

// ===============================
// BUY MODE SETZEN
// ===============================

export function setBuyMode(mode) {
    gameState.buyMode = mode;
}

// ===============================
// WELT WECHSEL
// ===============================

export function changeWorld(worldId) {
    gameState.currentWorld = worldId;
}

// ===============================
// PRESTIGE RESET
// ===============================

export function prestigeReset() {

    const earned = Math.floor(gameState.lifetimeCookies / 1000000);

    if (earned <= 0) return 0;

    gameState.prestigeCookies += earned;
    gameState.prestigeMultiplier += earned * 0.1;

    // Reset normale Werte
    gameState.cookies = 0;
    gameState.lifetimeCookies = 0;

    buildings.forEach(b => {
        gameState.buildingData[b.id].owned = 0;
    });

    return earned;
}
