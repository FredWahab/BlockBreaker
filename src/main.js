
/* ==========================================================
   BLOCK BREAKER — APPLICATION ENTRY POINT

   Connects:
   - Game initialization
   - Interface controls
   - Developer console cheats
   - Arcade high-score leaderboard
   - Player name entry
   - Mobile audio unlocking
   ========================================================== */

import "./style.css";

import { Game } from "./Game.js";
import { Leaderboard } from "./Leaderboard.js";
import { LeaderboardUI } from "./LeaderboardUI.js";

// ==========================================================
// Initialize Game
// ==========================================================

const canvas = document.getElementById("gameCanvas");

const game = new Game(canvas);

// ==========================================================
// Initialize Leaderboard
// ==========================================================

const leaderboard = new Leaderboard();
const leaderboardUI = new LeaderboardUI(game, leaderboard);

// Track the number of the last submitted run.
// Leaderboard.js also prevents duplicate submissions.
let lastFinishedRunId = null;

// When a legitimate game ends, check whether its score
// qualifies for the arcade leaderboard.
game.onRunFinished = (result) => {
  if (lastFinishedRunId === result.runId) {
    return;
  }

  lastFinishedRunId = result.runId;

  if (!result.eligible) {
    console.log(
      "[Block Breaker] Cheat-assisted run. " +
      "Score is not eligible for the leaderboard."
    );
    return;
  }

  if (!leaderboard.qualifies(result)) {
    console.log(
      "[Block Breaker] Game finished. " +
      "Score did not reach the top 10."
    );
    return;
  }

  console.log(
    "[Block Breaker] New high score! " +
    "Enter your initials to save your record."
  );

  // Automatically show the name-entry screen.
  leaderboardUI.showEntry(result);
};

// ==========================================================
// Pause Gameplay While Leaderboard Is Open
// ==========================================================

// The regular game loop continues rendering, but
// gameplay updates are suspended while the leaderboard
// is visible.
//
// This preserves the exact game state when viewing
// high scores during an active level.

const originalUpdate = game.update.bind(game);

game.update = (dt) => {
  if (leaderboardUI.isOpen()) {
    return;
  }

  originalUpdate(dt);
};

// Clear any buffered input when entering/leaving a modal.
// This prevents a Spacebar press or canvas tap from
// unintentionally triggering gameplay afterward.

function clearBufferedInput() {
  game.input.actionRequested = false;
  game.input.pauseRequested = false;
  game.input.restartRequested = false;
  game.input.muteRequested = false;

  game.input.keys.clear();
  game.input.pointerDown = false;
  game.input.spaceDown = false;
  game.input.spaceDownTime = 0;
}

// ==========================================================
// Game Controls
// ==========================================================

const pauseButton = document.getElementById("pauseButton");
const soundButton = document.getElementById("soundButton");
const highScoresButton = document.getElementById(
  "highScoresButton"
);
const restartButton = document.getElementById("restartButton");

// Pause / Resume.
pauseButton.addEventListener("click", () => {
  if (leaderboardUI.isOpen()) return;

  game.input.pauseRequested = true;
});

// Sound On / Off.
soundButton.addEventListener("click", () => {
  if (leaderboardUI.isOpen()) return;

  game.audio.unlock();
  game.input.muteRequested = true;
});

// View High Scores.
highScoresButton.addEventListener("click", () => {
  if (leaderboardUI.isOpen()) return;

  clearBufferedInput();
  leaderboardUI.open();
});

// Restart.
restartButton.addEventListener("click", () => {
  if (leaderboardUI.isOpen()) return;

  game.audio.unlock();
  game.restart();
});

// ==========================================================
// Keep Interface Labels Updated
// ==========================================================

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

// ==========================================================
// Modal Input Protection
// ==========================================================

// Prevent gameplay shortcuts from being activated while
// interacting with the high-score interface.
//
// This works alongside the keyboard handling already
// present in LeaderboardUI.js.

document.addEventListener(
  "keyup",
  (event) => {
    if (!leaderboardUI.isOpen()) return;

    if (
      [
        "Space",
        "ArrowLeft",
        "ArrowRight",
        "KeyA",
        "KeyD",
        "KeyP",
        "KeyR",
        "KeyM"
      ].includes(event.code)
    ) {
      event.stopImmediatePropagation();
    }
  },
  true
);

// Clear buffered input when the leaderboard closes.
// Wrap the UI's close method so both the Close and Back
// buttons get the same behavior.

const originalClose = leaderboardUI.close.bind(
  leaderboardUI
);

leaderboardUI.close = () => {
  originalClose();

  if (!leaderboardUI.isOpen()) {
    clearBufferedInput();
  }
};

// ==========================================================
// Audio Unlocking
// ==========================================================

// Mobile browsers require user interaction before sound
// playback. Preserve the existing Howler.js approach.

const unlockAudio = () => {
  game.audio.unlock();
};

window.addEventListener(
  "pointerdown",
  unlockAudio,
  { once: true }
);

window.addEventListener(
  "keydown",
  unlockAudio,
  { once: true }
);

// ==========================================================
// Start Game
// ==========================================================

game.start();

console.log(
  "%c[Block Breaker] Arcade leaderboard initialized.",
  "color: #38bdf8; font-weight: bold;"
);

console.log(
  "[Block Breaker] Top 10 scores are saved locally. " +
  "Cheat-assisted runs cannot submit scores."
);
