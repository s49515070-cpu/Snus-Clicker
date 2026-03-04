// =====================================
// SAVE SYSTEM – SNUS CLICKER
// LocalStorage Offline Save
// =====================================

import { gameState, prestigeUpgrades, milestones, resetGameState } from "./engine.js";
import { buildings } from "./buildings.js";
import { worlds } from "./worlds.js";
import { showAutosave, showToast } from "./ui.js";
import { t } from "./i18n.js";

const SAVE_KEY = "snus_clicker_save";

function emitSaveApplied() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("snus:save-applied"));
}

function normalizeNumber(value, fallback, min = 0) {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return num < min ? fallback : num;
}

function normalizeBuildingData(rawBuildingData) {
    const mergedBuildingData = {
        ...gameState.buildingData,
        ...(rawBuildingData || {})
    };

    buildings.forEach((building) => {
        const rawBuilding = mergedBuildingData[building.id] || {};
        const owned = Number(rawBuilding.owned);

        mergedBuildingData[building.id] = {
            owned: Number.isFinite(owned) && owned >= 0 ? Math.floor(owned) : 0
        };
    });

    return mergedBuildingData;
}

function normalizePrestigeUpgradeLevels(rawLevels) {
    const mergedPrestigeLevels = {
        ...gameState.prestigeUpgradeLevels,
        ...(rawLevels || {})
    };

    prestigeUpgrades.forEach((upgrade) => {
        const rawLevel = Number(mergedPrestigeLevels[upgrade.id]);
        const normalized = Number.isFinite(rawLevel) && rawLevel >= 0 ? Math.floor(rawLevel) : 0;

        mergedPrestigeLevels[upgrade.id] = Math.min(normalized, upgrade.maxLevel);
    });

    return mergedPrestigeLevels;
}

function normalizeMilestonesClaimed(rawMilestonesClaimed) {
    const mergedMilestones = {
        ...gameState.milestonesClaimed,
        ...(rawMilestonesClaimed || {})
    };

    milestones.forEach((milestone) => {
        mergedMilestones[milestone.id] = Boolean(mergedMilestones[milestone.id]);
    });

    return mergedMilestones;
}

function normalizeSavePayload(parsed) {
    if (!parsed || typeof parsed !== "object") {
        return null;
    }

    const cookies = normalizeNumber(parsed.cookies, 0, 0);
    const lifetimeCookies = normalizeNumber(parsed.lifetimeCookies, 0, 0);
    const prestigeCookies = normalizeNumber(parsed.prestigeCookies, 0, 0);
    const currentWorld = Number(parsed.currentWorld);
    const prestigeMultiplier = normalizeNumber(parsed.prestigeMultiplier, 1, 1);
    const clickPower = normalizeNumber(parsed.clickPower, 1, 1);
    const buyMode = parsed.buyMode === "max" ? "max" : Number(parsed.buyMode);

    return {
        ...parsed,
        cookies,
        lifetimeCookies,
        prestigeCookies,
        currentWorld: worlds.some((world) => world.id === currentWorld) ? currentWorld : 1,
        buyMode: buyMode === "max" || (Number.isFinite(buyMode) && buyMode > 0) ? buyMode : 1,
        buildingData: normalizeBuildingData(parsed.buildingData),
        prestigeMultiplier,
        clickPower,
        prestigeUpgradeLevels: normalizePrestigeUpgradeLevels(parsed.prestigeUpgradeLevels),
        milestonesClaimed: normalizeMilestonesClaimed(parsed.milestonesClaimed)
    };
}

// ===============================
// SPEICHERN
// ===============================

export function saveGame() {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
        showAutosave();
    } catch {
        // Ignoriere Speicherkapazitäts-/Storage-Fehler, damit das Spiel weiterläuft
    }
}

// ===============================
// LADEN
// ===============================

export function loadGame() {

    const data = localStorage.getItem(SAVE_KEY);
    if (!data) return false;

    try {
        const parsed = JSON.parse(data);
        const normalized = normalizeSavePayload(parsed);

        if (!normalized) {
            return false;
        }

        Object.assign(gameState, normalized);
        emitSaveApplied();
        return true;
    } catch {
        localStorage.removeItem(SAVE_KEY);
        return false;
    }
}

// ===============================
// EXPORT
// ===============================

function tryLegacyClipboardCopy(text) {
    if (typeof document === "undefined" || !document.body || typeof document.createElement !== "function") {
        return false;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";

    document.body.appendChild(textarea);

    if (typeof textarea.select === "function") {
        textarea.select();
    }
    if (typeof textarea.setSelectionRange === "function") {
        textarea.setSelectionRange(0, text.length);
    }

    const copied = typeof document.execCommand === "function" ? document.execCommand("copy") : false;
    document.body.removeChild(textarea);

    return Boolean(copied);
}

export function exportSave() {
    const data = localStorage.getItem(SAVE_KEY);
    if (!data) {
        showToast("⚠️ Kein Save gefunden.", 1800, "warning");
        return;
    }

    const clipboardApi = globalThis.navigator?.clipboard;
    if (clipboardApi && typeof clipboardApi.writeText === "function") {
        clipboardApi.writeText(data)
            .then(() => {
                showToast("✅ Save wurde kopiert.", 1500, "success");
            })
            .catch(() => {
                const copied = tryLegacyClipboardCopy(data);
                showToast(copied ? "✅ Save wurde kopiert." : "❌ Kopieren fehlgeschlagen.", 1800, copied ? "success" : "error");
            });
        return;
    }

    const copied = tryLegacyClipboardCopy(data);
    showToast(copied ? "✅ Save wurde kopiert." : "❌ Kopieren fehlgeschlagen.", 1800, copied ? "success" : "error");
}

// ===============================
// IMPORT
// ===============================

export function importSave() {
    const input = prompt("Füge deinen Save-Code hier ein:");
    if (!input) return;
    
    try {
        const parsed = JSON.parse(input);
        const normalized = normalizeSavePayload(parsed);

        if (!normalized) {
            throw new Error("invalid_save_payload");
        }

        Object.assign(gameState, normalized);
        localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
        emitSaveApplied();
        showToast("✅ Save importiert.", 1600, "success");
    } catch {
        showToast("❌ Ungültiger Save-Code.", 1800, "error");
    }
}


// ===============================
// RESET
// ===============================

export function resetSave() {
    const confirmed = confirm(t("resetSaveHint"));
    if (!confirmed) return;

    try {
        resetGameState();
        localStorage.removeItem(SAVE_KEY);
        emitSaveApplied();
        showToast("🗑️ Spielstand zurückgesetzt.", 1600, "info");
    } catch {
        showToast("❌ Zurücksetzen fehlgeschlagen.", 1800, "error");
    }
}
