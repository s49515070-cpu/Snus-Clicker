// =====================================
// PRESTIGE SYSTEM – NORMAL VERSION
// =====================================

// Prestige Upgrades Definition
var prestigeUpgrades = [
    {
        id: "globalBoost",
        name: "Heavenly Power",
        description: "+10% globale Produktion",
        cost: 1,
        effect: function () {
            gameState.prestigeMultiplier *= 1.10;
        }
    },
    {
        id: "clickBoost",
        name: "Divine Fingers",
        description: "+1 Klick Power",
        cost: 2,
        effect: function () {
            gameState.clickPower += 1;
        }
    },
    {
        id: "idleBoost",
        name: "Eternal Engines",
        description: "+5% Idle Produktion",
        cost: 3,
        effect: function () {
            gameState.prestigeMultiplier *= 1.05;
        }
    },
    {
        id: "worldBoost",
        name: "World Amplifier",
        description: "+15% Welt Multiplikator",
        cost: 5,
        effect: function () {
            gameState.prestigeMultiplier *= 1.15;
        }
    }
];


// Prestige Upgrade kaufen
function buyPrestigeUpgrade(id) {

    var upgrade = prestigeUpgrades.find(function(u) {
        return u.id === id;
    });

    if (!upgrade) return false;

    if (gameState.prestigeCookies >= upgrade.cost) {
        gameState.prestigeCookies -= upgrade.cost;
        upgrade.effect();
        return true;
    }

    return false;
}
