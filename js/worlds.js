// =====================================
// WORLDS CONFIG – SNUS CLICKER
// Frei editierbar
// =====================================

export const worlds = [
    {
        id: 1,
        name: "Golden Paradise",
        unlockCost: 0,
        multiplier: 1,
        cookieImage: "assets/cookies/world1.png",
        modifiers: { clickBonus: 0, cpsBonus: 0, buildingDiscount: 0 },
        theme: {
            background: "linear-gradient(135deg, #dff6ff, #fdfbff)",
            glow: "gold",
            button: "linear-gradient(45deg, gold, orange)"
        }
    },
    {
        id: 2,
        name: "Rainbow Heaven",
        unlockCost: 5_000,
        requirements: { lifetimeCookies: 60_000, totalBuildings: 30, prestigeCookies: 1 },
        multiplier: 1.08,
        cookieImage: "assets/cookies/world2.png",
        modifiers: { clickBonus: 0.08, cpsBonus: 0, buildingDiscount: 0.02 },
        theme: {
            background: "linear-gradient(135deg, #ff9a9e, #fad0c4, #fad0c4, #fbc2eb)",
            glow: "#ff00ff",
            button: "linear-gradient(45deg, #ff00cc, #3333ff)"
        }
    },
    {
        id: 3,
        name: "Divine Realm",
        unlockCost: 90_000,
        requirements: { lifetimeCookies: 1_200_000, totalBuildings: 90, prestigeCookies: 4 },
        multiplier: 1.2,
        cookieImage: "assets/cookies/world3.png",
        modifiers: { clickBonus: 0, cpsBonus: 0.08, buildingDiscount: 0 },
        theme: {
            background: "linear-gradient(135deg, #f3e7ff, #ffffff)",
            glow: "#a855f7",
            button: "linear-gradient(45deg, #a855f7, #ffffff)"
        }
    },
    {
        id: 4,
        name: "Cyber Bazaar",
        unlockCost: 1_100_000,
        requirements: { lifetimeCookies: 14_000_000, totalBuildings: 180, prestigeCookies: 10 },
        multiplier: 1.36,
        cookieImage: "assets/cookies/world2.png",
        modifiers: { clickBonus: 0.14, cpsBonus: 0.05, buildingDiscount: 0.04 },
        theme: {
            background: "linear-gradient(135deg, #0f172a, #1d4ed8)",
            glow: "#38bdf8",
            button: "linear-gradient(45deg, #2563eb, #06b6d4)"
        }
    },
    {
        id: 5,
        name: "Astral Forge",
        unlockCost: 12_000_000,
        requirements: { lifetimeCookies: 180_000_000, totalBuildings: 420, prestigeCookies: 20 },
        multiplier: 1.55,
        cookieImage: "assets/cookies/world3.png",
        modifiers: { clickBonus: 0.08, cpsBonus: 0.14, buildingDiscount: 0.05 },
        theme: {
            background: "linear-gradient(135deg, #111827, #581c87)",
            glow: "#f472b6",
            button: "linear-gradient(45deg, #9333ea, #ec4899)"
        }
    }
];

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
