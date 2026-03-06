import { getSoundEnabled } from "./config.js";

const clickAudio = typeof Audio === "function" ? new Audio("assets/sounds/click.mp3") : null;

if (clickAudio) {
    clickAudio.volume = 0.25;
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