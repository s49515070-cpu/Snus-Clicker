// =====================================
// WORLDS CONFIG – SNUS CLICKER
// Frei editierbar
// =====================================

import { WORLD_BALANCE } from "../data/balance.js";

const WORLD_THEMES = {
    1: {
        background: "linear-gradient(135deg, #dff6ff, #fdfbff)",
        glow: "gold",
        button: "linear-gradient(45deg, gold, orange)"
    },
    2: {
        background: "linear-gradient(135deg, #ff9a9e, #fad0c4, #fad0c4, #fbc2eb)",
        glow: "#ff00ff",
        button: "linear-gradient(45deg, #ff00cc, #3333ff)"
    },
    3: {
        background: "linear-gradient(135deg, #f3e7ff, #ffffff)",
        glow: "#a855f7",
        button: "linear-gradient(45deg, #a855f7, #ffffff)"
    },
    4: {
        background: "linear-gradient(135deg, #0f172a, #1d4ed8)",
        glow: "#38bdf8",
        button: "linear-gradient(45deg, #2563eb, #06b6d4)"
    },
    5: {
        background: "linear-gradient(135deg, #111827, #581c87)",
        glow: "#f472b6",
        button: "linear-gradient(45deg, #9333ea, #ec4899)"
    }
};

export const worlds = WORLD_BALANCE.map((world) => ({
    ...world,
    theme: WORLD_THEMES[world.id]
}));

export function getWorldById(id) {
    return worlds.find((w) => w.id === id);
}

export function getWorldUnlockDetails(world, snusAmount, progress = {}) {
    const requirements = world?.requirements || {};
    const lifetimeTarget = Number(requirements.lifetimeCookies || 0);
    const buildingsTarget = Number(requirements.totalBuildings || 0);
    const prestigeTarget = Number(requirements.prestigeCookies || 0);

    const lifetimeCurrent = Number(progress.lifetimeCookies || 0);
    const buildingsCurrent = Number(progress.totalBuildings || 0);
    const prestigeCurrent = Number(progress.prestigeCookies || 0);

    const hasCost = Number(snusAmount) >= Number(world?.unlockCost || 0);
    const hasLifetime = lifetimeCurrent >= lifetimeTarget;
    const hasBuildings = buildingsCurrent >= buildingsTarget;
    const hasPrestige = prestigeCurrent >= prestigeTarget;

    return {
        unlocked: hasCost && hasLifetime && hasBuildings && hasPrestige,
        hasCost,
        hasLifetime,
        hasBuildings,
        hasPrestige,
        missingCost: Math.max(0, Number(world?.unlockCost || 0) - Number(snusAmount || 0)),
        missingLifetime: Math.max(0, lifetimeTarget - lifetimeCurrent),
        missingBuildings: Math.max(0, buildingsTarget - buildingsCurrent),
        missingPrestige: Math.max(0, prestigeTarget - prestigeCurrent),
        lifetimeTarget,
        buildingsTarget,
        prestigeTarget
    };
}

export function isWorldUnlocked(world, snusAmount, progress = {}) {
    return getWorldUnlockDetails(world, snusAmount, progress).unlocked;
}
