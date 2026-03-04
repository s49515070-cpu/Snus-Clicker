// =====================================
// PRESTIGE SYSTEM 2.0 – SNUS CLICKER
// =====================================

import { gameState } from "./engine.js";

export const prestigeUpgrades = [
    {
        id: "globalBoost",
        name: "Heavenly Power",
        description: "+10% globale Produktion",
        cost: 1,
        effect: () => {
            gameState.prestigeMultiplier *= 1.10;
        }
    },
    {
        id: "clickBoost",
        name: "Divine Fingers",
        description: "+1 Klick Power",
        cost: 2,
        effect: () => {
            gameState.clickPower += 1;
        }
    },
    {
        id: "idleBoost",
        name: "Eternal Engines",
        description: "+5% Idle Produktion",
        cost: 3,
        effect: () => {
            gameState.prestigeMultiplier *= 1.05;
        }
    },
    {
        id: "worldBoost",
        name: "World Amplifier",
        description: "+15% Welt Multiplikator",
        cost: 5,
        effect: () => {
            gameState.prestigeMultiplier *= 1.15;
        }
    }
];

export function buyPrestigeUpgrade(id) {
    const upgrade = prestigeUpgrades.find(u => u.id === id);
    if (!upgrade) return false;

    if (gameState.prestigeCookies >= upgrade.cost) {
        gameState.prestigeCookies -= upgrade.cost;
        upgrade.effect();
        return true;
    }

    return false;
}
