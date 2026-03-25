import { getSoundEnabled, getSoundVolume } from "./config.js";

const clickAudio = typeof Audio === "function" ? new Audio("assets/sounds/click.mp3") : null;
let audioContext;

if (clickAudio) {
    clickAudio.volume = 0.25;
}

function getAudioContext() {
    if (typeof window === "undefined" || typeof window.AudioContext !== "function") return null;
    if (!audioContext) {
        audioContext = new window.AudioContext();
    }
    return audioContext;
}

function playToneSequence(steps = []) {
    if (!getSoundEnabled()) return;
    const context = getAudioContext();
    if (!context) return;
    if (context.state === "suspended") {
        context.resume().catch(() => {});
    }

    const now = context.currentTime;
    const master = Math.max(0, Math.min(1, (Number(getSoundVolume()) || 0) / 100));
    if (master <= 0.001) return;
    steps.forEach((step, index) => {
        const startAt = now + Number(step.delay || 0);
        const duration = Math.max(0.02, Number(step.duration || 0.1));
        const frequency = Math.max(40, Number(step.frequency || 220));
        const gainValue = Math.min(0.18, Math.max(0.005, Number(step.gain || 0.06) * master));

        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = step.type || "triangle";
        oscillator.frequency.setValueAtTime(frequency, startAt);
        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.exponentialRampToValueAtTime(gainValue, startAt + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(startAt);
        oscillator.stop(startAt + duration + 0.02 + (index * 0.0001));
    });
}

export function playClickSound() {
    if (!getSoundEnabled() || !clickAudio) return;
    clickAudio.volume = Math.max(0, Math.min(1, ((Number(getSoundVolume()) || 0) / 100) * 0.35));

    clickAudio.currentTime = 0;

    const playPromise = clickAudio.play();
    if (playPromise?.catch) {
        playPromise.catch(() => {
            // Browser blockiert Audio ggf. ohne User-Geste.
        });
    }
}

export function playUiClickSound() {
    playToneSequence([
        { frequency: 420, duration: 0.04, gain: 0.05, type: "triangle", delay: 0.00 },
        { frequency: 520, duration: 0.045, gain: 0.04, type: "sine", delay: 0.03 }
    ]);
}

export function playUiHoverSound() {
    playToneSequence([
        { frequency: 680, duration: 0.025, gain: 0.02, type: "sine", delay: 0.00 }
    ]);
}

export function playSlotSpinSound() {
    playToneSequence([
        { frequency: 190, duration: 0.14, gain: 0.04, type: "sawtooth", delay: 0.00 },
        { frequency: 220, duration: 0.14, gain: 0.05, type: "sawtooth", delay: 0.08 },
        { frequency: 260, duration: 0.14, gain: 0.06, type: "triangle", delay: 0.16 },
        { frequency: 320, duration: 0.12, gain: 0.07, type: "triangle", delay: 0.24 }
    ]);
}

export function playSlotStopSound() {
    playToneSequence([
        { frequency: 440, duration: 0.08, gain: 0.09, type: "triangle", delay: 0.00 },
        { frequency: 620, duration: 0.12, gain: 0.11, type: "sine", delay: 0.07 }
    ]);
}

export function playSlotImpactSound() {
    playToneSequence([
        { frequency: 180, duration: 0.07, gain: 0.1, type: "square", delay: 0.00 },
        { frequency: 125, duration: 0.1, gain: 0.08, type: "triangle", delay: 0.03 }
    ]);
}

export function playSlotFallSound(variation = 0) {
    const seed = Math.max(0, Number(variation) || 0);
    const drift = (Math.random() * 22) - 11;
    const base = 220 + (seed * 8);
    playToneSequence([
        { frequency: base + drift, duration: 0.04, gain: 0.04 + (seed * 0.0015), type: "triangle", delay: 0.00 },
        { frequency: (base * 1.22) + drift, duration: 0.03, gain: 0.035 + (seed * 0.0012), type: "sine", delay: 0.025 }
    ]);
}

export function playSlotWinSound() {
    playToneSequence([
        { frequency: 460, duration: 0.08, gain: 0.08, type: "triangle", delay: 0.00 },
        { frequency: 620, duration: 0.1, gain: 0.1, type: "triangle", delay: 0.06 },
        { frequency: 740, duration: 0.12, gain: 0.12, type: "sine", delay: 0.13 }
    ]);
}

export function playSlotWinByTier(stepMultiplier = 0) {
    const tier = Number(stepMultiplier) || 0;
    if (tier >= 10) {
        playSlotBigWinSound();
        return;
    }
    if (tier >= 3) {
        playToneSequence([
            { frequency: 392, duration: 0.08, gain: 0.07, type: "triangle", delay: 0.00 },
            { frequency: 523, duration: 0.12, gain: 0.09, type: "triangle", delay: 0.06 },
            { frequency: 659, duration: 0.14, gain: 0.11, type: "sine", delay: 0.14 }
        ]);
        return;
    }
    playToneSequence([
        { frequency: 500, duration: 0.055, gain: 0.05, type: "triangle", delay: 0.00 },
        { frequency: 630, duration: 0.08, gain: 0.06, type: "sine", delay: 0.05 }
    ]);
}

export function playSlotCascadeSound(intensity = 0) {
    const boost = Math.min(5, Math.max(0, Number(intensity) || 0));
    const pitchLift = boost * 16;
    const gainBoost = boost * 0.006;
    playToneSequence([
        { frequency: 330 + pitchLift, duration: 0.06, gain: 0.06 + gainBoost, type: "sawtooth", delay: 0.00 },
        { frequency: 390 + pitchLift, duration: 0.08, gain: 0.08 + gainBoost, type: "triangle", delay: 0.06 }
    ]);
}

export function playSlotBigWinSound() {
    playToneSequence([
        { frequency: 330, duration: 0.1, gain: 0.08, type: "sine", delay: 0.00 },
        { frequency: 494, duration: 0.12, gain: 0.1, type: "sine", delay: 0.08 },
        { frequency: 659, duration: 0.16, gain: 0.13, type: "triangle", delay: 0.18 },
        { frequency: 988, duration: 0.2, gain: 0.15, type: "triangle", delay: 0.32 }
    ]);
}

export function playRewardPingSound() {
    playToneSequence([
        { frequency: 740, duration: 0.06, gain: 0.07, type: "triangle", delay: 0.00 },
        { frequency: 988, duration: 0.08, gain: 0.09, type: "sine", delay: 0.04 }
    ]);
}
