
import "./style.css";
import { Game } from "./Game.js";

// Get the game canvas.
const canvas = document.getElementById("gameCanvas");

// Create and start the game.
const game = new Game(canvas);
game.start();

// Interface controls.
const pauseButton = document.getElementById("pauseButton");
const soundButton = document.getElementById("soundButton");
const restartButton = document.getElementById("restartButton");

// Pause / Resume.
pauseButton.addEventListener("click", () => {
  game.input.pauseRequested = true;
});

// Sound On / Off.
soundButton.addEventListener("click", () => {
  game.audio.unlock();
  game.input.muteRequested = true;
});

// Restart the game.
restartButton.addEventListener("click", () => {
  game.audio.unlock();
  game.restart();
});

// Keep the button labels synchronized with game state.
function updateControls() {
  soundButton.textContent = game.audio.muted
    ? "Sound: Off"
    : "Sound: On";

  pauseButton.textContent = game.state === "paused"
    ? "Resume"
    : "Pause";

  requestAnimationFrame(updateControls);
}

updateControls();

// Unlock audio on the first user interaction.
// Mobile browsers require user interaction before
// allowing audio playback.
const unlockAudio = () => {
  game.audio.unlock();
};

window.addEventListener("pointerdown", unlockAudio, {
  once: true
});

window.addEventListener("keydown", unlockAudio, {
  once: true
});
