// stuff used all over the place
var deg = Math.PI/180;

// the player object - just position + rotation
class player{
    constructor(x,y,z,rx,ry){
        this.x = x;
        this.y = y;
        this.z = z;
        this.rx = rx;
        this.ry = ry;
    }
}

var STONE = "linear-gradient(180deg,#343a48,#12141a)";
var FLOOR = "repeating-linear-gradient(0deg, rgba(227,178,60,0.07) 0 2px, transparent 2px 80px)," +
            "repeating-linear-gradient(90deg, rgba(227,178,60,0.07) 0 2px, transparent 2px 80px), #14161d";

//maze settings
var GRID = 6;
var CELL = 380;
var WALL_THICK = 40;
var WALL_HEIGHT = 220;
var ORIGIN = -(GRID * CELL) / 2 + CELL / 2;
var MAZE_SEED = 1337;

function WorldX(c){ return ORIGIN + c * CELL; }
function WorldZ(r){ return ORIGIN + r * CELL; }

function CellOf(x, z){
    let c = Math.max(0, Math.min(GRID - 1, Math.round((x - ORIGIN) / CELL)));
    let r = Math.max(0, Math.min(GRID - 1, Math.round((z - ORIGIN) / CELL)));
    return {r, c};
}

//0deg = the direction a fresh, unrotated square already faces — used for both the compass and enemy facing
function Bearing(dx, dz){
    return Math.atan2(dx, -dz) * 180 / Math.PI;
}

function CreateRNG(seed){
    return function(){
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

//carves a spanning-tree maze (recursive backtracker), then knocks a few extra walls for loops
function GenerateMaze(size, seed){
    let rng = CreateRNG(seed);
    let cells = [];
    for (let r = 0; r < size; r++){
        cells.push([]);
        for (let c = 0; c < size; c++) cells[r].push({N:true, S:true, E:true, W:true, visited:false});
    }

    let stack = [{r:0, c:0}];
    cells[0][0].visited = true;
    while (stack.length){
        let cur = stack[stack.length - 1];
        let options = [];
        if (cur.r > 0 && !cells[cur.r-1][cur.c].visited) options.push({r:cur.r-1, c:cur.c, dir:"N"});
        if (cur.r < size-1 && !cells[cur.r+1][cur.c].visited) options.push({r:cur.r+1, c:cur.c, dir:"S"});
        if (cur.c > 0 && !cells[cur.r][cur.c-1].visited) options.push({r:cur.r, c:cur.c-1, dir:"W"});
        if (cur.c < size-1 && !cells[cur.r][cur.c+1].visited) options.push({r:cur.r, c:cur.c+1, dir:"E"});

        if (options.length === 0){ stack.pop(); continue; }

        let next = options[Math.floor(rng() * options.length)];
        let opposite = {N:"S", S:"N", E:"W", W:"E"};
        cells[cur.r][cur.c][next.dir] = false;
        cells[next.r][next.c][opposite[next.dir]] = false;
        cells[next.r][next.c].visited = true;
        stack.push({r:next.r, c:next.c});
    }

    let loopHoles = Math.floor(size * size * 0.08);
    for (let i = 0; i < loopHoles; i++){
        let r = Math.floor(rng() * size);
        let c = Math.floor(rng() * (size - 1));
        if (cells[r][c].E){
            cells[r][c].E = false;
            cells[r][c+1].W = false;
        }
    }
    return cells;
}

var mazeCells = GenerateMaze(GRID, MAZE_SEED);

var map = [];
var WALLS = [];

function AddWallSegment(x1, z1, x2, z2){
    if (z1 === z2){
        let xMin = Math.min(x1, x2), xMax = Math.max(x1, x2);
        let length = xMax - xMin;
        let cx = xMin + length / 2;
        map.push([cx, 0, z1 - WALL_THICK/2, 0, 0, 0, length, WALL_HEIGHT, STONE]);
        map.push([cx, 0, z1 + WALL_THICK/2, 0, 0, 0, length, WALL_HEIGHT, STONE]);
        map.push([xMin, 0, z1, 0, 90, 0, WALL_THICK, WALL_HEIGHT, STONE]);
        map.push([xMax, 0, z1, 0, 90, 0, WALL_THICK, WALL_HEIGHT, STONE]);
        WALLS.push({axis:"z", pos:z1, min:xMin, max:xMax, thickness:WALL_THICK});
    } else {
        let zMin = Math.min(z1, z2), zMax = Math.max(z1, z2);
        let length = zMax - zMin;
        let cz = zMin + length / 2;
        map.push([x1 - WALL_THICK/2, 0, cz, 0, 90, 0, length, WALL_HEIGHT, STONE]);
        map.push([x1 + WALL_THICK/2, 0, cz, 0, 90, 0, length, WALL_HEIGHT, STONE]);
        map.push([x1, 0, zMin, 0, 0, 0, WALL_THICK, WALL_HEIGHT, STONE]);
        map.push([x1, 0, zMax, 0, 0, 0, WALL_THICK, WALL_HEIGHT, STONE]);
        WALLS.push({axis:"x", pos:x1, min:zMin, max:zMax, thickness:WALL_THICK});
    }
}

//build wall geometry from the maze grid — only add S/E walls per cell, plus N/W on the outer edge, so no wall is drawn twice
for (let r = 0; r < GRID; r++){
    for (let c = 0; c < GRID; c++){
        let cell = mazeCells[r][c];
        let left = WorldX(c) - CELL/2, right = WorldX(c) + CELL/2;
        let top = WorldZ(r) - CELL/2, bottom = WorldZ(r) + CELL/2;

        if (cell.S) AddWallSegment(left, bottom, right, bottom);
        if (cell.E) AddWallSegment(right, top, right, bottom);
        if (r === 0 && cell.N) AddWallSegment(left, top, right, top);
        if (c === 0 && cell.W) AddWallSegment(left, top, left, bottom);
    }
}

map.push([0, 100, 0, 90, 0, 0, GRID*CELL + 400, GRID*CELL + 400, FLOOR]); //GROUND

var MAP_BOUND = (GRID * CELL) / 2 + 100;

var PLAYER_RADIUS = 40;
var ENEMY_RADIUS = 35;
var PICKUP_RADIUS = 130; // forgiving pickup range — don't require walking dead-center over an item

var START_CELL = {r:0, c:0};
var ENEMY_START_CELL = {r:GRID-1, c:GRID-1};

//collectible templates, cloned fresh into "coins"/"keys" every run
var keysTemplate = [
    [WorldX(GRID-1), 30, WorldZ(0), 0,0,0, 50,50, "keys.png"],
    [WorldX(0), 30, WorldZ(GRID-1), 0,0,0, 50,50, "keys.png"],
    [WorldX(3), 30, WorldZ(2), 0,0,0, 50,50, "keys.png"],
    [WorldX(5), 30, WorldZ(3), 0,0,0, 50,50, "keys.png"],
    [WorldX(2), 30, WorldZ(5), 0,0,0, 50,50, "keys.png"]
];

var coinsTemplate = [
    [WorldX(1), 30, WorldZ(1), 0,0,0, 50,50, "coins.png"],
    [WorldX(4), 30, WorldZ(4), 0,0,0, 50,50, "coins.png"],
    [WorldX(1), 30, WorldZ(4), 0,0,0, 50,50, "coins.png"],
    [WorldX(4), 30, WorldZ(1), 0,0,0, 50,50, "coins.png"],
    [WorldX(2), 30, WorldZ(2), 0,0,0, 50,50, "coins.png"]
];

var coins = [];
var keys = [];

//run state
var TOTAL_TIME = 90;
var BASE_LIVES = 3;
var ENEMY_SPEED = 2.4;
var CATCH_DIST_SQ = 6400;
var PATH_RECALC_MS = 500;
var difficultyEnemyBoost = 0;
var ABILITY_RANGE = 900;

//---- Difficulty presets ----
var DIFFICULTIES = {
    easy:   { label: "Easy",   time: 60,  keysNeeded: 2, enemyBoost: 0 },
    normal: { label: "Normal", time: 40,  keysNeeded: 3, enemyBoost: 0 },
    hard:   { label: "Hard",   time: 20,  keysNeeded: 5, enemyBoost: 0.5 }
};
var currentDifficulty = "normal";
var keysNeeded = DIFFICULTIES.normal.keysNeeded;

//---- Persistent shop / progress (saved to this computer via localStorage) ----
var SAVE_KEY_BANK = "vaultBank";
var SAVE_KEY_UNLOCKS = "vaultUnlocks";
var DEFAULT_UNLOCKS = { emp: false, dash: false, extraLives: 0 };

var SHOP_ITEMS = {
    emp:       { name: "EMP Blast",    desc: "Freeze the guard for 3s (SPACE)", cost: 10 },
    dash:      { name: "Shadow Dash",  desc: "Burst forward past danger (Q)",   cost: 15 },
    extraLife: { name: "Extra Life",   desc: "+1 max life",  baseCost: 10, costStep: 10, max: 2 }
};

function LoadBank(){
    return parseInt(localStorage.getItem(SAVE_KEY_BANK) || "0", 10) || 0;
}
function SaveBank(v){ localStorage.setItem(SAVE_KEY_BANK, String(v)); }

function LoadUnlocks(){
    let raw = localStorage.getItem(SAVE_KEY_UNLOCKS);
    if (!raw) return Object.assign({}, DEFAULT_UNLOCKS);
    try {
        return Object.assign({}, DEFAULT_UNLOCKS, JSON.parse(raw));
    } catch (e){
        return Object.assign({}, DEFAULT_UNLOCKS);
    }
}
function SaveUnlocks(u){ localStorage.setItem(SAVE_KEY_UNLOCKS, JSON.stringify(u)); }

var coinsBank = LoadBank();
var unlocks = LoadUnlocks();

function RenderShop(){
    let bankEl = document.getElementById("shopBank");
    if (bankEl) bankEl.textContent = "Coins: " + coinsBank;

    let empBtn = document.getElementById("buttonBuyEmp");
    if (empBtn){
        if (unlocks.emp){
            empBtn.textContent = "Owned";
            empBtn.disabled = true;
            empBtn.classList.add("owned");
        } else {
            empBtn.textContent = "Buy — " + SHOP_ITEMS.emp.cost;
            empBtn.disabled = coinsBank < SHOP_ITEMS.emp.cost;
            empBtn.classList.remove("owned");
        }
    }

    let dashBtn = document.getElementById("buttonBuyDash");
    if (dashBtn){
        if (unlocks.dash){
            dashBtn.textContent = "Owned";
            dashBtn.disabled = true;
            dashBtn.classList.add("owned");
        } else {
            dashBtn.textContent = "Buy — " + SHOP_ITEMS.dash.cost;
            dashBtn.disabled = coinsBank < SHOP_ITEMS.dash.cost;
            dashBtn.classList.remove("owned");
        }
    }

    let lifeBtn = document.getElementById("buttonBuyLife");
    if (lifeBtn){
        if (unlocks.extraLives >= SHOP_ITEMS.extraLife.max){
            lifeBtn.textContent = "Maxed";
            lifeBtn.disabled = true;
            lifeBtn.classList.add("owned");
        } else {
            let cost = SHOP_ITEMS.extraLife.baseCost + (unlocks.extraLives * SHOP_ITEMS.extraLife.costStep);
            lifeBtn.textContent = "Buy — " + cost;
            lifeBtn.disabled = coinsBank < cost;
            lifeBtn.classList.remove("owned");
        }
    }
}

function BuyEmp(){
    if (unlocks.emp || coinsBank < SHOP_ITEMS.emp.cost) return;
    coinsBank -= SHOP_ITEMS.emp.cost;
    unlocks.emp = true;
    SaveBank(coinsBank);
    SaveUnlocks(unlocks);
    RenderShop();
}

function BuyDash(){
    if (unlocks.dash || coinsBank < SHOP_ITEMS.dash.cost) return;
    coinsBank -= SHOP_ITEMS.dash.cost;
    unlocks.dash = true;
    SaveBank(coinsBank);
    SaveUnlocks(unlocks);
    RenderShop();
}

function BuyLife(){
    if (unlocks.extraLives >= SHOP_ITEMS.extraLife.max) return;
    let cost = SHOP_ITEMS.extraLife.baseCost + (unlocks.extraLives * SHOP_ITEMS.extraLife.costStep);
    if (coinsBank < cost) return;
    coinsBank -= cost;
    unlocks.extraLives++;
    SaveBank(coinsBank);
    SaveUnlocks(unlocks);
    RenderShop();
}

function ResetProgress(){
    if (!confirm("Reset all coins and shop unlocks? This cannot be undone.")) return;
    coinsBank = 0;
    unlocks = Object.assign({}, DEFAULT_UNLOCKS);
    SaveBank(0);
    SaveUnlocks(unlocks);
    RenderShop();
}

var startTime = 0;
var timeLeft = TOTAL_TIME;
var lives = BASE_LIVES;
var coinsCollected = 0;
var keysCollected = 0;
var invincibleUntil = 0;
var gameOver = false;
var TimerGame;

var enemy = {x: WorldX(ENEMY_START_CELL.c), y:30, z: WorldZ(ENEMY_START_CELL.r)};
var enemyPath = [];
var enemyPathTimer = 0;
var enemyHeading = 0;
var shakeMag = 0;

//movement variables
var PressLeft = 0;
var PressRight = 0;
var PressForward = 0;
var PressBack = 0;
var MouseX = 0;
var MouseY = 0;
var lock = false;
var canlock = false;

// space + dash ability key states
var PressSpace = false;
var PressDash = false;

var enemyStunnedUntil = 0;
var lastStunUsed = 0;
var STUN_COOLDOWN_MS = 8000; 
var STUN_DURATION_MS = 3000; 

var lastDashUsed = -999999;
var DASH_COOLDOWN_MS = 6000;
var DASH_DISTANCE = 220;

var container = document.getElementById("container");
var world = document.getElementById("world");
var pawn = new player(WorldX(START_CELL.c), 0, WorldZ(START_CELL.r), 0, 0);

var coinSound = new Audio("Sounds/coin.mp3");
var keySound = new Audio("Sounds/key.mp3");
var hitSound = new Audio("Sounds/hit.mp3");
var footstepSound = new Audio("Sounds/footstep.mp3");
var enemyNearSound = new Audio("Sounds/enemyNear.mp3");
var bgMusic = new Audio("Sounds/music.mp3");
var tickSound = new Audio("Sounds/tick.mp3");
enemyNearSound.loop = true;
bgMusic.loop = true;
footstepSound.volume = 0.45;
bgMusic.volume = 0.25;

// Countdown ticking — kicks in once time is running low, speeding up in the
// final stretch for extra urgency
var TIME_WARNING_THRESHOLD = 10; // seconds left before ticking starts
var lastTickSlot = -1;

var lastFootstepTime = 0;
var ENEMY_NEAR_RANGE = 650; // start playing the proximity sound once the guard is this close

var isMuted = localStorage.getItem("vaultMuted") === "true";
function ApplyMute(){
    [coinSound, keySound, hitSound, footstepSound, enemyNearSound, bgMusic, tickSound].forEach(a => a.muted = isMuted);
}
ApplyMute();

// Browsers block audio until the user has interacted with the page at least
// once, so background music can't just autoplay on load — kick it off on the
// first click anywhere and never again.
document.addEventListener("click", function StartMusicOnce(){
    bgMusic.play().catch(() => {});
    document.removeEventListener("click", StartMusicOnce);
}, { once: true });

// Keyboard mappings for movement, EMP (Space), and Dash (Q)
document.addEventListener("keydown", (event) => {
    if (event.key == "a") PressLeft = 5;
    if (event.key == "d") PressRight = 5;
    if (event.key == "w") PressForward = 5;
    if (event.key == "s") PressBack = 5;
    if (event.key === " ") { event.preventDefault(); PressSpace = true; }
    if (event.key === "q" || event.key === "Q") PressDash = true;
})

document.addEventListener("keyup", (event) => {
    if (event.key == "a") PressLeft = 0;
    if (event.key == "d") PressRight = 0;
    if (event.key == "w") PressForward = 0;
    if (event.key == "s") PressBack = 0;
    if (event.key === " ") PressSpace = false;
    if (event.key === "q" || event.key === "Q") PressDash = false;
})

container.onclick = function(){
    if (canlock) container.requestPointerLock();
}

document.addEventListener("pointerlockchange", (event) => {
    lock = !lock;
})

document.addEventListener("mousemove", (event) => {
    MouseX = event.movementX;
    MouseY = event.movementY;
})

// Pushes the player back out of a wall along whichever axis has the smaller
// overlap. Checks against the player's actual current position rather than
// guessing from last frame, so hitting a wall at a steep angle can't just slip
// through the thickness like it used to. Runs a few passes because fixing one
// wall can uncover a small overlap with the wall next to it at a corner -
// looping a few times settles the player somewhere clean of everything nearby.
function ResolveCollision(pos, prevX, prevZ, radius){
    pos.x = Math.max(-MAP_BOUND, Math.min(MAP_BOUND, pos.x));
    pos.z = Math.max(-MAP_BOUND, Math.min(MAP_BOUND, pos.z));

    for (let pass = 0; pass < 4; pass++){
        for (let w of WALLS){
            let half = w.thickness / 2;
            let xMinB, xMaxB, zMinB, zMaxB;

            if (w.axis === "x"){
                // wall sits at fixed x = w.pos, running along z from min to max
                xMinB = w.pos - half - radius; xMaxB = w.pos + half + radius;
                zMinB = w.min - radius;        zMaxB = w.max + radius;
            } else {
                // wall sits at fixed z = w.pos, running along x from min to max
                zMinB = w.pos - half - radius; zMaxB = w.pos + half + radius;
                xMinB = w.min - radius;        xMaxB = w.max + radius;
            }

            if (pos.x > xMinB && pos.x < xMaxB && pos.z > zMinB && pos.z < zMaxB){
                let penLeft = pos.x - xMinB;
                let penRight = xMaxB - pos.x;
                let penTop = pos.z - zMinB;
                let penBottom = zMaxB - pos.z;
                let minX = Math.min(penLeft, penRight);
                let minZ = Math.min(penTop, penBottom);

                if (minX < minZ){
                    pos.x = (penLeft < penRight) ? xMinB : xMaxB;
                } else {
                    pos.z = (penTop < penBottom) ? zMinB : zMaxB;
                }
            }
        }
    }
    return pos;
}

// Straight-line-of-sight check between two points against the maze walls, so
// abilities that require "seeing" the guard can't be fired blindly through walls.
function SegmentsIntersect(p1, p2, p3, p4){
    function ccw(a, b, c){ return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x); }
    return (ccw(p1, p3, p4) !== ccw(p2, p3, p4)) && (ccw(p1, p2, p3) !== ccw(p1, p2, p4));
}

function HasLineOfSight(x1, z1, x2, z2){
    let p1 = {x: x1, y: z1};
    let p2 = {x: x2, y: z2};
    for (let w of WALLS){
        let p3, p4;
        if (w.axis === "z"){
            p3 = {x: w.min, y: w.pos};
            p4 = {x: w.max, y: w.pos};
        } else {
            p3 = {x: w.pos, y: w.min};
            p4 = {x: w.pos, y: w.max};
        }
        if (SegmentsIntersect(p1, p2, p3, p4)) return false;
    }
    return true;
}

// Runs every frame - handles movement, both abilities, cooldown text on the HUD, camera shake.
function update(){
    let currentSpeedMod = 1.0;
    let isMoving = PressLeft || PressRight || PressForward || PressBack;

    // EMP blast - only usable if it's been bought in the Shop, and only if the
    // guard is actually visible (close enough + no wall in the way). Otherwise
    // it'd just be a free panic button you could spam blind.
    let now = Date.now();
    let abilityEl = document.getElementById("hudAbility");

    if (abilityEl) {
        if (!unlocks.emp) {
            abilityEl.textContent = "🔒 LOCKED (SHOP)";
            abilityEl.className = "hudItem cooldown";
            PressSpace = false;
        } else if (now > lastStunUsed + STUN_COOLDOWN_MS) {
            let distToEnemy = Math.hypot(enemy.x - pawn.x, enemy.z - pawn.z);
            let enemyVisible = distToEnemy <= ABILITY_RANGE && HasLineOfSight(pawn.x, pawn.z, enemy.x, enemy.z);

            if (enemyVisible) {
                abilityEl.textContent = "⚡ READY (SPACE)";
                abilityEl.className = "hudItem ready";
                if (PressSpace) {
                    enemyStunnedUntil = now + STUN_DURATION_MS;
                    lastStunUsed = now;
                    shakeMag = 24;
                    SpawnPopup(pawn.x, pawn.y - 20, pawn.z, "💥 STUNNED!");
                    let enemyDiv = document.getElementById("enemy");
                    if (enemyDiv) enemyDiv.classList.add("frozen");
                    PressSpace = false; // must release & re-press, no holding through cooldown
                }
            } else {
                abilityEl.textContent = "👁 NO TARGET";
                abilityEl.className = "hudItem notarget";
            }
        } else {
            let remainingCd = Math.ceil(((lastStunUsed + STUN_COOLDOWN_MS) - now) / 1000);
            abilityEl.textContent = "💿 CD: " + remainingCd + "s";
            abilityEl.className = "hudItem cooldown";
        }
    }

    if (now > enemyStunnedUntil) {
        let enemyDiv = document.getElementById("enemy");
        if (enemyDiv) enemyDiv.classList.remove("frozen");
    }

    // Shadow Dash ability — unlockable in the Shop, bound to Q
    let ability2El = document.getElementById("hudAbility2");
    if (ability2El && unlocks.dash) {
        if (now > lastDashUsed + DASH_COOLDOWN_MS) {
            ability2El.textContent = "🌀 DASH READY (Q)";
            ability2El.className = "hudItem ready";
            if (PressDash) {
                let rad = pawn.ry * deg;
                let fdx = -Math.sin(rad) * DASH_DISTANCE;
                let fdz = -Math.cos(rad) * DASH_DISTANCE;

                // Dash jumps 220px forward but walls are only 40px thick, so
                // teleporting straight to the end point and only checking
                // collision there could land you clean on the other side of a
                // wall without ever touching it. Breaking it into small steps
                // (each smaller than a wall) and checking collision every step
                // means you can't skip over a wall like that anymore.
                let dashSteps = 12;
                let stepX = fdx / dashSteps, stepZ = fdz / dashSteps;
                let cx = pawn.x, cz = pawn.z;
                for (let s = 0; s < dashSteps; s++){
                    let next = ResolveCollision({x: cx + stepX, z: cz + stepZ}, cx, cz, PLAYER_RADIUS);
                    cx = next.x;
                    cz = next.z;
                }
                pawn.x = cx;
                pawn.z = cz;
                lastDashUsed = now;
                shakeMag = 14;
                SpawnPopup(pawn.x, pawn.y - 20, pawn.z, "💨 DASH!");
                PressDash = false;
            }
        } else {
            let remainingCd = Math.ceil(((lastDashUsed + DASH_COOLDOWN_MS) - now) / 1000);
            ability2El.textContent = "💿 CD: " + remainingCd + "s";
            ability2El.className = "hudItem cooldown";
        }
    }

    // Raw left/right and forward/back amounts before rotation is applied.
    // Holding two keys at once (like W+A) adds both, which makes moving
    // diagonally faster than moving straight - clamp the combined vector back
    // down to normal speed so diagonal movement isn't a free speed boost.
    let moveRight = PressRight - PressLeft;
    let moveForward = PressForward - PressBack;
    let moveMag = Math.sqrt(moveRight*moveRight + moveForward*moveForward);
    if (moveMag > 5){
        moveRight = (moveRight / moveMag) * 5;
        moveForward = (moveForward / moveMag) * 5;
    }

    let dx = (moveRight * Math.cos(pawn.ry * deg) - moveForward * Math.sin(pawn.ry * deg)) * currentSpeedMod;
    let dz = (-moveRight * Math.sin(pawn.ry * deg) - moveForward * Math.cos(pawn.ry * deg)) * currentSpeedMod;
    let drx = MouseY * 0.5;
    let dry = -MouseX * 0.5;
    MouseX = MouseY = 0;

    let moved = ResolveCollision({x: pawn.x + dx, z: pawn.z + dz}, pawn.x, pawn.z, PLAYER_RADIUS);
    pawn.x = moved.x;
    pawn.z = moved.z;

    if (isMoving){
        let footstepInterval = 350;
        if (now > lastFootstepTime + footstepInterval){
            footstepSound.currentTime = 0;
            footstepSound.play().catch(() => {});
            lastFootstepTime = now;
        }
    }

    if (lock){
        pawn.rx = pawn.rx + drx;
        pawn.ry = pawn.ry + dry;
        pawn.rx = Math.max(-90, Math.min(90, pawn.rx));
    }

    let shakeX = 0, shakeY = 0;
    if (shakeMag > 0){
        shakeX = (Math.random() - 0.5) * shakeMag;
        shakeY = (Math.random() - 0.5) * shakeMag;
        shakeMag *= 0.85;
        if (shakeMag < 0.5) shakeMag = 0;
    }

    world.style.transform = "translateZ(600px)" +
        "rotateX(" + (-pawn.rx) + "deg)" +
        "rotateY(" + (-pawn.ry) + "deg)" +
        "translate3d(" + (-pawn.x + shakeX) + "px," + (-pawn.y + shakeY) + "px," + (-pawn.z) + "px)";
}

function CreateSquares(squares,string){
    for (let i = 0; i < squares.length; i++){
        let newElement = document.createElement("div");
        newElement.className = string + " square";
        newElement.id = string + i;
        newElement.style.width = squares[i][6] + "px";
        newElement.style.height = squares[i][7] + "px";
        newElement.style.background = squares[i][8];
        if (/\.(png|jpg|jpeg|gif|svg)$/i.test(squares[i][8])){
            newElement.style.backgroundImage = "url(" + squares[i][8] + ")";
            newElement.style.backgroundSize = "cover";
        }
        if (squares[i][9] !== undefined) newElement.style.opacity = squares[i][9];
        newElement.style.transform =
            "translate3d(" + (600 - squares[i][6]/2 + squares[i][0]) + "px," +
            (400 - squares[i][7]/2 + squares[i][1]) + "px," +
            squares[i][2] + "px)" +
            "rotateX(" + squares[i][3] + "deg)" +
            "rotateY(" + squares[i][4] + "deg)" +
            "rotateZ(" + squares[i][5] + "deg)";
        world.append(newElement);
    }
}

function rotate(squares, string, ra){
    for (let i = 0; i < squares.length; i++){
        if (squares[i][0] >= 500000) continue;
        squares[i][4] = squares[i][4] + ra;
        let element = document.getElementById(string + i);
        if (element){
            element.style.transform = "translate3d(" + (600 - squares[i][6]/2 + squares[i][0]) + "px," +
                (400 - squares[i][7]/2 + squares[i][1]) + "px," +
                squares[i][2] + "px)" +
                "rotateX(" + squares[i][3] + "deg)" +
                "rotateY(" + squares[i][4] + "deg)" +
                "rotateZ(" + squares[i][5] + "deg)";
        }
    }
}

function SpawnPopup(x,y,z,text){
    let p = document.createElement("div");
    p.className = "popup";
    p.textContent = text;
    p.style.transform = "translate3d(" + (600+x) + "px," + (400+y) + "px," + z + "px)";
    world.append(p);
    setTimeout(() => p.remove(), 800);
}

function SpawnBurst(x,y,z){
    for (let i = 0; i < 8; i++){
        let s = document.createElement("div");
        s.className = "spark";
        let angle = (i / 8) * Math.PI * 2;
        s.style.setProperty("--endx", (600 + x + Math.cos(angle) * 60) + "px");
        s.style.setProperty("--endy", (400 + y + Math.sin(angle) * 60) + "px");
        s.style.setProperty("--endz", z + "px");
        s.style.transform = "translate3d(" + (600+x) + "px," + (400+y) + "px," + z + "px)";
        world.append(s);
        setTimeout(() => s.remove(), 600);
    }
}

function KeyFlash(){
    let f = document.getElementById("keyFlash");
    if (f) f.classList.add("active");
    setTimeout(() => { if (f) f.classList.remove("active"); }, 200);
}

function UpdateCompass(){
    let arrow = document.getElementById("compassArrow");
    if (!arrow) return;
    let nearest = null;
    let nearestDist = Infinity;
    for (let k of keys){
        if (k[0] >= 500000) continue;
        let dx = k[0] - pawn.x;
        let dz = k[2] - pawn.z;
        let d = dx*dx + dz*dz;
        if (d < nearestDist){ nearestDist = d; nearest = {dx, dz}; }
    }
    if (!nearest){ arrow.style.opacity = 0; return; }
    arrow.style.opacity = 1;
    arrow.style.transform = "rotate(" + (Bearing(nearest.dx, nearest.dz) + pawn.ry) + "deg)";
}

function interact(squares, string, objectSound, onCollect){
    for (let i = 0; i < squares.length; i++){
        if (squares[i][0] >= 500000) continue;
        let ox = squares[i][0], oy = squares[i][1], oz = squares[i][2];
        let dx = ox - pawn.x, dz = oz - pawn.z;
        let dis = dx*dx + dz*dz; // horizontal distance only — height offset shouldn't make pickups harder
        let is = PICKUP_RADIUS * PICKUP_RADIUS;
        if (dis < is){
            objectSound.play().catch(() => {});
            let element = document.getElementById(string + i);
            if (element) element.style.display = "none";
            SpawnPopup(ox, oy, oz, onCollect(ox, oy, oz));
            squares[i][0] = 1000000;
        }
    }
}

function CreateEnemy(){
    let enemyDiv = document.createElement("div");
    enemyDiv.id = "enemy";
    enemyDiv.className = "square enemy";
    enemyDiv.style.width = "60px";
    enemyDiv.style.height = "60px";
    world.append(enemyDiv);
    RenderEnemy(9999, 0);
}

function RenderEnemy(dist, heading){
    let enemyDiv = document.getElementById("enemy");
    if (!enemyDiv) return;
    let scale = Math.max(1, Math.min(1.6, 1 + (500 - dist) / 500));
    enemyDiv.style.transform =
        "translate3d(" + (570 + enemy.x) + "px," + (370 + enemy.y) + "px," + enemy.z + "px) rotateY(" + heading + "deg) scale(" + scale + ")";
}

function UpdateTension(dist){
    let vign = document.getElementById("vignette");
    if (vign){
        let t = Math.max(0, Math.min(1, (500 - dist) / 500));
        vign.style.opacity = t * 0.6;
    }

    // Enemy proximity sound — fades in as the guard gets close, stops once it backs off
    if (dist < ENEMY_NEAR_RANGE && !gameOver){
        let proximity = 1 - (dist / ENEMY_NEAR_RANGE); // 0 at edge of range, 1 right on top of you
        enemyNearSound.volume = Math.max(0.15, Math.min(1, proximity));
        if (enemyNearSound.paused) enemyNearSound.play().catch(() => {});
    } else if (!enemyNearSound.paused){
        enemyNearSound.pause();
    }
}

//BFS over the maze graph — always finds the real corridor route, so the enemy never gets stuck on a wall
function FindPath(start, goal){
    if (start.r === goal.r && start.c === goal.c) return [start];
    let key = (r,c) => r + "_" + c;
    let queue = [start];
    let visited = {[key(start.r,start.c)]: true};
    let cameFrom = {};

    while (queue.length){
        let cur = queue.shift();
        let cell = mazeCells[cur.r][cur.c];
        let neighbors = [];
        if (!cell.N && cur.r > 0) neighbors.push({r:cur.r-1, c:cur.c});
        if (!cell.S && cur.r < GRID-1) neighbors.push({r:cur.r+1, c:cur.c});
        if (!cell.W && cur.c > 0) neighbors.push({r:cur.r, c:cur.c-1});
        if (!cell.E && cur.c < GRID-1) neighbors.push({r:cur.r, c:cur.c+1});

        for (let n of neighbors){
            let k = key(n.r, n.c);
            if (visited[k]) continue;
            visited[k] = true;
            cameFrom[k] = cur;
            if (n.r === goal.r && n.c === goal.c){
                let path = [n];
                let ck = k;
                while (cameFrom[ck]){
                    path.unshift(cameFrom[ck]);
                    ck = key(cameFrom[ck].r, cameFrom[ck].c);
                }
                return path;
            }
            queue.push(n);
        }
    }
    return [start];
}

// Guard halts if stunned and dynamically gains speed based on collected keys
function MoveEnemy(){
    if (Date.now() < enemyStunnedUntil) {
        let directDist = Math.hypot(pawn.x - enemy.x, pawn.z - enemy.z);
        RenderEnemy(directDist, enemyHeading);
        return; 
    }

    // Guard gets faster per key collected, plus a flat boost on harder difficulties
    let currentSpeed = ENEMY_SPEED + difficultyEnemyBoost + (keysCollected * 0.6);

    let enemyCell = CellOf(enemy.x, enemy.z);
    let playerCell = CellOf(pawn.x, pawn.z);
    let sameCell = (enemyCell.r === playerCell.r && enemyCell.c === playerCell.c);

    if (!sameCell && (Date.now() > enemyPathTimer || enemyPath.length < 2)){
        enemyPath = FindPath(enemyCell, playerCell);
        enemyPathTimer = Date.now() + PATH_RECALC_MS;
    }

    let tx, tz;
    if (sameCell){
        // Once in the same cell, chase the player's exact position instead of
        // the cell's center point — otherwise the guard parks at the center
        // and standing off-center (e.g. right after taking a hit) is "safe" forever.
        tx = pawn.x;
        tz = pawn.z;
    } else {
        let target = enemyPath.length > 1 ? enemyPath[1] : playerCell;
        tx = WorldX(target.c);
        tz = WorldZ(target.r);
    }

    let dx = tx - enemy.x;
    let dz = tz - enemy.z;
    let dist = Math.sqrt(dx*dx + dz*dz);
    if (dist > 5){
        enemyHeading = Bearing(dx, dz);
        let nx = enemy.x + (dx/dist) * currentSpeed; 
        let nz = enemy.z + (dz/dist) * currentSpeed; 
        let moved = ResolveCollision({x: nx, z: nz}, enemy.x, enemy.z, ENEMY_RADIUS);
        enemy.x = moved.x;
        enemy.z = moved.z;
    } else if (!sameCell && enemyPath.length > 1){
        enemyPath.shift();
    }

    let directDist = Math.hypot(pawn.x - enemy.x, pawn.z - enemy.z);
    RenderEnemy(directDist, enemyHeading);
    UpdateTension(directDist);
}

function CheckEnemyCollision(){
    if (Date.now() < invincibleUntil) return;
    let dx = pawn.x - enemy.x;
    let dz = pawn.z - enemy.z;
    let dist = dx*dx + dz*dz;
    if (dist < CATCH_DIST_SQ){
        lives--;
        invincibleUntil = Date.now() + 1500;
        shakeMag = 18;
        Flash();
        hitSound.play().catch(() => {});
        UpdateHUD();
        if (lives <= 0) EndGame(false);
    }
}

function Flash(){
    let f = document.getElementById("flash");
    if (f) f.classList.add("active");
    setTimeout(() => { if (f) f.classList.remove("active"); }, 150);
}

function UpdateTimer(){
    let elapsed = (Date.now() - startTime) / 1000;
    timeLeft = Math.max(0, TOTAL_TIME - elapsed);
    if (timeLeft <= 0 && !gameOver) EndGame(false);

    // Ticking speeds up (every 0.5s instead of every 1s) in the final 5 seconds
    if (timeLeft > 0 && timeLeft <= TIME_WARNING_THRESHOLD && !gameOver){
        let tickInterval = timeLeft <= 5 ? 0.5 : 1;
        let tickSlot = Math.floor(timeLeft / tickInterval);
        if (tickSlot !== lastTickSlot){
            lastTickSlot = tickSlot;
            tickSound.currentTime = 0;
            tickSound.play().catch(() => {});
        }
    }

    UpdateHUD();
}

function UpdateHUD(){
    let timerEl = document.getElementById("hudTimer");
    if (timerEl) {
        timerEl.textContent = Math.ceil(timeLeft);
        timerEl.classList.toggle("warning", timeLeft <= TIME_WARNING_THRESHOLD);
    }

    // Full-screen edge pulse so the low-time warning isn't easy to miss while
    // focused on the maze rather than the HUD text
    let timeWarnEl = document.getElementById("timeWarning");
    if (timeWarnEl) timeWarnEl.classList.toggle("active", timeLeft > 0 && timeLeft <= TIME_WARNING_THRESHOLD);
    
    let keysEl = document.getElementById("hudKeys");
    if (keysEl) keysEl.textContent = "Keys: " + keysCollected + "/" + keysNeeded;
    
    let coinsEl = document.getElementById("hudCoins");
    if (coinsEl) coinsEl.textContent = "Coins: " + coinsCollected;
    
    let livesEl = document.getElementById("hudLives");
    if (livesEl) livesEl.textContent = "❤".repeat(Math.max(0, lives));
    
    UpdateCompass();
}

function EndGame(won){
    if (gameOver) return; // guard against double-firing in the same tick
    gameOver = true;
    canlock = false;
    enemyNearSound.pause();
    tickSound.pause();
    tickSound.currentTime = 0;
    tickSound.muted = true; // extra safety - if pause() loses a race with a play() that
                             // was still starting up, muting still guarantees it's silent
    clearInterval(TimerGame);
    document.exitPointerLock();

    let hudEl = document.getElementById("hud");
    if (hudEl) hudEl.style.display = "none";

    let timeWarnEl = document.getElementById("timeWarning");
    if (timeWarnEl) timeWarnEl.classList.remove("active");
    
    if (won){
        // Coins only bank to the Shop on a successful escape
        coinsBank = LoadBank() + coinsCollected;
        SaveBank(coinsBank);

        let statsEl = document.getElementById("winStats");
        if (statsEl) statsEl.textContent = "Time: " + (TOTAL_TIME - timeLeft).toFixed(1) + "s    Coins: " + coinsCollected + "    Bank: " + coinsBank;
        if (typeof menu3 !== "undefined") menu3.style.display = "block";
    } else {
        let loseStatsEl = document.getElementById("loseStats");
        if (loseStatsEl) loseStatsEl.textContent = "Out of time, or out of lives. The vault stays locked. You lost " + coinsCollected + " uncollected coins — nothing was banked.";
        if (typeof menu5 !== "undefined") menu5.style.display = "block";
    }
}

function ResetGame(){
    world.innerHTML = "";
    pawn.x = WorldX(START_CELL.c); pawn.y = 0; pawn.z = WorldZ(START_CELL.r);
    pawn.rx = 0; pawn.ry = 0;
    coins = JSON.parse(JSON.stringify(coinsTemplate));
    keys = JSON.parse(JSON.stringify(keysTemplate));
    coinsCollected = 0;
    keysCollected = 0;

    // Pull the latest Shop unlocks and apply the chosen difficulty
    unlocks = LoadUnlocks();
    let diff = DIFFICULTIES[currentDifficulty] || DIFFICULTIES.normal;
    TOTAL_TIME = diff.time;
    keysNeeded = diff.keysNeeded;
    difficultyEnemyBoost = diff.enemyBoost || 0;
    lives = BASE_LIVES + (unlocks.extraLives || 0);

    timeLeft = TOTAL_TIME;
    gameOver = false;
    enemy.x = WorldX(ENEMY_START_CELL.c);
    enemy.z = WorldZ(ENEMY_START_CELL.r);
    enemyPath = [];
    enemyPathTimer = 0;
    enemyHeading = 0;
    shakeMag = 0;

    enemyStunnedUntil = 0;
    lastStunUsed = 0;
    lastDashUsed = -999999;
    PressSpace = false;
    PressDash = false;
    lastTickSlot = -1;
    tickSound.muted = isMuted; // un-mute after EndGame's hard mute, but still respect the mute button

    let timeWarnEl = document.getElementById("timeWarning");
    if (timeWarnEl) timeWarnEl.classList.remove("active");

    CreateSquares(map, "map");
    CreateSquares(coins, "coin");
    CreateSquares(keys, "key");
    CreateEnemy();

    let hudEl = document.getElementById("hud");
    if (hudEl) hudEl.style.display = "flex";

    let ability2El = document.getElementById("hudAbility2");
    if (ability2El) ability2El.style.display = unlocks.dash ? "block" : "none";

    UpdateHUD();
    startTime = Date.now();
}

function Repeat(){
    if (gameOver) return;
    update();
    UpdateTimer();
    MoveEnemy();
    CheckEnemyCollision();
    interact(coins, "coin", coinSound, () => {
        coinsCollected++;
        UpdateHUD();
        return "+10";
    });
    interact(keys, "key", keySound, (x,y,z) => {
        keysCollected++;
        UpdateHUD();
        SpawnBurst(x,y,z);
        KeyFlash();
        if (keysCollected >= keysNeeded) EndGame(true);
        return "Key!";
    });
    rotate(coins, "coin", 0.5);
    rotate(keys, "key", 0.5);
}

function SaveScore(){
    let nameInput = document.getElementById("nameInput");
    let name = nameInput ? nameInput.value.trim() : "Player";
    if (!name) name = "Player";
    let time = TOTAL_TIME - timeLeft;
    let scores = JSON.parse(localStorage.getItem("vaultScores") || "[]");
    scores.push({name: name, time: time, coins: coinsCollected});
    scores.sort((a,b) => a.time - b.time);
    scores = scores.slice(0,10);
    localStorage.setItem("vaultScores", JSON.stringify(scores));
    if (nameInput) nameInput.value = "";
    if (typeof menu3 !== "undefined") menu3.style.display = "none";
    ShowLeaderboard();
}

function ShowLeaderboard(){
    let scores = JSON.parse(localStorage.getItem("vaultScores") || "[]");
    let list = document.getElementById("scoreList");
    if (!list) return;
    list.innerHTML = "";
    if (scores.length === 0){
        list.innerHTML = "<li>No runs yet — be the first</li>";
    } else {
        scores.forEach(s => {
            let li = document.createElement("li");
            li.textContent = s.name + " — " + s.time.toFixed(1) + "s (" + s.coins + " coins)";
            list.append(li);
        });
    }
    if (typeof menu4 !== "undefined") menu4.style.display = "block";
}