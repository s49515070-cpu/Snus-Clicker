// =====================================
// APP CONFIG – SNUS CLICKER
// =====================================

const CONFIG_STORAGE_KEY = "snus_clicker_config";

const DEFAULT_CONFIG = {
    autosaveIntervalMs: 5000,
    uiRefreshIntervalMs: 100,
    soundEnabled: true,
    language: "de",
    backgroundColor: "",
    cookieHorizontalOffset: 0,
    reducedMotion: false,
    highContrast: false,
    numberFormat: "short"
};

export const runtimeConfig = {
    ...DEFAULT_CONFIG
};

function clampConfigNumber(value, min, max, fallback) {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;

    return Math.min(max, Math.max(min, Math.floor(num)));
}

function saveConfig() {
    try {
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(runtimeConfig));
    } catch {
        // Optionales Persistieren, Fehler ignorieren
    }
}

export function loadConfig() {
    try {
        const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
        if (!raw) return;

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return;

        runtimeConfig.autosaveIntervalMs = clampConfigNumber(parsed.autosaveIntervalMs, 1000, 60000, DEFAULT_CONFIG.autosaveIntervalMs);
        runtimeConfig.uiRefreshIntervalMs = clampConfigNumber(parsed.uiRefreshIntervalMs, 16, 1000, DEFAULT_CONFIG.uiRefreshIntervalMs);
        runtimeConfig.soundEnabled = typeof parsed.soundEnabled === "boolean" ? parsed.soundEnabled : DEFAULT_CONFIG.soundEnabled;
        runtimeConfig.language = parsed.language === "en" ? "en" : "de";
        runtimeConfig.backgroundColor = typeof parsed.backgroundColor === "string" ? parsed.backgroundColor : DEFAULT_CONFIG.backgroundColor;
        runtimeConfig.cookieHorizontalOffset = clampConfigNumber(parsed.cookieHorizontalOffset, -260, 260, DEFAULT_CONFIG.cookieHorizontalOffset);
        runtimeConfig.reducedMotion = typeof parsed.reducedMotion === "boolean" ? parsed.reducedMotion : DEFAULT_CONFIG.reducedMotion;
        runtimeConfig.highContrast = typeof parsed.highContrast === "boolean" ? parsed.highContrast : DEFAULT_CONFIG.highContrast;
        runtimeConfig.numberFormat = parsed.numberFormat === "full" ? "full" : "short";
    } catch {
        // Bei kaputter Config mit Defaults weiterlaufen
    }
}

export function getAutosaveInterval() {
    return runtimeConfig.autosaveIntervalMs;
}

export function getUiRefreshInterval() {
    return runtimeConfig.uiRefreshIntervalMs;
}

export function updateAutosaveInterval(value) {
    runtimeConfig.autosaveIntervalMs = clampConfigNumber(value, 1000, 60000, runtimeConfig.autosaveIntervalMs);
    saveConfig();
    return runtimeConfig.autosaveIntervalMs;
}

export function updateUiRefreshInterval(value) {
    runtimeConfig.uiRefreshIntervalMs = clampConfigNumber(value, 16, 1000, runtimeConfig.uiRefreshIntervalMs);
    saveConfig();
    return runtimeConfig.uiRefreshIntervalMs;
}


export function resetRuntimeConfig() {
    runtimeConfig.autosaveIntervalMs = DEFAULT_CONFIG.autosaveIntervalMs;
    runtimeConfig.uiRefreshIntervalMs = DEFAULT_CONFIG.uiRefreshIntervalMs;
    runtimeConfig.soundEnabled = DEFAULT_CONFIG.soundEnabled;
    runtimeConfig.language = DEFAULT_CONFIG.language;
    runtimeConfig.backgroundColor = DEFAULT_CONFIG.backgroundColor;
    runtimeConfig.cookieHorizontalOffset = DEFAULT_CONFIG.cookieHorizontalOffset;
    runtimeConfig.reducedMotion = DEFAULT_CONFIG.reducedMotion;
    runtimeConfig.highContrast = DEFAULT_CONFIG.highContrast;
    runtimeConfig.numberFormat = DEFAULT_CONFIG.numberFormat;
    saveConfig();

    return { ...runtimeConfig };
}

export function updateSoundEnabled(value) {
    runtimeConfig.soundEnabled = Boolean(value);
    saveConfig();
    return runtimeConfig.soundEnabled;
}

export function updateLanguage(value) {
    runtimeConfig.language = value === "en" ? "en" : "de";
    saveConfig();
    return runtimeConfig.language;
}

export function getSoundEnabled() {
    return runtimeConfig.soundEnabled;
}

export function updateBackgroundColor(value) {
    runtimeConfig.backgroundColor = typeof value === "string" ? value.trim() : "";
    saveConfig();
    return runtimeConfig.backgroundColor;
}

export function getBackgroundColor() {
    return runtimeConfig.backgroundColor;
}

export function updateCookieHorizontalOffset(value) {
    runtimeConfig.cookieHorizontalOffset = clampConfigNumber(value, -260, 260, runtimeConfig.cookieHorizontalOffset);
    saveConfig();
    return runtimeConfig.cookieHorizontalOffset;
}

export function getCookieHorizontalOffset() {
    return runtimeConfig.cookieHorizontalOffset;
}

export function getLanguage() {
    return runtimeConfig.language;
}


export function updateReducedMotion(value) {
    runtimeConfig.reducedMotion = Boolean(value);
    saveConfig();
    return runtimeConfig.reducedMotion;
}

export function getReducedMotion() {
    return runtimeConfig.reducedMotion;
}

export function updateHighContrast(value) {
    runtimeConfig.highContrast = Boolean(value);
    saveConfig();
    return runtimeConfig.highContrast;
}

export function getHighContrast() {
    return runtimeConfig.highContrast;
}

export function updateNumberFormat(value) {
    runtimeConfig.numberFormat = value === "full" ? "full" : "short";
    saveConfig();
    return runtimeConfig.numberFormat;
}

export function getNumberFormat() {
    return runtimeConfig.numberFormat;
}
