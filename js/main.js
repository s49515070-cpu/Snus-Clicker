// =====================================
// MAIN ENTRY – SNUS CLICKER
// =====================================


import { gameLoop, claimAvailableMilestones, claimAvailableQuests, runAutoBuyerTick, applyOfflineProgress, setAutoBuyerStrategy, getAutoBuyerStrategy, setAutoBuyerWeights, getAutoBuyerWeights, prestigeReset, getPotentialPrestigeGain } from "./engine.js";
import { renderUI, renderBuildings, renderDiamondShop, renderTrophyPath, applyWorldTheme, refreshBuildingsIfNeeded, showToast, refreshAllUI, applyStaticTranslations } from "./ui.js";
import { loadGame, saveGame, exportSave, importSave, resetSave } from "./save.js";
import { loadConfig, getAutosaveInterval, getUiRefreshInterval, updateAutosaveInterval, updateUiRefreshInterval, resetRuntimeConfig, getLanguage, getSoundEnabled, updateLanguage, updateSoundEnabled, getBackgroundColor, updateBackgroundColor, getReducedMotion, updateReducedMotion, getHighContrast, updateHighContrast, getNumberFormat, updateNumberFormat } from "./config.js";
import { t } from "./i18n.js";
import { initWordle } from "./wordle.js";
import { initSlotMachine } from "./slot-machine.js";

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
    const autosaveIntervalInput = document.getElementById("autosaveIntervalInput");
    const autosaveIntervalText = document.getElementById("autosaveIntervalText");
    const uiRefreshIntervalInput = document.getElementById("uiRefreshIntervalInput");
    const uiRefreshIntervalText = document.getElementById("uiRefreshIntervalText");
    const autoBuyerStrategyInput = document.getElementById("autoBuyerStrategyInput");
    const autoBuyerCustomWeights = document.getElementById("autoBuyerCustomWeights");
    const autoBuyerValueWeightInput = document.getElementById("autoBuyerValueWeightInput");
    const autoBuyerCheapWeightInput = document.getElementById("autoBuyerCheapWeightInput");
    const autoBuyerValueWeightText = document.getElementById("autoBuyerValueWeightText");
    const autoBuyerCheapWeightText = document.getElementById("autoBuyerCheapWeightText");
    const numberFormatInput = document.getElementById("numberFormatInput");
    const reducedMotionInput = document.getElementById("reducedMotionInput");
    const highContrastInput = document.getElementById("highContrastInput");
    const resetSettingsButton = document.getElementById("resetSettingsButton");
    
    const collapseDurationMs = 220;

    
    const updateAutoBuyerStrategyOptionLabels = () => {
        if (!autoBuyerStrategyInput) return;

        const optionValue = autoBuyerStrategyInput.querySelector('option[value="value"]');
        const optionCheap = autoBuyerStrategyInput.querySelector('option[value="cheap"]');
        const optionBalanced = autoBuyerStrategyInput.querySelector('option[value="balanced"]');
        const optionReserve = autoBuyerStrategyInput.querySelector('option[value="reserve"]');
        const optionCustom = autoBuyerStrategyInput.querySelector('option[value="custom"]');
        if (optionValue) optionValue.textContent = t("autoBuyerStrategyValue");
        if (optionCheap) optionCheap.textContent = t("autoBuyerStrategyCheap");
        if (optionBalanced) optionBalanced.textContent = t("autoBuyerStrategyBalanced");
        if (optionReserve) optionReserve.textContent = t("autoBuyerStrategyReserve");
        if (optionCustom) optionCustom.textContent = t("autoBuyerStrategyCustom");
    };

    const updateCustomWeightsVisibility = (strategy) => {
        if (!autoBuyerCustomWeights) return;
        autoBuyerCustomWeights.hidden = strategy !== "custom";
    };

    const syncCustomWeightTexts = () => {
        if (autoBuyerValueWeightText && autoBuyerValueWeightInput) {
            autoBuyerValueWeightText.textContent = `${autoBuyerValueWeightInput.value}%`;
        }
        if (autoBuyerCheapWeightText && autoBuyerCheapWeightInput) {
            autoBuyerCheapWeightText.textContent = `${autoBuyerCheapWeightInput.value}%`;
        }
    };

    const syncRangeTexts = () => {
        if (autosaveIntervalText && autosaveIntervalInput) {
            autosaveIntervalText.textContent = `${Number(autosaveIntervalInput.value).toLocaleString("de-DE")} ms`;
        }

        if (uiRefreshIntervalText && uiRefreshIntervalInput) {
            uiRefreshIntervalText.textContent = `${Number(uiRefreshIntervalInput.value).toLocaleString("de-DE")} ms`;
        }
    };

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
            updateAutoBuyerStrategyOptionLabels();
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

    if (autosaveIntervalInput) {
        autosaveIntervalInput.value = String(getAutosaveInterval());
        syncRangeTexts();
        autosaveIntervalInput.addEventListener("input", syncRangeTexts);
        autosaveIntervalInput.addEventListener("change", () => {
            updateAutosaveInterval(autosaveIntervalInput.value);
            syncRangeTexts();
            restartAutosaveTimer();
            showToast(t("autosaveUpdated"), 1400, "info");
        });
    }

    if (uiRefreshIntervalInput) {
        uiRefreshIntervalInput.value = String(getUiRefreshInterval());
        syncRangeTexts();
        uiRefreshIntervalInput.addEventListener("input", () => {
            updateUiRefreshInterval(uiRefreshIntervalInput.value);
            syncRangeTexts();
        });
    }

    if (autoBuyerStrategyInput) {
        updateAutoBuyerStrategyOptionLabels();
        autoBuyerStrategyInput.value = getAutoBuyerStrategy();
        updateCustomWeightsVisibility(autoBuyerStrategyInput.value);
        autoBuyerStrategyInput.addEventListener("change", () => {
            const strategy = setAutoBuyerStrategy(autoBuyerStrategyInput.value);
            updateCustomWeightsVisibility(strategy);
            const strategyLabelKey = strategy === "cheap"
                ? "autoBuyerStrategyCheap"
                : strategy === "balanced"
                    ? "autoBuyerStrategyBalanced"
                    : strategy === "reserve"
                        ? "autoBuyerStrategyReserve"
                        : strategy === "custom"
                            ? "autoBuyerStrategyCustom"
                        : "autoBuyerStrategyValue";
            showToast(t("autoBuyerStrategyUpdated", { strategy: t(strategyLabelKey) }), 1300, "info");
        });
    }

        const weights = getAutoBuyerWeights();
    if (autoBuyerValueWeightInput && autoBuyerCheapWeightInput) {
        autoBuyerValueWeightInput.value = String(Math.round(weights.value * 100));
        autoBuyerCheapWeightInput.value = String(Math.round(weights.cheap * 100));
        syncCustomWeightTexts();

        const onWeightsInput = () => {
            const valueWeight = Number(autoBuyerValueWeightInput.value) / 100;
            const cheapWeight = Number(autoBuyerCheapWeightInput.value) / 100;
            setAutoBuyerWeights(valueWeight, cheapWeight);
            syncCustomWeightTexts();
        };

        autoBuyerValueWeightInput.addEventListener("input", onWeightsInput);
        autoBuyerCheapWeightInput.addEventListener("input", onWeightsInput);
    }

    if (numberFormatInput) {
        numberFormatInput.value = getNumberFormat();
        numberFormatInput.addEventListener("change", () => {
            updateNumberFormat(numberFormatInput.value);
            refreshAllUI();
        });
    }

    if (reducedMotionInput) {
        reducedMotionInput.value = getReducedMotion() ? "on" : "off";
        reducedMotionInput.addEventListener("change", () => {
            updateReducedMotion(reducedMotionInput.value === "on");
            applyWorldTheme();
        });
    }

    if (highContrastInput) {
        highContrastInput.value = getHighContrast() ? "on" : "off";
        highContrastInput.addEventListener("change", () => {
            updateHighContrast(highContrastInput.value === "on");
            applyWorldTheme();
        });
    }

    if (resetSettingsButton) {
        resetSettingsButton.addEventListener("click", () => {
            const defaults = resetRuntimeConfig();

            if (soundInput) soundInput.value = defaults.soundEnabled ? "on" : "off";
            if (languageInput) languageInput.value = defaults.language;
            if (backgroundColorInput) backgroundColorInput.value = defaults.backgroundColor || "#dff6ff";
            if (autosaveIntervalInput) autosaveIntervalInput.value = String(defaults.autosaveIntervalMs);
            if (uiRefreshIntervalInput) uiRefreshIntervalInput.value = String(defaults.uiRefreshIntervalMs);
            if (autoBuyerStrategyInput) {
                setAutoBuyerStrategy("value");
                updateAutoBuyerStrategyOptionLabels();
                updateCustomWeightsVisibility("value");
                setAutoBuyerWeights(0.75, 0.25);
            }
            if (autoBuyerValueWeightInput && autoBuyerCheapWeightInput) {
                autoBuyerValueWeightInput.value = "75";
                autoBuyerCheapWeightInput.value = "25";
                syncCustomWeightTexts();
            }
            if (numberFormatInput) numberFormatInput.value = defaults.numberFormat;
            if (reducedMotionInput) reducedMotionInput.value = defaults.reducedMotion ? "on" : "off";
            if (highContrastInput) highContrastInput.value = defaults.highContrast ? "on" : "off";

            syncRangeTexts();
            restartAutosaveTimer();
            applyStaticTranslations();
            updateAutoBuyerStrategyOptionLabels();
            refreshAllUI();
            showToast(t("settingsResetDone"), 1600, "info");
        });
    }
}


function initTrophyPathControls() {
    const trophyPathButton = document.getElementById("trophyPathButton");
    const trophyPathModal = document.getElementById("trophyPathModal");
    const trophyPathCloseButton = document.getElementById("trophyPathCloseButton");
    const trophyPrestigeButton = document.getElementById("trophyPrestigeButton");

    const setOpen = (open) => {
        if (!trophyPathModal) return;
        trophyPathModal.hidden = !open;
        if (trophyPathButton) trophyPathButton.setAttribute("aria-expanded", open ? "true" : "false");
        if (open) {
            renderTrophyPath();
            renderDiamondShop();
        }
    };

    if (trophyPathButton) {
        trophyPathButton.setAttribute("aria-controls", "trophyPathModal");
        trophyPathButton.setAttribute("aria-expanded", "false");
        trophyPathButton.addEventListener("click", () => setOpen(Boolean(trophyPathModal?.hidden)));
    }

    if (trophyPathCloseButton) {
        trophyPathCloseButton.addEventListener("click", () => setOpen(false));
    }

    if (trophyPrestigeButton) {
        trophyPrestigeButton.addEventListener("click", () => {
            const potential = getPotentialPrestigeGain();
            if (potential <= 0) {
                showToast(t("notEnoughLifetime"), 1700, "warning");
                return;
            }

            const confirmed = typeof globalThis.confirm === "function"
                ? globalThis.confirm(t("trophyResetConfirm"))
                : true;
            if (!confirmed) return;

            const earned = prestigeReset();
            if (earned > 0) {
                showToast(t("earnedPrestige", { amount: earned }), 1800, "success");
                renderBuildings();
                renderDiamondShop();
                renderTrophyPath();
                renderUI();
            }
        });
    }

    if (trophyPathModal) {
        trophyPathModal.addEventListener("click", (event) => {
            if (event.target === trophyPathModal) setOpen(false);
        });
    }
}

function initMilestonesControls() {
    const milestonesToggleButton = document.getElementById("milestonesToggleButton");
    const milestonesPanel = document.getElementById("milestonesPanel");
    const milestonesCloseButton = document.getElementById("milestonesCloseButton");

    const collapseDurationMs = 220;

    const setPanelVisibility = (visible) => {
        if (!milestonesPanel) return;

        if (visible) {
            milestonesPanel.hidden = false;
            requestAnimationFrame(() => {
                milestonesPanel.classList.remove("is-collapsed");
            });
        } else {
            milestonesPanel.classList.add("is-collapsed");
            window.setTimeout(() => {
                if (milestonesPanel.classList.contains("is-collapsed")) {
                    milestonesPanel.hidden = true;
                }
            }, collapseDurationMs);
        }

        if (milestonesToggleButton) {
            milestonesToggleButton.setAttribute("aria-expanded", visible ? "true" : "false");
        }
    };

    if (milestonesToggleButton) {
        milestonesToggleButton.setAttribute("aria-controls", "milestonesPanel");
        milestonesToggleButton.setAttribute("aria-expanded", "true");
        milestonesToggleButton.addEventListener("click", () => {
            setPanelVisibility(Boolean(milestonesPanel?.hidden));
        });
    }

    if (milestonesCloseButton) {
        milestonesCloseButton.addEventListener("click", () => setPanelVisibility(false));
    }
}

function initSaveSyncListener() {
    if (typeof window === "undefined") return;

    window.addEventListener("snus:save-applied", () => {
        refreshAllUI();
    });
}

function formatElapsedCompact(ms) {
    const totalSeconds = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
}

function init() {

    loadConfig();
    const loaded = loadGame();
    if (loaded && typeof localStorage !== "undefined") {
        const lastSeen = Number(localStorage.getItem("snus_clicker_last_seen") || Date.now());
        const offline = applyOfflineProgress(Date.now() - lastSeen);
        if (offline.gained > 0) {
            showToast(t("offlineProgressDetailed", {
                gained: Math.floor(offline.gained),
                time: formatElapsedCompact(offline.elapsedMs),
                cap: offline.capped ? t("offlineCapHit") : ""
            }), 2600, "info");
        }
    }
    applyWorldTheme();
    renderBuildings();
    renderDiamondShop();
    initSaveControls();
    initSettingsControls();
    initMilestonesControls();
    initTrophyPathControls();
    initSaveSyncListener();
    initSlotMachine();
    initWordle();
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
        const claimedQuests = claimAvailableQuests();
        if (claimedMilestones.length > 0 || claimedQuests.length > 0) {
            [...claimedMilestones, ...claimedQuests].forEach((entry) => {
                const rewards = [];
                if (entry.rewardCookies > 0) rewards.push(`+${entry.rewardCookies} ${t("snus")}`);
                if (entry.rewardDiamonds > 0) rewards.push(`+${entry.rewardDiamonds} ${t("diamonds")}`);
                showToast(`🏁 ${entry.label} (${rewards.join(" | ")})`, 1800, "success");
            });
            renderBuildings();
            renderDiamondShop();
        }

        runAutoBuyerTick();
        renderUI();
        refreshBuildingsIfNeeded();
        lastUiUpdateAt = timestamp;
        if (typeof localStorage !== "undefined") localStorage.setItem("snus_clicker_last_seen", String(Date.now()));
    }

    requestAnimationFrame(uiLoop);
}

// ===============================
// START
// ===============================

init();
