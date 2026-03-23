function normalizeOwnedCount(rawOwned) {
    const owned = Number(rawOwned);
    return Number.isFinite(owned) && owned >= 0 ? Math.floor(owned) : 0;
}

function getSafePreviewCost({ building, owned, budget, getEffectivePurchasePreview, getPurchaseCost }) {
    if (typeof getEffectivePurchasePreview === "function") {
        const preview = getEffectivePurchasePreview(building, owned, 1, budget);
        return {
            quantity: Number(preview?.quantity || 0),
            totalCost: Number(preview?.totalCost || 0)
        };
    }

    return {
        quantity: 1,
        totalCost: Number(typeof getPurchaseCost === "function" ? getPurchaseCost(building, owned, 1) : 0)
    };
}

export function getBuildingPurchaseCandidates({
    buildings,
    gameState,
    budget = Number(gameState?.cookies || 0),
    getEffectivePurchasePreview,
    getPurchaseCost,
    getBuildingSynergyBonusPercent,
    affordableOnly = true
}) {
    const getSynergyBonus = typeof getBuildingSynergyBonusPercent === "function"
        ? getBuildingSynergyBonusPercent
        : () => 0;

    return (Array.isArray(buildings) ? buildings : [])
        .map((building) => {
            const owned = normalizeOwnedCount(gameState?.buildingData?.[building.id]?.owned);
            const preview = getSafePreviewCost({
                building,
                owned,
                budget,
                getEffectivePurchasePreview,
                getPurchaseCost
            });
            const cost = preview.totalCost;

            if (preview.quantity < 1 || !Number.isFinite(cost) || cost <= 0) return null;
            if (affordableOnly && cost > budget) return null;

            const synergyBonusPercent = Math.max(0, Number(getSynergyBonus(building.id) || 0));
            const cpsGain = Number(building.baseCps || 0) * (1 + synergyBonusPercent / 100);
            const valueScore = cost > 0 && Number.isFinite(cpsGain) ? cpsGain / cost : 0;
            const paybackSeconds = cpsGain > 0 ? cost / cpsGain : Number.POSITIVE_INFINITY;

            return {
                buildingId: building.id,
                cost,
                owned,
                cpsGain,
                valueScore: Number.isFinite(valueScore) ? valueScore : 0,
                paybackSeconds
            };
        })
        .filter(Boolean);
}

export function compareCandidatesForCheap(candidate, currentBest) {
    if (!currentBest) return true;

    if (candidate.cost < currentBest.cost) return true;
    if (candidate.cost > currentBest.cost) return false;
    if (candidate.cpsGain > currentBest.cpsGain) return true;
    if (candidate.cpsGain < currentBest.cpsGain) return false;
    return candidate.valueScore > currentBest.valueScore;
}

export function compareCandidatesForValue(candidate, currentBest) {
    if (!currentBest) return true;

    if (candidate.valueScore > currentBest.valueScore) return true;
    if (candidate.valueScore < currentBest.valueScore) return false;
    if (candidate.cpsGain > currentBest.cpsGain) return true;
    if (candidate.cpsGain < currentBest.cpsGain) return false;
    if (candidate.paybackSeconds < currentBest.paybackSeconds) return true;
    if (candidate.paybackSeconds > currentBest.paybackSeconds) return false;
    return candidate.cost < currentBest.cost;
}

export function pickCheapestCandidate(candidates) {
    return (Array.isArray(candidates) ? candidates : []).reduce((best, candidate) => (
        compareCandidatesForCheap(candidate, best) ? candidate : best
    ), null);
}

export function pickBestValueCandidate(candidates) {
    return (Array.isArray(candidates) ? candidates : []).reduce((best, candidate) => (
        compareCandidatesForValue(candidate, best) ? candidate : best
    ), null);
}

export function getBestBuyBuildingId(options) {
    return pickBestValueCandidate(getBuildingPurchaseCandidates(options))?.buildingId || null;
}
