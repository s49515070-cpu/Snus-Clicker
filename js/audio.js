import { getSoundEnabled } from "./config.js";

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
    steps.forEach((step, index) => {
        const startAt = now + Number(step.delay || 0);
        const duration = Math.max(0.02, Number(step.duration || 0.1));
        const frequency = Math.max(40, Number(step.frequency || 220));
        const gainValue = Math.min(0.18, Math.max(0.01, Number(step.gain || 0.06)));

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

    clickAudio.currentTime = 0;

    const playPromise = clickAudio.play();
    if (playPromise?.catch) {
        playPromise.catch(() => {
            // Browser blockiert Audio ggf. ohne User-Geste.
        });
    }
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
