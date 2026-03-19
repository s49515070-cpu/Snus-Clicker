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

const KEYBOARD_ROWS = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "⌫"]
];

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
        mode: "daily"
    };
}

function createPracticeState(index = 0) {
    const safeIndex = Math.abs(Number(index) || 0) % solutionWords.length;
    return {
        ...createInitialGameState(solutionWords[safeIndex]),
        seed: safeIndex,
        mode: "practice"
    };
}

function loadWordleState() {
    const dailyState = createNewDailyState();
    const rawPersisted = safeStorageRead();
    const persisted = hydratePersistedState(rawPersisted, dailyState.solution);
    const persistedSeed = Number(rawPersisted?.seed);
    const persistedMode = rawPersisted?.mode === "practice" ? "practice" : "daily";

    if (persistedMode === "daily" && persistedSeed === dailyState.seed) {
        return {
            ...persisted,
            solution: dailyState.solution,
            seed: dailyState.seed,
            mode: "daily"
        };
    }

    if (persistedMode === "practice") {
        const practiceState = createPracticeState(persistedSeed);
        return {
            ...hydratePersistedState(rawPersisted, practiceState.solution),
            solution: practiceState.solution,
            seed: practiceState.seed,
            mode: "practice"
        };
    }

    return dailyState;
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
    const practiceButton = document.getElementById("wordlePracticeButton");
    const resetButton = document.getElementById("wordleResetButton");
    const hardModeInput = document.getElementById("wordleHardModeInput");

    if (!floatingButton || !modal || !boardEl || !keyboardEl || !statusEl || !subtitleEl || !badgeEl || !statsEl) {
        return;
    }

    let state = loadWordleState();
    let practiceSeed = state.mode === "practice" ? state.seed : 0;

    const persist = () => safeStorageWrite(state);

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
        badgeEl.textContent = state.mode === "daily" ? "Tagesrätsel" : "Freies Spiel";
        subtitleEl.textContent = state.mode === "daily"
            ? `Heute wartet ein neues 5-Buchstaben-Wort. Versuche ${MAX_ATTEMPTS} stabile Züge.`
            : `Trainingsrunde #${state.seed + 1}. Du kannst beliebig oft neu starten.`;
        statusEl.textContent = state.message || (state.status === "playing"
            ? `Zeile ${Math.min(state.guesses.length + 1, MAX_ATTEMPTS)} von ${MAX_ATTEMPTS} · ${WORD_LENGTH} Buchstaben.`
            : state.status === "won"
                ? `Gewonnen! Die Lösung war ${state.solution}.`
                : `Verloren. Die Lösung war ${state.solution}.`);
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
        modal.hidden = false;
        floatingButton.setAttribute("aria-expanded", "true");
        render();
    };

    const closeModal = () => {
        modal.hidden = true;
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
        practiceSeed += 1;
        state = {
            ...createPracticeState(practiceSeed),
            statistics: state.statistics,
            hardMode: state.hardMode
        };
        render();
    });

    resetButton?.addEventListener("click", () => {
        state = state.mode === "practice"
            ? { ...createPracticeState(state.seed), statistics: state.statistics, hardMode: state.hardMode }
            : { ...createNewDailyState(), statistics: state.statistics, hardMode: state.hardMode };
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
