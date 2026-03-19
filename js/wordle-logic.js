const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;
const STORAGE_KEY = "snus_clicker_wordle_state_v1";
const WORDLE_EPOCH = "2024-01-01T00:00:00Z";

export { WORD_LENGTH, MAX_ATTEMPTS, STORAGE_KEY };

export function sanitizeWord(raw) {
    return String(raw || "")
        .trim()
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Z]/g, "");
}

export function normalizeWordList(words) {
    return Array.from(new Set(
        (Array.isArray(words) ? words : [])
            .map(sanitizeWord)
            .filter((word) => word.length === WORD_LENGTH)
    ));
}

export function createDailySeed(date = new Date()) {
    const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const epoch = new Date(WORDLE_EPOCH);
    return Math.max(0, Math.floor((utcDate.getTime() - epoch.getTime()) / 86_400_000));
}

export function getWordForSeed(seed, solutionWords) {
    if (!Array.isArray(solutionWords) || solutionWords.length === 0) {
        throw new Error("A non-empty solution word list is required.");
    }
    const safeSeed = Math.abs(Number(seed) || 0);
    return solutionWords[safeSeed % solutionWords.length];
}

export function evaluateGuess(guess, solution) {
    const normalizedGuess = sanitizeWord(guess);
    const normalizedSolution = sanitizeWord(solution);

    if (normalizedGuess.length !== WORD_LENGTH || normalizedSolution.length !== WORD_LENGTH) {
        throw new Error("Guess and solution must both be exactly 5 letters long.");
    }

    const result = Array.from({ length: WORD_LENGTH }, (_, index) => ({
        letter: normalizedGuess[index],
        state: "absent"
    }));

    const unmatchedSolutionCounts = new Map();

    for (let index = 0; index < WORD_LENGTH; index += 1) {
        if (normalizedGuess[index] === normalizedSolution[index]) {
            result[index].state = "correct";
        } else {
            const solutionLetter = normalizedSolution[index];
            unmatchedSolutionCounts.set(solutionLetter, (unmatchedSolutionCounts.get(solutionLetter) || 0) + 1);
        }
    }

    for (let index = 0; index < WORD_LENGTH; index += 1) {
        if (result[index].state === "correct") continue;
        const guessLetter = normalizedGuess[index];
        const remaining = unmatchedSolutionCounts.get(guessLetter) || 0;
        if (remaining > 0) {
            result[index].state = "present";
            unmatchedSolutionCounts.set(guessLetter, remaining - 1);
        }
    }

    return result;
}

export function scoreKeyboard(rows) {
    const priority = { absent: 1, present: 2, correct: 3 };
    const letters = {};

    rows.flat().forEach((tile) => {
        if (!tile?.letter || !tile?.state) return;
        const current = letters[tile.letter];
        if (!current || priority[tile.state] > priority[current]) {
            letters[tile.letter] = tile.state;
        }
    });

    return letters;
}

export function createEmptyBoard() {
    return Array.from({ length: MAX_ATTEMPTS }, () => Array.from({ length: WORD_LENGTH }, () => ({
        letter: "",
        state: "empty"
    })));
}

export function createInitialGameState(solution) {
    const normalizedSolution = sanitizeWord(solution);
    if (normalizedSolution.length !== WORD_LENGTH) {
        throw new Error("The solution must be exactly 5 letters long.");
    }

    return {
        solution: normalizedSolution,
        guesses: [],
        currentGuess: "",
        status: "playing",
        message: "",
        lastPlayedAt: Date.now(),
        hardMode: false,
        statistics: {
            played: 0,
            wins: 0,
            currentStreak: 0,
            maxStreak: 0,
            distribution: Array.from({ length: MAX_ATTEMPTS }, () => 0)
        }
    };
}

export function hydratePersistedState(rawState, fallbackSolution) {
    const safeFallback = sanitizeWord(fallbackSolution);
    const base = createInitialGameState(safeFallback);

    if (!rawState || typeof rawState !== "object") {
        return base;
    }

    const sanitizedGuesses = Array.isArray(rawState.guesses)
        ? rawState.guesses.map(sanitizeWord).filter((word) => word.length === WORD_LENGTH).slice(0, MAX_ATTEMPTS)
        : [];

    const statistics = rawState.statistics && typeof rawState.statistics === "object"
        ? {
            played: Math.max(0, Number(rawState.statistics.played) || 0),
            wins: Math.max(0, Number(rawState.statistics.wins) || 0),
            currentStreak: Math.max(0, Number(rawState.statistics.currentStreak) || 0),
            maxStreak: Math.max(0, Number(rawState.statistics.maxStreak) || 0),
            distribution: Array.from({ length: MAX_ATTEMPTS }, (_, index) => Math.max(0, Number(rawState.statistics.distribution?.[index]) || 0))
        }
        : base.statistics;

    const status = rawState.status === "won" || rawState.status === "lost" ? rawState.status : "playing";

    return {
        solution: sanitizeWord(rawState.solution) || safeFallback,
        guesses: sanitizedGuesses,
        currentGuess: sanitizeWord(rawState.currentGuess).slice(0, WORD_LENGTH),
        status,
        message: typeof rawState.message === "string" ? rawState.message : "",
        lastPlayedAt: Number(rawState.lastPlayedAt) || Date.now(),
        hardMode: Boolean(rawState.hardMode),
        statistics
    };
}

export function buildBoard(state) {
    const board = createEmptyBoard();
    state.guesses.forEach((guess, rowIndex) => {
        const evaluated = evaluateGuess(guess, state.solution);
        board[rowIndex] = evaluated;
    });

    if (state.status === "playing") {
        const draftRowIndex = state.guesses.length;
        if (board[draftRowIndex]) {
            const draft = state.currentGuess.padEnd(WORD_LENGTH, " ").slice(0, WORD_LENGTH);
            board[draftRowIndex] = Array.from({ length: WORD_LENGTH }, (_, index) => ({
                letter: draft[index] === " " ? "" : draft[index],
                state: draft[index] === " " ? "empty" : "draft"
            }));
        }
    }

    return board;
}

export function getRequiredHardModeHints(previousRows) {
    const requiredPositions = new Map();
    const minimumLetterCounts = new Map();

    previousRows.forEach((row) => {
        const rowPresentCounts = new Map();
        row.forEach((tile, index) => {
            if (!tile?.letter) return;
            if (tile.state === "correct") {
                requiredPositions.set(index, tile.letter);
                rowPresentCounts.set(tile.letter, (rowPresentCounts.get(tile.letter) || 0) + 1);
            } else if (tile.state === "present") {
                rowPresentCounts.set(tile.letter, (rowPresentCounts.get(tile.letter) || 0) + 1);
            }
        });

        rowPresentCounts.forEach((count, letter) => {
            minimumLetterCounts.set(letter, Math.max(minimumLetterCounts.get(letter) || 0, count));
        });
    });

    return { requiredPositions, minimumLetterCounts };
}

export function validateHardMode(nextGuess, previousRows) {
    const guess = sanitizeWord(nextGuess);
    const { requiredPositions, minimumLetterCounts } = getRequiredHardModeHints(previousRows);

    for (const [index, letter] of requiredPositions.entries()) {
        if (guess[index] !== letter) {
            return `Position ${index + 1} muss ${letter} bleiben.`;
        }
    }

    for (const [letter, minimum] of minimumLetterCounts.entries()) {
        const actual = Array.from(guess).filter((value) => value === letter).length;
        if (actual < minimum) {
            return `Du musst ${letter} weiterhin verwenden.`;
        }
    }

    return "";
}

export function submitGuess(state, wordBank) {
    if (state.status !== "playing") {
        return { state, accepted: false, reason: "Spiel ist bereits beendet." };
    }

    const guess = sanitizeWord(state.currentGuess);
    if (guess.length !== WORD_LENGTH) {
        return { state, accepted: false, reason: `Bitte ${WORD_LENGTH} Buchstaben eingeben.` };
    }

    if (!wordBank.has(guess)) {
        return { state, accepted: false, reason: "Dieses Wort ist nicht in der Liste." };
    }

    const rows = state.guesses.map((entry) => evaluateGuess(entry, state.solution));
    if (state.hardMode) {
        const hardModeError = validateHardMode(guess, rows);
        if (hardModeError) {
            return { state, accepted: false, reason: hardModeError };
        }
    }

    const nextGuesses = [...state.guesses, guess];
    const isWin = guess === state.solution;
    const isLoss = !isWin && nextGuesses.length >= MAX_ATTEMPTS;
    const nextStatus = isWin ? "won" : isLoss ? "lost" : "playing";
    const statistics = {
        ...state.statistics,
        distribution: [...state.statistics.distribution]
    };

    let message = "Weiter so!";
    if (isWin || isLoss) {
        statistics.played += 1;
        if (isWin) {
            statistics.wins += 1;
            statistics.currentStreak += 1;
            statistics.maxStreak = Math.max(statistics.maxStreak, statistics.currentStreak);
            statistics.distribution[nextGuesses.length - 1] += 1;
            message = `Stark! Du hast ${state.solution} in ${nextGuesses.length}/${MAX_ATTEMPTS} gelöst.`;
        } else {
            statistics.currentStreak = 0;
            message = `Runde vorbei. Die Lösung war ${state.solution}.`;
        }
    }

    return {
        accepted: true,
        reason: message,
        state: {
            ...state,
            guesses: nextGuesses,
            currentGuess: "",
            status: nextStatus,
            message,
            lastPlayedAt: Date.now(),
            statistics
        }
    };
}

export function applyKeyInput(state, key) {
    if (state.status !== "playing") return state;
    const normalizedKey = sanitizeWord(key);

    if (key === "Backspace") {
        return {
            ...state,
            currentGuess: state.currentGuess.slice(0, -1),
            message: ""
        };
    }

    if (normalizedKey.length !== 1) return state;
    if (state.currentGuess.length >= WORD_LENGTH) return state;

    return {
        ...state,
        currentGuess: `${state.currentGuess}${normalizedKey}`,
        message: ""
    };
}
