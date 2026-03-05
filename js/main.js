// =====================================
// MAIN ENTRY – SNUS CLICKER
// =====================================


import { gameLoop, claimAvailableMilestones } from "./engine.js";
import { renderUI, renderBuildings, renderPrestigeUpgrades, applyWorldTheme, refreshBuildingsIfNeeded, showToast, refreshAllUI, applyStaticTranslations } from "./ui.js";
import { loadGame, saveGame, exportSave, importSave, resetSave } from "./save.js";
import { loadConfig, getAutosaveInterval, getUiRefreshInterval, resetRuntimeConfig, getLanguage, getSoundEnabled, updateLanguage, updateSoundEnabled, getBackgroundColor, updateBackgroundColor } from "./config.js";
import { t } from "./i18n.js";

// ===============================
// INITIALISIERUNG
// ===============================

let autosaveTimerId;

function restartAutosaveTimer() {
    if (autosaveTimerId) {
        clearInterval(autosaveTimerId);
    }

    autosaveTimerId = setInterval(saveGame, getAutosaveInterval());
}

function initSaveControls() {
    const exportButton = document.getElementById("exportSaveButton");
    const importButton = document.getElementById("importSaveButton");
    const resetButton = document.getElementById("resetSaveButton");

    if (exportButton) {
        exportButton.addEventListener("click", exportSave);
    }

    if (importButton) {
        importButton.addEventListener("click", importSave);
    }

    if (resetButton) {
        resetButton.addEventListener("click", resetSave);
    }
}

function initSettingsControls() {
    const settingsToggleButton = document.getElementById("settingsToggleButton");
    const settingsPanel = document.getElementById("settingsPanel");
    const settingsCloseButton = document.getElementById("settingsCloseButton");
    const soundInput = document.getElementById("soundEnabledInput");
    const languageInput = document.getElementById("languageInput");
    const backgroundColorInput = document.getElementById("backgroundColorInput");
    const resetSettingsButton = document.getElementById("resetSettingsButton");
    
    const collapseDurationMs = 220;


    const setPanelVisibility = (visible) => {
        if (!settingsPanel) return;
        if (visible) {
            settingsPanel.hidden = false;
            requestAnimationFrame(() => {
                settingsPanel.classList.remove("is-collapsed");
            });
        } else {
            settingsPanel.classList.add("is-collapsed");
            window.setTimeout(() => {
                if (settingsPanel.classList.contains("is-collapsed")) {
                    settingsPanel.hidden = true;
                }
            }, collapseDurationMs);
        }

    
        if (settingsToggleButton) {
            settingsToggleButton.setAttribute("aria-expanded", visible ? "true" : "false");
        }
    };

    if (settingsToggleButton) {
        settingsToggleButton.setAttribute("aria-controls", "settingsPanel");
        settingsToggleButton.setAttribute("aria-expanded", "false");
        settingsToggleButton.addEventListener("click", () => {
            setPanelVisibility(settingsPanel?.hidden);
        });
    }

   
    if (settingsCloseButton) {
        settingsCloseButton.addEventListener("click", () => setPanelVisibility(false));
    }

    if (soundInput) {
        soundInput.value = getSoundEnabled() ? "on" : "off";
        soundInput.addEventListener("change", () => {
            updateSoundEnabled(soundInput.value === "on");
        });
    }

    if (languageInput) {
        languageInput.value = getLanguage();
        languageInput.addEventListener("change", () => {
            updateLanguage(languageInput.value);
            applyStaticTranslations();
            refreshAllUI();
        });
    }

    if (backgroundColorInput) {
        backgroundColorInput.value = getBackgroundColor() || "#dff6ff";
        backgroundColorInput.addEventListener("change", () => {
            const selectedColor = backgroundColorInput.value;
            updateBackgroundColor(selectedColor);
            applyWorldTheme();
            showToast(t("backgroundUpdated"), 1400, "info");
        });
    }

    if (resetSettingsButton) {
        resetSettingsButton.addEventListener("click", () => {
            const defaults = resetRuntimeConfig();

            if (soundInput) soundInput.value = defaults.soundEnabled ? "on" : "off";
            if (languageInput) languageInput.value = defaults.language;
            if (backgroundColorInput) backgroundColorInput.value = defaults.backgroundColor || "#dff6ff";

            restartAutosaveTimer();
            applyStaticTranslations();
            refreshAllUI();
            showToast(t("settingsResetDone"), 1600, "info");
        });
    }
}


function initSaveSyncListener() {
    if (typeof window === "undefined") return;

    window.addEventListener("snus:save-applied", () => {
        refreshAllUI();
    });
}

function init() {

    loadConfig();
    loadGame();
    applyWorldTheme();
    renderBuildings();
    renderPrestigeUpgrades();
    initSaveControls();
    initSettingsControls();
    initSaveSyncListener();
    applyStaticTranslations();

    gameLoop();
    requestAnimationFrame(uiLoop);

    restartAutosaveTimer();
}

// ===============================
// UI LOOP
// ===============================

let lastUiUpdateAt = 0;

function uiLoop(timestamp = 0) {
    if (timestamp - lastUiUpdateAt >= getUiRefreshInterval()) {
        const claimedMilestones = claimAvailableMilestones();
        if (claimedMilestones.length > 0) {
            claimedMilestones.forEach((milestone) => {
                const rewards = [];
                if (milestone.rewardCookies > 0) rewards.push(`+${milestone.rewardCookies} ${t("snus")}`);
                if (milestone.rewardPrestigeCookies > 0) rewards.push(`+${milestone.rewardPrestigeCookies} ${t("prestigeSnus")}`);
                showToast(`🏁 Milestone: ${milestone.label} (${rewards.join(" | ")})`, 1800, "success");
            });
            renderBuildings();
            renderPrestigeUpgrades();
        }

        renderUI();
        refreshBuildingsIfNeeded();
        lastUiUpdateAt = timestamp;
    }

    requestAnimationFrame(uiLoop);
}

// ===============================
// START
// ===============================

init();
