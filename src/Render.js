
/* ==========================================================
   BLOCK BREAKER — RENDERING

   Handles:
   - Background and playfield
   - All brick types
   - Moving defensive paddle
   - Player paddle, balls, and trails
   - Power-ups and lasers
   - Particle effects
   - HUD and menus
   - Animated 30-level victory celebration

   Gameplay logic remains in Game.js and Physics.js.
   ========================================================== */

import { getLevel } from "./Levels.js";

const POWER_INFO = {
  expand: { label: "W", color: "#38bdf8" },
  multi: { label: "3", color: "#a78bfa" },
  slow: { label: "S", color: "#4ade80" },
  laser: { label: "L", color: "#fb7185" },
  life: { label: "+", color: "#facc15" }
};

const CELEBRATION_COLORS = [
  "#facc15",
  "#fde68a",
  "#38bdf8",
  "#7dd3fc",
  "#a78bfa",
  "#4ade80",
  "#ffffff"
];

export class Render {
  constructor(game) {
    this.game = game;
    this.ctx = game.ctx;

    this.victoryParticles = [];
    this.victoryStart = 0;
    this.lastVictoryFrame = 0;
    this.victoryRunId = null;
    this.victoryBursts = 0;
  }

  // ========================================================
  // Main Rendering
  // ========================================================

  render() {
    const game = this.game;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, game.width, game.height);

    this.drawBackground();

    ctx.save();

    if (game.shake > 0) {
      ctx.translate(
        (Math.random() - 0.5) * game.shake * 9,
        (Math.random() - 0.5) * game.shake * 9
      );
    }

    this.drawBricks();
    this.drawDefender();
    this.drawPowerUps();
    this.drawShots();
    this.drawPaddle();
    this.drawBalls();
    this.drawParticles();

    ctx.restore();

    this.drawHUD();

    if (
      game.banner.time > 0 &&
      game.state === "playing"
    ) {
      this.drawBanner();
    }

    switch (game.state) {
      case "ready":
        this.drawMenu(
          game.level === 1 && game.score === 0
            ? "BLOCK BREAKER"
            : `LEVEL ${game.level}`,
          this.isMobile()
            ? "TAP TO LAUNCH"
            : "SPACE / CLICK TO LAUNCH",
          true
        );
        break;

      case "paused":
        this.drawMenu(
          "PAUSED",
          this.isMobile()
            ? "TAP RESUME BUTTON"
            : "SPACE / P TO RESUME",
          true
        );
        break;

      case "lost":
        this.drawMenu(
          "GAME OVER",
          `FINAL SCORE: ${game.score.toLocaleString()}`,
          false
        );
        break;

      case "won":
        this.drawVictory();
        break;

      default:
        this.resetVictory();
        break;
    }
  }

  isMobile() {
    return this.game.layout !== "desktop";
  }

  // ========================================================
  // Background
  // ========================================================

  drawBackground() {
    const ctx = this.ctx;
    const { width: w, height: h } = this.game;

    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#101b30");
    gradient.addColorStop(1, "#080d18");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

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
  }

  // ========================================================
  // Bricks
  // ========================================================

  drawBricks() {
    const ctx = this.ctx;

    for (const brick of this.game.bricks) {
      if (!brick.active) continue;

      const { x, y, width, height } = brick;

      let color = brick.color;

      if (brick.type === "armored") color = "#64748b";
      if (brick.type === "explosive") color = "#be123c";
      if (brick.type === "permanent") color = "#334155";

      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur =
        brick.type === "permanent" ? 3 : 11;

      ctx.fillRect(x, y, width, height);
      ctx.shadowBlur = 0;

      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.fillRect(x + 2, y + 2, width - 4, 3);

      if (brick.type === "armored") {
        this.drawArmoredBrick(brick);
      } else if (brick.type === "explosive") {
        this.drawExplosiveBrick(brick);
      } else if (brick.type === "permanent") {
        this.drawPermanentBrick(brick);
      }
    }
  }

  drawArmoredBrick(brick) {
    const ctx = this.ctx;
    const { x, y, width, height } = brick;

    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 3, y + 3, width - 6, height - 6);

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

  drawExplosiveBrick(brick) {
    const ctx = this.ctx;

    ctx.fillStyle = "#fff1f2";
    ctx.font =
      `bold ${Math.min(16, brick.height - 2)}px Arial`;
    ctx.textAlign = "center";

    ctx.fillText(
      "✦",
      brick.x + brick.width / 2,
      brick.y + brick.height * 0.75
    );
  }

  drawPermanentBrick(brick) {
    const ctx = this.ctx;
    const { x, y, width, height } = brick;

    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, y + 2, width - 4, height - 4);

    ctx.strokeStyle = "rgba(203,213,225,0.45)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    ctx.moveTo(x + width * 0.25, y + height - 3);
    ctx.lineTo(x + width * 0.45, y + 3);
    ctx.moveTo(x + width * 0.55, y + height - 3);
    ctx.lineTo(x + width * 0.75, y + 3);

    ctx.stroke();
  }

  // ========================================================
  // Defender
  // ========================================================

  drawDefender() {
    const d = this.game.defender;
    if (!d?.active) return;

    const ctx = this.ctx;

    ctx.save();
    ctx.shadowColor = "#fb7185";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#e11d48";
    ctx.fillRect(d.x, d.y, d.width, d.height);

    ctx.fillStyle = "#fecdd3";
    ctx.fillRect(d.x + 3, d.y + 2, d.width - 6, 3);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(
      d.x + d.width / 2 - 8,
      d.y + 4,
      16,
      Math.max(2, d.height - 8)
    );

    ctx.restore();
  }

  // ========================================================
  // Power-ups and Lasers
  // ========================================================

  drawPowerUps() {
    const ctx = this.ctx;

    for (const power of this.game.powers) {
      const info = POWER_INFO[power.type];
      if (!info) continue;

      ctx.save();
      ctx.translate(power.x, power.y);
      ctx.rotate(this.game.time * 0.8);

      ctx.fillStyle = info.color;
      ctx.shadowColor = info.color;
      ctx.shadowBlur = 16;
      ctx.fillRect(-11, -11, 22, 22);
      ctx.restore();

      ctx.fillStyle = "#080d18";
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.fillText(info.label, power.x, power.y + 5);
    }
  }

  drawShots() {
    const ctx = this.ctx;

    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#fb7185";
    ctx.fillStyle = "#fb7185";

    for (const shot of this.game.shots) {
      ctx.fillRect(shot.x - 2, shot.y - 12, 4, 16);
    }

    ctx.restore();
  }

  // ========================================================
  // Player Paddle
  // ========================================================

  drawPaddle() {
    const ctx = this.ctx;
    const p = this.game.paddle;

    const color =
      this.game.effects.laser > 0 ||
      this.game.cheats?.flags.laser
        ? "#fb7185"
        : "#38bdf8";

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fillStyle = color;
    ctx.fillRect(p.x, p.y, p.width, p.height);

    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillRect(p.x + 3, p.y + 2, p.width - 6, 3);
    ctx.restore();
  }

  // ========================================================
  // Balls and Particle Effects
  // ========================================================

  drawBalls() {
    const ctx = this.ctx;

    for (const ball of this.game.balls) {
      const trail = ball.trail ?? [];

      for (let i = 0; i < trail.length; i++) {
        const point = trail[i];
        const progress = (i + 1) / trail.length;

        ctx.beginPath();
        ctx.arc(
          point.x,
          point.y,
          ball.radius * progress * 0.75,
          0,
          Math.PI * 2
        );

        ctx.fillStyle =
          `rgba(125,211,252,${progress * 0.2})`;
        ctx.fill();
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);

      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#7dd3fc";
      ctx.shadowBlur = 16;
      ctx.fill();
      ctx.restore();
    }
  }

  drawParticles() {
    const ctx = this.ctx;

    ctx.save();

    for (const p of this.game.particles) {
      ctx.globalAlpha = Math.max(
        0,
        Math.min(1, p.life / p.maxLife)
      );

      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // ========================================================
  // HUD and Notifications
  // ========================================================

  drawHUD() {
    const ctx = this.ctx;
    const game = this.game;
    const w = game.width;

    const fontSize =
      game.layout === "portrait" ? 16 : 17;

    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillStyle = "#e2e8f0";

    ctx.textAlign = "left";
    ctx.fillText(
      `SCORE ${String(game.score).padStart(5, "0")}`,
      16,
      29
    );

    ctx.textAlign = "center";
    ctx.fillText(
      `LV ${game.level}/${game.maxLevel}`,
      w / 2,
      29
    );

    ctx.textAlign = "right";
    ctx.fillText(`♥ ${game.lives}`, w - 16, 29);

    const effects = Object.entries(game.effects)
      .filter(([, remaining]) => remaining > 0);

    if (effects.length) {
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "left";

      effects.forEach(([name, remaining], index) => {
        const info = POWER_INFO[name];
        if (!info) return;

        ctx.fillStyle = info.color;

        const duration =
          name === "laser" && game.cheats?.flags.laser
            ? "∞"
            : `${Math.ceil(remaining)}s`;

        ctx.fillText(
          `${name.toUpperCase()} ${duration}`,
          16 + index * 122,
          game.height - 12
        );
      });
    }
  }

  drawBanner() {
    const game = this.game;
    const ctx = this.ctx;

    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "bold 24px Arial";
    ctx.fillStyle = "#facc15";
    ctx.shadowColor = "#facc15";
    ctx.shadowBlur = 12;

    ctx.fillText(
      game.banner.text,
      game.width / 2,
      game.height * 0.67
    );

    ctx.restore();
  }

  // ========================================================
  // Standard Game Menus
  // ========================================================

  drawMenu(title, subtitle, showInstructions) {
    const game = this.game;
    const ctx = this.ctx;
    const w = game.width;
    const h = game.height;

    const landscape = game.layout === "landscape";
    const portrait = game.layout === "portrait";

    ctx.fillStyle = "rgba(3,7,18,0.90)";
    ctx.fillRect(0, 0, w, h);

    const titleY = landscape
      ? 75
      : portrait
        ? 214
        : 180;

    const titleSize = landscape
      ? 35
      : portrait
        ? 37
        : 45;

    ctx.save();
    ctx.textAlign = "center";
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${titleSize}px Arial`;
    ctx.fillText(title, w / 2, titleY);

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 15px Arial";
    ctx.fillText(subtitle, w / 2, titleY + 35);
    ctx.restore();

    if (!showInstructions) {
      ctx.textAlign = "center";
      ctx.fillStyle = "#94a3b8";
      ctx.font = "14px Arial";

      ctx.fillText(
        this.isMobile()
          ? "TAP TO PLAY AGAIN"
          : "SPACE / CLICK TO PLAY AGAIN",
        w / 2,
        titleY + 82
      );

      return;
    }

    this.drawInstructions(landscape, portrait, titleY);
  }

  drawInstructions(landscape, portrait, titleY) {
    const game = this.game;
    const ctx = this.ctx;

    const instructions = this.isMobile()
      ? [
          ["MOVE", "Touch / Drag"],
          ["LAUNCH", "Tap Game Area"],
          ["PAUSE", "Pause Button"],
          ["LASER", "Touch / Hold"],
          ["SOUND", "Sound Button"],
          ["RESTART", "Restart Button"]
        ]
      : [
          ["MOVE", "Mouse / Arrows / A-D"],
          ["LAUNCH", "Space / Click"],
          ["PAUSE", "Space / P"],
          ["LASER", "Hold Space / Mouse"],
          ["SOUND", "M / Sound Button"],
          ["RESTART", "R / Restart Button"]
        ];

    if (landscape) {
      const leftX = game.width * 0.28;
      const rightX = game.width * 0.72;
      const startY = titleY + 82;

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

      ctx.fillStyle = "#94a3b8";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(
        "Break bricks • Collect power-ups • Clear all 30 levels",
        game.width / 2,
        game.height - 32
      );
    } else {
      const startY = portrait
        ? titleY + 100
        : titleY + 96;

      const spacing = portrait ? 47 : 42;

      instructions.forEach(([label, description], index) => {
        const y = startY + index * spacing;

        ctx.textAlign = "center";
        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 12px Arial";
        ctx.fillText(label, game.width / 2, y);

        ctx.fillStyle = "#cbd5e1";
        ctx.font = portrait ? "13px Arial" : "14px Arial";
        ctx.fillText(description, game.width / 2, y + 18);
      });

      ctx.fillStyle = "#94a3b8";
      ctx.font = portrait ? "12px Arial" : "13px Arial";
      ctx.textAlign = "center";
      ctx.fillText(
        "30 levels • Special bricks • Power-ups",
        game.width / 2,
        startY + instructions.length * spacing + 16
      );
    }
  }

  // ========================================================
  // Victory Celebration
  // ========================================================

  resetVictory() {
    this.victoryParticles = [];
    this.victoryStart = 0;
    this.lastVictoryFrame = 0;
    this.victoryRunId = null;
    this.victoryBursts = 0;
  }

  startVictory(now) {
    this.victoryStart = now;
    this.lastVictoryFrame = now;
    this.victoryParticles = [];
    this.victoryBursts = 0;
    this.victoryRunId = this.game.runId;

    // Initial celebration burst.
    const w = this.game.width;
    const h = this.game.height;

    this.spawnFirework(w * 0.25, h * 0.35, 35);
    this.spawnFirework(w * 0.75, h * 0.3, 35);
    this.spawnFirework(w * 0.5, h * 0.22, 45);
  }

  spawnFirework(x, y, count = 35) {
    const color =
      CELEBRATION_COLORS[
        Math.floor(Math.random() * CELEBRATION_COLORS.length)
      ];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 50 + Math.random() * 155;
      const life = 0.9 + Math.random() * 1.1;

      this.victoryParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        size: 2 + Math.random() * 2.5,
        color,
        confetti: false,
        rotation: 0,
        spin: 0
      });
    }
  }

  spawnConfetti(count = 8) {
    const w = this.game.width;

    for (let i = 0; i < count; i++) {
      const life = 3 + Math.random() * 3;

      this.victoryParticles.push({
        x: Math.random() * w,
        y: -15 - Math.random() * 45,
        vx: (Math.random() - 0.5) * 65,
        vy: 55 + Math.random() * 85,
        life,
        maxLife: life,
        size: 3 + Math.random() * 4,
        color: CELEBRATION_COLORS[
          Math.floor(Math.random() * CELEBRATION_COLORS.length)
        ],
        confetti: true,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 5
      });
    }
  }

  updateVictory(now) {
    if (
      !this.victoryStart ||
      this.victoryRunId !== this.game.runId
    ) {
      this.startVictory(now);
    }

    const dt = Math.min(
      0.05,
      Math.max(0, (now - this.lastVictoryFrame) / 1000)
    );

    this.lastVictoryFrame = now;

    const elapsed = (now - this.victoryStart) / 1000;

    // Additional fireworks during the opening celebration.
    const targetBursts = Math.min(
      12,
      Math.floor(elapsed * 2)
    );

    while (this.victoryBursts < targetBursts) {
      this.victoryBursts++;

      const w = this.game.width;
      const h = this.game.height;

      this.spawnFirework(
        w * (0.12 + Math.random() * 0.76),
        h * (0.12 + Math.random() * 0.38),
        25 + Math.floor(Math.random() * 20)
      );
    }

    // Keep a gentle rain of confetti going afterward.
    if (Math.random() < dt * 11) {
      this.spawnConfetti(5);
    }

    for (const p of this.victoryParticles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.spin * dt;

      if (p.confetti) {
        p.vx += Math.sin(now * 0.002 + p.y * 0.03) * dt * 12;
      } else {
        p.vx *= Math.max(0, 1 - dt * 0.8);
        p.vy += 60 * dt;
      }

      p.life -= dt;
    }

    this.victoryParticles = this.victoryParticles.filter(
      p =>
        p.life > 0 &&
        p.y < this.game.height + 30
    );

    if (this.victoryParticles.length > 350) {
      this.victoryParticles.splice(
        0,
        this.victoryParticles.length - 350
      );
    }
  }

  drawVictoryParticles() {
    const ctx = this.ctx;

    ctx.save();

    for (const p of this.victoryParticles) {
      const alpha = Math.max(
        0,
        Math.min(1, p.life / p.maxLife)
      );

      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;

      if (p.confetti) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillRect(
          -p.size / 2,
          -p.size,
          p.size,
          p.size * 2
        );
        ctx.restore();
      } else {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 7;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    ctx.restore();
  }

  drawVictory() {
    const game = this.game;
    const ctx = this.ctx;

    const w = game.width;
    const h = game.height;

    const landscape = game.layout === "landscape";
    const portrait = game.layout === "portrait";

    const now = performance.now();
    this.updateVictory(now);

    // Deep navy overlay with a subtle gold glow.
    ctx.fillStyle = "rgba(3,7,18,0.95)";
    ctx.fillRect(0, 0, w, h);

    const glow = ctx.createRadialGradient(
      w / 2, h * 0.42, 15,
      w / 2, h * 0.42, w * 0.65
    );

    glow.addColorStop(0, "rgba(250,204,21,0.13)");
    glow.addColorStop(0.5, "rgba(56,189,248,0.045)");
    glow.addColorStop(1, "rgba(3,7,18,0)");

    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // Animated effects behind the victory text.
    this.drawVictoryParticles();

    const elapsed = (now - this.victoryStart) / 1000;
    const pulse = 0.85 + Math.sin(elapsed * 2.6) * 0.15;

    const centerY = landscape
      ? h * 0.42
      : portrait
        ? h * 0.42
        : h * 0.43;

    const titleSize = portrait ? 34 : landscape ? 40 : 52;
    const sectionGap = landscape ? 42 : 52;

    ctx.save();
    ctx.textAlign = "center";

    // Victory star.
    ctx.font = landscape ? "37px Arial" : "48px Arial";
    ctx.fillStyle = "#facc15";
    ctx.shadowColor = "#facc15";
    ctx.shadowBlur = 20 * pulse;
    ctx.fillText("★", w / 2, centerY - sectionGap * 2);

    // Main heading.
    ctx.font = `900 ${titleSize}px Arial`;
    ctx.shadowBlur = 25 * pulse;
    ctx.fillStyle = "#facc15";
    ctx.fillText(
      "VICTORY!",
      w / 2,
      centerY - sectionGap
    );

    ctx.shadowBlur = 0;

    // Campaign accomplishment.
    ctx.font = `bold ${landscape ? 18 : 20}px Arial`;
    ctx.fillStyle = "#38bdf8";
    ctx.fillText(
      "CAMPAIGN COMPLETE",
      w / 2,
      centerY
    );

    ctx.font = `bold ${landscape ? 14 : 16}px Arial`;
    ctx.fillStyle = "#e2e8f0";
    ctx.fillText(
      "ALL 30 LEVELS CLEARED",
      w / 2,
      centerY + sectionGap * 0.62
    );

    // Decorative gold rule.
    const ruleY = centerY + sectionGap * 0.9;
    ctx.strokeStyle = "rgba(250,204,21,0.65)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.33, ruleY);
    ctx.lineTo(w * 0.67, ruleY);
    ctx.stroke();

    // Final score.
    const scoreY = centerY + sectionGap * 1.55;

    ctx.font = "bold 13px Arial";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("FINAL SCORE", w / 2, scoreY);

    ctx.font = `900 ${landscape ? 29 : 37}px Arial`;
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 12;

    ctx.fillText(
      game.score.toLocaleString("en-US"),
      w / 2,
      scoreY + (landscape ? 32 : 42)
    );

    ctx.shadowBlur = 0;

    // Different messages for cheat-assisted victories.
    const eligible =
      typeof game.isLeaderboardEligible === "function"
        ? game.isLeaderboardEligible()
        : false;

    ctx.font = `bold ${landscape ? 12 : 14}px Arial`;
    ctx.fillStyle = eligible ? "#4ade80" : "#fbbf24";

    ctx.fillText(
      eligible
        ? "LEGENDARY ARCADE RUN"
        : "CHALLENGE COMPLETED",
      w / 2,
      scoreY + (landscape ? 55 : 73)
    );

    ctx.fillStyle = "#94a3b8";
    ctx.font = landscape ? "12px Arial" : "14px Arial";

    ctx.fillText(
      this.isMobile()
        ? "TAP TO PLAY AGAIN"
        : "PRESS SPACE OR CLICK TO PLAY AGAIN",
      w / 2,
      h - (landscape ? 19 : portrait ? 65 : 42)
    );

    ctx.restore();
  }
}
