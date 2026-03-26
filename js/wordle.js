import { WORDLE_ALLOWED_GUESSES, WORDLE_SOLUTIONS } from "../data/wordle-words.js";
import {
    MAX_ATTEMPTS,
    STORAGE_KEY,
    WORD_LENGTH,
    applyKeyInput,
    buildBoard,
    createDailySeed,
    createInitialGameState,
    evaluateGuess,
    getWordForSeed,
    hydratePersistedState,
    normalizeWordList,
    scoreKeyboard,
    submitGuess
} from "./wordle-logic.js";
import { awardDiamonds, gameState, spendDiamonds } from "./engine.js";
import { animateDiamondReward } from "./ui-rewards.js";

const KEYBOARD_ROWS = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "⌫"]
];
const WORDLE_WIN_DIAMONDS = 5;
const WORDLE_HINT_COST = 8;
const WORDLE_WIN_ADVANCE_DELAY_MS = 1500;
const WORDLE_MAX_HINTS_PER_ROUND = 1;

const solutionWords = normalizeWordList(WORDLE_SOLUTIONS);
const allowedWords = new Set(normalizeWordList([...WORDLE_ALLOWED_GUESSES, ...solutionWords]));

function safeStorageRead() {
    if (typeof localStorage === "undefined") return null;
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch {
        return null;
    }
}

function safeStorageWrite(state) {
    if (typeof localStorage === "undefined") return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        // Ignore storage quota or serialization failures to keep the game responsive.
    }
}

function createNewDailyState() {
    const seed = createDailySeed(new Date());
    const solution = getWordForSeed(seed, solutionWords);
    return {
        ...createInitialGameState(solution),
        seed,
        mode: "daily",
        dailyRoundIndex: 0,
        dailySolvedCount: 0
    };
}

function createDailyRoundState(seed, roundIndex) {
    const safeSeed = Math.abs(Math.trunc(Number(seed) || 0));
    const safeRoundIndex = Math.max(0, Math.trunc(Number(roundIndex) || 0));
    return {
        ...createInitialGameState(getWordForSeed(safeSeed + safeRoundIndex, solutionWords)),
        seed: safeSeed,
        mode: "daily",
        dailyRoundIndex: safeRoundIndex
    };
}

function createStateCarryover(rawPersisted) {
    const safeStatistics = rawPersisted?.statistics && typeof rawPersisted.statistics === "object"
        ? {
            played: Math.max(0, Number(rawPersisted.statistics.played) || 0),
            wins: Math.max(0, Number(rawPersisted.statistics.wins) || 0),
            currentStreak: Math.max(0, Number(rawPersisted.statistics.currentStreak) || 0),
            maxStreak: Math.max(0, Number(rawPersisted.statistics.maxStreak) || 0),
            distribution: Array.from({ length: MAX_ATTEMPTS }, (_, index) => Math.max(0, Number(rawPersisted.statistics.distribution?.[index]) || 0))
        }
        : createInitialGameState(solutionWords[0]).statistics;

    return {
        statistics: safeStatistics,
        hardMode: Boolean(rawPersisted?.hardMode)
    };
}

function loadWordleState() {
    const dailyState = createNewDailyState();
    const rawPersisted = safeStorageRead();
    const persisted = hydratePersistedState(rawPersisted, dailyState.solution);
    const persistedSeed = Number(rawPersisted?.seed);
    const persistedRoundIndex = Math.max(0, Math.trunc(Number(rawPersisted?.dailyRoundIndex) || 0));
    const persistedSolvedCount = Math.max(0, Math.trunc(Number(rawPersisted?.dailySolvedCount) || 0));
    const carryover = createStateCarryover(rawPersisted);

    if (persistedSeed === dailyState.seed) {
        const roundState = createDailyRoundState(dailyState.seed, persistedRoundIndex);
        const hydratedRoundState = hydratePersistedState(rawPersisted, roundState.solution);
        return {
            ...hydratedRoundState,
            solution: roundState.solution,
            seed: dailyState.seed,
            mode: "daily",
            hardMode: carryover.hardMode,
            dailyRoundIndex: persistedRoundIndex,
            dailySolvedCount: persistedSolvedCount
        };
    }

    const canResumePreviousRound = persisted.status === "playing"
        && persisted.guesses.length < MAX_ATTEMPTS
        && persisted.solution.length === WORD_LENGTH;

    if (canResumePreviousRound) {
        return {
            ...persisted,
            seed: dailyState.seed,
            mode: "daily",
            hardMode: carryover.hardMode,
            dailyRoundIndex: persistedRoundIndex,
            dailySolvedCount: persistedSolvedCount,
            message: persisted.message || "Deine letzte Runde wurde fortgesetzt."
        };
    }

    return {
        ...dailyState,
        ...carryover,
        hardMode: carryover.hardMode,
        dailyRoundIndex: 0,
        dailySolvedCount: 0
    };
}


function setModalVisibility(modalEl, open, durationMs = 240) {
    if (!modalEl) return;

    if (open) {
        modalEl.hidden = false;
        
        const raf = typeof globalThis.requestAnimationFrame === "function"
            ? globalThis.requestAnimationFrame.bind(globalThis)
            : null;
        if (raf) {
            raf(() => modalEl.classList.add("is-open"));
        } else {
            modalEl.classList.add("is-open");
        }
        return;
    }

    modalEl.classList.remove("is-open");
    window.setTimeout(() => {
        if (!modalEl.classList.contains("is-open")) {
            modalEl.hidden = true;
        }
    }, durationMs);
}

function computeStatsSummary(state) {
    const { played, wins, currentStreak, maxStreak, distribution } = state.statistics;
    const winRate = played > 0 ? Math.round((wins / played) * 100) : 0;
    const highestDistribution = Math.max(1, ...distribution);
    return { played, wins, currentStreak, maxStreak, winRate, highestDistribution };
}

export function initWordle() {
    const floatingButton = document.getElementById("wordleLauncherButton");
    const modal = document.getElementById("wordleModal");
    const closeButton = document.getElementById("wordleCloseButton");
    const boardEl = document.getElementById("wordleBoard");
    const keyboardEl = document.getElementById("wordleKeyboard");
    const statusEl = document.getElementById("wordleStatus");
    const subtitleEl = document.getElementById("wordleSubtitle");
    const badgeEl = document.getElementById("wordleModeBadge");
    const statsEl = document.getElementById("wordleStats");
    const hintEl = document.getElementById("wordleHint");
    const solutionEl = document.getElementById("wordleSolution");
    const practiceButton = document.getElementById("wordlePracticeButton");
    const resetButton = document.getElementById("wordleResetButton");
    const hintButton = document.getElementById("wordleHintButton");
    const hardModeInput = document.getElementById("wordleHardModeInput");

    if (!floatingButton || !modal || !boardEl || !keyboardEl || !statusEl || !subtitleEl || !badgeEl || !statsEl || !hintEl) {
        return;
    }

    let state = loadWordleState();
    let autoAdvanceTimerId = null;

    const persist = () => safeStorageWrite(state);
    const diamondCountEl = document.getElementById("diamondCount");

    const clearAutoAdvanceTimer = () => {
        if (autoAdvanceTimerId) {
            clearTimeout(autoAdvanceTimerId);
            autoAdvanceTimerId = null;
        }
    };

    const refreshDiamondCount = (value) => {
        if (diamondCountEl) {
            diamondCountEl.textContent = String(Math.max(0, Math.floor(Number(value) || 0)));
        }
    };

    const getLastResolvedRowElement = () => {
        if (!boardEl || typeof boardEl.querySelector !== "function") return null;
        const rowIndex = Math.max(0, Math.min(MAX_ATTEMPTS - 1, state.guesses.length - 1));
        return boardEl.querySelector(`.wordle-row[data-row="${rowIndex}"]`);
    };

    const getDiscoveredSolutionLetters = () => {
        const discovered = new Set(Array.isArray(state.hintLetters) ? state.hintLetters : []);
        state.guesses.forEach((guess) => {
            const evaluation = evaluateGuess(guess, state.solution);
            evaluation.forEach((tile) => {
                if (tile.state === "correct" || tile.state === "present") {
                    discovered.add(tile.letter);
                }
            });
        });
        return discovered;
    };

    const getHintableLetters = () => {
        const discovered = getDiscoveredSolutionLetters();
        return Array.from(new Set(Array.from(state.solution).filter((letter) => !discovered.has(letter))));
    };

    const renderHint = () => {
        const revealedLetters = Array.isArray(state.hintLetters) ? state.hintLetters : [];
        if (revealedLetters.length === 0) {
            hintEl.textContent = `Tipp kostet ${WORDLE_HINT_COST} Diamanten: Du erfährst einen Buchstaben, aber nicht seine Position.`;
            return;
        }

        hintEl.innerHTML = `Tipp: Der Buchstabe <span class="wordle-hint-letter">${revealedLetters[0]}</span> ist im Wort enthalten.`;
    };

    const buyHint = () => {
        if (state.status !== 'playing') {
            state = { ...state, message: 'Tipps gibt es nur während einer laufenden Runde.' };
            render();
            return;
        }

        if (state.hintLetters.length >= WORDLE_MAX_HINTS_PER_ROUND) {
            state = { ...state, message: "Du kannst pro Runde nur einen Tipp kaufen." };
            render();
            return;
        }

        const hintableLetters = getHintableLetters();
        if (hintableLetters.length === 0) {
            state = { ...state, message: 'Für dieses Wort wurden schon alle möglichen Buchstaben-Hinweise aufgedeckt.' };
            render();
            return;
        }

        const spent = spendDiamonds(WORDLE_HINT_COST);
        if (spent < WORDLE_HINT_COST) {
            state = { ...state, message: `Du brauchst ${WORDLE_HINT_COST} Diamanten für einen Tipp.` };
            render();
            return;
        }

        const letter = hintableLetters[Math.floor(Math.random() * hintableLetters.length)];
        state = {
            ...state,
            hintLetters: [letter],
            message: `Tipp gekauft: Der Buchstabe ${letter} ist im Wort enthalten.`
        };
        refreshDiamondCount(gameState.diamonds);
        render();
    };

    const createNextSolvedRoundState = () => {
        const nextRoundIndex = Math.max(0, Math.trunc(Number(state.dailyRoundIndex) || 0)) + 1;
        return {
            ...createDailyRoundState(state.seed, nextRoundIndex),
            statistics: state.statistics,
            hardMode: state.hardMode,
            dailyRoundIndex: nextRoundIndex,
            dailySolvedCount: state.dailySolvedCount,
            message: "Neue Runde gestartet."
        };
    };

    const queueNextSolvedRound = () => {
        clearAutoAdvanceTimer();
        autoAdvanceTimerId = setTimeout(() => {
            state = createNextSolvedRoundState();
            render();
            autoAdvanceTimerId = null;
        }, WORDLE_WIN_ADVANCE_DELAY_MS);
    };

    const render = () => {
        const board = buildBoard(state);
        boardEl.innerHTML = "";

        board.forEach((row, rowIndex) => {
            const rowEl = document.createElement("div");
            rowEl.className = "wordle-row";
            rowEl.dataset.row = String(rowIndex);

            row.forEach((tile, tileIndex) => {
                const tileEl = document.createElement("div");
                tileEl.className = `wordle-tile is-${tile.state}`;
                tileEl.textContent = tile.letter || "";
                tileEl.style.setProperty("--tile-index", String(tileIndex));
                rowEl.appendChild(tileEl);
            });

            boardEl.appendChild(rowEl);
        });

        const evaluatedRows = state.guesses.map((guess) => evaluateGuess(guess, state.solution));
        const keyboardState = scoreKeyboard(evaluatedRows);
        keyboardEl.innerHTML = "";
        KEYBOARD_ROWS.forEach((row) => {
            const rowEl = document.createElement("div");
            rowEl.className = "wordle-keyboard-row";
            row.forEach((key) => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "wordle-key";
                const translatedKey = key === "⌫" ? "Backspace" : key;
                const singleLetter = translatedKey.length === 1 ? translatedKey : "";
                const score = keyboardState[singleLetter] || "unused";
                button.classList.add(`is-${score}`);
                if (key === "ENTER" || key === "⌫") button.classList.add("is-wide");
                button.dataset.key = translatedKey;
                button.textContent = key;
                rowEl.appendChild(button);
            });
            keyboardEl.appendChild(rowEl);
        });

        const summary = computeStatsSummary(state);
        const hintableLetters = getHintableLetters();
        badgeEl.textContent = "Tagesmodus";
        subtitleEl.textContent = `Heute: Wort #${Math.max(1, state.dailyRoundIndex + 1)} · ${MAX_ATTEMPTS} Versuche · 5 Buchstaben.`;
        statusEl.textContent = state.message || (state.status === "playing"
            ? `Zeile ${Math.min(state.guesses.length + 1, MAX_ATTEMPTS)} von ${MAX_ATTEMPTS} · ${WORD_LENGTH} Buchstaben.`
            : state.status === "won"
                ? `Gewonnen! Die Lösung war ${state.solution}.`
                : `Verloren. Die Lösung war ${state.solution}.`);
        if (solutionEl) {
            solutionEl.hidden = state.status === "playing";
            solutionEl.innerHTML = state.status === "playing"
                ? ""
                : `Lösungswort: <span class="wordle-solution-word">${state.solution}</span>`;
        }
        renderHint();

        if (hintButton) {
            const hasHintAlready = state.hintLetters.length >= WORDLE_MAX_HINTS_PER_ROUND;
            const canBuyHint = state.status === "playing"
                && !hasHintAlready
                && hintableLetters.length > 0
                && Number(gameState.diamonds || 0) >= WORDLE_HINT_COST;
            hintButton.disabled = !canBuyHint;
            hintButton.textContent = state.status !== "playing"
                ? "💡 Tipp nur im Spiel"
                : hasHintAlready
                    ? "💡 Tipp bereits genutzt"
                : hintableLetters.length === 0
                    ? "💡 Alle Tipps genutzt"
                    : `💡 Tipp (${WORDLE_HINT_COST} 💎)`;
        }

        statsEl.innerHTML = `
            <div class="wordle-stat-card"><strong>${summary.played}</strong><span>Spiele</span></div>
            <div class="wordle-stat-card"><strong>${summary.winRate}%</strong><span>Quote</span></div>
            <div class="wordle-stat-card"><strong>${summary.currentStreak}</strong><span>Serie</span></div>
            <div class="wordle-stat-card"><strong>${summary.maxStreak}</strong><span>Bestserie</span></div>
            <div class="wordle-distribution">
                ${state.statistics.distribution.map((value, index) => `
                    <div class="wordle-distribution-row">
                        <span>${index + 1}</span>
                        <div class="wordle-distribution-bar"><i style="width:${Math.max(10, Math.round((value / summary.highestDistribution) * 100))}%">${value}</i></div>
                    </div>
                `).join("")}
            </div>
        `;

        if (hardModeInput) hardModeInput.checked = Boolean(state.hardMode);
        if (resetButton) {
            resetButton.disabled = true;
            resetButton.title = "Tagesrätsel kann nicht zurückgesetzt werden.";
        }
        if (practiceButton) {
            practiceButton.textContent = "➡️ Nächstes Tageswort";
        }
        persist();
    };

    const setMessage = (message) => {
        state = { ...state, message };
        render();
    };

    const submitCurrentGuess = () => {
        const result = submitGuess(state, allowedWords);
        state = result.state;
        if (!result.accepted) {
            setMessage(result.reason);
            return;
        }
        if (state.status === "won") {
            const nextDiamondTotal = awardDiamonds(WORDLE_WIN_DIAMONDS);
            animateDiamondReward({
                amount: WORDLE_WIN_DIAMONDS,
                sourceEl: getLastResolvedRowElement(),
                targetEl: diamondCountEl,
                finalTotal: nextDiamondTotal
            });
            state = {
                ...state,
                dailySolvedCount: Math.max(0, Number(state.dailySolvedCount) || 0) + 1,
                message: `Du hast gewonnen! +${WORDLE_WIN_DIAMONDS} Diamanten. Heute gelöst: ${Math.max(0, Number(state.dailySolvedCount) || 0) + 1}.`
            };
            render();
            queueNextSolvedRound();
            return;
        }
        render();
    };

    const handleKey = (key) => {
        if (modal.hidden) return;
        if (key === "Enter") {
            submitCurrentGuess();
            return;
        }
        if (key === "Backspace") {
            state = applyKeyInput(state, key);
            render();
            return;
        }
        state = applyKeyInput(state, key);
        render();
    };

    const openModal = () => {
        setModalVisibility(modal, true, 240);
        floatingButton.setAttribute("aria-expanded", "true");
        render();
    };

    const closeModal = () => {
        setModalVisibility(modal, false, 240);
        floatingButton.setAttribute("aria-expanded", "false");
    };

    floatingButton.setAttribute("aria-controls", "wordleModal");
    floatingButton.setAttribute("aria-expanded", "false");
    floatingButton.addEventListener("click", openModal);
    closeButton?.addEventListener("click", closeModal);
    modal.addEventListener("click", (event) => {
        if (event.target === modal) closeModal();
    });

    keyboardEl.addEventListener("click", (event) => {
        const keyButton = event.target.closest("button[data-key]");
        if (!keyButton) return;
        handleKey(keyButton.dataset.key);
    });

    practiceButton?.addEventListener("click", () => {
        clearAutoAdvanceTimer();
        state = createNextSolvedRoundState();
        render();
    });

    hintButton?.addEventListener("click", buyHint);

    resetButton?.addEventListener("click", () => {
        clearAutoAdvanceTimer();
        if (state.mode === "daily") {
            state = {
                ...state,
                message: "Das Tagesrätsel kann nicht zurückgesetzt werden."
            };
            render();
            return;
        }
        state = { ...createNewDailyState(), statistics: state.statistics, hardMode: state.hardMode };
        render();
    });

    hardModeInput?.addEventListener("change", () => {
        state = {
            ...state,
            hardMode: Boolean(hardModeInput.checked),
            message: hardModeInput.checked ? "Hard Mode aktiviert." : "Hard Mode deaktiviert."
        };
        render();
    });

    document.addEventListener("keydown", (event) => {
        if (modal.hidden) return;
        if (event.key === "Escape") {
            closeModal();
            return;
        }
        const activeTag = document.activeElement?.tagName;
        if (activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT") return;
        if (event.key === "Enter" || event.key === "Backspace" || /^[a-zA-ZäöüÄÖÜß]$/.test(event.key)) {
            event.preventDefault();
            handleKey(event.key);
        }
    });

    render();
}
