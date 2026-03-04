import { updateGame } from "./engine.js";
import { render } from "./ui.js";

function gameLoop() {
    updateGame();
    render();
}

setInterval(gameLoop, 100);
render();
