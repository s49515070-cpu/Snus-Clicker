export function createBuildingsUIController({ gameState, buildings, getBuildingCost, getPurchaseCost, getMaxAffordableSummary, buyBuilding, formatNumber, leftColumn, rightColumn }) {
    const buildingCardMap = new Map();
    let lastBuildingRenderKey = "";

    function getBuildingRenderKey() {
        const ownedValues = buildings
            .map((building) => {
                const rawOwned = Number(gameState.buildingData[building.id]?.owned);
                return Number.isFinite(rawOwned) && rawOwned >= 0 ? Math.floor(rawOwned) : 0;
            })
            .join("|");

        return `${ownedValues}::${gameState.buyMode}::${Math.floor(gameState.cookies)}`;
    }

    function getCurrentPurchaseCost(building, owned) {
        const mode = gameState.buyMode;

        if (mode === "max") {
            const summary = getMaxAffordableSummary(building, owned, gameState.cookies);
            return {
                cost: summary.totalCost,
                quantity: summary.count
            };
        }

        return {
            cost: getPurchaseCost(building, owned, mode),
            quantity: mode
        };
    }

    function buildCardSkeleton(building) {
        const card = document.createElement("div");
        card.className = "building-card";
        card.dataset.buildingId = building.id;
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        card.setAttribute("aria-label", `${building.name} kaufen`);

        const details = document.createElement("div");
        details.className = "building-details";

        const icon = document.createElement("img");
        icon.src = building.icon;
        icon.alt = building.name;

        const title = document.createElement("div");
        title.className = "building-title";

        const nextPrice = document.createElement("div");
        nextPrice.className = "building-next-price";

        const buyCost = document.createElement("div");
        buyCost.className = "building-buy-cost";

        details.append(title, nextPrice, buyCost);
        card.append(icon, details);

        return { card, title, nextPrice, buyCost };
    }

    function updateBuildingCard(building) {
        const entry = buildingCardMap.get(building.id);
        if (!entry) return;

        const buildingState = gameState.buildingData[building.id] || { owned: 0 };
        const rawOwned = Number(buildingState.owned);
        const owned = Number.isFinite(rawOwned) && rawOwned >= 0 ? Math.floor(rawOwned) : 0;
        const cost = getBuildingCost(building, owned);
        const purchase = getCurrentPurchaseCost(building, owned);
        const canAfford = purchase.quantity > 0 && gameState.cookies >= purchase.cost;

        entry.title.innerHTML = `<strong>${building.name}</strong> (${owned})`;
        entry.nextPrice.textContent = `Nächster Preis: ${formatNumber(cost)}`;
        entry.buyCost.textContent = `Kauf (${gameState.buyMode === "max" ? "MAX" : `x${purchase.quantity}`}): ${formatNumber(purchase.cost)}`;

        entry.card.classList.toggle("is-affordable", canAfford);
        entry.card.classList.toggle("is-unaffordable", !canAfford);
    }

    function ensureBuildingCardsInitialized() {
        if (!leftColumn || !rightColumn) {
            return;
        }

        if (buildingCardMap.size === buildings.length) {
            return;
        }

        buildingCardMap.clear();
        leftColumn.innerHTML = "";
        rightColumn.innerHTML = "";

        buildings.forEach((building) => {
            const entry = buildCardSkeleton(building);
            buildingCardMap.set(building.id, entry);

            if (building.side === "left") {
                leftColumn.appendChild(entry.card);
            } else {
                rightColumn.appendChild(entry.card);
            }
        });
    }

    function updateBuildingCards() {
        buildings.forEach((building) => {
            updateBuildingCard(building);
        });
    }

    function getBuildingIdFromEvent(event) {
        const target = event.target instanceof Element ? event.target : null;
        const card = target?.closest(".building-card");

        if (!card) return null;
        return card.dataset.buildingId || null;
    }

    function onBuildingColumnClick(event) {
        const buildingId = getBuildingIdFromEvent(event);
        if (!buildingId) return;

        const purchased = buyBuilding(buildingId);
        if (purchased) {
            updateBuildingCards();
            lastBuildingRenderKey = getBuildingRenderKey();
        }
    }

    function onBuildingColumnKeydown(event) {
        if (event.key !== "Enter" && event.key !== " ") return;

        const buildingId = getBuildingIdFromEvent(event);
        if (!buildingId) return;

        event.preventDefault();
        const purchased = buyBuilding(buildingId);

        if (purchased) {
            updateBuildingCards();
            lastBuildingRenderKey = getBuildingRenderKey();
        }
    }

    if (leftColumn) {
        leftColumn.addEventListener("click", onBuildingColumnClick);
        leftColumn.addEventListener("keydown", onBuildingColumnKeydown);
    }
    if (rightColumn) {
        rightColumn.addEventListener("click", onBuildingColumnClick);
        rightColumn.addEventListener("keydown", onBuildingColumnKeydown);
    }

    function refreshBuildingsIfNeeded() {
        const key = getBuildingRenderKey();

        if (key !== lastBuildingRenderKey) {
            updateBuildingCards();
            lastBuildingRenderKey = key;
        }
    }

    function renderBuildings() {
        ensureBuildingCardsInitialized();
        updateBuildingCards();
        lastBuildingRenderKey = getBuildingRenderKey();
    }

    return {
        renderBuildings,
        refreshBuildingsIfNeeded
    };
}
