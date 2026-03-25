import { awardDiamonds, gameState, spendDiamonds } from "./engine.js";
import { renderUI, showToast } from "./ui.js";
import { getLeSnusFeatureRules, runLeSnusRound } from "./le-snus-logic.js";
import { playSlotSpinSound, playSlotStopSound } from "./audio.js";

const BET_STEPS = [1, 2, 5, 10];
const DIAMOND_DOLLAR_VALUE = 10;
const REEL_SYMBOLS = [
    { icon: "🔟", label: "10" },
    { icon: "🃏", label: "J" },
    { icon: "👑", label: "Q" },
    { icon: "🤴", label: "K" },
    { icon: "🅰️", label: "A" },
    { icon: "🧀", label: "Cheese" },
    { icon: "🍺", label: "Beer" },
    { icon: "🥖", label: "Baguette" },
    { icon: "🎩", label: "Top Hat" },
    { icon: "📷", label: "FS", special: true },
    { icon: "🌈", label: "Rainbow", special: true }
];
const MODE_CONFIG = {
    base: { label: "Base Spin", costMultiplier: 1, options: {} },
    bonusHunt: { label: "BonusHunt FeatureSpins", costMultiplier: 3, options: { bonusHunt: true } },
    rainbow: { label: "Rainbow FeatureSpins", costMultiplier: 50, options: { rainbowFeatureSpins: true } },
    luck: { label: "Luck of the Bandit Buy", costMultiplier: 100, options: { forcedFeature: "luck" } },
    glitter: { label: "All That Glitters is Gold Buy", costMultiplier: 250, options: { forcedFeature: "glitter" } }
};

function formatNumber(num) {
    return Math.max(0, Number(num) || 0).toLocaleString("de-DE", { maximumFractionDigits: 2 });
}

function formatDiamondAmount(amount) {
    return `${formatNumber(amount)} 💎`;
}

function formatDollarEquivalent(amount) {
    return `$${formatNumber((Number(amount) || 0) * DIAMOND_DOLLAR_VALUE)}`;
}

function wait(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function nextFrame() {
    return new Promise((resolve) => window.requestAnimationFrame(resolve));
}

function createSet(positions = []) {
    return new Set(positions.map((position) => `${position.row}:${position.col}`));
}

function getNextBet(currentBet, direction) {
    const index = BET_STEPS.findIndex((step) => step >= currentBet);
    const currentIndex = index >= 0 ? index : BET_STEPS.length - 1;
    const nextIndex = Math.max(0, Math.min(BET_STEPS.length - 1, currentIndex + direction));
    return BET_STEPS[nextIndex];
}

function renderBoard(boardEl, board, goldenPositions = [], winningPositions = []) {
    if (!boardEl || !Array.isArray(board)) return;
    const goldenSet = createSet(goldenPositions);
    const winningSet = createSet(winningPositions);

    boardEl.innerHTML = board.map((row, rowIndex) => row.map((cell, colIndex) => {
        const key = `${rowIndex}:${colIndex}`;
        const classes = ["slot-cell"];
        if (goldenSet.has(key)) classes.push("is-golden");
        if (winningSet.has(key)) classes.push("is-winning");
        if (cell.special) classes.push("is-special");
        return `
            <div class="${classes.join(" ")}" data-row="${rowIndex}" data-col="${colIndex}">
                <span class="slot-cell-icon">${cell.icon}</span>
                <small>${cell.label}</small>
            </div>
        `;
    }).join("")).join("");
}

function randomReelBoard(rows = 5, columns = 6) {
    return Array.from({ length: rows }, () => Array.from({ length: columns }, () => {
        const symbol = REEL_SYMBOLS[Math.floor(Math.random() * REEL_SYMBOLS.length)] || REEL_SYMBOLS[0];
        return {
            id: symbol.label.toLowerCase(),
            icon: symbol.icon,
            label: symbol.label,
            special: Boolean(symbol.special)
        };
    }));
}

function renderFeatureRules(listEl) {
    if (!listEl) return;
    listEl.innerHTML = getLeSnusFeatureRules().map((rule) => `<div>${rule}</div>`).join("");
}

function renderTimeline(logEl, round) {
    if (!logEl) return;
    if (!round) {
        logEl.innerHTML = `<div class="slot-log-entry"><strong>Le-Snus bereit</strong><span>Nutze Bet, Base Spin, BonusHunt, Rainbow Spins oder die Bonus-Buys.</span><em>0.00x</em></div>`;
        return;
    }
    const entries = round.timeline.slice(-10);
    logEl.innerHTML = entries.length > 0
        ? entries.map((entry) => `
            <div class="slot-log-entry">
                <strong>${entry.label}</strong>
                <span>${entry.notes || "—"}</span>
                <em>${Number(entry.stepMultiplier || 0).toFixed(2)}x</em>
            </div>
        `).join("")
        : `<div class="slot-log-entry"><strong>Kein Gewinn</strong><span>In dieser Runde wurde kein Cluster getroffen.</span><em>0.00x</em></div>`;
}

export function initSlotMachine() {
    const launcherButton = document.getElementById("slotLauncherButton");
    const modal = document.getElementById("slotModal");
    const closeButton = document.getElementById("slotCloseButton");
    const spinButton = document.getElementById("slotSpinButton");
    const bonusHuntButton = document.getElementById("slotBonusHuntButton");
    const rainbowSpinsButton = document.getElementById("slotRainbowSpinsButton");
    const luckBuyButton = document.getElementById("slotLuckBuyButton");
    const glitterBuyButton = document.getElementById("slotGlitterBuyButton");
    const betDownButton = document.getElementById("slotBetDownButton");
    const betUpButton = document.getElementById("slotBetUpButton");
    const topUpButton = document.getElementById("slotTopUpButton");
    const statusEl = document.getElementById("slotStatus");
    const boardEl = document.getElementById("slotBoard");
    const logEl = document.getElementById("slotLog");
    const featureListEl = document.getElementById("slotFeatureList");
    const bankEl = document.getElementById("slotBankValue");
    const betEl = document.getElementById("slotBetValue");
    const payoutEl = document.getElementById("slotPayoutValue");
    const featureEl = document.getElementById("slotFeatureValue");

    if (!launcherButton || !modal || !spinButton || !statusEl || !boardEl || !logEl) {
        return;
    }

    let isSpinning = false;
    let lastRound = null;
    let currentBet = 1;

    const getBank = () => Math.max(0, Number(gameState.diamonds || 0));
    const getModeCost = (mode) => Math.floor(currentBet * MODE_CONFIG[mode].costMultiplier);

    const syncBalances = () => {
        const currentBank = getBank();
        const lastPayout = Math.max(0, Math.floor(Number(lastRound?.totalPayout) || 0));
        if (bankEl) bankEl.textContent = `${formatDiamondAmount(currentBank)} · ${formatDollarEquivalent(currentBank)}`;
        if (betEl) betEl.textContent = `${formatDiamondAmount(currentBet)} · ${formatDollarEquivalent(currentBet)}`;
        if (payoutEl) payoutEl.textContent = `${formatDiamondAmount(lastPayout)} · ${formatDollarEquivalent(lastPayout)}`;
        if (featureEl) featureEl.textContent = lastRound?.triggeredBonus?.label || lastRound?.feature?.label || "Base Game";

        const disableMode = (mode) => isSpinning || currentBank < getModeCost(mode);
        spinButton.disabled = disableMode("base");
        bonusHuntButton.disabled = disableMode("bonusHunt");
        rainbowSpinsButton.disabled = disableMode("rainbow");
        luckBuyButton.disabled = disableMode("luck");
        glitterBuyButton.disabled = disableMode("glitter");
        if (betDownButton) betDownButton.disabled = isSpinning || currentBet <= BET_STEPS[0];
        if (betUpButton) betUpButton.disabled = isSpinning || currentBet >= BET_STEPS[BET_STEPS.length - 1];
    };

    const setStatus = (message) => {
        if (statusEl) statusEl.textContent = message;
    };

    const resetPreviewBoard = () => {
        const preview = runLeSnusRound(currentBet);
        renderBoard(boardEl, preview.board, [], []);
    };

    const openModal = () => {
        modal.hidden = false;
        launcherButton.setAttribute("aria-expanded", "true");
        renderFeatureRules(featureListEl);
        if (lastRound) {
            renderBoard(boardEl, lastRound.board, lastRound.goldenPositions);
            renderTimeline(logEl, lastRound);
            setStatus(lastRound.summaryLines.join(" · "));
        } else {
            resetPreviewBoard();
            renderTimeline(logEl, null);
            setStatus("Le-Snus nutzt jetzt Diamanten als Le-Bandit-Währung: 1 💎 = 10$. Bet, Buys und Wins laufen komplett über Diamanten.");
        }
        syncBalances();
    };

    const closeModal = () => {
        modal.hidden = true;
        launcherButton.setAttribute("aria-expanded", "false");
    };

    const animateRound = async (round) => {
        const cascadeEntries = round.timeline.filter((entry) => entry.type === "cascade" || entry.type === "activation");
        if (cascadeEntries.length === 0) {
            renderBoard(boardEl, round.board, round.goldenPositions);
            return;
        }

        for (const entry of cascadeEntries) {
            renderBoard(boardEl, entry.board, entry.goldenPositions, entry.winningPositions);
            setStatus(`${entry.label}: ${entry.notes || ""}`.trim());
            await wait(entry.type === "activation" ? 520 : 340);
        }

        renderBoard(boardEl, round.board, round.goldenPositions);
    };

    const animateSpinReels = async () => {
        if (!boardEl) return;
        boardEl.classList.add("is-spinning");
        let lastTick = performance.now();
        const startTime = performance.now();
        const totalDuration = 1750;
        playSlotSpinSound();

        while (true) {
            const now = performance.now();
            const progress = Math.min(1, (now - startTime) / totalDuration);
            const speedWindow = progress < 0.22
                ? 180 - (progress / 0.22) * 120
                : progress > 0.72
                    ? 58 + ((progress - 0.72) / 0.28) * 190
                    : 58;

            if (now - lastTick >= speedWindow) {
                renderBoard(boardEl, randomReelBoard());
                lastTick = now;
            }

            if (progress >= 1) break;
            await nextFrame();
        }

        boardEl.classList.remove("is-spinning");
        boardEl.classList.add("is-stop-flash");
        playSlotStopSound();
        await wait(430);
        boardEl.classList.remove("is-stop-flash");
    };

    const handleSpin = async (mode = "base") => {
        if (isSpinning) return;
        const cost = getModeCost(mode);
        const spent = spendDiamonds(cost);
        if (spent <= 0) {
            setStatus("Nicht genug Diamanten für diesen Spin / Buy.");
            syncBalances();
            showToast("💎 Nicht genug Diamanten für den gewählten Modus.", 1500, "warning");
            return;
        }

        isSpinning = true;
        syncBalances();
        renderUI();
        setStatus(`${MODE_CONFIG[mode].label} läuft mit Einsatz ${formatDiamondAmount(currentBet)} / ${formatDollarEquivalent(currentBet)} (Kosten ${formatDiamondAmount(spent)}).`);

        const round = runLeSnusRound(currentBet, Math.random, MODE_CONFIG[mode].options);
        await animateSpinReels();
        await animateRound(round);

        if (round.totalPayout > 0) {
            awardDiamonds(round.totalPayout);
        }

        lastRound = round;
        isSpinning = false;
        renderTimeline(logEl, round);
        setStatus(round.summaryLines.join(" · "));
        if (round.economy?.nearMiss) {
            boardEl.classList.add("is-near-miss");
            await wait(500);
            boardEl.classList.remove("is-near-miss");
        }
        syncBalances();
        renderUI();

        if (round.totalPayout > currentBet) {
            showToast(`🎉 ${MODE_CONFIG[mode].label}: ${formatDiamondAmount(round.totalPayout)} ausgezahlt.`, 2200, "success");
        } else if (round.totalPayout > 0) {
            showToast(`😮 ${MODE_CONFIG[mode].label}: ${formatDiamondAmount(round.totalPayout)} zurück.`, 2000, "info");
        } else {
            showToast(`💥 ${MODE_CONFIG[mode].label}: kein Win.`, 1800, "warning");
        }
    };

    launcherButton.setAttribute("aria-controls", "slotModal");
    launcherButton.setAttribute("aria-expanded", "false");
    launcherButton.addEventListener("click", openModal);
    closeButton?.addEventListener("click", closeModal);
    topUpButton?.addEventListener("click", closeModal);
    spinButton.addEventListener("click", () => handleSpin("base").catch(() => { isSpinning = false; syncBalances(); }));
    bonusHuntButton?.addEventListener("click", () => handleSpin("bonusHunt").catch(() => { isSpinning = false; syncBalances(); }));
    rainbowSpinsButton?.addEventListener("click", () => handleSpin("rainbow").catch(() => { isSpinning = false; syncBalances(); }));
    luckBuyButton?.addEventListener("click", () => handleSpin("luck").catch(() => { isSpinning = false; syncBalances(); }));
    glitterBuyButton?.addEventListener("click", () => handleSpin("glitter").catch(() => { isSpinning = false; syncBalances(); }));
    betDownButton?.addEventListener("click", () => { currentBet = getNextBet(currentBet, -1); syncBalances(); });
    betUpButton?.addEventListener("click", () => { currentBet = getNextBet(currentBet, 1); syncBalances(); });

    modal.addEventListener("click", (event) => {
        if (event.target === modal) closeModal();
    });

    document.addEventListener("keydown", (event) => {
        if (modal.hidden) return;
        if (event.key === "Escape") {
            closeModal();
            return;
        }
        if (event.key === "Enter" && !isSpinning) {
            event.preventDefault();
            handleSpin("base").catch(() => {
                isSpinning = false;
                syncBalances();
            });
        }
    });

    window.addEventListener("snus:save-applied", () => {
        syncBalances();
        if (!modal.hidden) {
            setStatus("Le-Snus ist bereit für den nächsten Diamanten-Spin / Buy (1 💎 = 10$ Le Bandit).");
        }
    });

    window.addEventListener("snus:ui-rendered", () => {
        if (!modal.hidden) syncBalances();
    });

    renderFeatureRules(featureListEl);
    resetPreviewBoard();
    renderTimeline(logEl, null);
    syncBalances();
}
