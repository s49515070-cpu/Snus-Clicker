export function createTrophyPathController({
    trophyPathListEl,
    getPrestigeTrackStatus,
    t
}) {
    function renderTrophyPath() {
        if (!trophyPathListEl) return;
        const track = getPrestigeTrackStatus();

        trophyPathListEl.innerHTML = "";

        track.forEach((entry) => {
            const card = document.createElement("div");
            card.className = "trophy-path-item";
            card.classList.toggle("is-unlocked", entry.unlocked);
            card.classList.toggle("is-claimed", entry.claimed);

            const stateLabel = entry.claimed
                ? t("trophyClaimed")
                : entry.unlocked
                    ? t("trophyUnlocked")
                    : t("trophyLocked");

            card.innerHTML = `
                <div class="trophy-path-level">${t("trophyLevel", { level: entry.level })}</div>
                <div class="trophy-path-meta">
                    <div class="trophy-path-reward">💎 +${entry.rewardDiamonds || 0}</div>
                    <div class="trophy-path-state">${stateLabel}</div>
                </div>
            `;

            trophyPathListEl.appendChild(card);
        });

    }

    return { renderTrophyPath };
}
