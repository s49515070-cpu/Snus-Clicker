export function createDiamondShopController({
    gameState,
    prestigeUpgrades,
    diamondShopListEl,
    diamondShopBalanceEl,
    getPrestigeUpgradeCost,
    buyPrestigeUpgrade,
    t,
    onPurchased
}) {
    const upgradeCardMap = new Map();

    function buildShopCards() {
        if (!diamondShopListEl || upgradeCardMap.size === prestigeUpgrades.length) return;

        diamondShopListEl.innerHTML = "";
        upgradeCardMap.clear();

        prestigeUpgrades.forEach((upgrade) => {
            const card = document.createElement("button");
            card.type = "button";
            card.className = "diamond-shop-item";
            card.dataset.upgradeId = upgrade.id;

            const title = document.createElement("div");
            title.className = "diamond-shop-title";

            const desc = document.createElement("div");
            desc.className = "diamond-shop-description";
            desc.textContent = upgrade.description;

            const meta = document.createElement("div");
            meta.className = "diamond-shop-meta";

            card.append(title, desc, meta);
            diamondShopListEl.appendChild(card);
            upgradeCardMap.set(upgrade.id, { card, title, meta });
        });
    }

    function renderDiamondShop() {
        if (!diamondShopListEl) return;
        buildShopCards();

        if (diamondShopBalanceEl) {
            diamondShopBalanceEl.textContent = `${Math.floor(gameState.diamonds || 0)} ${t("diamonds")}`;
        }

        prestigeUpgrades.forEach((upgrade) => {
            const entry = upgradeCardMap.get(upgrade.id);
            if (!entry) return;
            const level = Number(gameState.prestigeUpgradeLevels[upgrade.id] || 0);
            const maxed = level >= upgrade.maxLevel;
            const cost = getPrestigeUpgradeCost(upgrade.id);
            const canAfford = !maxed && (gameState.diamonds || 0) >= cost;

            entry.title.textContent = `${upgrade.name} (${t("levelShort")} ${level}/${upgrade.maxLevel})`;
            entry.meta.textContent = maxed ? t("maxReached") : `${t("cost")}: ${cost} ${t("diamonds")}`;
            entry.card.classList.toggle("is-affordable", canAfford);
            entry.card.classList.toggle("is-unaffordable", !canAfford);
            entry.card.disabled = maxed;
        });
    }

    if (diamondShopListEl) {
        diamondShopListEl.addEventListener("click", (event) => {
            const target = event.target instanceof Element ? event.target.closest(".diamond-shop-item") : null;
            const upgradeId = target?.dataset.upgradeId;
            if (!upgradeId) return;

            const ok = buyPrestigeUpgrade(upgradeId);
            if (ok) {
                renderDiamondShop();
                if (typeof onPurchased === "function") onPurchased(upgradeId);
            }
        });
    }

    return { renderDiamondShop };
}
