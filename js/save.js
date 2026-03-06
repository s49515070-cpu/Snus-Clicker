 // =====================================
// SAVE SYSTEM – SNUS CLICKER
// LocalStorage Offline Save
// =====================================

import { gameState, prestigeUpgrades, milestones, resetGameState } from "./engine.js";
import { buildings } from "./buildings.js";
import { worlds } from "./worlds.js";

function normalizeUnlockedWorldIds(rawUnlockedWorldIds) {
    const validWorldIds = worlds.map((world) => world.id);
    const parsed = Array.isArray(rawUnlockedWorldIds) ? rawUnlockedWorldIds : [];

    const sanitized = parsed
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && validWorldIds.includes(value));

    if (!sanitized.includes(1)) {
        sanitized.push(1);
    }

    return Array.from(new Set(sanitized)).sort((a, b) => a - b);
}


import { showAutosave, showToast } from "./ui.js";
import { t } from "./i18n.js";
 

const SAVE_KEY = "snus_clicker_save";

function safeStorageGet(key) {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function safeStorageSet(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch {
        return false;
    }
}

function safeStorageRemove(key) {
    try {
        localStorage.removeItem(key);
    } catch {
        // Ignore storage access failures (e.g. blocked browser storage)
    }
}



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
    const lifetimeCookiesAtLastPrestigeRaw = normalizeNumber(parsed.lifetimeCookiesAtLastPrestige, 0, 0);
    const lifetimeCookiesAtLastPrestige = Math.min(lifetimeCookies, lifetimeCookiesAtLastPrestigeRaw);
    const prestigeCookies = normalizeNumber(parsed.prestigeCookies, 0, 0);
    const currentWorld = Number(parsed.currentWorld);
    const unlockedWorldIds = normalizeUnlockedWorldIds(parsed.unlockedWorldIds);
    const normalizedCurrentWorld = worlds.some((world) => world.id === currentWorld) ? currentWorld : 1;
    const prestigeMultiplier = normalizeNumber(parsed.prestigeMultiplier, 1, 1);
    const clickPower = normalizeNumber(parsed.clickPower, 1, 1);
    const buyMode = parsed.buyMode === "max" ? "max" : Number(parsed.buyMode);

    return {
        ...parsed,
        cookies,
        lifetimeCookies,
        lifetimeCookiesAtLastPrestige,
        prestigeCookies,
        unlockedWorldIds,
        currentWorld: unlockedWorldIds.includes(normalizedCurrentWorld) ? normalizedCurrentWorld : 1,
        buyMode: buyMode === "max" || (Number.isFinite(buyMode) && buyMode > 0) ? buyMode : 1,
        buildingData: normalizeBuildingData(parsed.buildingData),
        prestigeMultiplier,
        clickPower,
        prestigeUpgradeLevels: normalizePrestigeUpgradeLevels(parsed.prestigeUpgradeLevels),
        milestonesClaimed: normalizeMilestonesClaimed(parsed.milestonesClaimed),
        questsClaimed: { ...(gameState.questsClaimed || {}), ...(parsed.questsClaimed || {}) },
        activeBoostUntil: normalizeNumber(parsed.activeBoostUntil, 0, 0),
        activeBoostCooldownUntil: normalizeNumber(parsed.activeBoostCooldownUntil, 0, 0),
        totalClicks: normalizeNumber(parsed.totalClicks, 0, 0),
        autoBuyerUnlocked: Boolean(parsed.autoBuyerUnlocked),
        autoBuyerEnabled: Boolean(parsed.autoBuyerEnabled),
        todayStats: {
            clicks: normalizeNumber(parsed.todayStats?.clicks, 0, 0),
            earned: normalizeNumber(parsed.todayStats?.earned, 0, 0),
            resetDayKey: typeof parsed.todayStats?.resetDayKey === "string" ? parsed.todayStats.resetDayKey : ""
        }
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
