var menu1 = document.getElementById("menu1");
var menu2 = document.getElementById("menu2");
var menu3 = document.getElementById("menu3");
var menu4 = document.getElementById("menu4");
var menu5 = document.getElementById("menu5");
var menu6 = document.getElementById("menu6");
var menu7 = document.getElementById("menu7");
var menu8 = document.getElementById("menu8");

var button1 = document.getElementById("button1");
var button2 = document.getElementById("button2");
var button3 = document.getElementById("button3");
var button4 = document.getElementById("button4");
var button5 = document.getElementById("button5");
var button6 = document.getElementById("button6");
var button7 = document.getElementById("button7");
var buttonSkip = document.getElementById("buttonSkip"); // "skip saving score" button on the win screen

var buttonShop = document.getElementById("buttonShop");
var buttonDiffEasy = document.getElementById("buttonDiffEasy");
var buttonDiffNormal = document.getElementById("buttonDiffNormal");
var buttonDiffHard = document.getElementById("buttonDiffHard");
var buttonDiffBack = document.getElementById("buttonDiffBack");
var buttonTutorialGo = document.getElementById("buttonTutorialGo");
var buttonTutorialBack = document.getElementById("buttonTutorialBack");
var buttonShopBack = document.getElementById("buttonShopBack");
var buttonBuyEmp = document.getElementById("buttonBuyEmp");
var buttonBuyDash = document.getElementById("buttonBuyDash");
var buttonBuyLife = document.getElementById("buttonBuyLife");
var buttonResetProgress = document.getElementById("buttonResetProgress");

// Start Game now opens Difficulty Select first, instead of jumping straight into a run
button1.onclick = function(){
    menu1.style.display = "none";
    menu6.style.display = "block";
}

button2.onclick = function(){
    menu1.style.display = "none";
    menu2.style.display = "block";
}

button3.onclick = function(){
    menu2.style.display = "none";
    menu1.style.display = "block";
}

button4.onclick = function(){
    menu1.style.display = "none";
    ShowLeaderboard();
}

button5.onclick = function(){
    SaveScore();
}

button6.onclick = function(){
    menu4.style.display = "none";
    menu1.style.display = "block";
}

button7.onclick = function(){
    menu5.style.display = "none";
    menu1.style.display = "block";
}

// go straight back to the main menu without saving a score
buttonSkip.onclick = function(){
    menu3.style.display = "none";
    menu1.style.display = "block";
}

// ---- Shop ----
buttonShop.onclick = function(){
    menu1.style.display = "none";
    menu8.style.display = "block";
    RenderShop();
}

buttonShopBack.onclick = function(){
    menu8.style.display = "none";
    menu1.style.display = "block";
}

buttonBuyEmp.onclick = function(){ BuyEmp(); }
buttonBuyDash.onclick = function(){ BuyDash(); }
buttonBuyLife.onclick = function(){ BuyLife(); }
buttonResetProgress.onclick = function(){ ResetProgress(); }

// ---- Difficulty select ----
function SelectDifficulty(diff){
    currentDifficulty = diff;
    menu6.style.display = "none";
    menu7.style.display = "block";
}

buttonDiffEasy.onclick = function(){ SelectDifficulty("easy"); }
buttonDiffNormal.onclick = function(){ SelectDifficulty("normal"); }
buttonDiffHard.onclick = function(){ SelectDifficulty("hard"); }

buttonDiffBack.onclick = function(){
    menu6.style.display = "none";
    menu1.style.display = "block";
}

// ---- Pre-level tutorial ----
buttonTutorialGo.onclick = function(){
    menu7.style.display = "none";
    ResetGame();
    TimerGame = setInterval(Repeat, 10);
    canlock = true;
}

buttonTutorialBack.onclick = function(){
    menu7.style.display = "none";
    menu6.style.display = "block";
}

// ---- Mute ----
var muteButton = document.getElementById("muteButton");

function ToggleMute(){
    isMuted = !isMuted;
    localStorage.setItem("vaultMuted", isMuted ? "true" : "false");
    ApplyMute();
    muteButton.textContent = isMuted ? "🔇" : "🔊";
    muteButton.classList.toggle("isMuted", isMuted);
}

muteButton.textContent = isMuted ? "🔇" : "🔊";
muteButton.classList.toggle("isMuted", isMuted);
muteButton.onclick = ToggleMute;

document.addEventListener("keydown", (event) => {
    if (event.key === "m" || event.key === "M") ToggleMute();
})