// =====================================
// MAIN ENTRY – SNUS CLICKER
// =====================================


import { gameLoop, claimAvailableMilestones } from "./engine.js";
import { renderUI, renderBuildings, renderPrestigeUpgrades, applyWorldTheme, refreshBuildingsIfNeeded, showToast, refreshAllUI } from "./ui.js";
import { loadGame, saveGame, exportSave, importSave, resetSave } from "./save.js";
import { loadConfig, getAutosaveInterval, getUiRefreshInterval, updateAutosaveInterval, updateUiRefreshInterval, resetRuntimeConfig } from "./config.js";

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
    const autosaveInput = document.getElementById("autosaveIntervalInput");
    const uiRefreshInput = document.getElementById("uiRefreshIntervalInput");
    const resetSettingsButton = document.getElementById("resetSettingsButton");

    function bindSettingInput(inputEl, options) {
        if (!inputEl) return;

        const { getValue, updateValue, onUpdated, toastMessage } = options;

        inputEl.value = String(getValue());

        const applySetting = () => {
            const previousValue = getValue();
            const updatedValue = updateValue(inputEl.value);
            inputEl.value = String(updatedValue);

            if (updatedValue !== previousValue) {
                if (typeof onUpdated === "function") {
                    onUpdated(updatedValue);
                }
                showToast(toastMessage, 1400, "success");
            }
        };

        inputEl.addEventListener("blur", applySetting);
        inputEl.addEventListener("change", applySetting);
        inputEl.addEventListener("keydown", (event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            applySetting();
            inputEl.blur();
        });
    }

    bindSettingInput(autosaveInput, {
        getValue: getAutosaveInterval,
        updateValue: updateAutosaveInterval,
        onUpdated: restartAutosaveTimer,
        toastMessage: "⚙️ Autosave-Intervall aktualisiert."
    });

    bindSettingInput(uiRefreshInput, {
        getValue: getUiRefreshInterval,
        updateValue: updateUiRefreshInterval,
        toastMessage: "⚙️ UI-Refresh aktualisiert."
    });

    if (resetSettingsButton) {
        resetSettingsButton.addEventListener("click", () => {
            const defaults = resetRuntimeConfig();

            if (autosaveInput) autosaveInput.value = String(defaults.autosaveIntervalMs);
            if (uiRefreshInput) uiRefreshInput.value = String(defaults.uiRefreshIntervalMs);

            restartAutosaveTimer();
            showToast("↺ Settings auf Standard zurückgesetzt.", 1600, "info");
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
                if (milestone.rewardCookies > 0) rewards.push(`+${milestone.rewardCookies} Cookies`);
                if (milestone.rewardPrestigeCookies > 0) rewards.push(`+${milestone.rewardPrestigeCookies} Prestige`);
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
