import { playRewardPingSound } from "./audio.js";

function getElementCenter(el) {
    if (!el || typeof el.getBoundingClientRect !== "function") return null;
    const rect = el.getBoundingClientRect();
    return {
        x: rect.left + (rect.width / 2),
        y: rect.top + (rect.height / 2)
    };
}

function animateCounterValue(counterEl, toValue, durationMs = 650) {
    if (!counterEl || typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
        if (counterEl) counterEl.textContent = String(toValue);
        return;
    }

    const fromValue = Math.max(0, Math.floor(Number(counterEl.textContent) || 0));
    const target = Math.max(fromValue, Math.floor(Number(toValue) || 0));
    if (target === fromValue) {
        counterEl.textContent = String(target);
        return;
    }

    const startTime = performance.now();
    const tick = (now) => {
        const progress = Math.min(1, (now - startTime) / Math.max(1, durationMs));
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(fromValue + ((target - fromValue) * eased));
        counterEl.textContent = String(current);
        if (progress < 1) {
            window.requestAnimationFrame(tick);
        }
    };

    window.requestAnimationFrame(tick);
}

export function animateDiamondReward({
    amount = 0,
    sourceEl = null,
    targetEl = null,
    finalTotal = 0
} = {}) {
    const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));
    if (safeAmount <= 0) return;

    if (!targetEl || typeof document === "undefined" || typeof window === "undefined") {
        return;
    }

    const origin = getElementCenter(sourceEl) || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const target = getElementCenter(targetEl);

    targetEl.classList.add("reward-counter-pulse");
    window.setTimeout(() => targetEl.classList.remove("reward-counter-pulse"), 900);

    animateCounterValue(targetEl, finalTotal, 800);
    playRewardPingSound();

    if (!target) return;

    const rewardEl = document.createElement("div");
    rewardEl.className = "reward-popup reward-popup--diamond";
    rewardEl.textContent = `+${safeAmount} 💎`;
    rewardEl.style.left = `${origin.x}px`;
    rewardEl.style.top = `${origin.y}px`;
    document.body.appendChild(rewardEl);

    const sparkEl = document.createElement("div");
    sparkEl.className = "reward-spark";
    sparkEl.style.left = `${target.x}px`;
    sparkEl.style.top = `${target.y}px`;
    document.body.appendChild(sparkEl);

    const flyEl = document.createElement("div");
    flyEl.className = "reward-fly reward-fly--diamond";
    flyEl.style.left = `${origin.x}px`;
    flyEl.style.top = `${origin.y}px`;
    flyEl.style.setProperty("--reward-dx", `${target.x - origin.x}px`);
    flyEl.style.setProperty("--reward-dy", `${target.y - origin.y}px`);
    document.body.appendChild(flyEl);

    window.setTimeout(() => {
        rewardEl.remove();
        sparkEl.remove();
        flyEl.remove();
    }, 1600);
}
