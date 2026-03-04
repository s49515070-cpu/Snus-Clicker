export function createPrestigeUIController({
    gameState,
    prestigeUpgrades,
    prestigeUpgradesEl,
    prestigeSummaryEl,
    prestigeButton,
    getPrestigeUpgradeCost,
    getPrestigeEffects,
    getPotentialPrestigeGain,
    buyPrestigeUpgrade,
    prestigeReset,
    showToast,
    t,
    onUpgradePurchased,
    onPrestigeReset
}) {
    const fallbackTranslations = {
        activeBonuses: "Aktive Boni",
        levelShort: "Lvl",
        maxReached: "MAX erreicht",
        cost: "Kosten",
        prestigeSnus: "Prestige-Snus",
        prestigeReset: "Prestige-Reset",
        earnedPrestige: "✨ Du hast {amount} Prestige-Snus erhalten!",
        notEnoughLifetime: "ℹ️ Noch nicht genug Lifetime-Snus für Prestige."
    };
    const translate = typeof t === "function"
        ? t
        : (key, vars) => {
            const template = fallbackTranslations[key] || key;
            if (!vars) return template;
            return template.replace(/\{(\w+)\}/g, (_, token) => String(vars[token] ?? ""));
        };


    const prestigeUpgradeCardMap = new Map();
    let lastPrestigeRenderKey = "";

    function getPrestigeRenderKey() {
        const levels = prestigeUpgrades
            .map((upgrade) => gameState.prestigeUpgradeLevels[upgrade.id] ?? 0)
            .join("|");

        return `${levels}::${gameState.prestigeCookies}`;
    }

    function buildPrestigeUpgradeCards() {
        if (!prestigeUpgradesEl || prestigeUpgradeCardMap.size === prestigeUpgrades.length) {
            return;
        }

        prestigeUpgradesEl.innerHTML = "";
        prestigeUpgradeCardMap.clear();

        prestigeUpgrades.forEach((upgrade) => {
            const card = document.createElement("button");
            card.type = "button";
            card.className = "prestige-upgrade";
            card.dataset.upgradeId = upgrade.id;

            const title = document.createElement("div");
            title.className = "prestige-upgrade-title";

            const description = document.createElement("div");
            description.className = "prestige-upgrade-description";
            description.textContent = upgrade.description;

            const meta = document.createElement("div");
            meta.className = "prestige-upgrade-meta";

            card.append(title, description, meta);
            prestigeUpgradesEl.appendChild(card);

            prestigeUpgradeCardMap.set(upgrade.id, { card, title, meta });
        });
    }

    function updatePrestigeSummary() {
        if (!prestigeSummaryEl) return;

        const effects = getPrestigeEffects();
        prestigeSummaryEl.textContent = `${translate("activeBonuses")}: Klick +${effects.clickBonusPercent}% | CPS +${effects.cpsBonusPercent}%`;
    }

    function updatePrestigeUpgradeCards() {
        if (!prestigeUpgradesEl) {
            return;
        }

        buildPrestigeUpgradeCards();

        prestigeUpgrades.forEach((upgrade) => {
            const entry = prestigeUpgradeCardMap.get(upgrade.id);
            if (!entry) return;

            const level = Number(gameState.prestigeUpgradeLevels[upgrade.id] || 0);
            const maxed = level >= upgrade.maxLevel;
            const cost = getPrestigeUpgradeCost(upgrade.id);
            const canAfford = !maxed && gameState.prestigeCookies >= cost;

            entry.title.textContent = `${upgrade.name} (${translate("levelShort")} ${level}/${upgrade.maxLevel})`;
            entry.meta.textContent = maxed ? translate("maxReached") : `${translate("cost")}: ${cost} ${translate("prestigeSnus")}`;
            
            entry.card.classList.toggle("is-affordable", canAfford);
            entry.card.classList.toggle("is-unaffordable", !canAfford);
            entry.card.disabled = maxed;
        });

        updatePrestigeSummary();
        lastPrestigeRenderKey = getPrestigeRenderKey();
    }

    function updatePrestigeResetButtonState() {
        if (!prestigeButton) return;

        const potential = getPotentialPrestigeGain();
        prestigeButton.disabled = potential <= 0;
        prestigeButton.textContent = potential > 0 ? `${translate("prestigeReset")} (+${potential})` : translate("prestigeReset");
   }

    function refreshPrestigeUpgradesIfNeeded() {
        const key = getPrestigeRenderKey();

        if (key !== lastPrestigeRenderKey) {
            updatePrestigeUpgradeCards();
        }
    }

    if (prestigeUpgradesEl) {
        prestigeUpgradesEl.addEventListener("click", (event) => {
            const target = event.target instanceof Element ? event.target.closest(".prestige-upgrade") : null;
            const upgradeId = target?.dataset.upgradeId;
            if (!upgradeId) return;

            const purchased = buyPrestigeUpgrade(upgradeId);
            if (purchased) {
                updatePrestigeUpgradeCards();
                if (typeof onUpgradePurchased === "function") {
                    onUpgradePurchased(upgradeId);
                }
            }
        });
    }

    if (prestigeButton) {
        prestigeButton.addEventListener("click", () => {
            const earned = prestigeReset();
            if (earned > 0) {
                showToast(translate("earnedPrestige", { amount: earned }), 1800, "success");
                updatePrestigeUpgradeCards();
                updatePrestigeResetButtonState();
                if (typeof onPrestigeReset === "function") {
                    onPrestigeReset(earned);
                }
            } else {
                showToast(translate("notEnoughLifetime"), 1800, "warning");
            }
        });
    }

    function renderPrestigeUpgrades() {
        updatePrestigeUpgradeCards();
        updatePrestigeResetButtonState();
    }

    return {
        renderPrestigeUpgrades,
        refreshPrestigeUpgradesIfNeeded,
        updatePrestigeResetButtonState
    };
}
