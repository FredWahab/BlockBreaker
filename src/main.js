
/* ==========================================================
   BLOCK BREAKER — APPLICATION ENTRY POINT

   Connects:
   - Game initialization
   - Interface controls
   - Developer console cheats
   - Arcade leaderboard
   - High-score name entry
   - Victory celebration timing
   - Mobile audio unlocking
   ========================================================== */

import "./style.css";

import { Game } from "./Game.js";
import { Leaderboard } from "./Leaderboard.js";
import { LeaderboardUI } from "./LeaderboardUI.js";

// ==========================================================
// Initialize
// ==========================================================

const canvas = document.getElementById("gameCanvas");

const game = new Game(canvas);

const leaderboard = new Leaderboard();
const leaderboardUI = new LeaderboardUI(game, leaderboard);

// ==========================================================
// Victory Celebration
// ==========================================================

// Give players time to appreciate completing all 30 levels
// before asking them to enter their initials.

const VICTORY_CELEBRATION_MS = 6000;

let pendingVictoryResult = null;
let victoryCelebrationStarted = 0;
let victoryHoldUntil = 0;

let lastFinishedRunId = null;

// ==========================================================
// Leaderboard Qualification
// ==========================================================

game.onRunFinished = (result) => {
  if (lastFinishedRunId === result.runId) {
    return;
  }

  lastFinishedRunId = result.runId;

  // A completed campaign gets its own celebration before
  // name entry, whether the run qualifies or not.
  if (result.completed) {
    victoryCelebrationStarted = performance.now();

    victoryHoldUntil =
      victoryCelebrationStarted + VICTORY_CELEBRATION_MS;

    if (result.eligible && leaderboard.qualifies(result)) {
      pendingVictoryResult = result;

      console.log(
        "[Block Breaker] Campaign complete! " +
        "New high score — initials entry will follow " +
        "the victory celebration."
      );
    } else {
      pendingVictoryResult = null;

      console.log(
        "[Block Breaker] Campaign complete! " +
        (
          result.eligible
            ? "Final score did not qualify for the top 10."
            : "This run is not leaderboard eligible."
        )
      );
    }

    return;
  }

  // Ordinary game over: show qualifying initials entry
  // immediately.
  if (!result.eligible) {
    console.log(
      "[Block Breaker] Cheat-assisted or checkpoint " +
      "continued run. Leaderboard entry disabled."
    );
    return;
  }

  if (!leaderboard.qualifies(result)) {
    console.log(
      "[Block Breaker] Game over. " +
      "Score did not reach the top 10."
    );
    return;
  }

  console.log(
    "[Block Breaker] New high score! " +
    "Enter your initials to save your record."
  );

  clearBufferedInput();
  leaderboardUI.showEntry(result);
};

// ==========================================================
// Input Management
// ==========================================================

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
// Suspend Gameplay for Modal and Victory Sequence
// ==========================================================

const originalUpdate = game.update.bind(game);

game.update = (dt) => {
  // Never update gameplay while a leaderboard screen is open.
  if (leaderboardUI.isOpen()) {
    return;
  }

  // When the player wins, prevent accidental key presses
  // or taps from immediately restarting the campaign
  // before the victory sequence has been displayed.
  if (
    game.state === "won" &&
    victoryHoldUntil > 0
  ) {
    const now = performance.now();

    if (now < victoryHoldUntil) {
      clearBufferedInput();
      return;
    }

    victoryHoldUntil = 0;

    // Open the initials screen after the celebration.
    if (pendingVictoryResult) {
      const result = pendingVictoryResult;
      pendingVictoryResult = null;

      clearBufferedInput();

      leaderboardUI.showEntry(result);
      return;
    }
  }

  originalUpdate(dt);
};

// ==========================================================
// Interface Controls
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
  if (victoryHoldUntil > 0) return;

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

  // Don't interrupt an unfinished victory celebration.
  if (victoryHoldUntil > 0) return;

  clearBufferedInput();
  leaderboardUI.open();
});

// Restart.
restartButton.addEventListener("click", () => {
  if (leaderboardUI.isOpen()) return;

  // Prevent bypassing high-score name entry immediately
  // after finishing the campaign.
  if (victoryHoldUntil > 0) return;

  game.audio.unlock();
  game.restart();

  pendingVictoryResult = null;
  victoryHoldUntil = 0;
  victoryCelebrationStarted = 0;
});

// ==========================================================
// Keep Buttons Synchronized
// ==========================================================

function updateControls() {
  soundButton.textContent = game.audio.muted
    ? "Sound: Off"
    : "Sound: On";

  pauseButton.textContent = game.state === "paused"
    ? "Resume"
    : "Pause";

  const modalOpen = leaderboardUI.isOpen();
  const victoryLocked = victoryHoldUntil > 0;

  pauseButton.disabled = modalOpen || victoryLocked;
  restartButton.disabled = modalOpen || victoryLocked;

  highScoresButton.disabled = modalOpen || victoryLocked;

  requestAnimationFrame(updateControls);
}

updateControls();

// ==========================================================
// Modal Keyboard Protection
// ==========================================================

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

// Clear leftover input when closing the leaderboard.

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
// Start
// ==========================================================

game.start();

console.log(
  "%c[Block Breaker] Arcade leaderboard initialized.",
  "color: #38bdf8; font-weight: bold;"
);

console.log(
  "[Block Breaker] Top 10 scores are saved locally. " +
  "Cheat-assisted and checkpoint-continued runs " +
  "cannot submit scores."
);
