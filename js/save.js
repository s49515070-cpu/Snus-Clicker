// =====================================
// SAVE SYSTEM – SNUS CLICKER
// LocalStorage Offline Save
// =====================================

import { gameState } from "./engine.js";
import { showAutosave } from "./ui.js";

const SAVE_KEY = "snus_clicker_save";

// ===============================
// SPEICHERN
// ===============================

export function saveGame() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
    showAutosave();
}

// ===============================
// LADEN
// ===============================

export function loadGame() {

    const data = localStorage.getItem(SAVE_KEY);
    if (!data) return;

    const parsed = JSON.parse(data);

    Object.assign(gameState, parsed);
}

// ===============================
// EXPORT
// ===============================

export function exportSave() {
    const data = localStorage.getItem(SAVE_KEY);
    if (!data) return;

    navigator.clipboard.writeText(data);
    alert("Save wurde in die Zwischenablage kopiert!");
}

// ===============================
// IMPORT
// ===============================

export function importSave() {
    const input = prompt("Füge deinen Save-Code hier ein:");
    if (!input) return;

    localStorage.setItem(SAVE_KEY, input);
    location.reload();
}
