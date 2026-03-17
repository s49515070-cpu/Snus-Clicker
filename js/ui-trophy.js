export function createTrophyPathController({
    trophyPathListEl,
    trophyPathScrollBarEl,
    getPrestigeTrackStatus,
    t
}) {
    function syncScrollBarWithList() {
        if (!trophyPathListEl || !trophyPathScrollBarEl) return;
        const maxScroll = Math.max(0, trophyPathListEl.scrollWidth - trophyPathListEl.clientWidth);
        trophyPathScrollBarEl.max = String(maxScroll);
        trophyPathScrollBarEl.value = String(Math.min(maxScroll, trophyPathListEl.scrollLeft));
        trophyPathScrollBarEl.hidden = maxScroll <= 0;
    }

    function ensureScrollListeners() {
        if (!trophyPathListEl || !trophyPathScrollBarEl || trophyPathListEl.dataset.scrollBound === "true") return;
        trophyPathListEl.dataset.scrollBound = "true";

        trophyPathListEl.addEventListener("scroll", () => {
            trophyPathScrollBarEl.value = String(trophyPathListEl.scrollLeft);
        });

        trophyPathScrollBarEl.addEventListener("input", () => {
            trophyPathListEl.scrollLeft = Number(trophyPathScrollBarEl.value || 0);
        });

        if (typeof window !== "undefined") {
            window.addEventListener("resize", syncScrollBarWithList);
        }
    }

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

        ensureScrollListeners();
        syncScrollBarWithList();
    }

    return { renderTrophyPath };
}
