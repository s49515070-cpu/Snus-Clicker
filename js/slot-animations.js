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
    const removingSet = createPositionSet(options.removingPositions);

    boardEl.innerHTML = board.map((row, rowIndex) => row.map((cell, colIndex) => {
        const key = `${rowIndex}:${colIndex}`;
        const classes = ["slot-cell"];
        if (goldenSet.has(key)) classes.push("is-golden");
        if (winningSet.has(key)) classes.push("is-winning");
        if (droppingSet.has(key)) classes.push("is-dropping");
        if (removingSet.has(key)) classes.push("is-removing");
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
    await wait(Math.max(80, Math.floor((options.duration ?? 380) * 0.6)));
    playSlotImpactSound();
    boardEl.classList.add("is-drop-impact");
    await wait(Math.max(120, Math.floor((options.duration ?? 380) * 0.4)));
    boardEl.classList.remove("is-drop-impact");
    boardEl.classList.remove(phaseClass);
}

export async function animateSpinIntro(boardEl, randomBoardFactory) {
    const introBoard = randomBoardFactory();
    const droppingPositions = introBoard.flatMap((row, rowIndex) => row.map((_, colIndex) => ({ row: rowIndex, col: colIndex })));
    boardEl.classList.add("is-pre-drop");
    await animateDrop(boardEl, introBoard, {
        droppingPositions,
        duration: 360,
        phaseClass: "is-spinning"
    });
    boardEl.classList.remove("is-pre-drop");
    boardEl.classList.add("is-stop-flash");
    playSlotStopSound();
    await wait(220);
    boardEl.classList.remove("is-stop-flash");
}

export async function animateWinStep(boardEl, board, entry = {}) {
    renderBoard(boardEl, board, {
        goldenPositions: entry.goldenPositions,
        winningPositions: entry.winningPositions
    });
    boardEl.classList.add("is-evaluating");
    boardEl.classList.add("is-win-impact");
    playSlotWinByTier(entry.stepMultiplier);
    await wait(260);
    boardEl.classList.remove("is-win-impact");
    renderBoard(boardEl, board, {
        goldenPositions: entry.goldenPositions,
        winningPositions: entry.winningPositions,
        removingPositions: entry.winningPositions
    });
    await wait(180);
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
