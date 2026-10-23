
/* ==========================================================
   BLOCK BREAKER — LEADERBOARD INTERFACE

   Handles:
   - High-score name entry
   - Top 10 arcade leaderboard
   - Keyboard and mobile input
   - Highlighting newly submitted scores
   - Closing and reopening the leaderboard

   Leaderboard.js manages score data and storage.
   ========================================================== */

export class LeaderboardUI {
  constructor(game, leaderboard) {
    this.game = game;
    this.leaderboard = leaderboard;

    this.pendingResult = null;
    this.highlightId = null;
    this.mode = null;

    this.createElements();
    this.bindEvents();
  }

  // ========================================================
  // Create Interface
  // ========================================================

  createElements() {
    this.overlay = document.createElement("div");
    this.overlay.className = "arcade-overlay";
    this.overlay.hidden = true;

    this.overlay.innerHTML = `
      <div
        class="arcade-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="arcadeModalTitle"
      >
        <button
          class="arcade-close"
          type="button"
          aria-label="Close leaderboard"
        >
          &times;
        </button>

        <div class="arcade-header">
          <div class="arcade-kicker">BLOCK BREAKER</div>
          <h2 id="arcadeModalTitle">HIGH SCORES</h2>
          <p class="arcade-subtitle">
            TOP 10 ARCADE RECORDS
          </p>
        </div>

        <section class="arcade-entry" hidden>
          <div class="arcade-trophy">★</div>

          <h3>NEW HIGH SCORE!</h3>

          <div class="arcade-entry-score">000000</div>

          <p class="arcade-entry-prompt">
            ENTER YOUR NAME
          </p>

          <form class="arcade-entry-form">
            <input
              class="arcade-name-input"
              type="text"
              name="playerName"
              maxlength="5"
              minlength="1"
              autocomplete="off"
              autocapitalize="characters"
              spellcheck="false"
              inputmode="text"
              placeholder="AAA"
              aria-label="Player initials, maximum five characters"
              required
            />

            <div class="arcade-name-hint">
              1–5 LETTERS OR NUMBERS
            </div>

            <div
              class="arcade-entry-error"
              role="alert"
              aria-live="polite"
            ></div>

            <button
              class="arcade-submit"
              type="submit"
            >
              SAVE SCORE
            </button>
          </form>

          <div class="arcade-entry-footer">
            <span class="arcade-entry-rank"></span>
            <span class="arcade-entry-level"></span>
          </div>
        </section>

        <section class="arcade-scores">
          <div class="arcade-table-header">
            <span>RANK</span>
            <span>NAME</span>
            <span>SCORE</span>
            <span>LVL</span>
          </div>

          <div class="arcade-score-list"></div>

          <p class="arcade-scores-note">
            SCORES ARE SAVED ON THIS DEVICE
          </p>
        </section>

        <button
          class="arcade-back"
          type="button"
        >
          BACK TO GAME
        </button>
      </div>
    `;

    document.body.appendChild(this.overlay);

    this.modal = this.overlay.querySelector(".arcade-modal");
    this.title = this.overlay.querySelector("#arcadeModalTitle");

    this.closeButton =
      this.overlay.querySelector(".arcade-close");

    this.entrySection =
      this.overlay.querySelector(".arcade-entry");

    this.scoresSection =
      this.overlay.querySelector(".arcade-scores");

    this.scoreList =
      this.overlay.querySelector(".arcade-score-list");

    this.scoreDisplay =
      this.overlay.querySelector(".arcade-entry-score");

    this.entryRank =
      this.overlay.querySelector(".arcade-entry-rank");

    this.entryLevel =
      this.overlay.querySelector(".arcade-entry-level");

    this.form =
      this.overlay.querySelector(".arcade-entry-form");

    this.nameInput =
      this.overlay.querySelector(".arcade-name-input");

    this.errorDisplay =
      this.overlay.querySelector(".arcade-entry-error");

    this.backButton =
      this.overlay.querySelector(".arcade-back");
  }

  // ========================================================
  // Events
  // ========================================================

  bindEvents() {
    this.closeButton.addEventListener("click", () => {
      this.close();
    });

    this.backButton.addEventListener("click", () => {
      this.close();
    });

    this.form.addEventListener("submit", event => {
      event.preventDefault();
      this.submitScore();
    });

    this.nameInput.addEventListener("input", () => {
      const cleanName = this.leaderboard.validateName(
        this.nameInput.value
      );

      this.nameInput.value = cleanName;
      this.errorDisplay.textContent = "";
    });

    // Allow Escape to close the regular leaderboard.
    // Name entry must be completed before dismissal.
    document.addEventListener("keydown", event => {
      if (this.overlay.hidden) return;

      // Prevent gameplay keyboard controls from
      // being processed while a modal is visible.
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

      if (
        event.key === "Escape" &&
        this.mode === "scores"
      ) {
        event.preventDefault();
        this.close();
      }
    }, true);
  }

  // ========================================================
  // General Leaderboard
  // ========================================================

  open() {
    if (this.mode === "entry") return;

    this.mode = "scores";
    this.pendingResult = null;

    this.title.textContent = "HIGH SCORES";

    this.entrySection.hidden = true;
    this.scoresSection.hidden = false;

    this.closeButton.hidden = false;
    this.backButton.hidden = false;

    this.renderScores();

    this.overlay.hidden = false;
    this.backButton.focus();
  }

  // ========================================================
  // New High Score Entry
  // ========================================================

  showEntry(result) {
    if (!this.leaderboard.qualifies(result)) {
      return false;
    }

    this.mode = "entry";
    this.pendingResult = result;

    this.highlightId = null;

    this.title.textContent = "HIGH SCORES";

    this.entrySection.hidden = false;
    this.scoresSection.hidden = true;

    // Player must save their name before leaving.
    this.closeButton.hidden = true;
    this.backButton.hidden = true;

    this.scoreDisplay.textContent =
      this.leaderboard.formatScore(result.score)
        .padStart(6, "0");

    const rank =
      this.leaderboard.getPotentialRank(result);

    this.entryRank.textContent =
      `RANK #${rank}`;

    this.entryLevel.textContent =
      result.completed
        ? "GAME CLEARED!"
        : `LEVEL ${result.level}`;

    this.nameInput.value = "";
    this.errorDisplay.textContent = "";

    this.overlay.hidden = false;

    this.nameInput.focus();

    return true;
  }

  submitScore() {
    if (!this.pendingResult) return;

    const name = this.leaderboard.validateName(
      this.nameInput.value
    );

    if (!name) {
      this.errorDisplay.textContent =
        "ENTER AT LEAST ONE CHARACTER";
      this.nameInput.focus();
      return;
    }

    const response = this.leaderboard.submit(
      name,
      this.pendingResult
    );

    if (!response.success) {
      this.errorDisplay.textContent =
        response.reason.toUpperCase();
      return;
    }

    this.highlightId = response.entry.id;
    this.pendingResult = null;

    this.mode = "scores";

    this.title.textContent = "HIGH SCORES";

    this.entrySection.hidden = true;
    this.scoresSection.hidden = false;

    this.closeButton.hidden = false;
    this.backButton.hidden = false;

    this.renderScores();

    this.backButton.focus();

    console.log(
      `[Block Breaker] High score saved: ${name} — ` +
      `${response.entry.score} points, rank #${response.rank}.`
    );

    if (!response.saved) {
      console.warn(
        "[Block Breaker] Score was added, but browser storage failed."
      );
    }
  }

  // ========================================================
  // Score Table
  // ========================================================

  renderScores() {
    const entries = this.leaderboard.getDisplayEntries();

    this.scoreList.replaceChildren();

    entries.forEach(entry => {
      const row = document.createElement("div");

      row.className = "arcade-score-row";

      if (entry.rank === 1 && !entry.empty) {
        row.classList.add("arcade-score-first");
      }

      if (entry.id === this.highlightId) {
        row.classList.add("arcade-score-new");
      }

      if (entry.empty) {
        row.classList.add("arcade-score-empty");
      }

      const rank = document.createElement("span");
      rank.className = "arcade-score-rank";
      rank.textContent = String(entry.rank).padStart(2, "0");

      const name = document.createElement("span");
      name.className = "arcade-score-name";
      name.textContent = entry.name;

      const score = document.createElement("span");
      score.className = "arcade-score-value";
      score.textContent = entry.score;

      const level = document.createElement("span");
      level.className = "arcade-score-level";

      if (entry.completed) {
        level.textContent = "★30";
        level.title = "Completed all 30 levels";
      } else {
        level.textContent = entry.level;
      }

      row.append(rank, name, score, level);

      this.scoreList.appendChild(row);
    });
  }

  // ========================================================
  // Close
  // ========================================================

  close() {
    if (this.mode === "entry") {
      return;
    }

    this.overlay.hidden = true;
    this.mode = null;

    this.game.canvas.focus?.();
  }

  isOpen() {
    return !this.overlay.hidden;
  }

  isEnteringName() {
    return this.mode === "entry";
  }
}
