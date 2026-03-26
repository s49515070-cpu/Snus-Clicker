import { t } from "./i18n.js";
import { playAchievementRaritySound } from "./audio.js";

const RARITY_THEME = {
    common: { color: "#60a5fa", particleCount: 8, durationMs: 1700, cameraZoom: 1.01 },
    rare: { color: "#facc15", particleCount: 14, durationMs: 2200, cameraZoom: 1.025 },
    epic: { color: "#a855f7", particleCount: 22, durationMs: 2800, cameraZoom: 1.04 },
    legendary: { color: "#f59e0b", particleCount: 34, durationMs: 3400, cameraZoom: 1.06 }
};

export function createAchievementCelebrationController({ layerEl, onComplete } = {}) {
    const queue = [];
    let active = false;

    const celebrate = (payload) => {
        if (!payload) return;
        queue.push(payload);
        if (!active) runNext();
    };

    const runNext = () => {
        if (!layerEl || queue.length === 0) {
            active = false;
            return;
        }
        active = true;
        const data = queue.shift();
        const rarity = String(data.rarity || "common").toLowerCase();
        const theme = RARITY_THEME[rarity] || RARITY_THEME.common;
        const rewardItems = Array.isArray(data.rewardItems) ? data.rewardItems : [];
        const rewardDiamonds = Math.max(0, Number(data.rewardDiamonds || 0));

        playAchievementRaritySound(rarity);

        const card = document.createElement("article");
        card.className = `achievement-celebration-card rarity-${rarity}`;
        card.style.setProperty("--rarity-color", theme.color);

        const previewItems = rewardItems.length > 0
            ? rewardItems.map((item) => `
                <div class="achievement-celebration-reward">
                    <div class="achievement-celebration-reward-icon">${item.icon || "🎁"}</div>
                    <div>
                        <div class="achievement-celebration-reward-title">${t(item.nameKey)}</div>
                        <div class="achievement-celebration-reward-description">${t(item.descriptionKey)}</div>
                    </div>
                </div>
            `).join("")
            : rewardDiamonds > 0
                ? `<div class="achievement-celebration-reward"><div class="achievement-celebration-reward-icon">💎</div><div><div class="achievement-celebration-reward-title">+${rewardDiamonds} ${t("diamonds")}</div></div></div>`
                : `<div class="achievement-celebration-reward-empty">${t("achievementRewardNone")}</div>`;

        card.innerHTML = `
            <div class="achievement-celebration-headline">🏅 ${t("achievementUnlockedHeadline")}</div>
            <div class="achievement-celebration-title">${data.icon || "🏅"} ${t(data.titleKey)}</div>
            <div class="achievement-celebration-meta">${t("achievementTierLabel", { tier: data.tier })} · ${t(`achievementRarity${rarity[0].toUpperCase()}${rarity.slice(1)}`)}</div>
            <div class="achievement-celebration-rewards">${previewItems}</div>
        `;

        layerEl.appendChild(card);
        document.body?.classList.add("achievement-camera-active");
        document.body?.style?.setProperty("--achievement-camera-zoom", String(theme.cameraZoom));

        spawnParticles(layerEl, theme.color, theme.particleCount);

        window.setTimeout(() => {
            card.classList.add("is-leaving");
        }, Math.max(800, theme.durationMs - 700));

        window.setTimeout(() => {
            card.remove();
            if (!layerEl.querySelector(".achievement-celebration-card")) {
                document.body?.classList.remove("achievement-camera-active");
                document.body?.style?.removeProperty("--achievement-camera-zoom");
            }
            rewardItems.forEach((item) => {
                onComplete?.(item);
            });
            runNext();
        }, theme.durationMs);
    };

    return { celebrate };
}

function spawnParticles(host, color, count) {
    if (!host || !Number.isFinite(count) || count <= 0) return;
    const amount = Math.min(40, Math.max(4, Math.floor(count)));
    for (let index = 0; index < amount; index += 1) {
        const particle = document.createElement("span");
        particle.className = "achievement-particle";
        const x = 15 + Math.random() * 70;
        const delay = Math.random() * 180;
        const drift = (Math.random() * 120) - 60;
        const size = 4 + Math.random() * 8;
        particle.style.setProperty("--particle-x", `${x}%`);
        particle.style.setProperty("--particle-drift", `${drift}px`);
        particle.style.setProperty("--particle-delay", `${delay}ms`);
        particle.style.setProperty("--particle-size", `${size}px`);
        particle.style.setProperty("--particle-color", color);
        host.appendChild(particle);
        window.setTimeout(() => particle.remove(), 1800 + delay);
    }
}
