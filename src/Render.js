
/* ==========================================================
   BLOCK BREAKER — RENDERING

   Handles:
   - Background and playfield
   - Normal, armored, explosive, and permanent bricks
   - Moving defensive paddle
   - Player paddle
   - Balls and trails
   - Power-ups and laser projectiles
   - Particle effects
   - Score, lives, level, and active power-ups
   - Start, pause, victory, and game-over screens

   All gameplay logic remains outside this file.
   ========================================================== */

import { getLevel, getWorld } from "./Levels.js";

const POWER_INFO = {
  expand: {
    label: "W",
    color: "#38bdf8",
    name: "WIDE PADDLE"
  },
  multi: {
    label: "3",
    color: "#a78bfa",
    name: "MULTIBALL"
  },
  slow: {
    label: "S",
    color: "#4ade80",
    name: "SLOW BALL"
  },
  laser: {
    label: "L",
    color: "#fb7185",
    name: "LASER"
  },
  life: {
    label: "+",
    color: "#facc15",
    name: "EXTRA LIFE"
  }
};

export class Render {
  constructor(game) {
    this.game = game;
    this.ctx = game.ctx;
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
          `FINAL SCORE: ${game.score}`,
          false
        );
        break;

      case "won":
        this.drawMenu(
          "YOU WIN!",
          `FINAL SCORE: ${game.score}`,
          false
        );
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
    const game = this.game;
    const ctx = this.ctx;

    const w = game.width;
    const h = game.height;

    ctx.fillStyle = "#080d18";
    ctx.fillRect(0, 0, w, h);

    // Subtle gradient for depth.
    const gradient = ctx.createLinearGradient(
      0, 0, 0, h
    );

    gradient.addColorStop(0, "#101b30");
    gradient.addColorStop(1, "#080d18");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Background grid.
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

      switch (brick.type) {
        case "armored":
          color = "#64748b";
          break;

        case "explosive":
          color = "#be123c";
          break;

        case "permanent":
          color = "#334155";
          break;
      }

      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = brick.type === "permanent"
        ? 3
        : 11;

      ctx.fillRect(x, y, width, height);

      ctx.shadowBlur = 0;

      // Reflective highlight.
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.fillRect(
        x + 2,
        y + 2,
        width - 4,
        3
      );

      switch (brick.type) {
        case "armored":
          this.drawArmoredBrick(brick);
          break;

        case "explosive":
          this.drawExplosiveBrick(brick);
          break;

        case "permanent":
          this.drawPermanentBrick(brick);
          break;
      }
    }
  }

  drawArmoredBrick(brick) {
    const ctx = this.ctx;
    const { x, y, width, height } = brick;

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

      ctx.moveTo(x + width * 0.30, y + 2);
      ctx.lineTo(x + width * 0.42, y + height * 0.40);
      ctx.lineTo(x + width * 0.36, y + height * 0.70);
      ctx.lineTo(x + width * 0.56, y + height - 2);

      ctx.strokeStyle = "#f8fafc";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  drawExplosiveBrick(brick) {
    const ctx = this.ctx;

    ctx.fillStyle = "#fff1f2";
    ctx.font = `bold ${Math.min(16, brick.height - 2)}px Arial`;
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

    ctx.strokeRect(
      x + 2,
      y + 2,
      width - 4,
      height - 4
    );

    // Diagonal metallic markings.
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
  // Moving Defensive Paddle
  // ========================================================

  drawDefender() {
    const defender = this.game.defender;

    if (!defender || !defender.active) return;

    const ctx = this.ctx;

    ctx.save();

    ctx.shadowColor = "#fb7185";
    ctx.shadowBlur = 18;

    ctx.fillStyle = "#e11d48";

    ctx.fillRect(
      defender.x,
      defender.y,
      defender.width,
      defender.height
    );

    // Bright upper edge.
    ctx.fillStyle = "#fecdd3";

    ctx.fillRect(
      defender.x + 3,
      defender.y + 2,
      defender.width - 6,
      3
    );

    // Small illuminated center.
    ctx.fillStyle = "#ffffff";

    ctx.fillRect(
      defender.x + defender.width / 2 - 8,
      defender.y + 4,
      16,
      Math.max(2, defender.height - 8)
    );

    ctx.restore();
  }

  // ========================================================
  // Falling Power-ups
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

      ctx.fillText(
        info.label,
        power.x,
        power.y + 5
      );
    }
  }

  // ========================================================
  // Laser Projectiles
  // ========================================================

  drawShots() {
    const ctx = this.ctx;

    ctx.shadowBlur = 12;
    ctx.shadowColor = "#fb7185";
    ctx.fillStyle = "#fb7185";

    for (const shot of this.game.shots) {
      ctx.fillRect(
        shot.x - 2,
        shot.y - 12,
        4,
        16
      );
    }

    ctx.shadowBlur = 0;
  }

  // ========================================================
  // Player Paddle
  // ========================================================

  drawPaddle() {
    const ctx = this.ctx;
    const game = this.game;
    const paddle = game.paddle;

    const laserActive = game.effects.laser > 0;

    const color = laserActive
      ? "#fb7185"
      : "#38bdf8";

    ctx.shadowColor = color;
    ctx.shadowBlur = 20;

    ctx.fillStyle = color;

    ctx.fillRect(
      paddle.x,
      paddle.y,
      paddle.width,
      paddle.height
    );

    ctx.fillStyle = "rgba(255,255,255,0.55)";

    ctx.fillRect(
      paddle.x + 3,
      paddle.y + 2,
      paddle.width - 6,
      3
    );

    ctx.shadowBlur = 0;
  }

  // ========================================================
  // Balls and Trails
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
          `rgba(125,211,252,${progress * 0.20})`;

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

  // ========================================================
  // Particle Effects
  // ========================================================

  drawParticles() {
    const ctx = this.ctx;

    for (const particle of this.game.particles) {
      ctx.globalAlpha = Math.max(
        0,
        Math.min(
          1,
          particle.life / particle.maxLife
        )
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

  // ========================================================
  // HUD
  // ========================================================

  drawHUD() {
    const ctx = this.ctx;
    const game = this.game;

    const w = game.width;
    const h = game.height;

    const portrait = game.layout === "portrait";
    const fontSize = portrait ? 16 : 17;

    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillStyle = "#e2e8f0";

    // Score.
    ctx.textAlign = "left";

    ctx.fillText(
      `SCORE ${game.score.toString().padStart(5, "0")}`,
      16,
      29
    );

    // Level.
    ctx.textAlign = "center";

    ctx.fillText(
      `LV ${game.level}/${game.maxLevel}`,
      w / 2,
      29
    );

    // Lives.
    ctx.textAlign = "right";

    ctx.fillText(
      `♥ ${game.lives}`,
      w - 16,
      29
    );

    // Active power-up timers.
    const activeEffects = Object.entries(game.effects)
      .filter(([, remaining]) => remaining > 0);

    if (activeEffects.length) {
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "left";

      activeEffects.forEach(([name, remaining], index) => {
        const info = POWER_INFO[name];

        if (!info) return;

        ctx.fillStyle = info.color;

        ctx.fillText(
          `${name.toUpperCase()} ${Math.ceil(remaining)}s`,
          16 + index * 122,
          h - 12
        );
      });
    }
  }

  // ========================================================
  // Temporary Notifications
  // ========================================================

  drawBanner() {
    const game = this.game;
    const ctx = this.ctx;

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

    ctx.shadowBlur = 0;
  }

  // ========================================================
  // Start, Pause, and Game Over Screens
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

    ctx.textAlign = "center";
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 18;

    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${titleSize}px Arial`;

    ctx.fillText(
      title,
      w / 2,
      titleY
    );

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
        this.isMobile()
          ? "TAP TO PLAY AGAIN"
          : "SPACE / CLICK TO PLAY AGAIN",
        w / 2,
        titleY + 82
      );

      return;
    }

    this.drawInstructions(
      landscape,
      portrait,
      titleY
    );
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

        const x = col === 0
          ? leftX
          : rightX;

        const y = startY + row * 58;

        ctx.textAlign = "center";

        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 12px Arial";
        ctx.fillText(label, x, y);

        ctx.fillStyle = "#cbd5e1";
        ctx.font = "12px Arial";
        ctx.fillText(
          description,
          x,
          y + 19
        );
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
        ctx.fillText(
          label,
          game.width / 2,
          y
        );

        ctx.fillStyle = "#cbd5e1";
        ctx.font = portrait ? "13px Arial" : "14px Arial";

        ctx.fillText(
          description,
          game.width / 2,
          y + 18
        );
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
}
