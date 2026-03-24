 // =====================================
// SAVE SYSTEM – SNUS CLICKER
// LocalStorage Offline Save
// =====================================

import { gameState, prestigeUpgrades, prestigeTalents, milestones, resetGameState, AUTO_BUYER_STRATEGIES, quests, getPrestigeMultiplierForLevel } from "./engine.js";
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
const SAVE_BACKUP_KEY_PREFIX = `${SAVE_KEY}_backup_`;
const MAX_SAVE_BACKUPS = 3;
const CURRENT_SAVE_VERSION = 3;
const ACTIVE_DAILY_QUEST_COUNT = 3;
const MAX_IMPORT_SIZE_CHARS = 250_000;

function migrateV1ToV2(payload) {
    const migrated = { ...(payload || {}) };

    if (!migrated.milestonePerks && migrated.milestonePeks && typeof migrated.milestonePeks === "object") {
        migrated.milestonePerks = migrated.milestonePeks;
    }
    if (!migrated.todayStats && migrated.dailyStats && typeof migrated.dailyStats === "object") {
        migrated.todayStats = migrated.dailyStats;
    }
    if (!migrated.autoBuyerWeights && typeof migrated.autoBuyerWeight === "number") {
        const valueWeight = Math.max(0, Math.min(1, Number(migrated.autoBuyerWeight)));
        migrated.autoBuyerWeights = {
            value: valueWeight,
            cheap: Math.max(0, Math.min(1, 1 - valueWeight))
        };
    }

    return migrated;
}

function migrateV2ToV3(payload) {
    const migrated = { ...(payload || {}) };

    delete migrated.dailyStats;
    delete migrated.autoBuyerWeight;
    delete migrated.milestonePeks;

    return migrated;
}

const MIGRATION_STEPS = {
    1: {
        id: "v1_to_v2",
        nextVersion: 2,
        apply: migrateV1ToV2
    },
    2: {
        id: "v2_to_v3",
        nextVersion: 3,
        apply: migrateV2ToV3
    }
};

function createMigrationMeta(previousVersion, currentVersion, steps = [], migratedAt = "", futureVersionDetected = false, reason = "") {
    return {
        previousVersion,
        currentVersion,
        steps,
        migratedAt,
        futureVersionDetected,
        reason
    };
}

function applySaveMigrations(parsedInput) {
    const parsed = { ...(parsedInput || {}) };
    const incomingVersion = Number(parsed.saveVersion);
    const fallbackVersion = 1;
    let normalizedVersion = Number.isInteger(incomingVersion) && incomingVersion > 0 ? incomingVersion : fallbackVersion;

    let migrated = { ...parsed };
    const migrationSteps = [];

    if (normalizedVersion > CURRENT_SAVE_VERSION) {
        migrated.saveVersion = normalizedVersion;
        return {
            payload: migrated,
            migrationMeta: createMigrationMeta(normalizedVersion, normalizedVersion, [], "", true, "future_version")
        };
    }

    while (normalizedVersion < CURRENT_SAVE_VERSION) {
        const migrationStep = MIGRATION_STEPS[normalizedVersion];
        if (!migrationStep || typeof migrationStep.apply !== "function") {
            break;
        }

        migrated = migrationStep.apply(migrated);
        normalizedVersion = migrationStep.nextVersion;
        migrationSteps.push(migrationStep.id);
    }

    migrated.saveVersion = CURRENT_SAVE_VERSION;
    return {
        payload: migrated,
        migrationMeta: createMigrationMeta(
            Number.isInteger(incomingVersion) && incomingVersion > 0 ? incomingVersion : fallbackVersion,
            CURRENT_SAVE_VERSION,
            migrationSteps,
            migrationSteps.length > 0 ? new Date().toISOString() : "",
            false,
            migrationSteps.length > 0 ? "migrated" : "none"
        )
    };
}

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

function normalizePrestigeTalentLevels(rawLevels) {
    const mergedTalentLevels = {
        ...gameState.prestigeTalentLevels,
        ...(rawLevels || {})
    };

    prestigeTalents.forEach((talent) => {
        const rawLevel = Number(mergedTalentLevels[talent.id]);
        mergedTalentLevels[talent.id] = Number.isFinite(rawLevel) && rawLevel >= 1 ? 1 : 0;
    });

    return mergedTalentLevels;
}


function normalizeActiveDailyQuestIds(rawIds) {
    const dailyIds = quests.filter((quest) => quest.isDaily).map((quest) => quest.id);
    const parsed = Array.isArray(rawIds) ? rawIds : [];
    const sanitized = parsed.filter((id) => typeof id === "string" && dailyIds.includes(id));

    if (sanitized.length >= 1) {
        return Array.from(new Set(sanitized)).slice(0, ACTIVE_DAILY_QUEST_COUNT);
    }

    return dailyIds.slice(0, ACTIVE_DAILY_QUEST_COUNT);
}

function normalizeAutoBuyerWeights(rawWeights) {
    const rawValue = Number(rawWeights?.value);
    const rawCheap = Number(rawWeights?.cheap);
    const hasValue = Number.isFinite(rawValue);
    const hasCheap = Number.isFinite(rawCheap);

    if (hasValue && hasCheap) {
        const value = Math.max(0, Math.min(1, rawValue));
        const cheap = Math.max(0, Math.min(1, rawCheap));
        const total = value + cheap;

        if (total > 0) {
            return {
                value: value / total,
                cheap: cheap / total
            };
        }
    }

    if (hasValue) {
        const value = Math.max(0, Math.min(1, rawValue));
        return {
            value,
            cheap: 1 - value
        };
    }

    if (hasCheap) {
        const cheap = Math.max(0, Math.min(1, rawCheap));
        return {
            value: 1 - cheap,
            cheap
        };
    }

    return {
        value: 0.75,
        cheap: 0.25
    };
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

function sanitizePlainObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const source = Object.assign({}, value);
    delete source.__proto__;
    delete source.constructor;
    delete source.prototype;
    return source;
}

function normalizeBooleanMap(rawMap, allowedKeys) {
    const source = sanitizePlainObject(rawMap);
    return allowedKeys.reduce((acc, key) => {
        acc[key] = Boolean(source[key]);
        return acc;
    }, {});
}

function normalizeSavePayload(parsed) {
    if (!parsed || typeof parsed !== "object") {
        return null;
    }

    const migrationResult = applySaveMigrations(parsed);
    const migrated = migrationResult.payload;

    const cookies = normalizeNumber(migrated.cookies, 0, 0);
    const lifetimeCookies = normalizeNumber(migrated.lifetimeCookies, 0, 0);
    const lifetimeCookiesAtLastPrestigeRaw = normalizeNumber(migrated.lifetimeCookiesAtLastPrestige, 0, 0);
    const lifetimeCookiesAtLastPrestige = Math.min(lifetimeCookies, lifetimeCookiesAtLastPrestigeRaw);
    const prestigeCookies = normalizeNumber(migrated.prestigeCookies, 0, 0);
    const diamonds = normalizeNumber(migrated.diamonds, 0, 0);
    const currentWorld = Number(migrated.currentWorld);
    const unlockedWorldIds = normalizeUnlockedWorldIds(migrated.unlockedWorldIds);
    const normalizedCurrentWorld = worlds.some((world) => world.id === currentWorld) ? currentWorld : 1;
    const prestigeMultiplier = getPrestigeMultiplierForLevel(prestigeCookies);
    const clickPower = normalizeNumber(migrated.clickPower, 1, 1);
    const buyMode = migrated.buyMode === "max" ? "max" : Number(migrated.buyMode);

    const allowedQuestIds = quests.map((quest) => quest.id);
    const allowedPrestigeLevels = prestigeUpgrades
        ? Array.from({ length: 100 }, (_, index) => String(index + 1))
        : [];
    const allowedPerks = Array.from(new Set(
        milestones
            .map((milestone) => milestone.rewardPerk)
            .filter((perk) => typeof perk === "string" && perk.length > 0)
    ));

    return {
        saveVersion: migrated.saveVersion,
        cookies,
        lifetimeCookies,
        lifetimeCookiesAtLastPrestige,
        prestigeCookies,
        diamonds,
        unlockedWorldIds,
        currentWorld: unlockedWorldIds.includes(normalizedCurrentWorld) ? normalizedCurrentWorld : 1,
        buyMode: buyMode === "max" || (Number.isFinite(buyMode) && buyMode > 0) ? buyMode : 1,
        buildingData: normalizeBuildingData(migrated.buildingData),
        prestigeMultiplier,
        clickPower,
        prestigeUpgradeLevels: normalizePrestigeUpgradeLevels(migrated.prestigeUpgradeLevels),
        prestigeTalentPoints: normalizeNumber(migrated.prestigeTalentPoints, 0, 0),
        prestigeTalentLevels: normalizePrestigeTalentLevels(migrated.prestigeTalentLevels),
        milestonesClaimed: normalizeMilestonesClaimed(migrated.milestonesClaimed),
        questsClaimed: normalizeBooleanMap(migrated.questsClaimed, allowedQuestIds),
        prestigeTrackClaimed: normalizeBooleanMap(migrated.prestigeTrackClaimed, allowedPrestigeLevels),
        activeBoostUntil: normalizeNumber(migrated.activeBoostUntil, 0, 0),
        activeBoostCooldownUntil: normalizeNumber(migrated.activeBoostCooldownUntil, 0, 0),
        clickBurstUntil: normalizeNumber(migrated.clickBurstUntil, 0, 0),
        clickBurstCooldownUntil: normalizeNumber(migrated.clickBurstCooldownUntil, 0, 0),
        discountBurstUntil: normalizeNumber(migrated.discountBurstUntil, 0, 0),
        discountBurstCooldownUntil: normalizeNumber(migrated.discountBurstCooldownUntil, 0, 0),
        totalClicks: normalizeNumber(migrated.totalClicks, 0, 0),
        autoBuyerUnlocked: Boolean(migrated.autoBuyerUnlocked),
        autoBuyerEnabled: Boolean(migrated.autoBuyerEnabled),
        autoBuyerStrategy: AUTO_BUYER_STRATEGIES.includes(migrated.autoBuyerStrategy) ? migrated.autoBuyerStrategy : "value",
        autoBuyerWeights: normalizeAutoBuyerWeights(migrated.autoBuyerWeights),
        autoBuyerLastDecision: typeof migrated.autoBuyerLastDecision === "string" ? migrated.autoBuyerLastDecision : "",
        activeDailyQuestIds: normalizeActiveDailyQuestIds(migrated.activeDailyQuestIds),
        dailyStreak: normalizeNumber(migrated.dailyStreak, 0, 0),
        todayStats: {
            clicks: normalizeNumber(migrated.todayStats?.clicks, 0, 0),
            earned: normalizeNumber(migrated.todayStats?.earned, 0, 0),
            resetDayKey: typeof migrated.todayStats?.resetDayKey === "string" ? migrated.todayStats.resetDayKey : ""
        },
        weeklyStats: {
            earned: normalizeNumber(migrated.weeklyStats?.earned, 0, 0),
            resetWeekKey: typeof migrated.weeklyStats?.resetWeekKey === "string" ? migrated.weeklyStats.resetWeekKey : ""
        },
        milestonePerks: normalizeBooleanMap(migrated.milestonePerks, allowedPerks),
        goldenSnusAvailableUntil: normalizeNumber(migrated.goldenSnusAvailableUntil, 0, 0),
        goldenSnusCooldownUntil: normalizeNumber(migrated.goldenSnusCooldownUntil, 0, 0),
        goldenSnusReward: normalizeNumber(migrated.goldenSnusReward, 0, 0),
        clickCombo: normalizeNumber(migrated.clickCombo, 0, 0),
        maxClickCombo: normalizeNumber(migrated.maxClickCombo, 0, 0),
        lastClickAt: normalizeNumber(migrated.lastClickAt, 0, 0),
        onboardingHintsShown: sanitizePlainObject(migrated.onboardingHintsShown),
        migrationMeta: migrationResult.migrationMeta
        
    };
}

function hasAppliedMigrations(normalizedPayload) {
    const steps = normalizedPayload?.migrationMeta?.steps;
    return Array.isArray(steps) && steps.length > 0;
}

function shouldShowMigrationNotice(normalizedPayload) {
    if (!hasAppliedMigrations(normalizedPayload)) return false;
    if (normalizedPayload?.migrationMeta?.futureVersionDetected === true) return false;
    return normalizedPayload?.migrationMeta?.noticeShown !== true;
}

function getBackupKey(index) {
    return `${SAVE_BACKUP_KEY_PREFIX}${index}`;
}

function rotateSaveBackups(previousRawSave) {
    if (typeof previousRawSave !== "string" || previousRawSave.length === 0) {
        return;
    }

    for (let index = MAX_SAVE_BACKUPS; index >= 2; index -= 1) {
        const previousBackup = safeStorageGet(getBackupKey(index - 1));
        if (typeof previousBackup === "string" && previousBackup.length > 0) {
            safeStorageSet(getBackupKey(index), previousBackup);
        } else {
            safeStorageRemove(getBackupKey(index));
        }
    }

    safeStorageSet(getBackupKey(1), previousRawSave);
}

function clearSaveBackups() {
    for (let index = 1; index <= MAX_SAVE_BACKUPS; index += 1) {
        safeStorageRemove(getBackupKey(index));
    }
}

function canConfirm() {
    return typeof globalThis.confirm === "function";
}

function confirmAction(message, fallback = true) {
    if (!canConfirm()) return fallback;
    return globalThis.confirm(message);
}

function buildImportPreview(currentState, importedState) {
    const watchedFields = [
        "saveVersion",
        "cookies",
        "lifetimeCookies",
        "prestigeCookies",
        "diamonds",
        "currentWorld",
        "buyMode",
        "prestigeTrackClaimed"
    ];

    const lines = watchedFields
        .filter((field) => currentState?.[field] !== importedState?.[field])
        .map((field) => `• ${field}: ${String(currentState?.[field])} -> ${String(importedState?.[field])}`);

    const migrationReason = importedState?.migrationMeta?.reason || "";
    const migrationSteps = Array.isArray(importedState?.migrationMeta?.steps) ? importedState.migrationMeta.steps : [];

    lines.push(`• migration reason: ${migrationReason || "unknown"}`);
    if (migrationSteps.length > 0) {
        lines.push(`• migration steps: ${migrationSteps.join(", ")}`);
    }

    return [
        "⚠️ Import-Vorschau:",
        ...lines,
        "",
        "Willst du diesen Save wirklich importieren?"
    ].join("\n");
}

function listSaveBackups() {
    const backups = [];

    for (let index = 1; index <= MAX_SAVE_BACKUPS; index += 1) {
        const raw = safeStorageGet(getBackupKey(index));
        if (typeof raw !== "string" || raw.length === 0) continue;

        try {
            const parsed = JSON.parse(raw);
            backups.push({
                slot: index,
                key: getBackupKey(index),
                saveVersion: Number(parsed?.saveVersion) || 0,
                cookies: Number(parsed?.cookies) || 0,
                lifetimeCookies: Number(parsed?.lifetimeCookies) || 0,
                raw
            });
        } catch {
            backups.push({
                slot: index,
                key: getBackupKey(index),
                saveVersion: 0,
                cookies: 0,
                lifetimeCookies: 0,
                raw
            });
        }
    }

    return backups;
}

function parseBackupSlotInput(input) {
    const slot = Number(input);
    if (!Number.isInteger(slot) || slot < 1 || slot > MAX_SAVE_BACKUPS) {
        return 1;
    }
    return slot;
}

function persistNormalizedSave(normalizedPayload, options = {}) {
    const { createBackup = true } = options;
    const nextRaw = JSON.stringify(normalizedPayload);

    if (createBackup) {
        const previousRaw = safeStorageGet(SAVE_KEY);
        if (typeof previousRaw === "string" && previousRaw.length > 0 && previousRaw !== nextRaw) {
            rotateSaveBackups(previousRaw);
        }
    }

    return safeStorageSet(SAVE_KEY, nextRaw);
}

function maybeShowMigrationNotice(normalizedPayload) {
    if (!shouldShowMigrationNotice(normalizedPayload)) return normalizedPayload;

    showToast(t("saveMigrated", { version: normalizedPayload.saveVersion }), 2200, "info");

    const nextPayload = {
        ...normalizedPayload,
        migrationMeta: {
            ...(normalizedPayload.migrationMeta || {}),
            noticeShown: true
        }
    };

    persistNormalizedSave(nextPayload);
    return nextPayload;
}

// ===============================
// SPEICHERN
// ===============================

export function saveGame() {
    const payload = {
        saveVersion: CURRENT_SAVE_VERSION,
        ...gameState
    };
    const saved = persistNormalizedSave(payload);
    if (saved) {
        showAutosave();
    }
}

// ===============================
// LADEN
// ===============================

export function loadGame() {

    const data = safeStorageGet(SAVE_KEY);
    if (!data) return false;

    try {
        const parsed = JSON.parse(data);
        const normalized = normalizeSavePayload(parsed);

        if (!normalized) {
            return false;
        }

        const finalPayload = maybeShowMigrationNotice(normalized);
        Object.assign(gameState, finalPayload);
        persistNormalizedSave(finalPayload);

        emitSaveApplied();
        return true;
    } catch {
        safeStorageRemove(SAVE_KEY);
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
    const data = safeStorageGet(SAVE_KEY);
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

    if (input.length > MAX_IMPORT_SIZE_CHARS) {
        showToast("❌ Save-Code ist zu groß.", 1800, "error");
        return;
    }
 
    try {
        const parsed = JSON.parse(input);
        const normalized = normalizeSavePayload(parsed);

        if (!normalized) {
            throw new Error("invalid_save_payload");
        }

        const importPreview = buildImportPreview(gameState, normalized);
        if (!confirmAction(importPreview, true)) {
            showToast("ℹ️ Import abgebrochen.", 1400, "info");
            return;
        }

        const finalPayload = maybeShowMigrationNotice(normalized);
        Object.assign(gameState, finalPayload);
        persistNormalizedSave(finalPayload);
        emitSaveApplied();
        showToast("✅ Save importiert.", 1600, "success");
    } catch {
        showToast("❌ Ungültiger Save-Code.", 1800, "error");
    }
}

export function restoreBackup(slotInput) {
    const available = listSaveBackups();
    if (available.length === 0) {
        showToast("⚠️ Kein Backup gefunden.", 1700, "warning");
        return false;
    }

    const selectedSlot = typeof slotInput === "undefined"
        ? parseBackupSlotInput(prompt(`Welchen Backup-Slot wiederherstellen? (1-${MAX_SAVE_BACKUPS})`))
        : parseBackupSlotInput(slotInput);

    const selected = available.find((backup) => backup.slot === selectedSlot);
    if (!selected) {
        showToast("⚠️ Gewählter Backup-Slot ist leer.", 1700, "warning");
        return false;
    }

    try {
        const parsed = JSON.parse(selected.raw);
        const normalized = normalizeSavePayload(parsed);
        if (!normalized) {
            showToast("❌ Backup ist ungültig.", 1700, "error");
            return false;
        }

        const preview = buildImportPreview(gameState, normalized);
        const confirmed = confirmAction(`${preview}

Backup-Slot: ${selectedSlot}`, true);
        if (!confirmed) {
            showToast("ℹ️ Backup-Wiederherstellung abgebrochen.", 1400, "info");
            return false;
        }

        const finalPayload = maybeShowMigrationNotice(normalized);
        Object.assign(gameState, finalPayload);
        persistNormalizedSave(finalPayload);
        emitSaveApplied();
        showToast(`✅ Backup-Slot ${selectedSlot} wiederhergestellt.`, 1700, "success");
        return true;
    } catch {
        showToast("❌ Backup konnte nicht gelesen werden.", 1700, "error");
        return false;
    }
}


// ===============================
// RESET
// ===============================

export function resetSave() {
    const confirmed = confirmAction(t("resetSaveHint"), true);
    if (!confirmed) return;

    try {
        resetGameState();
        safeStorageRemove(SAVE_KEY);
        clearSaveBackups();
        emitSaveApplied();
        showToast("🗑️ Spielstand zurückgesetzt.", 1600, "info");
    } catch {
        showToast("❌ Zurücksetzen fehlgeschlagen.", 1800, "error");
    }
}
