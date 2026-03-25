import { playSlotCascadeSound, playSlotFallSound, playSlotImpactSound, playSlotStopSound, playSlotWinByTier } from "./audio.js";

function wait(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function getDropCells(previousBoard = [], nextBoard = []) {
    if (!Array.isArray(nextBoard)) return [];
    const changed = [];
    nextBoard.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
            const previous = previousBoard?.[rowIndex]?.[colIndex];
            if (!previous || previous.id !== cell.id || previous.icon !== cell.icon) {
                changed.push({ row: rowIndex, col: colIndex });
            }
        });
    });
    return changed;
}

function createPositionSet(positions = []) {
    return new Set(positions.map((position) => `${position.row}:${position.col}`));
}

export function renderBoard(boardEl, board, options = {}) {
    if (!boardEl || !Array.isArray(board)) return;
    const goldenSet = createPositionSet(options.goldenPositions);
    const winningSet = createPositionSet(options.winningPositions);
    const droppingSet = createPositionSet(options.droppingPositions);

    boardEl.innerHTML = board.map((row, rowIndex) => row.map((cell, colIndex) => {
        const key = `${rowIndex}:${colIndex}`;
        const classes = ["slot-cell"];
        if (goldenSet.has(key)) classes.push("is-golden");
        if (winningSet.has(key)) classes.push("is-winning");
        if (droppingSet.has(key)) classes.push("is-dropping");
        if (cell.special) classes.push("is-special");
        const dropDelay = (rowIndex * 18) + (colIndex * 10);

        return `
            <div class="${classes.join(" ")}" data-row="${rowIndex}" data-col="${colIndex}" style="--drop-delay:${dropDelay}ms;">
                <span class="slot-cell-icon">${cell.icon}</span>
                <small>${cell.label}</small>
            </div>
        `;
    }).join("")).join("");
}

export async function animateDrop(boardEl, board, options = {}) {
    const phaseClass = options.phaseClass || "is-cascading";
    boardEl.classList.add(phaseClass);
    renderBoard(boardEl, board, options);
    playSlotFallSound((options.droppingPositions?.length || 0) / 4);
    playSlotImpactSound();
    await wait(options.duration ?? 290);
    boardEl.classList.remove(phaseClass);
}

export async function animateSpinIntro(boardEl, randomBoardFactory) {
    boardEl.classList.add("is-spinning");
    await wait(240);
    const frames = 7;
    for (let i = 0; i < frames; i += 1) {
        renderBoard(boardEl, randomBoardFactory(), { droppingPositions: [] });
        await wait(80);
    }
    boardEl.classList.remove("is-spinning");
    boardEl.classList.add("is-stop-flash");
    playSlotStopSound();
    await wait(270);
    boardEl.classList.remove("is-stop-flash");
}

export async function animateWinStep(boardEl, board, entry = {}) {
    renderBoard(boardEl, board, {
        goldenPositions: entry.goldenPositions,
        winningPositions: entry.winningPositions
    });
    boardEl.classList.add("is-evaluating");
    playSlotWinByTier(entry.stepMultiplier);
    await wait(280);
    boardEl.classList.remove("is-evaluating");
}

export async function animateCascadeStep(boardEl, fromBoard, toEntry, intensity = 0) {
    playSlotCascadeSound(intensity);
    boardEl.classList.toggle("is-cascade-intense", intensity > 1);
    const droppingPositions = getDropCells(fromBoard, toEntry.board);
    await animateDrop(boardEl, toEntry.board, {
        goldenPositions: toEntry.goldenPositions,
        winningPositions: [],
        droppingPositions,
        duration: Math.max(150, 280 - (intensity * 30))
    });
    boardEl.classList.remove("is-cascade-intense");
}
