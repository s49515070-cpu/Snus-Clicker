export const LE_SNUS_COLUMNS = 6;
export const LE_SNUS_ROWS = 5;
const CLUSTER_MIN_SIZE = 5;
const MAX_TOTAL_MULTIPLIER = 10_000;

const SYMBOLS = {
    ten: { id: "ten", icon: "🔟", label: "10", weight: 14, payouts: { 5: 0.10, 6: 0.20, 7: 0.30, 8: 0.50, 9: 1.50, 11: 5.00, 13: 15.00 } },
    jack: { id: "jack", icon: "🃏", label: "J", weight: 14, payouts: { 5: 0.10, 6: 0.20, 7: 0.30, 8: 0.50, 9: 1.50, 11: 5.00, 13: 15.00 } },
    queen: { id: "queen", icon: "👑", label: "Q", weight: 14, payouts: { 5: 0.10, 6: 0.20, 7: 0.30, 8: 0.50, 9: 1.50, 11: 5.00, 13: 15.00 } },
    king: { id: "king", icon: "🤴", label: "K", weight: 14, payouts: { 5: 0.10, 6: 0.20, 7: 0.30, 8: 0.50, 9: 1.50, 11: 5.00, 13: 15.00 } },
    ace: { id: "ace", icon: "🅰️", label: "A", weight: 14, payouts: { 5: 0.10, 6: 0.20, 7: 0.30, 8: 0.50, 9: 1.50, 11: 5.00, 13: 15.00 } },
    clamp: { id: "clamp", icon: "⛓️", label: "Ankle Clamp", weight: 10, payouts: { 5: 0.30, 6: 0.40, 7: 0.50, 8: 0.70, 9: 2.50, 11: 7.50, 13: 25.00 } },
    cheese: { id: "cheese", icon: "🧀", label: "Cheese", weight: 10, payouts: { 5: 0.30, 6: 0.40, 7: 0.50, 8: 0.70, 9: 2.50, 11: 7.50, 13: 25.00 } },
    beer: { id: "beer", icon: "🍺", label: "Beer", weight: 8, payouts: { 5: 0.50, 6: 0.70, 7: 1.00, 8: 1.50, 9: 5.00, 11: 15.00, 13: 50.00 } },
    baguette: { id: "baguette", icon: "🥖", label: "Baguette", weight: 8, payouts: { 5: 0.50, 6: 0.70, 7: 1.00, 8: 1.50, 9: 5.00, 11: 15.00, 13: 50.00 } },
    hat: { id: "hat", icon: "🎩", label: "Top Hat", weight: 6, payouts: { 5: 1.00, 6: 1.50, 7: 2.00, 8: 3.00, 9: 10.00, 11: 30.00, 13: 100.00 } },
    fs: { id: "fs", icon: "📷", label: "Free Spins", weight: 3, special: true },
    rainbow: { id: "rainbow", icon: "🌈", label: "Rainbow", weight: 3, special: true }
};

const PAY_SYMBOL_IDS = ["ten", "jack", "queen", "king", "ace", "clamp", "cheese", "beer", "baguette", "hat"];
const BOARD_SYMBOL_IDS = [...PAY_SYMBOL_IDS, "fs", "rainbow"];

const BONUS_CONFIG = {
    base: { id: "base", label: "Base Game", freeSpins: 0, preserveGoldenBetweenSpins: false, keepGoldenAfterActivation: false, guaranteedRainbow: false, allowBronze: true },
    luck: { id: "luck", label: "Luck of the Bandit", freeSpins: 8, preserveGoldenBetweenSpins: true, keepGoldenAfterActivation: false, guaranteedRainbow: false, allowBronze: true },
    glitter: { id: "glitter", label: "All That Glitters is Gold", freeSpins: 12, preserveGoldenBetweenSpins: true, keepGoldenAfterActivation: true, guaranteedRainbow: false, allowBronze: true },
    treasure: { id: "treasure", label: "Treasure at the End of the Rainbow", freeSpins: 12, preserveGoldenBetweenSpins: true, keepGoldenAfterActivation: true, guaranteedRainbow: true, allowBronze: false }
};

const RTP_PROFILE = Object.freeze({
    houseEdgeFactor: 0.57,
    lossChance: 0.64,
    nearMissChance: 0.14,
    smallWinChance: 0.16,
    mediumWinChance: 0.045,
    bigWinChance: 0.013,
    topWinChance: 0.002
});

function cloneCell(cell) {
    return { ...cell };
}

function cloneBoard(board) {
    return board.map((row) => row.map(cloneCell));
}

function posKey(row, col) {
    return `${row}:${col}`;
}

function parsePosKey(key) {
    const [row, col] = key.split(":").map(Number);
    return { row, col };
}

function getSymbol(symbolId) {
    return SYMBOLS[symbolId] || SYMBOLS.ten;
}

function randomInt(min, max, rng = Math.random) {
    return Math.floor(rng() * ((max - min) + 1)) + min;
}

function weightedPick(symbolIds, rng = Math.random, options = {}) {
    const entries = symbolIds.map((symbolId) => {
        const symbol = getSymbol(symbolId);
        const weightMultiplier = symbolId === "fs"
            ? Number(options.fsWeightMultiplier || 1)
            : symbolId === "rainbow"
                ? Number(options.rainbowWeightMultiplier || 1)
                : 1;
        return {
            ...symbol,
            weight: Number(symbol.weight || 0) * weightMultiplier
        };
    });
    const totalWeight = entries.reduce((sum, symbol) => sum + Number(symbol.weight || 0), 0);
    let roll = rng() * totalWeight;
    for (const symbol of entries) {
        roll -= Number(symbol.weight || 0);
        if (roll <= 0) return symbol.id;
    }
    return entries[entries.length - 1]?.id || "snus";
}

function createCell(symbolId) {
    const symbol = getSymbol(symbolId);
    return {
        id: symbol.id,
        icon: symbol.icon,
        label: symbol.label,
        special: Boolean(symbol.special)
    };
}

export function createSeededRng(seed = Date.now()) {
    let state = Number(seed) >>> 0;
    return () => {
        state += 0x6D2B79F5;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function createBoardFromIds(rows) {
    return rows.map((row) => row.map((symbolId) => createCell(symbolId)));
}

export function createBoard(rng = Math.random, options = {}) {
    const board = Array.from({ length: LE_SNUS_ROWS }, () => Array.from({ length: LE_SNUS_COLUMNS }, () => createCell(weightedPick(BOARD_SYMBOL_IDS, rng, options))));

    if (options.guaranteedRainbow) {
        const row = randomInt(0, LE_SNUS_ROWS - 1, rng);
        const col = randomInt(0, LE_SNUS_COLUMNS - 1, rng);
        board[row][col] = createCell("rainbow");
    }

    return board;
}

function getClusterMultiplier(symbolId, count) {
    const payouts = getSymbol(symbolId).payouts || {};
    const thresholds = Object.keys(payouts).map(Number).sort((a, b) => a - b);
    let best = 0;
    thresholds.forEach((threshold) => {
        if (count >= threshold) best = payouts[threshold];
    });
    return best;
}

export function findWinningClusters(board) {
    const visited = new Set();
    const wins = [];

    for (let row = 0; row < LE_SNUS_ROWS; row += 1) {
        for (let col = 0; col < LE_SNUS_COLUMNS; col += 1) {
            const key = posKey(row, col);
            if (visited.has(key)) continue;
            const cell = board[row]?.[col];
            if (!cell || cell.special || !PAY_SYMBOL_IDS.includes(cell.id)) {
                visited.add(key);
                continue;
            }

            const queue = [{ row, col }];
            const positions = [];
            visited.add(key);

            while (queue.length > 0) {
                const current = queue.shift();
                positions.push(current);

                const neighbors = [
                    { row: current.row - 1, col: current.col },
                    { row: current.row + 1, col: current.col },
                    { row: current.row, col: current.col - 1 },
                    { row: current.row, col: current.col + 1 }
                ];

                neighbors.forEach((neighbor) => {
                    if (neighbor.row < 0 || neighbor.row >= LE_SNUS_ROWS || neighbor.col < 0 || neighbor.col >= LE_SNUS_COLUMNS) return;
                    const neighborKey = posKey(neighbor.row, neighbor.col);
                    if (visited.has(neighborKey)) return;
                    const neighborCell = board[neighbor.row][neighbor.col];
                    if (!neighborCell || neighborCell.id !== cell.id || neighborCell.special) return;
                    visited.add(neighborKey);
                    queue.push(neighbor);
                });
            }

            if (positions.length >= CLUSTER_MIN_SIZE) {
                wins.push({
                    symbolId: cell.id,
                    symbolIcon: cell.icon,
                    count: positions.length,
                    multiplier: getClusterMultiplier(cell.id, positions.length),
                    positions
                });
            }
        }
    }

    return wins;
}

export function cascadeBoard(board, winningPositions, rng = Math.random, options = {}) {
    const winningPositionKeys = new Set(winningPositions.map((position) => posKey(position.row, position.col)));
    const nextBoard = Array.from({ length: LE_SNUS_ROWS }, () => Array.from({ length: LE_SNUS_COLUMNS }, () => null));

    for (let col = 0; col < LE_SNUS_COLUMNS; col += 1) {
        const survivors = [];
        for (let row = LE_SNUS_ROWS - 1; row >= 0; row -= 1) {
            const cell = board[row][col];
            const shouldRemove = !cell.special && winningPositionKeys.has(posKey(row, col));
            if (!shouldRemove) {
                survivors.push(cloneCell(cell));
            }
        }

        while (survivors.length < LE_SNUS_ROWS) {
            survivors.push(createCell(weightedPick(BOARD_SYMBOL_IDS, rng, options)));
        }

        for (let row = LE_SNUS_ROWS - 1; row >= 0; row -= 1) {
            nextBoard[row][col] = survivors[LE_SNUS_ROWS - 1 - row];
        }
    }

    if (options.guaranteedRainbow) {
        const hasRainbow = nextBoard.some((row) => row.some((cell) => cell.id === "rainbow"));
        if (!hasRainbow) {
            const row = randomInt(0, LE_SNUS_ROWS - 1, rng);
            const col = randomInt(0, LE_SNUS_COLUMNS - 1, rng);
            nextBoard[row][col] = createCell("rainbow");
        }
    }

    return nextBoard;
}

function countSymbol(board, symbolId) {
    return board.reduce((sum, row) => sum + row.filter((cell) => cell.id === symbolId).length, 0);
}

function hasRainbow(board) {
    return countSymbol(board, "rainbow") > 0;
}

function getTriggeredBonus(fsCount) {
    if (fsCount >= 5) return BONUS_CONFIG.treasure;
    if (fsCount >= 4) return BONUS_CONFIG.glitter;
    if (fsCount >= 3) return BONUS_CONFIG.luck;
    return null;
}

function summarizeWins(wins) {
    return wins.map((win) => `${win.symbolIcon} ${win.count}x (${win.multiplier.toFixed(2)}x)`).join(" · ");
}

const BRONZE_COIN_VALUES = [0.2, 0.5, 1, 2, 3, 4];
const SILVER_COIN_VALUES = [5, 10, 15, 20];
const GOLD_COIN_VALUES = [25, 50, 100, 250, 500];
const CLOVER_VALUES = [2, 3, 4, 5, 10];

function pickFrom(values, rng = Math.random) {
    return values[Math.floor(rng() * values.length)] ?? values[0];
}

function sortTopLeft(positions = []) {
    return [...positions].sort((a, b) => (a.row - b.row) || (a.col - b.col));
}

function revealGoldenToken(rng = Math.random, options = {}) {
    const tokenPool = options.allowBronze === false
        ? [
            { kind: "silver", weight: 48 },
            { kind: "gold", weight: 18 },
            { kind: "clover", weight: 22 },
            { kind: "pot", weight: 12 }
        ]
        : [
            { kind: "bronze", weight: 50 },
            { kind: "silver", weight: 22 },
            { kind: "gold", weight: 10 },
            { kind: "clover", weight: 10 },
            { kind: "pot", weight: 8 }
        ];

    const totalWeight = tokenPool.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = rng() * totalWeight;
    let kind = tokenPool[0].kind;
    for (const entry of tokenPool) {
        roll -= entry.weight;
        if (roll <= 0) {
            kind = entry.kind;
            break;
        }
    }

    if (kind === "bronze") return { kind, icon: "🪙", multiplier: pickFrom(BRONZE_COIN_VALUES, rng) };
    if (kind === "silver") return { kind, icon: "🥈", multiplier: pickFrom(SILVER_COIN_VALUES, rng) };
    if (kind === "gold") return { kind, icon: "🥇", multiplier: pickFrom(GOLD_COIN_VALUES, rng) };
    if (kind === "clover") return { kind, icon: "🍀", multiplier: pickFrom(CLOVER_VALUES, rng) };
    return { kind: "pot", icon: "🏺", multiplier: 1 };
}

function getAdjacentPositions(position) {
    return [
        { row: position.row - 1, col: position.col },
        { row: position.row + 1, col: position.col },
        { row: position.row, col: position.col - 1 },
        { row: position.row, col: position.col + 1 }
    ].filter((neighbor) => neighbor.row >= 0 && neighbor.row < LE_SNUS_ROWS && neighbor.col >= 0 && neighbor.col < LE_SNUS_COLUMNS);
}

function activateGoldenSquares(goldenPositions, rng = Math.random, options = {}) {
    if (!Array.isArray(goldenPositions) || goldenPositions.length === 0) {
        return { totalMultiplier: 0, notes: [], reveals: [], rounds: [] };
    }

    const rounds = [];
    const notes = [];
    let totalMultiplier = 0;
    let repeatActivation = true;
    let activationRound = 0;

    while (repeatActivation && activationRound < 5) {
        const reveals = sortTopLeft(goldenPositions).map((position) => ({
            position,
            ...revealGoldenToken(rng, options),
            boostFactor: 1,
            totalMultiplier: 0
        }));

        reveals.filter((reveal) => reveal.kind === "clover").forEach((clover) => {
            const adjacentKeys = new Set(getAdjacentPositions(clover.position).map((position) => posKey(position.row, position.col)));
            let boosted = 0;
            reveals.forEach((target) => {
                if (target.kind === "clover") return;
                if (!adjacentKeys.has(posKey(target.position.row, target.position.col))) return;
                target.boostFactor *= clover.multiplier;
                boosted += 1;
            });
            if (boosted > 0) {
                notes.push(`🍀 Clover x${clover.multiplier} boosted ${boosted} symbol${boosted === 1 ? "" : "s"}`);
            }
        });

        reveals.forEach((reveal) => {
            if (["bronze", "silver", "gold"].includes(reveal.kind)) {
                reveal.totalMultiplier = Number((reveal.multiplier * reveal.boostFactor).toFixed(2));
            }
        });

        const coinTotal = reveals
            .filter((reveal) => ["bronze", "silver", "gold"].includes(reveal.kind))
            .reduce((sum, reveal) => sum + reveal.totalMultiplier, 0);

        let potCarry = 0;
        const pots = reveals.filter((reveal) => reveal.kind === "pot");
        pots.forEach((pot) => {
            const collected = (coinTotal + potCarry) * pot.boostFactor;
            pot.totalMultiplier = Number(collected.toFixed(2));
            potCarry += pot.totalMultiplier;
            notes.push(`🏺 Pot collected ${pot.totalMultiplier.toFixed(2)}x`);
        });

        const roundTotal = reveals.reduce((sum, reveal) => sum + Number(reveal.totalMultiplier || 0), 0);
        totalMultiplier += roundTotal;
        rounds.push({
            index: activationRound + 1,
            totalMultiplier: Number(roundTotal.toFixed(2)),
            reveals
        });

        repeatActivation = pots.length > 0;
        activationRound += 1;
    }

    return {
        totalMultiplier: Number(totalMultiplier.toFixed(2)),
        notes,
        reveals: rounds.at(-1)?.reveals || [],
        rounds
    };
}

function resolveBoardSequence(board, rng = Math.random, options = {}) {
    let currentBoard = cloneBoard(board);
    const timeline = [];
    let totalMultiplier = 0;
    const goldenSet = new Set((options.initialGoldenPositions || []).map((position) => posKey(position.row, position.col)));
    let cascadeCount = 0;

    while (cascadeCount < 8) {
        const wins = findWinningClusters(currentBoard);
        if (wins.length === 0) break;

        const winningPositions = wins.flatMap((win) => win.positions);
        winningPositions.forEach((position) => goldenSet.add(posKey(position.row, position.col)));

        const stepMultiplier = wins.reduce((sum, win) => sum + Number(win.multiplier || 0), 0);
        totalMultiplier += stepMultiplier;
        timeline.push({
            type: "cascade",
            label: `Cascade ${cascadeCount + 1}`,
            board: cloneBoard(currentBoard),
            winningPositions,
            goldenPositions: Array.from(goldenSet).map(parsePosKey),
            notes: summarizeWins(wins),
            stepMultiplier: Number(stepMultiplier.toFixed(2))
        });

        currentBoard = cascadeBoard(currentBoard, winningPositions, rng, options);
        cascadeCount += 1;
    }

    return {
        board: currentBoard,
        totalMultiplier: Number(totalMultiplier.toFixed(2)),
        goldenPositions: Array.from(goldenSet).map(parsePosKey),
        timeline,
        fsCount: countSymbol(currentBoard, "fs")
    };
}

function simulateFeature(board, rng = Math.random, bonusConfig = BONUS_CONFIG.base, persistedGoldenPositions = []) {
    const sequence = resolveBoardSequence(board, rng, {
        guaranteedRainbow: bonusConfig.guaranteedRainbow,
        initialGoldenPositions: bonusConfig.preserveGoldenBetweenSpins ? persistedGoldenPositions : []
    });

    const stickySource = bonusConfig.preserveGoldenBetweenSpins
        ? [...persistedGoldenPositions, ...sequence.goldenPositions]
        : sequence.goldenPositions;
    const stickyGoldenPositions = Array.from(new Set(stickySource.map((position) => posKey(position.row, position.col)))).map(parsePosKey);
    const rainbowActive = bonusConfig.guaranteedRainbow || hasRainbow(sequence.board);
    let activation = { totalMultiplier: 0, notes: [], reveals: [], rounds: [] };
    let nextPersistentGoldenPositions = bonusConfig.preserveGoldenBetweenSpins ? stickyGoldenPositions : [];

    if (rainbowActive && stickyGoldenPositions.length > 0) {
        activation = activateGoldenSquares(stickyGoldenPositions, rng, { allowBronze: bonusConfig.allowBronze });
        sequence.timeline.push({
            type: "activation",
            label: "Rainbow Activation",
            board: cloneBoard(sequence.board),
            winningPositions: [],
            goldenPositions: stickyGoldenPositions,
            notes: activation.notes.length > 0 ? activation.notes.join(" · ") : "Golden Squares activated.",
            stepMultiplier: activation.totalMultiplier,
            reveals: activation.reveals
        });
        if (!bonusConfig.keepGoldenAfterActivation) {
            nextPersistentGoldenPositions = [];
        }
    }

    const totalMultiplier = Number((sequence.totalMultiplier + activation.totalMultiplier).toFixed(2));
    return {
        board: sequence.board,
        totalMultiplier,
        goldenPositions: nextPersistentGoldenPositions,
        activatedGoldenPositions: stickyGoldenPositions,
        persistentGoldenPositions: nextPersistentGoldenPositions,
        timeline: sequence.timeline,
        activation,
        fsCount: sequence.fsCount
    };
}

function runBonusGame(stake, rng = Math.random, startingConfig = BONUS_CONFIG.luck) {
    const spins = [];
    let totalMultiplier = 0;
    let persistentGolden = [];
    let spinsRemaining = startingConfig.freeSpins;
    let currentConfig = startingConfig;

    while (spinsRemaining > 0 && spins.length < 60) {
        const spinConfig = currentConfig;
        const board = createBoard(rng, { guaranteedRainbow: spinConfig.guaranteedRainbow });
        const result = simulateFeature(board, rng, spinConfig, persistentGolden);
        persistentGolden = result.persistentGoldenPositions;
        totalMultiplier += result.totalMultiplier;

        let retriggerText = "";
        if (spinConfig.id === "luck" && result.fsCount >= 4) {
            currentConfig = BONUS_CONFIG.glitter;
            spinsRemaining += 4;
            retriggerText = " · Upgrade to All That Glitters is Gold (+4 spins)";
        } else if (result.fsCount >= 3) {
            spinsRemaining += 4;
            retriggerText = " · Retrigger +4 spins";
        } else if (result.fsCount >= 2) {
            spinsRemaining += 2;
            retriggerText = " · Retrigger +2 spins";
        }

        spins.push({
            index: spins.length + 1,
            label: `${spinConfig.label} · Spin ${spins.length + 1}`,
            totalMultiplier: result.totalMultiplier,
            goldenPositions: result.goldenPositions,
            board: result.board,
            timeline: result.timeline,
            fsCount: result.fsCount,
            retriggerText
        });

        spinsRemaining -= 1;
    }

    return {
        config: currentConfig,
        spins,
        totalMultiplier: Number(totalMultiplier.toFixed(2))
    };
}

function randomBetween(min, max, rng = Math.random) {
    return min + ((max - min) * rng());
}

function applyHouseEdge(rawMultiplier, rng = Math.random) {
    const normalizedRaw = Math.max(0, Number(rawMultiplier) || 0);
    const dampenedRaw = normalizedRaw * RTP_PROFILE.houseEdgeFactor;
    const roll = rng();
    const nearMiss = roll >= RTP_PROFILE.lossChance && roll < RTP_PROFILE.lossChance + RTP_PROFILE.nearMissChance;

    if (roll < RTP_PROFILE.lossChance || nearMiss) {
        return {
            finalMultiplier: 0,
            nearMiss,
            economyTier: nearMiss ? "near-miss" : "loss"
        };
    }

    const thresholds = [
        RTP_PROFILE.lossChance + RTP_PROFILE.nearMissChance + RTP_PROFILE.smallWinChance,
        RTP_PROFILE.lossChance + RTP_PROFILE.nearMissChance + RTP_PROFILE.smallWinChance + RTP_PROFILE.mediumWinChance,
        RTP_PROFILE.lossChance + RTP_PROFILE.nearMissChance + RTP_PROFILE.smallWinChance + RTP_PROFILE.mediumWinChance + RTP_PROFILE.bigWinChance,
        RTP_PROFILE.lossChance + RTP_PROFILE.nearMissChance + RTP_PROFILE.smallWinChance + RTP_PROFILE.mediumWinChance + RTP_PROFILE.bigWinChance + RTP_PROFILE.topWinChance
    ];

    let targetMultiplier = 0;
    let economyTier = "small";
    if (roll < thresholds[0]) {
        targetMultiplier = randomBetween(0.2, 1.1, rng);
        economyTier = "small";
    } else if (roll < thresholds[1]) {
        targetMultiplier = randomBetween(1.2, 4.8, rng);
        economyTier = "medium";
    } else if (roll < thresholds[2]) {
        targetMultiplier = randomBetween(5, 15, rng);
        economyTier = "big";
    } else {
        targetMultiplier = randomBetween(15, 42, rng);
        economyTier = "top";
    }

    const blended = (dampenedRaw * 0.55) + (targetMultiplier * 0.45);
    return {
        finalMultiplier: Number(Math.max(0, blended).toFixed(2)),
        nearMiss: false,
        economyTier
    };
}

export function runLeSnusRound(stakeInput, rng = Math.random, options = {}) {
    const stake = Math.max(0, Math.floor(Number(stakeInput) || 0));
    if (stake <= 0) {
        return {
            stake: 0,
            totalPayout: 0,
            totalMultiplier: 0,
            feature: BONUS_CONFIG.base,
            board: createBoard(rng, options),
            goldenPositions: [],
            timeline: [],
            triggeredBonus: null,
            summaryLines: ["Keine Diamanten für Le-Snus vorhanden."],
            fsCount: 0
        };
    }

    const board = createBoard(rng, {
        fsWeightMultiplier: options.bonusHunt ? 5 : 1,
        guaranteedRainbow: Boolean(options.rainbowFeatureSpins)
    });
    if (options.forcedFeature && BONUS_CONFIG[options.forcedFeature]) {
        const forcedConfig = BONUS_CONFIG[options.forcedFeature];
        const bonusResult = runBonusGame(stake, rng, forcedConfig);
        const finalSpin = bonusResult.spins[bonusResult.spins.length - 1];
        const economy = applyHouseEdge(Math.min(MAX_TOTAL_MULTIPLIER, Number(bonusResult.totalMultiplier.toFixed(2))), rng);
        const totalMultiplier = economy.finalMultiplier;
        const totalPayout = Math.floor(stake * totalMultiplier);
        return {
            stake,
            totalPayout,
            totalMultiplier,
            feature: forcedConfig,
            board: finalSpin?.board || createBoard(rng),
            goldenPositions: finalSpin?.goldenPositions || [],
            timeline: bonusResult.spins.flatMap((spin) => spin.timeline),
            triggeredBonus: forcedConfig,
            bonusResult,
            summaryLines: [
                `Bought Feature: ${forcedConfig.label}`,
                economy.nearMiss ? "Beinahe-Gewinn: Walzen stoppten knapp ohne Auszahlung." : `RTP-Profil: ${economy.economyTier}`,
                `Total: ${totalMultiplier.toFixed(2)}x = ${totalPayout.toLocaleString("de-DE")} Diamanten`
            ],
            economy,
            fsCount: 0
        };
    }

    const baseResult = simulateFeature(board, rng, BONUS_CONFIG.base);
    const fsCount = countSymbol(board, "fs");
    const triggeredBonus = getTriggeredBonus(fsCount);
    const summaryLines = [
        `Base Game: ${baseResult.totalMultiplier.toFixed(2)}x`,
        `Golden Squares: ${baseResult.activatedGoldenPositions.length}`,
        triggeredBonus ? `Feature Trigger: ${triggeredBonus.label}` : "Feature Trigger: none"
    ];

    let bonusResult = null;
    let totalMultiplier = baseResult.totalMultiplier;
    let finalBoard = baseResult.board;
    let finalGoldenPositions = baseResult.goldenPositions;
    const timeline = [...baseResult.timeline];

    if (triggeredBonus) {
        bonusResult = runBonusGame(stake, rng, triggeredBonus);
        totalMultiplier += bonusResult.totalMultiplier;
        summaryLines.push(`${triggeredBonus.label}: ${bonusResult.totalMultiplier.toFixed(2)}x`);
        const finalSpin = bonusResult.spins[bonusResult.spins.length - 1];
        if (finalSpin) {
            finalBoard = finalSpin.board;
            finalGoldenPositions = finalSpin.goldenPositions;
        }
        bonusResult.spins.forEach((spin) => {
            timeline.push({
                type: "feature-summary",
                label: spin.label,
                board: cloneBoard(spin.board),
                winningPositions: [],
                goldenPositions: spin.goldenPositions,
                notes: `${spin.totalMultiplier.toFixed(2)}x in this feature spin${spin.retriggerText}`,
                stepMultiplier: spin.totalMultiplier
            });
        });
    }

    const economy = applyHouseEdge(Math.min(MAX_TOTAL_MULTIPLIER, Number(totalMultiplier.toFixed(2))), rng);
    totalMultiplier = economy.finalMultiplier;
    const totalPayout = Math.floor(stake * totalMultiplier);
    if (economy.nearMiss) {
        summaryLines.push("Beinahe-Gewinn: gute Symbole knapp verpasst.");
    } else {
        summaryLines.push(`RTP-Profil: ${economy.economyTier}`);
    }
    summaryLines.push(`Total: ${totalMultiplier.toFixed(2)}x = ${totalPayout.toLocaleString("de-DE")} Diamanten`);

    return {
        stake,
        totalPayout,
        totalMultiplier,
        feature: triggeredBonus || BONUS_CONFIG.base,
        board: finalBoard,
        goldenPositions: finalGoldenPositions,
        timeline,
        triggeredBonus,
        bonusResult,
        summaryLines,
        economy,
        fsCount
    };
}

export function getLeSnusFeatureRules() {
    return [
        "6x5 grid with cluster pays from 5 matching symbols.",
        "Wins create Golden Squares; a Rainbow activates every highlighted square.",
        "Bronze coins pay 0.2x-4x, Silver 5x-20x, Gold 25x-500x and Clovers multiply adjacent values x2-x10.",
        "Pots collect values top-to-bottom, left-to-right and can re-activate Golden Squares for another round.",
        "3/4/5 Free Spins trigger Luck of the Bandit / All That Glitters is Gold / Treasure at the End of the Rainbow."
    ];
}

export function getLeSnusSymbolGuide() {
    return {
        normal: PAY_SYMBOL_IDS.map((symbolId) => {
            const symbol = getSymbol(symbolId);
            const firstThreshold = Object.keys(symbol.payouts || {}).map(Number).sort((a, b) => a - b)[0] || CLUSTER_MIN_SIZE;
            const maxThreshold = Math.max(...Object.keys(symbol.payouts || {}).map(Number));
            return {
                id: symbol.id,
                icon: symbol.icon,
                label: symbol.label,
                description: `Cluster-Pay Symbol. Auszahlung ab ${firstThreshold} Treffern.`,
                minCluster: firstThreshold,
                maxCluster: Number.isFinite(maxThreshold) ? maxThreshold : firstThreshold,
                payouts: symbol.payouts || {}
            };
        }),
        special: [
            {
                id: "fs",
                icon: SYMBOLS.fs.icon,
                label: SYMBOLS.fs.label,
                description: "3/4/5 Symbole starten Luck, Glitter oder Treasure Freispiele.",
                effect: "Feature Trigger"
            },
            {
                id: "rainbow",
                icon: SYMBOLS.rainbow.icon,
                label: SYMBOLS.rainbow.label,
                description: "Aktiviert alle Golden Squares auf dem Feld.",
                effect: "Golden-Square Aktivierung"
            },
            {
                id: "golden-square",
                icon: "🟨",
                label: "Golden Square",
                description: "Entsteht aus Wins und bleibt je nach Feature erhalten.",
                effect: "Token-Reveal beim 🌈"
            },
            {
                id: "gold-token",
                icon: "🥇",
                label: "Gold/Silver/Bronze",
                description: "Token-Reveals zahlen Multiplikatoren aus; Clover boostet Nachbarn, Pot sammelt Werte.",
                effect: "0.2x bis 500x + Combos"
            }
        ]
    };
}
