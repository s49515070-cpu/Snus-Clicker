// =====================================
// MAIN ENTRY – SNUS CLICKER
// =====================================

import { gameLoop } from "./engine.js";
import { renderUI, renderBuildings, applyWorldTheme } from "./ui.js";
import { loadGame, saveGame } from "./save.js";

// ===============================
// INITIALISIERUNG
// ===============================

function init() {

    loadGame();
    applyWorldTheme();
    renderBuildings();

    gameLoop();
    uiLoop();

    setInterval(saveGame, 5000);
}

// ===============================
// UI LOOP
// ===============================

function uiLoop() {
    renderUI();
    requestAnimationFrame(uiLoop);
}

// ===============================
// START
// ===============================

init();
