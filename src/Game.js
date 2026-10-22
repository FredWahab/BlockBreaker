
import { Input } from "./Input.js";
import { Audio } from "./Audio.js";

const ROW_COLORS = [
  "#fb7185",
  "#fb923c",
  "#facc15",
  "#4ade80",
  "#38bdf8",
  "#a78bfa"
];

const POWER_TYPES = ["expand", "multi", "slow", "laser", "life"];

const POWER_INFO = {
  expand: { label: "W", color: "#38bdf8", name: "WIDE PADDLE" },
  multi: { label: "3", color: "#a78bfa", name: "MULTIBALL" },
  slow: { label: "S", color: "#4ade80", name: "SLOW BALL" },
  laser: { label: "L", color: "#fb7185", name: "LASER" },
  life: { label: "+", color: "#facc15", name: "EXTRA LIFE" }
};

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    this.input = new Input(canvas);
    this.audio = new Audio();

    this.width = 800;
    this.height = 600;
    this.layout = "desktop";

    this.paddle = {
      x: 340,
      y: 548,
      width: 120,
      height: 16,
      speed: 600
    };

    this.balls = [];
    this.bricks = [];
    this.powers = [];
    this.shots = [];
    this.particles = [];

    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.maxLevel = 4;

    this.state = "ready";
    this.previousState = "ready";

    this.effects = {
      expand: 0,
      slow: 0,
      laser: 0
    };

    this.shotTimer = 0;
    this.shake = 0;
    this.banner = { text: "", time: 0 };

    this.time = 0;
    this.lastTime = null;
    this.running = false;

    this.updateLayout(true);
    this.createLevel();
    this.resetBall();

    this.loop = this.loop.bind(this);

    window.addEventListener("resize", () => {
      this.updateLayout();
    });

    window.addEventListener("orientationchange", () => {
      this.updateLayout();
    });
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
      if (window.innerWidth > window.innerHeight) {
        return "landscape";
      }

      return "portrait";
    }

    return "desktop";
  }

  updateLayout(initial = false) {
    const newLayout = this.getLayout();

    if (!initial && newLayout === this.layout) return;

    const oldWidth = this.width;
    const oldHeight = this.height;

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

    const centerRatio = initial
      ? 0.5
      : (this.paddle.x + this.paddle.width / 2) / oldWidth;

    this.paddle.width = this.effects.expand > 0
      ? (this.layout === "portrait" ? 170 : 190)
      : (this.layout === "portrait" ? 110 : 120);

    this.paddle.height = this.layout === "landscape" ? 14 : 16;

    this.paddle.y = this.height -
      (this.layout === "landscape" ? 35 : 52);

    this.paddle.x = Math.max(
      0,
      Math.min(
        this.width - this.paddle.width,
        centerRatio * this.width - this.paddle.width / 2
      )
    );

    if (!initial) {
      const scaleX = this.width / oldWidth;
      const scaleY = this.height / oldHeight;

      for (const ball of this.balls) {
        ball.x = Math.max(
          ball.radius,
          Math.min(this.width - ball.radius, ball.x * scaleX)
        );

        ball.y = Math.max(
          ball.radius,
          Math.min(this.height - ball.radius, ball.y * scaleY)
        );

        ball.trail = [];
      }

      for (const power of this.powers) {
        power.x *= scaleX;
        power.y *= scaleY;
      }

      for (const shot of this.shots) {
        shot.x *= scaleX;
        shot.y *= scaleY;
      }

      this.particles = [];
      this.input.pointerX = null;

      this.arrangeBricks();

      if (this.state === "ready") {
        this.attachBall();
      }
    }
  }

  arrangeBricks() {
    const columns = this.layout === "portrait" ? 6 : 10;

    const gap = this.layout === "landscape" ? 6 : 7;
    const margin = this.layout === "portrait" ? 18 : 23;

    const brickWidth =
      (this.width - margin * 2 - gap * (columns - 1)) /
      columns;

    const brickHeight = this.layout === "landscape" ? 17 : 22;
    const top = this.layout === "landscape" ? 47 : 78;

    const rowSpacing = brickHeight + gap;

    this.bricks.forEach((brick, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;

      brick.x = margin + col * (brickWidth + gap);
      brick.y = top + row * rowSpacing;

      brick.width = brickWidth;
      brick.height = brickHeight;
    });
  }

  // ==========================================================
  // Game Initialization
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
      : Math.min((timestamp - this.lastTime) / 1000, 0.033);

    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame(this.loop);
  }

  createLevel() {
    this.bricks = [];

    const rows = Math.min(4 + this.level, 7);
    const columns = 10;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        if (
          this.level === 2 &&
          row > 1 &&
          (row + col) % 7 === 0
        ) continue;

        if (
          this.level === 3 &&
          row > 1 &&
          (col === 0 || col === 9) &&
          row % 2 === 0
        ) continue;

        if (
          this.level === 4 &&
          row > 2 &&
          (col === 2 || col === 7) &&
          row % 2 === 0
        ) continue;

        let type = "normal";

        if (
          this.level >= 2 &&
          row < 3 &&
          (col + row * 2) % 7 === 0
        ) {
          type = "explosive";
        } else if (
          row < 2 &&
          (col + this.level) % 3 === 0
        ) {
          type = "armored";
        } else if (
          this.level >= 3 &&
          (row + col) % 9 === 0
        ) {
          type = "armored";
        }

        const health = type === "armored"
          ? (this.level >= 3 ? 3 : 2)
          : 1;

        this.bricks.push({
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          color: ROW_COLORS[row % ROW_COLORS.length],
          type,
          health,
          maxHealth: health,
          active: true
        });
      }
    }

    this.arrangeBricks();
  }

  createBall(x, y, vx, vy) {
    return {
      x,
      y,
      vx,
      vy,
      radius: this.layout === "portrait" ? 9 : 8,
      trail: []
    };
  }

  resetBall() {
    this.balls = [
      this.createBall(
        this.paddle.x + this.paddle.width / 2,
        this.paddle.y - 15,
        190,
        -(260 + (this.level - 1) * 18)
      )
    ];
  }

  attachBall() {
    if (!this.balls.length) {
      this.resetBall();
    }

    const ball = this.balls[0];

    ball.x = this.paddle.x + this.paddle.width / 2;
    ball.y = this.paddle.y - ball.radius - 4;
    ball.trail = [];
  }

  launch() {
    if (this.state !== "ready") return;

    this.state = "playing";
    this.audio.play("launch");
  }

  togglePause() {
    if (
      this.state === "playing" ||
      this.state === "ready"
    ) {
      this.previousState = this.state;
      this.state = "paused";
    } else if (this.state === "paused") {
      this.state = this.previousState;
    }
  }

  restart() {
    this.score = 0;
    this.lives = 3;
    this.level = 1;

    this.state = "ready";
    this.previousState = "ready";

    this.effects = {
      expand: 0,
      slow: 0,
      laser: 0
    };

    this.powers = [];
    this.shots = [];
    this.particles = [];

    this.shake = 0;
    this.banner = { text: "", time: 0 };

    this.paddle.width =
      this.layout === "portrait" ? 110 : 120;

    this.paddle.x =
      (this.width - this.paddle.width) / 2;

    this.input.pointerX = null;
    this.input.actionRequested = false;
    this.input.pauseRequested = false;

    this.createLevel();
    this.resetBall();

    this.audio.play("start");
  }

  nextLevel() {
    if (this.level >= this.maxLevel) {
      this.state = "won";
      this.audio.play("win");
      return;
    }

    this.level++;
    this.state = "ready";

    // Clear any input left over from the previous level.
    this.input.actionRequested = false;
    this.input.pauseRequested = false;

    this.powers = [];
    this.shots = [];
    this.particles = [];

    this.effects = {
      expand: 0,
      slow: 0,
      laser: 0
    };

    this.paddle.width =
      this.layout === "portrait" ? 110 : 120;

    this.paddle.x = Math.min(
      this.paddle.x,
      this.width - this.paddle.width
    );

    this.createLevel();
    this.resetBall();

    this.showBanner(`LEVEL ${this.level}`, 2);
    this.audio.play("level");
  }

  showBanner(text, time = 1.3) {
    this.banner = { text, time };
  }

  // ==========================================================
  // Game Updates
  // ==========================================================

  update(dt) {
    this.time += dt;
    this.input.update();

    // Spacebar tap or P key, depending on game state.
    if (this.input.consumePause()) {
      switch (this.state) {
        case "ready":
          this.launch();
          break;

        case "playing":
        case "paused":
          this.togglePause();
          break;

        case "won":
        case "lost":
          this.restart();
          break;
      }

      return;
    }

    if (this.input.consumeMute()) {
      this.audio.toggleMute();
    }

    if (this.input.consumeRestart()) {
      this.restart();
      return;
    }

    const action = this.input.consumeAction();

    if (this.state === "paused") return;

    if (this.state === "won" || this.state === "lost") {
      if (action) this.restart();
      return;
    }

    this.updatePaddle(dt);

    if (this.state === "ready") {
      this.attachBall();

      if (action) this.launch();
      return;
    }

    if (this.state !== "playing") return;

    this.updateEffects(dt);
    this.updatePowers(dt);
    this.updateShots(dt);
    this.updateParticles(dt);

    this.banner.time = Math.max(
      0,
      this.banner.time - dt
    );

    this.shake = Math.max(0, this.shake - dt * 15);

    for (const ball of [...this.balls]) {
      this.updateBall(ball, dt);

      if (this.state !== "playing") break;
    }

    this.balls = this.balls.filter(
      ball => ball.y - ball.radius <= this.height + 10
    );

    if (
      this.state === "playing" &&
      this.balls.length === 0
    ) {
      this.loseLife();
    }

    if (
      this.state === "playing" &&
      this.bricks.every(brick => !brick.active)
    ) {
      this.nextLevel();
    }
  }

  updatePaddle(dt) {
    const p = this.paddle;
    const direction = this.input.getHorizontalDirection();

    if (direction !== 0) {
      p.x += direction * p.speed * dt;
    } else if (this.input.pointerX !== null) {
      p.x = this.input.pointerX - p.width / 2;
    }

    p.x = Math.max(
      0,
      Math.min(this.width - p.width, p.x)
    );
  }

  updateBall(ball, dt) {
    const previousX = ball.x;
    const previousY = ball.y;

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    ball.trail.push({
      x: ball.x,
      y: ball.y
    });

    if (ball.trail.length > 9) {
      ball.trail.shift();
    }

    // Side walls.
    if (ball.x - ball.radius <= 0) {
      ball.x = ball.radius;
      ball.vx = Math.abs(ball.vx);
      this.audio.play("wall");
    } else if (ball.x + ball.radius >= this.width) {
      ball.x = this.width - ball.radius;
      ball.vx = -Math.abs(ball.vx);
      this.audio.play("wall");
    }

    // Ceiling.
    if (ball.y - ball.radius <= 0) {
      ball.y = ball.radius;
      ball.vy = Math.abs(ball.vy);
      this.audio.play("wall");
    }

    this.checkBrickCollision(ball, previousX, previousY);

    // Paddle collision.
    const p = this.paddle;

    if (
      ball.vy > 0 &&
      ball.x + ball.radius > p.x &&
      ball.x - ball.radius < p.x + p.width &&
      ball.y + ball.radius >= p.y &&
      previousY - ball.radius < p.y + p.height
    ) {
      ball.y = p.y - ball.radius;

      const hit = Math.max(
        -1,
        Math.min(
          1,
          (ball.x - (p.x + p.width / 2)) / (p.width / 2)
        )
      );

      const angle = hit * Math.PI / 3;
      const speed = Math.max(
        300,
        Math.hypot(ball.vx, ball.vy)
      );

      ball.vx = speed * Math.sin(angle);
      ball.vy = -speed * Math.cos(angle);

      if (Math.abs(ball.vx) < 65) {
        ball.vx = 65 * (hit < 0 ? -1 : 1);
      }

      this.spawnParticles(
        ball.x,
        p.y,
        "#38bdf8",
        7
      );

      this.audio.play("paddle");
    }
  }

  checkBrickCollision(ball, previousX, previousY) {
    for (const brick of this.bricks) {
      if (!brick.active) continue;

      const cx = Math.max(
        brick.x,
        Math.min(ball.x, brick.x + brick.width)
      );

      const cy = Math.max(
        brick.y,
        Math.min(ball.y, brick.y + brick.height)
      );

      const dx = ball.x - cx;
      const dy = ball.y - cy;

      if (
        dx * dx + dy * dy >
        ball.radius * ball.radius
      ) continue;

      const fromLeft =
        previousX + ball.radius <= brick.x;

      const fromRight =
        previousX - ball.radius >= brick.x + brick.width;

      const fromTop =
        previousY + ball.radius <= brick.y;

      const fromBottom =
        previousY - ball.radius >= brick.y + brick.height;

      if (fromLeft || fromRight) {
        ball.vx = -ball.vx;

        ball.x = fromLeft
          ? brick.x - ball.radius
          : brick.x + brick.width + ball.radius;
      } else if (fromTop || fromBottom) {
        ball.vy = -ball.vy;

        ball.y = fromTop
          ? brick.y - ball.radius
          : brick.y + brick.height + ball.radius;
      } else {
        ball.vy = -ball.vy;
      }

      this.damageBrick(brick, 1);
      break;
    }
  }

  // ==========================================================
  // Special Bricks
  // ==========================================================

  damageBrick(brick, damage = 1, chain = false) {
    if (!brick.active) return;

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

    this.score += brick.type === "armored"
      ? 25
      : brick.type === "explosive"
        ? 30
        : 10;

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

    if (!chain && Math.random() < 0.16) {
      this.dropPower(brick);
    }

    if (brick.type === "explosive") {
      this.shake = Math.max(this.shake, 0.65);

      const nearby = this.bricks.filter(other =>
        other.active &&
        Math.abs(
          (other.x + other.width / 2) -
          (brick.x + brick.width / 2)
        ) < brick.width + 12 &&
        Math.abs(
          (other.y + other.height / 2) -
          (brick.y + brick.height / 2)
        ) < brick.height + 12
      );

      for (const other of nearby) {
        this.damageBrick(other, 1, true);
      }
    }
  }

  // ==========================================================
  // Power-ups
  // ==========================================================

  dropPower(brick) {
    const type = POWER_TYPES[
      Math.floor(Math.random() * POWER_TYPES.length)
    ];

    this.powers.push({
      type,
      x: brick.x + brick.width / 2,
      y: brick.y + brick.height / 2,
      size: 20,
      vy: this.layout === "landscape" ? 110 : 130
    });
  }

  updatePowers(dt) {
    const p = this.paddle;

    for (const power of this.powers) {
      power.y += power.vy * dt;

      if (
        power.x + power.size / 2 > p.x &&
        power.x - power.size / 2 < p.x + p.width &&
        power.y + power.size / 2 > p.y &&
        power.y - power.size / 2 < p.y + p.height
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

  applyPower(type) {
    const info = POWER_INFO[type];

    this.showBanner(info.name);
    this.audio.play("power");

    switch (type) {
      case "expand": {
        const center =
          this.paddle.x + this.paddle.width / 2;

        this.paddle.width =
          this.layout === "portrait" ? 170 : 190;

        this.paddle.x = Math.max(
          0,
          Math.min(
            this.width - this.paddle.width,
            center - this.paddle.width / 2
          )
        );

        this.effects.expand = 15;
        break;
      }

      case "multi": {
        const original = [...this.balls];

        for (const ball of original) {
          if (this.balls.length >= 9) break;

          const speed = Math.hypot(ball.vx, ball.vy);
          const angle = Math.atan2(ball.vy, ball.vx);

          for (const offset of [-0.42, 0.42]) {
            if (this.balls.length >= 9) break;

            this.balls.push(
              this.createBall(
                ball.x,
                ball.y,
                Math.cos(angle + offset) * speed,
                Math.sin(angle + offset) * speed
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
        this.effects.laser = 12;
        this.shotTimer = 0;
        break;

      case "life":
        this.lives = Math.min(9, this.lives + 1);
        break;
    }
  }

  updateEffects(dt) {
    for (const key of Object.keys(this.effects)) {
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
        const center =
          this.paddle.x + this.paddle.width / 2;

        this.paddle.width =
          this.layout === "portrait" ? 110 : 120;

        this.paddle.x = Math.max(
          0,
          Math.min(
            this.width - this.paddle.width,
            center - this.paddle.width / 2
          )
        );
      }
    }

    if (this.effects.laser > 0) {
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
          x: this.paddle.x + this.paddle.width - 12,
          y: this.paddle.y,
          vy: -700
        });

        this.audio.play("laser");
      }
    }
  }

  updateShots(dt) {
    for (const shot of this.shots) {
      const previousY = shot.y;
      shot.y += shot.vy * dt;

      for (const brick of this.bricks) {
        if (!brick.active) continue;

        if (
          shot.x >= brick.x &&
          shot.x <= brick.x + brick.width &&
          previousY >= brick.y &&
          shot.y <= brick.y + brick.height
        ) {
          this.damageBrick(brick, 1);
          shot.hit = true;
          break;
        }
      }
    }

    this.shots = this.shots.filter(
      shot => !shot.hit && shot.y > -20
    );
  }

  loseLife() {
    this.lives--;

    this.powers = [];
    this.shots = [];

    this.effects = {
      expand: 0,
      slow: 0,
      laser: 0
    };

    this.paddle.width =
      this.layout === "portrait" ? 110 : 120;

    this.paddle.x = Math.min(
      this.paddle.x,
      this.width - this.paddle.width
    );

    this.audio.play("lose");

    if (this.lives <= 0) {
      this.state = "lost";
      return;
    }

    this.state = "ready";
    this.resetBall();
  }

  // ==========================================================
  // Particles
  // ==========================================================

  spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 35 + Math.random() * 150;

      const life = 0.25 + Math.random() * 0.4;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        radius: 1.5 + Math.random() * 3,
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
  // Rendering
  // ==========================================================

  render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    // Background.
    ctx.fillStyle = "#080d18";
    ctx.fillRect(0, 0, w, h);

    // Subtle grid.
    ctx.strokeStyle = "rgba(56,189,248,0.035)";
    ctx.lineWidth = 1;

    for (let x = 0; x <= w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    for (let y = 0; y <= h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    ctx.save();

    if (this.shake > 0) {
      ctx.translate(
        (Math.random() - 0.5) * this.shake * 9,
        (Math.random() - 0.5) * this.shake * 9
      );
    }

    this.drawBricks(ctx);
    this.drawPowers(ctx);
    this.drawShots(ctx);
    this.drawPaddle(ctx);
    this.drawBalls(ctx);
    this.drawParticles(ctx);

    ctx.restore();

    this.drawHUD(ctx);

    if (
      this.banner.time > 0 &&
      this.state === "playing"
    ) {
      ctx.textAlign = "center";
      ctx.font = "bold 24px Arial";
      ctx.fillStyle = "#facc15";

      ctx.fillText(
        this.banner.text,
        w / 2,
        h * 0.67
      );
    }

    // Device-specific start instructions.
    if (this.state === "ready") {
      this.drawMenu(
        this.level === 1 && this.score === 0
          ? "BLOCK BREAKER"
          : `LEVEL ${this.level}`,
        this.layout === "desktop"
          ? "PRESS SPACE OR CLICK TO LAUNCH"
          : "TAP TO LAUNCH",
        true
      );
    }

    // Device-specific pause instructions.
    if (this.state === "paused") {
      this.drawMenu(
        "PAUSED",
        this.layout === "desktop"
          ? "PRESS SPACE / P TO RESUME"
          : "TAP RESUME BUTTON",
        true
      );
    }

    if (this.state === "lost") {
      this.drawMenu(
        "GAME OVER",
        `FINAL SCORE: ${this.score}`,
        false
      );
    }

    if (this.state === "won") {
      this.drawMenu(
        "YOU WIN!",
        `FINAL SCORE: ${this.score}`,
        false
      );
    }
  }

  drawBricks(ctx) {
    for (const brick of this.bricks) {
      if (!brick.active) continue;

      const { x, y, width, height } = brick;

      ctx.shadowBlur = 10;

      ctx.shadowColor =
        brick.type === "armored"
          ? "#94a3b8"
          : brick.type === "explosive"
            ? "#fb7185"
            : brick.color;

      ctx.fillStyle =
        brick.type === "armored"
          ? "#64748b"
          : brick.type === "explosive"
            ? "#be123c"
            : brick.color;

      ctx.fillRect(x, y, width, height);
      ctx.shadowBlur = 0;

      ctx.fillStyle = "rgba(255,255,255,0.21)";
      ctx.fillRect(x + 2, y + 2, width - 4, 3);

      if (brick.type === "armored") {
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 2;

        ctx.strokeRect(
          x + 3,
          y + 3,
          width - 6,
          height - 6
        );

        if (brick.health < brick.maxHealth) {
          ctx.beginPath();
          ctx.moveTo(x + width * 0.3, y + 2);
          ctx.lineTo(x + width * 0.42, y + height * 0.4);
          ctx.lineTo(x + width * 0.36, y + height * 0.7);
          ctx.lineTo(x + width * 0.56, y + height - 2);

          ctx.strokeStyle = "#f8fafc";
          ctx.stroke();
        }
      }

      if (brick.type === "explosive") {
        ctx.fillStyle = "#fff1f2";
        ctx.font = `bold ${Math.min(16, height - 2)}px Arial`;
        ctx.textAlign = "center";

        ctx.fillText(
          "✦",
          x + width / 2,
          y + height * 0.75
        );
      }
    }
  }

  drawPowers(ctx) {
    for (const power of this.powers) {
      const info = POWER_INFO[power.type];

      ctx.save();
      ctx.translate(power.x, power.y);
      ctx.rotate(this.time * 0.8);

      ctx.fillStyle = info.color;
      ctx.shadowColor = info.color;
      ctx.shadowBlur = 16;

      ctx.fillRect(-11, -11, 22, 22);
      ctx.restore();

      ctx.fillStyle = "#080d18";
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";

      ctx.fillText(
        info.label,
        power.x,
        power.y + 5
      );
    }
  }

  drawShots(ctx) {
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#fb7185";
    ctx.fillStyle = "#fb7185";

    for (const shot of this.shots) {
      ctx.fillRect(
        shot.x - 2,
        shot.y - 12,
        4,
        16
      );
    }

    ctx.shadowBlur = 0;
  }

  drawPaddle(ctx) {
    const p = this.paddle;

    const color = this.effects.laser > 0
      ? "#fb7185"
      : "#38bdf8";

    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fillStyle = color;

    ctx.fillRect(
      p.x,
      p.y,
      p.width,
      p.height
    );

    ctx.fillStyle = "rgba(255,255,255,0.55)";

    ctx.fillRect(
      p.x + 3,
      p.y + 2,
      p.width - 6,
      3
    );

    ctx.shadowBlur = 0;
  }

  drawBalls(ctx) {
    for (const ball of this.balls) {
      for (let i = 0; i < ball.trail.length; i++) {
        const point = ball.trail[i];

        ctx.beginPath();

        ctx.arc(
          point.x,
          point.y,
          ball.radius * (i / ball.trail.length) * 0.75,
          0,
          Math.PI * 2
        );

        ctx.fillStyle =
          `rgba(125,211,252,${(i / ball.trail.length) * 0.2})`;

        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(
        ball.x,
        ball.y,
        ball.radius,
        0,
        Math.PI * 2
      );

      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#7dd3fc";
      ctx.shadowBlur = 16;

      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  drawParticles(ctx) {
    for (const particle of this.particles) {
      ctx.globalAlpha = Math.max(
        0,
        Math.min(1, particle.life / particle.maxLife)
      );

      ctx.fillStyle = particle.color;

      ctx.beginPath();
      ctx.arc(
        particle.x,
        particle.y,
        particle.radius,
        0,
        Math.PI * 2
      );

      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  drawHUD(ctx) {
    const w = this.width;
    const h = this.height;

    const fontSize = this.layout === "portrait" ? 16 : 17;

    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillStyle = "#e2e8f0";

    ctx.textAlign = "left";
    ctx.fillText(
      `SCORE ${this.score.toString().padStart(5, "0")}`,
      16,
      29
    );

    ctx.textAlign = "center";
    ctx.fillText(
      `LV ${this.level}/${this.maxLevel}`,
      w / 2,
      29
    );

    ctx.textAlign = "right";
    ctx.fillText(
      `♥ ${this.lives}`,
      w - 16,
      29
    );

    const activeEffects = Object.entries(this.effects)
      .filter(([, remaining]) => remaining > 0);

    if (activeEffects.length) {
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "left";

      activeEffects.forEach(([name, remaining], i) => {
        ctx.fillStyle = POWER_INFO[name].color;

        ctx.fillText(
          `${name.toUpperCase()} ${Math.ceil(remaining)}s`,
          16 + i * 122,
          h - 12
        );
      });
    }
  }

  // ==========================================================
  // Start / Pause / Game Over Screens
  // ==========================================================

  drawMenu(title, subtitle, showInstructions) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    const compact = this.layout === "landscape";
    const portrait = this.layout === "portrait";

    ctx.fillStyle = "rgba(3,7,18,0.88)";
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = "center";

    const titleY = compact ? 85 : portrait ? 238 : 192;
    const titleSize = compact ? 35 : portrait ? 37 : 45;

    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#ffffff";

    ctx.font = `bold ${titleSize}px Arial`;
    ctx.fillText(title, w / 2, titleY);

    ctx.shadowBlur = 0;

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 15px Arial";

    ctx.fillText(
      subtitle,
      w / 2,
      titleY + 35
    );

    if (!showInstructions) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "14px Arial";

      ctx.fillText(
        this.layout === "desktop"
          ? "PRESS SPACE OR CLICK TO PLAY AGAIN"
          : "TAP TO PLAY AGAIN",
        w / 2,
        titleY + 82
      );

      return;
    }

    // Display only controls relevant to the current device.
    const instructions = this.layout === "desktop"
      ? [
          ["MOVE", "Mouse / Arrow Keys / A-D"],
          ["LAUNCH", "Space / Click"],
          ["PAUSE", "Space / P"],
          ["LASER", "Hold Space / Mouse"],
          ["SOUND", "M / Sound Button"],
          ["RESTART", "R / Restart Button"]
        ]
      : [
          ["MOVE", "Touch / Drag"],
          ["LAUNCH", "Tap Game Area"],
          ["PAUSE", "Pause Button"],
          ["LASER", "Touch / Hold"],
          ["SOUND", "Sound Button"],
          ["RESTART", "Restart Button"]
        ];

    if (compact) {
      // Two-column instructions for mobile landscape.
      const leftX = w * 0.28;
      const rightX = w * 0.72;
      const startY = 164;

      instructions.forEach(([label, description], index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);

        const x = col === 0 ? leftX : rightX;
        const y = startY + row * 58;

        ctx.textAlign = "center";
        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 12px Arial";
        ctx.fillText(label, x, y);

        ctx.fillStyle = "#cbd5e1";
        ctx.font = "12px Arial";
        ctx.fillText(description, x, y + 19);
      });

      ctx.textAlign = "center";
      ctx.fillStyle = "#94a3b8";
      ctx.font = "12px Arial";

      ctx.fillText(
        "Break all bricks • Collect power-ups • Clear 4 levels",
        w / 2,
        h - 32
      );
    } else {
      // Vertical instructions for mobile portrait and desktop.
      const startY = portrait ? 335 : 288;
      const spacing = portrait ? 43 : 40;

      instructions.forEach(([label, description], index) => {
        const y = startY + index * spacing;

        ctx.textAlign = "center";
        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 12px Arial";
        ctx.fillText(label, w / 2, y);

        ctx.fillStyle = "#cbd5e1";
        ctx.font = portrait ? "13px Arial" : "14px Arial";
        ctx.fillText(description, w / 2, y + 18);
      });

      ctx.textAlign = "center";
      ctx.fillStyle = "#94a3b8";
      ctx.font = portrait ? "12px Arial" : "13px Arial";

      ctx.fillText(
        "Break bricks • Collect power-ups • Clear all levels",
        w / 2,
        startY + instructions.length * spacing + 12
      );
    }
  }
}
