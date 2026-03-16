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
        unlockCost: 250,
        requirements: { lifetimeCookies: 2_000, totalBuildings: 15 },
        multiplier: 1.25,
        cookieImage: "assets/cookies/world2.png",
        modifiers: { clickBonus: 0.2, cpsBonus: 0, buildingDiscount: 0.05 },
        theme: {
            background: "linear-gradient(135deg, #ff9a9e, #fad0c4, #fad0c4, #fbc2eb)",
            glow: "#ff00ff",
            button: "linear-gradient(45deg, #ff00cc, #3333ff)"
        }
    },
    {
        id: 3,
        name: "Divine Realm",
        unlockCost: 5000,
        requirements: { lifetimeCookies: 100_000, totalBuildings: 60 },
        multiplier: 1.75,
        cookieImage: "assets/cookies/world3.png",
        modifiers: { clickBonus: 0, cpsBonus: 0.15, buildingDiscount: 0 },
        theme: {
            background: "linear-gradient(135deg, #f3e7ff, #ffffff)",
            glow: "#a855f7",
            button: "linear-gradient(45deg, #a855f7, #ffffff)"
        }
    },
    {
        id: 4,
        name: "Cyber Bazaar",
        unlockCost: 120_000,
        requirements: { lifetimeCookies: 2_500_000, totalBuildings: 160 },
        multiplier: 2.2,
        cookieImage: "assets/cookies/world2.png",
        modifiers: { clickBonus: 0.35, cpsBonus: 0.1, buildingDiscount: 0.1 },
        theme: {
            background: "linear-gradient(135deg, #0f172a, #1d4ed8)",
            glow: "#38bdf8",
            button: "linear-gradient(45deg, #2563eb, #06b6d4)"
        }
    },
    {
        id: 5,
        name: "Astral Forge",
        unlockCost: 2_500_000,
        requirements: { lifetimeCookies: 90_000_000, totalBuildings: 340 },
        multiplier: 3.25,
        cookieImage: "assets/cookies/world3.png",
        modifiers: { clickBonus: 0.15, cpsBonus: 0.3, buildingDiscount: 0.12 },
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

    const lifetimeCurrent = Number(progress.lifetimeCookies || 0);
    const buildingsCurrent = Number(progress.totalBuildings || 0);

    const hasCost = Number(snusAmount) >= Number(world?.unlockCost || 0);
    const hasLifetime = lifetimeCurrent >= lifetimeTarget;
    const hasBuildings = buildingsCurrent >= buildingsTarget;

    return {
        unlocked: hasCost && hasLifetime && hasBuildings,
        hasCost,
        hasLifetime,
        hasBuildings,
        missingCost: Math.max(0, Number(world?.unlockCost || 0) - Number(snusAmount || 0)),
        missingLifetime: Math.max(0, lifetimeTarget - lifetimeCurrent),
        missingBuildings: Math.max(0, buildingsTarget - buildingsCurrent),
        lifetimeTarget,
        buildingsTarget
    };
}

export function isWorldUnlocked(world, snusAmount, progress = {}) {
    return getWorldUnlockDetails(world, snusAmount, progress).unlocked;
}
