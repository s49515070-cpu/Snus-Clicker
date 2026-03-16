export function createBuildingsUIController({ gameState, buildings, getBuildingCost, getPurchaseCost, getMaxAffordableSummary, getEffectivePurchasePreview, buyBuilding, formatNumber, t, leftColumn, rightColumn, getBuildingSynergyBonusPercent }) {
    const fallbackTranslations = {
        purchase: "Kauf",
        nextPrice: "Nächster Preis",
        bestBuy: "Best Buy",
        info: "Info",
        close: "Schließen",
        owned: "Anzahl",
        moreInfo: "Mehr Infos"
    };
    const translate = typeof t === "function" ? t : (key) => fallbackTranslations[key] || key;
    const getSynergyBonus = typeof getBuildingSynergyBonusPercent === "function" ? getBuildingSynergyBonusPercent : () => 0;
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
        if (typeof getEffectivePurchasePreview === "function") {
            const preview = getEffectivePurchasePreview(building, owned, gameState.buyMode, gameState.cookies);
            return {
                cost: preview.totalCost,
                quantity: preview.quantity,
                discountPercent: preview.discountPercent
            };
        }

        const mode = gameState.buyMode;

        if (mode === "max") {
            const summary = getMaxAffordableSummary(building, owned, gameState.cookies);
            return {
                cost: summary.totalCost,
                quantity: summary.count,
                discountPercent: 0
            };
        }

        return {
            cost: getPurchaseCost(building, owned, mode),
            quantity: mode,
            discountPercent: 0
        };
    }

    
    function getBestBuyBuildingId() {
        let best = null;

        buildings.forEach((building) => {
            const rawOwned = Number(gameState.buildingData[building.id]?.owned);
            const owned = Number.isFinite(rawOwned) && rawOwned >= 0 ? Math.floor(rawOwned) : 0;
            const cost = getPurchaseCost(building, owned, 1);
            if (!Number.isFinite(cost) || cost <= 0) return;

            const score = building.baseCps / cost;
            if (!best || score > best.score || (score === best.score && cost < best.cost)) {
                best = { id: building.id, score, cost };
            }
        });

        return best ? best.id : null;
    }

    function buildCardSkeleton(building) {
        const card = document.createElement("div");
        card.className = "building-card";
        card.dataset.buildingId = building.id;
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        card.setAttribute("aria-label", `${building.name} ${translate("purchase")}`);;

        const details = document.createElement("div");
        details.className = "building-details";

        const icon = document.createElement("img");
        icon.src = building.icon;
        icon.alt = building.name;

        const title = document.createElement("div");
        title.className = "building-title";

        const owned = document.createElement("div");
        owned.className = "building-owned";

        const nextPrice = document.createElement("div");
        nextPrice.className = "building-next-price";

        const buyCost = document.createElement("div");
        buyCost.className = "building-buy-cost";

        const forecast = document.createElement("div");
        forecast.className = "building-forecast";

        const infoButton = document.createElement("button");
        infoButton.type = "button";
        infoButton.className = "building-info-button";
        infoButton.setAttribute("aria-expanded", "false");
        infoButton.textContent = `ℹ️ ${translate("moreInfo")}`;

        details.append(title, owned, buyCost, infoButton, nextPrice, forecast);
        card.append(icon, details);

        return { card, title, owned, nextPrice, buyCost, infoButton, forecast };
    }

    function updateBuildingCard(building, bestBuyBuildingId) {
        const entry = buildingCardMap.get(building.id);
        if (!entry) return;

        const buildingState = gameState.buildingData[building.id] || { owned: 0 };
        const rawOwned = Number(buildingState.owned);
        const owned = Number.isFinite(rawOwned) && rawOwned >= 0 ? Math.floor(rawOwned) : 0;
        const cost = getBuildingCost(building, owned);
        const purchase = getCurrentPurchaseCost(building, owned);
        const canAfford = purchase.quantity > 0 && gameState.cookies >= purchase.cost;

        const isBestBuy = building.id === bestBuyBuildingId;

        entry.title.innerHTML = `<strong>${building.name}</strong>${isBestBuy ? ` · ⭐ ${translate("bestBuy")}` : ""}`;
        entry.owned.textContent = `${translate("owned")}: ${owned}`;
        entry.nextPrice.textContent = `${translate("nextPrice")}: ${formatNumber(cost)}`;
        const discountSuffix = purchase.discountPercent > 0 ? ` (-${purchase.discountPercent}%)` : "";
        entry.buyCost.textContent = `${translate("purchase")}: ${formatNumber(purchase.cost)}${discountSuffix}`;
        const quantity = Number.isFinite(Number(purchase.quantity)) ? Number(purchase.quantity) : 0;
        const synergyBonusPercent = getSynergyBonus(building.id);
        const synergyMultiplier = 1 + Math.max(0, Number(synergyBonusPercent || 0)) / 100;
        const addedCps = building.baseCps * synergyMultiplier * Math.max(0, quantity);
        const roi = addedCps > 0 ? purchase.cost / addedCps : NaN;
        const synergyText = synergyBonusPercent > 0 ? ` · SYNC +${synergyBonusPercent}%` : "";
        entry.forecast.textContent = `ROI: ${Number.isFinite(roi) ? roi.toFixed(1) : "—"}s${synergyText}`;
       
        entry.card.classList.toggle("is-affordable", canAfford);
        entry.card.classList.toggle("is-unaffordable", !canAfford);
        entry.card.classList.toggle("is-best-buy", isBestBuy);
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
       const bestBuyBuildingId = getBestBuyBuildingId();

        buildings.forEach((building) => {
            updateBuildingCard(building);
            updateBuildingCard(building, bestBuyBuildingId);
        });
    }

    function getBuildingIdFromEvent(event) {
        const target = event.target instanceof Element ? event.target : null;
        const card = target?.closest(".building-card");

        if (!card) return null;
        return card.dataset.buildingId || null;
    }

    function onBuildingColumnClick(event) {
        const closestInfo = event.target instanceof Element ? event.target.closest(".building-info-button") : null;
        const infoButton = closestInfo && closestInfo.classList?.contains("building-info-button") ? closestInfo : null;
        if (infoButton) {
            if (typeof event.stopPropagation === "function") event.stopPropagation();
            const entry = Array.from(buildingCardMap.values()).find((item) => item.infoButton === infoButton);
            if (!entry) return;

            const isOpen = entry.card.classList.contains("show-extra-info");
            entry.card.classList.toggle("show-extra-info", !isOpen);
            infoButton.setAttribute("aria-expanded", String(!isOpen));
            infoButton.textContent = isOpen ? `ℹ️ ${translate("moreInfo")}` : `✕ ${translate("close")}`;
            return;
        }


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

        const closestInfo = event.target instanceof Element ? event.target.closest(".building-info-button") : null;
        const infoButton = closestInfo && closestInfo.classList?.contains("building-info-button") ? closestInfo : null;
        if (infoButton) return;

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
