
/* ==========================================================
   BLOCK BREAKER — LEADERBOARD

   Classic arcade high-score system.

   Features:
   - Top 10 scores
   - Player names up to 5 characters
   - Browser localStorage persistence
   - Score qualification and ranking
   - Level reached and game completion
   - Cheat-assisted run disqualification
   - Duplicate run protection

   UI rendering is handled separately.
   ========================================================== */

const STORAGE_KEY = "blockbreaker-highscores-v1";

const MAX_ENTRIES = 10;
const MAX_NAME_LENGTH = 5;

export class Leaderboard {
  constructor() {
    this.entries = this.load();
    this.submittedRuns = new Set();
  }

  // ========================================================
  // Storage
  // ========================================================

  load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (!stored) return [];

      const parsed = JSON.parse(stored);

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .filter(entry => this.isValidEntry(entry))
        .map(entry => ({
          id: entry.id,
          name: this.validateName(entry.name),
          score: entry.score,
          level: entry.level,
          completed: entry.completed === true,
          date: entry.date
        }))
        .sort((a, b) => this.compareEntries(a, b))
        .slice(0, MAX_ENTRIES);
    } catch (error) {
      console.warn(
        "[Block Breaker] Could not load high scores.",
        error
      );

      return [];
    }
  }

  save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(this.entries)
      );

      return true;
    } catch (error) {
      console.warn(
        "[Block Breaker] Could not save high scores.",
        error
      );

      return false;
    }
  }

  // ========================================================
  // Validation
  // ========================================================

  validateName(value) {
    return String(value ?? "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, MAX_NAME_LENGTH);
  }

  isValidEntry(entry) {
    return (
      entry !== null &&
      typeof entry === "object" &&
      typeof entry.id === "string" &&
      entry.id.length > 0 &&
      typeof entry.name === "string" &&
      this.validateName(entry.name).length > 0 &&
      Number.isSafeInteger(entry.score) &&
      entry.score >= 0 &&
      Number.isInteger(entry.level) &&
      entry.level >= 1 &&
      entry.level <= 30 &&
      typeof entry.date === "string"
    );
  }

  isValidResult(result) {
    return (
      result !== null &&
      typeof result === "object" &&
      result.eligible === true &&
      Number.isSafeInteger(result.score) &&
      result.score >= 0 &&
      Number.isInteger(result.level) &&
      result.level >= 1 &&
      result.level <= 30 &&
      typeof result.completed === "boolean"
    );
  }

  // ========================================================
  // Ranking
  // ========================================================

  compareEntries(a, b) {
    // Higher scores rank first.
    if (a.score !== b.score) {
      return b.score - a.score;
    }

    // Completed campaigns win score ties.
    if (a.completed !== b.completed) {
      return a.completed ? -1 : 1;
    }

    // Higher level wins remaining ties.
    if (a.level !== b.level) {
      return b.level - a.level;
    }

    // Earlier score wins an exact tie.
    return a.date.localeCompare(b.date);
  }

  getEntries() {
    return this.entries.map(entry => ({ ...entry }));
  }

  getHighScore() {
    return this.entries.length > 0
      ? this.entries[0].score
      : 0;
  }

  getLowestScore() {
    if (this.entries.length < MAX_ENTRIES) {
      return 0;
    }

    return this.entries[
      this.entries.length - 1
    ].score;
  }

  // ========================================================
  // Qualification
  // ========================================================

  qualifies(result) {
    if (!this.isValidResult(result)) {
      return false;
    }

    if (this.entries.length < MAX_ENTRIES) {
      return true;
    }

    // Compare with a hypothetical entry.
    // This also handles tied scores consistently.
    const candidate = {
      score: result.score,
      level: result.level,
      completed: result.completed,
      date: new Date().toISOString()
    };

    const lastEntry =
      this.entries[this.entries.length - 1];

    return this.compareEntries(
      candidate,
      lastEntry
    ) < 0;
  }

  getPotentialRank(result) {
    if (!this.qualifies(result)) {
      return null;
    }

    const candidate = {
      score: result.score,
      level: result.level,
      completed: result.completed,
      date: new Date().toISOString()
    };

    const position = this.entries.findIndex(
      entry => this.compareEntries(candidate, entry) < 0
    );

    return position === -1
      ? this.entries.length + 1
      : position + 1;
  }

  // ========================================================
  // Submitting a High Score
  // ========================================================

  submit(name, result) {
    const cleanName = this.validateName(name);

    if (!cleanName) {
      return {
        success: false,
        reason: "Enter at least one letter or number."
      };
    }

    if (!this.isValidResult(result)) {
      return {
        success: false,
        reason: "This run is not leaderboard eligible."
      };
    }

    if (!this.qualifies(result)) {
      return {
        success: false,
        reason: "This score does not qualify for the top 10."
      };
    }

    // Every completed run has an ID generated by Game.js.
    // Prevent the same run from being submitted twice.
    const runId = result.runId;

    if (
      runId === undefined ||
      runId === null ||
      this.submittedRuns.has(runId)
    ) {
      return {
        success: false,
        reason: "This run has already been submitted."
      };
    }

    const entry = {
      id: this.createId(),
      name: cleanName,
      score: result.score,
      level: result.level,
      completed: result.completed,
      date: new Date().toISOString()
    };

    this.entries.push(entry);

    this.entries.sort(
      (a, b) => this.compareEntries(a, b)
    );

    this.entries = this.entries.slice(
      0,
      MAX_ENTRIES
    );

    this.submittedRuns.add(runId);

    const rank =
      this.entries.findIndex(
        item => item.id === entry.id
      ) + 1;

    const saved = this.save();

    return {
      success: true,
      saved,
      rank,
      entry: { ...entry }
    };
  }

  createId() {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }

    return (
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 10)
    );
  }

  // ========================================================
  // Display Helpers
  // ========================================================

  formatScore(score) {
    return Number(score).toLocaleString("en-US");
  }

  formatRank(rank) {
    return String(rank).padStart(2, "0");
  }

  getDisplayEntries() {
    return Array.from(
      { length: MAX_ENTRIES },
      (_, index) => {
        const entry = this.entries[index];

        if (!entry) {
          return {
            rank: index + 1,
            empty: true,
            name: "-----",
            score: "-----",
            level: "--",
            completed: false
          };
        }

        return {
          ...entry,
          rank: index + 1,
          empty: false,
          score: this.formatScore(entry.score)
            .padStart(7, "0"),
          level: String(entry.level).padStart(2, "0")
        };
      }
    );
  }

  // ========================================================
  // Testing / Maintenance
  // ========================================================

  clearScores() {
    this.entries = [];
    this.submittedRuns.clear();

    return this.save();
  }
}
