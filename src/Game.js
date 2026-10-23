
/* ==========================================================
   BLOCK BREAKER — GAME CONTROLLER

   Handles:
   - Main game loop and state management
   - Responsive desktop and mobile layouts
   - 30-level campaign and checkpoints
   - Brick generation and destruction
   - Player paddle and power-ups
   - Console cheat integration
   - Leaderboard eligibility and run tracking

   Physics.js — Ball and defender collisions
   Render.js  — Canvas rendering
   Levels.js  — Level configurations
   Cheats.js  — Developer console commands
   ========================================================== */

import { Input } from "./Input.js";
import { Audio } from "./Audio.js";
import { Physics } from "./Physics.js";
import { Render } from "./Render.js";
import { Cheats } from "./Cheats.js";

import {
  getLevel,
  isCheckpoint,
  MAX_LEVEL
} from "./Levels.js";

// ==========================================================
// Power-up Definitions
// ==========================================================

const POWER_TYPES = [
  "expand",
  "multi",
  "slow",
  "laser",
  "life"
];

const POWER_INFO = {
  expand: "WIDE PADDLE",
  multi: "MULTIBALL",
  slow: "SLOW BALL",
  laser: "LASER",
  life: "EXTRA LIFE"
};

// ==========================================================
// Game Class
// ==========================================================

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    // Core systems.
    this.input = new Input(canvas);
    this.audio = new Audio();

    // Playfield.
    this.width = 800;
    this.height = 600;
    this.layout = "desktop";

    // Player paddle.
    this.paddle = {
      x: 340,
      y: 548,
      width: 120,
      height: 16,
      speed: 600
    };

    // Game objects.
    this.balls = [];
    this.bricks = [];
    this.defender = null;
    this.powers = [];
    this.shots = [];
    this.particles = [];

    // Campaign.
    this.level = 1;
    this.maxLevel = MAX_LEVEL;
    this.checkpoint = 1;

    this.levelConfig = null;
    this.baseBallSpeed = 300;

    // Player progress.
    this.score = 0;
    this.lives = 3;

    // States: ready, playing, paused, won, lost.
    this.state = "ready";
    this.previousState = "ready";

    // Temporary power-up timers.
    this.effects = {
      expand: 0,
      slow: 0,
      laser: 0
    };

    this.shotTimer = 0;

    // Visual effects.
    this.shake = 0;
    this.banner = {
      text: "",
      time: 0
    };

    // Timing.
    this.time = 0;
    this.lastTime = null;
    this.running = false;

    // ======================================================
    // Leaderboard Tracking
    // ======================================================

    this.runId = 1;
    this.runFinished = false;
    this.completed = false;
    this.highestLevel = 1;

    // True when the current run restarted from a
    // checkpoint instead of beginning at Level 1.
    this.continuedFromCheckpoint = false;

    // This callback is registered by main.js.
    this.onRunFinished = null;

    // ======================================================
    // Initialization
    // ======================================================

    this.updateLayout(true);

    this.physics = new Physics(this);
    this.renderer = new Render(this);

    this.loadLevel(1);

    this.cheats = new Cheats(this);

    this.loop = this.loop.bind(this);

    window.addEventListener("resize", () => {
      this.updateLayout();
    });

    window.addEventListener("orientationchange", () => {
      this.updateLayout();
    });
  }

  // ==========================================================
  // Main Game Loop
  // ==========================================================

  start() {
    if (this.running) return;

    this.running = true;
    this.lastTime = null;

    requestAnimationFrame(this.loop);
  }

  loop(timestamp) {
    if (!this.running) return;

    const dt = this.lastTime === null
      ? 0
      : Math.min(
          (timestamp - this.lastTime) / 1000,
          0.033
        );

    this.lastTime = timestamp;

    this.update(dt);
    this.renderer.render();

    requestAnimationFrame(this.loop);
  }

  // ==========================================================
  // Responsive Layout
  // ==========================================================

  getLayout() {
    const coarsePointer = window.matchMedia(
      "(pointer: coarse)"
    ).matches;

    const narrowScreen = window.innerWidth <= 768;

    if (coarsePointer || narrowScreen) {
      return window.innerWidth > window.innerHeight
        ? "landscape"
        : "portrait";
    }

    return "desktop";
  }

  updateLayout(initial = false) {
    const newLayout = this.getLayout();

    if (!initial && newLayout === this.layout) {
      return;
    }

    const oldWidth = this.width;
    const oldHeight = this.height;

    const paddleCenter = initial
      ? 0.5
      : (
          this.paddle.x +
          this.paddle.width / 2
        ) / oldWidth;

    this.layout = newLayout;

    switch (this.layout) {
      case "portrait":
        this.width = 480;
        this.height = 760;
        break;

      case "landscape":
        this.width = 800;
        this.height = 450;
        break;

      default:
        this.width = 800;
        this.height = 600;
        break;
    }

    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Resize the paddle while preserving its
    // relative horizontal position.
    this.paddle.width = this.shouldUseWidePaddle()
      ? this.getExpandedPaddleWidth()
      : this.getNormalPaddleWidth();

    this.paddle.height =
      this.layout === "landscape" ? 14 : 16;

    this.paddle.y =
      this.height -
      (this.layout === "landscape" ? 35 : 52);

    this.paddle.x = this.clamp(
      paddleCenter * this.width -
        this.paddle.width / 2,
      0,
      this.width - this.paddle.width
    );

    if (initial) return;

    const scaleX = this.width / oldWidth;

    // Preserve the ball's relative position within
    // the playable vertical region when rotating.
    const oldPaddleY =
      oldHeight -
      (
        oldHeight === 450
          ? 35
          : 52
      );

    for (const ball of this.balls) {
      const verticalRatio =
        oldPaddleY > 0
          ? ball.y / oldPaddleY
          : 0.5;

      ball.radius =
        this.layout === "portrait" ? 9 : 8;

      ball.x = this.clamp(
        ball.x * scaleX,
        ball.radius,
        this.width - ball.radius
      );

      ball.y = this.clamp(
        verticalRatio * this.paddle.y,
        ball.radius,
        this.height - ball.radius
      );

      ball.trail = [];
    }

    for (const power of this.powers) {
      power.x *= scaleX;
      power.y *= this.height / oldHeight;
    }

    for (const shot of this.shots) {
      shot.x *= scaleX;
      shot.y *= this.height / oldHeight;
    }

    // Clear transient visuals after resizing.
    this.particles = [];
    this.input.pointerX = null;

    // Reposition the existing bricks without
    // regenerating or restoring destroyed bricks.
    this.arrangeBricks();

    // Recalculate defender movement boundaries.
    this.createDefender(true);

    if (this.state === "ready") {
      this.attachBall();
    }
  }

  getNormalPaddleWidth() {
    return this.layout === "portrait" ? 110 : 120;
  }

  getExpandedPaddleWidth() {
    return this.layout === "portrait" ? 170 : 190;
  }

  shouldUseWidePaddle() {
    return (
      (this.cheats?.flags.wide ?? false) ||
      this.effects.expand > 0
    );
  }

  updatePaddleWidth() {
    const center =
      this.paddle.x + this.paddle.width / 2;

    this.paddle.width = this.shouldUseWidePaddle()
      ? this.getExpandedPaddleWidth()
      : this.getNormalPaddleWidth();

    this.paddle.x = this.clamp(
      center - this.paddle.width / 2,
      0,
      this.width - this.paddle.width
    );

    if (this.state === "ready") {
      this.attachBall();
    }
  }

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  // ==========================================================
  // Level Management
  // ==========================================================

  loadLevel(number) {
    this.level = this.clamp(
      number,
      1,
      this.maxLevel
    );

    this.levelConfig = getLevel(this.level);
    this.baseBallSpeed =
      this.levelConfig.ballSpeed;

    this.highestLevel = Math.max(
      this.highestLevel,
      this.level
    );

    this.state = "ready";
    this.previousState = "ready";

    this.powers = [];
    this.shots = [];
    this.particles = [];

    this.effects = {
      expand: 0,
      slow: 0,
      laser: 0
    };

    this.shotTimer = 0;
    this.shake = 0;

    // Preserve infinite lasers across levels.
    if (this.cheats?.flags.laser) {
      this.effects.laser = 3600;
    }

    this.updatePaddleWidth();
    this.createBricks();

    // Every new level starts with a fresh defender.
    this.createDefender(false);

    this.resetBall();

    this.input.actionRequested = false;
    this.input.pauseRequested = false;
    this.input.pointerX = null;

    if (isCheckpoint(this.level)) {
      this.checkpoint = Math.max(
        this.checkpoint,
        this.level
      );
    }
  }

  // ==========================================================
  // Brick Generation
  // ==========================================================

  createBricks() {
    this.bricks = [];

    const config = this.levelConfig;

    config.pattern.forEach((row, rowIndex) => {
      [...row].forEach((symbol, colIndex) => {
        if (symbol === ".") return;

        const type = {
          N: "normal",
          A: "armored",
          X: "explosive",
          "#": "permanent"
        }[symbol];

        if (!type) return;

        const health =
          type === "armored"
            ? config.armorHealth
            : type === "permanent"
              ? Infinity
              : 1;

        this.bricks.push({
          row: rowIndex,
          col: colIndex,
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          type,
          color:
            config.colors[
              rowIndex % config.colors.length
            ],
          health,
          maxHealth: health,
          active: true
        });
      });
    });

    this.arrangeBricks();
  }

  arrangeBricks() {
    if (!this.bricks.length) return;

    const portrait = this.layout === "portrait";
    const landscape = this.layout === "landscape";

    // All level patterns are defined with 10 columns.
    // Preserve their exact structure on every device.
    const columns = 10;

    const gap = portrait
      ? 4
      : landscape
        ? 6
        : 7;

    const margin = portrait ? 10 : 23;

    const brickWidth =
      (
        this.width -
        margin * 2 -
        gap * (columns - 1)
      ) / columns;

    const brickHeight = landscape
      ? 17
      : portrait
        ? 20
        : 22;

    const top = landscape ? 47 : 78;

    for (const brick of this.bricks) {
      // Preserve empty spaces, gaps, and patterns
      // using the original row/column coordinates.
      brick.x =
        margin +
        brick.col * (brickWidth + gap);

      brick.y =
        top +
        brick.row * (brickHeight + gap);

      brick.width = brickWidth;
      brick.height = brickHeight;
    }
  }

  // ==========================================================
  // Moving Defensive Paddle
  // ==========================================================

  createDefender(preservePosition = false) {
    const config = this.levelConfig?.defender;

    if (!config) {
      this.defender = null;
      return;
    }

    const previous =
      preservePosition ? this.defender : null;

    const width = Math.min(
      config.width,
      this.width * 0.28
    );

    const height =
      this.layout === "landscape" ? 11 : 14;

    const lowestBrick = this.bricks.reduce(
      (bottom, brick) =>
        Math.max(
          bottom,
          brick.y + brick.height
        ),
      0
    );

    const preferredY =
      lowestBrick +
      (
        this.layout === "landscape"
          ? 20
          : 30
      );

    // Keep the defender below the brick formation
    // but safely above the player's paddle.
    const maximumY =
      this.paddle.y -
      (
        this.layout === "landscape"
          ? 75
          : 110
      );

    const y = Math.min(
      preferredY,
      maximumY
    );

    const centerX = this.width / 2;

    const travel = Math.max(
      20,
      (this.width - width) * config.range
    );

    const minX = Math.max(
      0,
      centerX - width / 2 - travel
    );

    const maxX = Math.min(
      this.width - width,
      centerX - width / 2 + travel
    );

    const positionRatio =
      previous &&
      previous.maxX > previous.minX
        ? (
            previous.x - previous.minX
          ) / (
            previous.maxX - previous.minX
          )
        : 0.5;

    this.defender = {
      x:
        minX +
        this.clamp(positionRatio, 0, 1) *
        (maxX - minX),
      y,
      width,
      height,
      speed: config.speed,
      direction: previous?.direction ?? 1,
      minX,
      maxX,
      active: true
    };
  }

  // ==========================================================
  // Campaign Progression
  // ==========================================================

  nextLevel() {
    if (this.level >= this.maxLevel) {
      this.finishRun(true);
      this.state = "won";
      this.audio.play("win");
      return;
    }

    const next = this.level + 1;

    this.loadLevel(next);

    if (isCheckpoint(next)) {
      this.lives = Math.min(
        9,
        this.lives + 1
      );

      this.showBanner(
        "CHECKPOINT!",
        2
      );
    } else {
      this.showBanner(
        `LEVEL ${next}`,
        2
      );
    }

    this.audio.play("level");
  }

  // ==========================================================
  // Restart and Checkpoint Continuation
  // ==========================================================

  restart(fromCheckpoint = false) {
    const checkpointContinue =
      fromCheckpoint && this.checkpoint > 1;

    // A new attempt gets its own run ID.
    this.runId++;
    this.runFinished = false;
    this.completed = false;

    this.score = 0;
    this.lives = 3;

    this.continuedFromCheckpoint =
      checkpointContinue;

    const startingLevel =
      checkpointContinue ? this.checkpoint : 1;

    if (!checkpointContinue) {
      this.checkpoint = 1;
    }

    this.highestLevel = startingLevel;

    this.paddle.x =
      (
        this.width -
        this.getNormalPaddleWidth()
      ) / 2;

    this.loadLevel(startingLevel);

    if (checkpointContinue) {
      console.log(
        `[Block Breaker] Continuing from Level ${startingLevel}.`
      );

      console.log(
        "[Block Breaker] Checkpoint continues are " +
        "not eligible for leaderboard submission."
      );
    } else {
      console.log(
        "[Block Breaker] New game started at Level 1."
      );
    }

    this.audio.play("start");
  }

  // ==========================================================
  // Leaderboard Eligibility
  // ==========================================================

  isLeaderboardEligible() {
    return (
      !this.continuedFromCheckpoint &&
      !this.cheats.used
    );
  }

  finishRun(completed = false) {
    if (this.runFinished) return null;

    this.runFinished = true;
    this.completed = completed;

    const result = {
      runId: this.runId,
      score: this.score,
      level: this.highestLevel,
      completed,
      eligible: this.isLeaderboardEligible(),
      finishedAt: new Date().toISOString()
    };

    if (typeof this.onRunFinished === "function") {
      this.onRunFinished(result);
    }

    return result;
  }

  // ==========================================================
  // Ball Management
  // ==========================================================

  createBall(x, y, vx, vy) {
    return {
      x,
      y,
      vx,
      vy,
      radius:
        this.layout === "portrait" ? 9 : 8,
      trail: []
    };
  }

  resetBall() {
    const speed = this.baseBallSpeed;

    const vx = speed * 0.55;

    const vy = -Math.sqrt(
      speed * speed - vx * vx
    );

    this.balls = [
      this.createBall(
        this.paddle.x + this.paddle.width / 2,
        this.paddle.y - 16,
        vx,
        vy
      )
    ];

    this.attachBall();
  }

  attachBall() {
    if (!this.balls.length) {
      this.resetBall();
      return;
    }

    const ball = this.balls[0];

    ball.x =
      this.paddle.x +
      this.paddle.width / 2;

    ball.y =
      this.paddle.y -
      ball.radius - 4;

    ball.trail = [];
  }

  launch() {
    if (this.state !== "ready") return;

    this.state = "playing";
    this.audio.play("launch");
  }

  // ==========================================================
  // Pause Management
  // ==========================================================

  togglePause() {
    if (
      this.state === "ready" ||
      this.state === "playing"
    ) {
      this.previousState = this.state;
      this.state = "paused";
    } else if (this.state === "paused") {
      this.state = this.previousState;
    }
  }

  // ==========================================================
  // Losing a Life
  // ==========================================================

  loseLife() {
    this.audio.play("lose");

    this.powers = [];
    this.shots = [];

    this.effects = {
      expand: 0,
      slow: 0,
      laser:
        this.cheats.flags.laser
          ? 3600
          : 0
    };

    this.updatePaddleWidth();

    // God mode resets the ball without losing lives.
    if (this.cheats.flags.god) {
      this.state = "ready";
      this.resetBall();

      this.showBanner("GOD MODE", 1);
      return;
    }

    this.lives--;

    if (this.lives <= 0) {
      this.balls = [];
      this.finishRun(false);
      this.state = "lost";
      return;
    }

    this.state = "ready";
    this.resetBall();
  }

  // ==========================================================
  // Main Update
  // ==========================================================

  update(dt) {
    this.input.update();

    if (this.input.consumeMute()) {
      this.audio.toggleMute();
    }

    if (this.input.consumeRestart()) {
      this.restart();
      return;
    }

    if (this.input.consumePause()) {
      switch (this.state) {
        case "ready":
          this.launch();
          break;

        case "playing":
        case "paused":
          this.togglePause();
          break;

        case "lost":
          this.restart(this.checkpoint > 1);
          break;

        case "won":
          this.restart();
          break;
      }

      return;
    }

    const action = this.input.consumeAction();

    if (this.state === "paused") return;

    if (this.state === "won") {
      if (action) this.restart();
      return;
    }

    if (this.state === "lost") {
      if (action) {
        this.restart(this.checkpoint > 1);
      }
      return;
    }

    this.updatePaddle(dt);

    if (this.state === "ready") {
      this.attachBall();

      if (action) {
        this.launch();
      }

      return;
    }

    if (this.state !== "playing") return;

    this.time += dt;

    this.updateEffects(dt);
    this.updatePowerUps(dt);
    this.updateShots(dt);
    this.updateParticles(dt);

    this.banner.time = Math.max(
      0,
      this.banner.time - dt
    );

    this.shake = Math.max(
      0,
      this.shake - dt * 15
    );

    const physicsDt =
      this.cheats.flags.slow
        ? dt * 0.65
        : dt;

    this.physics.update(physicsDt);

    // Permanent bricks do not count toward
    // completion of a level.
    if (
      this.state === "playing" &&
      this.bricks.every(
        brick =>
          !brick.active ||
          brick.type === "permanent"
      )
    ) {
      this.nextLevel();
    }
  }

  // ==========================================================
  // Player Paddle
  // ==========================================================

  updatePaddle(dt) {
    const direction =
      this.input.getHorizontalDirection();

    if (direction !== 0) {
      this.paddle.x +=
        direction *
        this.paddle.speed *
        dt;
    } else if (this.input.pointerX !== null) {
      this.paddle.x =
        this.input.pointerX -
        this.paddle.width / 2;
    }

    this.paddle.x = this.clamp(
      this.paddle.x,
      0,
      this.width - this.paddle.width
    );
  }

  // ==========================================================
  // Brick Destruction
  // ==========================================================

  damageBrick(brick, damage = 1, chain = false) {
    if (
      !brick.active ||
      brick.type === "permanent"
    ) {
      return;
    }

    brick.health -= damage;

    this.spawnParticles(
      brick.x + brick.width / 2,
      brick.y + brick.height / 2,
      brick.color,
      7
    );

    if (brick.health > 0) {
      this.audio.play("armor");
      return;
    }

    brick.active = false;

    switch (brick.type) {
      case "armored":
        this.score += 25;
        break;

      case "explosive":
        this.score += 30;
        break;

      default:
        this.score += 10;
    }

    this.audio.play(
      brick.type === "explosive"
        ? "explosion"
        : "brick"
    );

    this.spawnParticles(
      brick.x + brick.width / 2,
      brick.y + brick.height / 2,
      brick.color,
      15
    );

    if (
      !chain &&
      Math.random() <
        this.levelConfig.powerChance
    ) {
      this.dropPower(brick);
    }

    // Explosions damage nearby destructible bricks.
    if (brick.type === "explosive") {
      this.shake = Math.max(
        this.shake,
        0.65
      );

      const nearby = this.bricks.filter(other => {
        if (
          !other.active ||
          other.type === "permanent"
        ) {
          return false;
        }

        const dx = Math.abs(
          (
            other.x +
            other.width / 2
          ) - (
            brick.x +
            brick.width / 2
          )
        );

        const dy = Math.abs(
          (
            other.y +
            other.height / 2
          ) - (
            brick.y +
            brick.height / 2
          )
        );

        return (
          dx < brick.width + 12 &&
          dy < brick.height + 12
        );
      });

      for (const other of nearby) {
        this.damageBrick(other, 1, true);
      }
    }
  }

  // ==========================================================
  // Power-up Drops
  // ==========================================================

  dropPower(brick) {
    const type = POWER_TYPES[
      Math.floor(
        Math.random() *
        POWER_TYPES.length
      )
    ];

    this.powers.push({
      type,
      x: brick.x + brick.width / 2,
      y: brick.y + brick.height / 2,
      size: 20,
      vy:
        this.layout === "landscape"
          ? 110
          : 130
    });
  }

  updatePowerUps(dt) {
    const p = this.paddle;

    for (const power of this.powers) {
      power.y += power.vy * dt;

      if (
        power.x + power.size / 2 > p.x &&
        power.x - power.size / 2 <
          p.x + p.width &&
        power.y + power.size / 2 > p.y &&
        power.y - power.size / 2 <
          p.y + p.height
      ) {
        this.applyPower(power.type);
        power.collected = true;
      }
    }

    this.powers = this.powers.filter(
      power =>
        !power.collected &&
        power.y < this.height + 30
    );
  }

  // ==========================================================
  // Apply Power-ups
  // ==========================================================

  applyPower(type) {
    this.showBanner(
      POWER_INFO[type] ?? "POWER UP!"
    );

    this.audio.play("power");

    switch (type) {
      case "expand":
        this.effects.expand = 15;
        this.updatePaddleWidth();
        break;

      case "multi": {
        const original = [...this.balls];

        for (const ball of original) {
          if (this.balls.length >= 9) break;

          const speed = Math.hypot(
            ball.vx,
            ball.vy
          );

          const angle = Math.atan2(
            ball.vy,
            ball.vx
          );

          for (const offset of [-0.42, 0.42]) {
            if (this.balls.length >= 9) break;

            this.balls.push(
              this.createBall(
                ball.x,
                ball.y,
                Math.cos(
                  angle + offset
                ) * speed,
                Math.sin(
                  angle + offset
                ) * speed
              )
            );
          }
        }

        break;
      }

      case "slow":
        for (const ball of this.balls) {
          ball.vx *= 0.75;
          ball.vy *= 0.75;
        }

        this.effects.slow = 10;
        break;

      case "laser":
        this.effects.laser =
          this.cheats.flags.laser
            ? 3600
            : 12;

        this.shotTimer = 0;
        break;

      case "life":
        this.lives = Math.min(
          9,
          this.lives + 1
        );
        break;
    }
  }

  // ==========================================================
  // Temporary Effects
  // ==========================================================

  updateEffects(dt) {
    for (const key of Object.keys(this.effects)) {
      if (
        key === "laser" &&
        this.cheats.flags.laser
      ) {
        this.effects.laser = 3600;
        continue;
      }

      const before = this.effects[key];

      this.effects[key] = Math.max(
        0,
        before - dt
      );

      if (
        key === "expand" &&
        before > 0 &&
        this.effects[key] === 0
      ) {
        this.updatePaddleWidth();
      }
    }

    const lasersActive =
      this.effects.laser > 0 ||
      this.cheats.flags.laser;

    if (lasersActive) {
      this.shotTimer -= dt;

      if (
        this.input.isFiring() &&
        this.shotTimer <= 0
      ) {
        this.shotTimer = 0.23;

        this.shots.push({
          x: this.paddle.x + 12,
          y: this.paddle.y,
          vy: -700
        });

        this.shots.push({
          x:
            this.paddle.x +
            this.paddle.width - 12,
          y: this.paddle.y,
          vy: -700
        });

        this.audio.play("laser");
      }
    }
  }

  // ==========================================================
  // Laser Projectiles
  // ==========================================================

  updateShots(dt) {
    for (const shot of this.shots) {
      const previousY = shot.y;

      shot.y += shot.vy * dt;

      const defender = this.defender;

      if (
        defender?.active &&
        shot.x >= defender.x &&
        shot.x <= defender.x + defender.width &&
        previousY >= defender.y &&
        shot.y <= defender.y + defender.height
      ) {
        shot.hit = true;

        this.spawnParticles(
          shot.x,
          defender.y,
          "#fb7185",
          5
        );

        continue;
      }

      for (const brick of this.bricks) {
        if (!brick.active) continue;

        if (
          shot.x >= brick.x &&
          shot.x <= brick.x + brick.width &&
          previousY >= brick.y &&
          shot.y <= brick.y + brick.height
        ) {
          if (brick.type !== "permanent") {
            this.damageBrick(brick, 1);
          } else {
            this.audio.play("armor");
          }

          shot.hit = true;
          break;
        }
      }
    }

    this.shots = this.shots.filter(
      shot =>
        !shot.hit &&
        shot.y > -20
    );
  }

  // ==========================================================
  // Particle Effects
  // ==========================================================

  spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle =
        Math.random() * Math.PI * 2;

      const speed =
        35 + Math.random() * 150;

      const life =
        0.25 + Math.random() * 0.4;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        radius:
          1.5 + Math.random() * 3,
        color
      });
    }

    if (this.particles.length > 220) {
      this.particles.splice(
        0,
        this.particles.length - 220
      );
    }
  }

  updateParticles(dt) {
    for (const particle of this.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;

      particle.vy += 90 * dt;
      particle.life -= dt;
    }

    this.particles = this.particles.filter(
      particle => particle.life > 0
    );
  }

  // ==========================================================
  // Notifications
  // ==========================================================

  showBanner(text, time = 1.3) {
    this.banner = {
      text,
      time
    };
  }

  // ==========================================================
  // Rendering
  // ==========================================================

  render() {
    this.renderer.render();
  }
}
