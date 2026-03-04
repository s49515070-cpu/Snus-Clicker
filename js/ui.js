import {
    gameState,
    clickCookie,
    buyBuilding,
    getBuildingCost,
    getProductionPerSecond,
    prestigeReset
} from "./engine.js";

import { prestigeUpgrades, buyPrestigeUpgrade } from "./prestige.js";


// ===============================
// COOKIE BUTTON
// ===============================

document.getElementById("cookie").addEventListener("click", () => {
    clickCookie();
    render();
});


// ===============================
// RENDER BUILDINGS
// ===============================

export function renderBuildings() {

    const container = document.getElementById("buildings");
    container.innerHTML = "";

    for (let key in gameState.buildings) {

        const building = gameState.buildings[key];
        const cost = getBuildingCost(key);

        const div = document.createElement("div");
        div.style.cursor = "pointer";
        div.style.marginBottom = "8px";

        div.innerHTML = `
            <strong>${key.toUpperCase()}</strong><br>
            Anzahl: ${building.count}<br>
            Kosten: ${cost} 🍪
        `;

        div.addEventListener("click", () => {
            buyBuilding(key);
            render();
        });

        container.appendChild(div);
    }
}


// ===============================
// PRESTIGE UPGRADES
// ===============================

export function renderPrestigeUpgrades() {

    const container = document.getElementById("prestigeUpgrades");
    container.innerHTML = "";

    prestigeUpgrades.forEach(upgrade => {

        const div = document.createElement("div");
        div.style.cursor = "pointer";
        div.style.marginBottom = "10px";

        div.innerHTML = `
            <strong>${upgrade.name}</strong><br>
            ${upgrade.description}<br>
            Kosten: ${upgrade.cost} ⭐
        `;

        div.addEventListener("click", () => {
            const success = buyPrestigeUpgrade(upgrade.id);
            if (success) render();
        });

        container.appendChild(div);
    });
}


// ===============================
// PRESTIGE BUTTON
// ===============================

document.getElementById("prestigeButton").addEventListener("click", () => {
    const earned = prestigeReset();
    alert("Du hast " + earned + " Prestige Cookies erhalten!");
    render();
});


// ===============================
// RENDER
// ===============================

export function render() {

    document.getElementById("cookieCount").textContent =
        Math.floor(gameState.cookies);

    document.getElementById("production").textContent =
        getProductionPerSecond().toFixed(1);

    document.getElementById("prestigeCount").textContent =
        gameState.prestigeCookies;

    renderBuildings();
    renderPrestigeUpgrades();
}
