
/* ==========================================================
   BLOCK BREAKER — DEVELOPER CHEATS

   Permanent browser-console commands for testing and fun.

   Commands reset after refreshing the page.
   Using any gameplay cheat disqualifies the current run
   from leaderboard submission.

   help() and status() do not count as cheating.
   ========================================================== */

import { getLevel, MAX_LEVEL } from "./Levels.js";

const PREFIX = "[Block Breaker]";

export class Cheats {
  constructor(game) {
    this.game = game;

    this.used = false;

    this.flags = {
      god: false,
      laser: false,
      wide: false,
      slow: false
    };

    this.install();
  }

  // ========================================================
  // Console Feedback
  // ========================================================

  success(message) {
    console.log(
      `%c${PREFIX} ${message}`,
      "color: #4ade80; font-weight: bold;"
    );
  }

  warning(message) {
    console.warn(`${PREFIX} ${message}`);
  }

  markUsed() {
    if (this.used) return;

    this.used = true;

    this.warning(
      "Cheats activated — leaderboard disabled for this run."
    );
  }

  // ========================================================
  // Register Global Commands
  // ========================================================

  install() {
    const commands = {
      help: () => this.help(),
      status: () => this.status(),

      level: number => this.level(number),
      next: () => this.next(),
      prev: () => this.prev(),

      god: () => this.toggle("god"),
      laser: () => this.toggle("laser"),
      wide: () => this.toggle("wide"),
      slow: () => this.toggle("slow"),

      lives: amount => this.lives(amount),
      multi: () => this.multi(),
      clear: () => this.clear(),

      normal: () => this.normal()
    };

    for (const [name, callback] of Object.entries(commands)) {
      // Short commands intentionally exposed globally.
      window[name] = callback;
    }

    this.success(
      "Developer console ready. Type help() for commands."
    );
  }

  // ========================================================
  // Informational Commands
  // ========================================================

  help() {
    console.log(`${PREFIX} Available commands:`);

    console.table([
      { command: "help()", effect: "Show commands" },
      { command: "status()", effect: "Show game and cheat status" },
      { command: "level(16)", effect: "Jump to a level" },
      { command: "next()", effect: "Advance one level" },
      { command: "prev()", effect: "Go back one level" },
      { command: "god()", effect: "Toggle invincibility" },
      { command: "laser()", effect: "Toggle infinite lasers" },
      { command: "wide()", effect: "Toggle wide paddle" },
      { command: "slow()", effect: "Toggle slow motion" },
      { command: "lives(99)", effect: "Set remaining lives" },
      { command: "multi()", effect: "Add more balls" },
      { command: "clear()", effect: "Clear the current level" },
      { command: "normal()", effect: "Disable active cheats" }
    ]);

    this.success("Commands are case-sensitive.");
  }

  status() {
    const game = this.game;

    console.table({
      Level: `${game.level}/${MAX_LEVEL}`,
      Stage: getLevel(game.level).name,
      Score: game.score,
      Lives: game.lives,
      State: game.state,
      "God Mode": this.onOff(this.flags.god),
      "Infinite Lasers": this.onOff(this.flags.laser),
      "Wide Paddle": this.onOff(this.flags.wide),
      "Slow Motion": this.onOff(this.flags.slow),
      "Leaderboard Eligible": this.used ? "NO" : "YES"
    });
  }

  onOff(enabled) {
    return enabled ? "ON" : "OFF";
  }

  // ========================================================
  // Level Selection
  // ========================================================

  level(number) {
    if (
      !Number.isInteger(number) ||
      number < 1 ||
      number > MAX_LEVEL
    ) {
      this.warning(
        `Enter a level from 1 to ${MAX_LEVEL}. Example: level(16)`
      );
      return;
    }

    this.markUsed();

    this.game.loadLevel(number);

    this.success(
      `Jumped to Level ${number}: ${getLevel(number).name}.`
    );
  }

  next() {
    const game = this.game;

    if (game.level >= MAX_LEVEL) {
      this.warning("Already at the final level.");
      return;
    }

    this.level(game.level + 1);
  }

  prev() {
    const game = this.game;

    if (game.level <= 1) {
      this.warning("Already at Level 1.");
      return;
    }

    this.level(game.level - 1);
  }

  // ========================================================
  // Persistent Cheat Toggles
  // ========================================================

  toggle(name) {
    if (!(name in this.flags)) return;

    this.markUsed();

    this.flags[name] = !this.flags[name];

    if (name === "wide") {
      this.updatePaddleWidth();
    }

    if (name === "laser" && this.flags.laser) {
      this.game.shotTimer = 0;
    }

    const names = {
      god: "God mode",
      laser: "Infinite lasers",
      wide: "Wide paddle",
      slow: "Slow motion"
    };

    this.success(
      `${names[name]} ${this.onOff(this.flags[name])}.`
    );
  }

  updatePaddleWidth() {
    const game = this.game;
    const paddle = game.paddle;

    const center = paddle.x + paddle.width / 2;

    const expanded =
      this.flags.wide || game.effects.expand > 0;

    paddle.width = expanded
      ? game.getExpandedPaddleWidth()
      : game.getNormalPaddleWidth();

    paddle.x = game.clamp(
      center - paddle.width / 2,
      0,
      game.width - paddle.width
    );

    if (game.state === "ready") {
      game.attachBall();
    }
  }

  // ========================================================
  // One-Time Cheats
  // ========================================================

  lives(amount) {
    if (
      !Number.isInteger(amount) ||
      amount < 1 ||
      amount > 999
    ) {
      this.warning(
        "Enter a whole number from 1 to 999. Example: lives(99)"
      );
      return;
    }

    this.markUsed();

    this.game.lives = amount;

    this.success(`Lives set to ${amount}.`);
  }

  multi() {
    const game = this.game;

    if (
      game.state !== "playing" ||
      game.balls.length === 0
    ) {
      this.warning(
        "Start the ball before using multi()."
      );
      return;
    }

    if (game.balls.length >= 9) {
      this.warning(
        "Maximum of 9 balls already active."
      );
      return;
    }

    this.markUsed();

    game.applyPower("multi");

    this.success(
      `Multiball activated — ${game.balls.length} balls in play.`
    );
  }

  clear() {
    const game = this.game;

    if (
      game.state === "won" ||
      game.state === "lost"
    ) {
      this.warning(
        "Start a game before clearing a level."
      );
      return;
    }

    this.markUsed();

    // Launch first if sitting on the ready screen.
    if (game.state === "ready") {
      game.launch();
    }

    // Resume if paused so the level can advance.
    if (game.state === "paused") {
      game.togglePause();
    }

    for (const brick of game.bricks) {
      if (brick.type !== "permanent") {
        brick.active = false;
      }
    }

    this.success(
      `Level ${game.level} cleared.`
    );
  }

  // ========================================================
  // Restore Normal Gameplay
  // ========================================================

  normal() {
    const game = this.game;

    const hadCheats = Object.values(
      this.flags
    ).some(Boolean);

    this.flags = {
      god: false,
      laser: false,
      wide: false,
      slow: false
    };

    if (game.effects) {
      game.effects.laser = 0;
      game.effects.slow = 0;
      game.effects.expand = 0;
    }

    this.updatePaddleWidth();

    if (hadCheats) {
      this.success("All active cheats disabled.");
    } else {
      this.success("Normal gameplay settings restored.");
    }

    if (this.used) {
      this.warning(
        "This run remains ineligible for the leaderboard. Refresh to start a clean session."
      );
    }
  }
}
