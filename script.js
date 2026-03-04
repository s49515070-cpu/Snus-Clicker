let game = {
    cookies: 0,
    totalCookies: 0,
    cps: 0,
    prestige: 0,
    clickPower: 1,
    world: 1,
    buildings: [
        { name: "Cursor", baseCost: 15, amount: 0, production: 0.1 },
        { name: "Oma", baseCost: 100, amount: 0, production: 1 },
        { name: "Farm", baseCost: 1100, amount: 0, production: 8 }
    ],
    prestigeUpgrades: {
        multiplier: 0,
        clickBonus: 0
    }
};

const cookieImg = document.getElementById("cookie");
const cookieCount = document.getElementById("cookieCount");
const cpsDisplay = document.getElementById("cps");
const prestigeCount = document.getElementById("prestigeCount");
const buildingsDiv = document.getElementById("buildings");
const prestigeBtn = document.getElementById("prestigeBtn");
const worldDisplay = document.getElementById("worldDisplay");

const clickSound = new Audio("assets/sounds/click.mp3");
const prestigeSound = new Audio("assets/sounds/prestige.mp3");

function updateWorld() {
    if (game.totalCookies >= 100000000) {
        game.world = 3;
        cookieImg.src = "assets/cookies/world3.png";
        worldDisplay.innerText = "Welt 3: Divine Dream";
    } else if (game.totalCookies >= 10000000) {
        game.world = 2;
        cookieImg.src = "assets/cookies/world2.png";
        worldDisplay.innerText = "Welt 2: Rainbow Heaven";
    } else {
        game.world = 1;
        cookieImg.src = "assets/cookies/world1.png";
        worldDisplay.innerText = "Welt 1: Classic Paradise";
    }
}

function calculateCPS() {
    let total = 0;
    game.buildings.forEach(b => {
        total += b.amount * b.production;
    });
    total *= (1 + game.prestigeUpgrades.multiplier * 0.1);
    game.cps = total;
}

function updateDisplay() {
    cookieCount.innerText = Math.floor(game.cookies);
    cpsDisplay.innerText = game.cps.toFixed(1);
    prestigeCount.innerText = game.prestige;
}

function clickCookie() {
    let amount = game.clickPower + game.prestigeUpgrades.clickBonus;
    game.cookies += amount;
    game.totalCookies += amount;
    clickSound.play();
    showFloating("+" + amount);
}

function showFloating(text) {
    const div = document.createElement("div");
    div.className = "floating";
    div.innerText = text;
    document.getElementById("floatingNumbers").appendChild(div);
    setTimeout(() => div.remove(), 1000);
}

cookieImg.addEventListener("click", clickCookie);

function gameLoop() {
    calculateCPS();
    game.cookies += game.cps / 10;
    game.totalCookies += game.cps / 10;
    updateWorld();
    updateDisplay();
}

setInterval(gameLoop, 100);

function createBuildings() {
    buildingsDiv.innerHTML = "";
    game.buildings.forEach((b, i) => {
        let cost = Math.floor(b.baseCost * Math.pow(1.15, b.amount));
        let btn = document.createElement("button");
        btn.innerText = `${b.name} (${b.amount}) - ${cost}`;
        btn.onclick = () => {
            if (game.cookies >= cost) {
                game.cookies -= cost;
                b.amount++;
            }
        };
        buildingsDiv.appendChild(btn);
    });
}

setInterval(createBuildings, 500);

prestigeBtn.onclick = () => {
    let gained = Math.floor(game.totalCookies / 1000000);
    if (gained > 0) {
        game.prestige += gained;
        game.cookies = 0;
        game.totalCookies = 0;
        game.buildings.forEach(b => b.amount = 0);
        prestigeSound.play();
    }
};

function saveGame() {
    localStorage.setItem("snusClickerSave", JSON.stringify(game));
}

function loadGame() {
    let save = localStorage.getItem("snusClickerSave");
    if (save) {
        game = JSON.parse(save);
    }
}

loadGame();
setInterval(saveGame, 5000);
