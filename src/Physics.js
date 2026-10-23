
/* ==========================================================
   BLOCK BREAKER — PHYSICS

   Handles:
   - Ball movement
   - Wall collisions
   - Player paddle collisions
   - Brick collisions
   - Indestructible obstacles
   - Moving defender collisions
   - Multiball physics

   Game.js remains responsible for gameplay consequences.
   ========================================================== */

const MAX_DELTA = 1 / 120;
const MAX_STEPS = 12;
const MIN_HORIZONTAL_SPEED = 65;
const MAX_BOUNCE_ANGLE = Math.PI / 3;

// ==========================================================
// Helpers
// ==========================================================

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function circleIntersectsRect(ball, rect) {
  const closestX = clamp(
    ball.x,
    rect.x,
    rect.x + rect.width
  );

  const closestY = clamp(
    ball.y,
    rect.y,
    rect.y + rect.height
  );

  const dx = ball.x - closestX;
  const dy = ball.y - closestY;

  return dx * dx + dy * dy <= ball.radius * ball.radius;
}

function reflectFromRect(ball, rect, previousX, previousY) {
  const fromLeft =
    previousX + ball.radius <= rect.x;

  const fromRight =
    previousX - ball.radius >= rect.x + rect.width;

  const fromTop =
    previousY + ball.radius <= rect.y;

  const fromBottom =
    previousY - ball.radius >= rect.y + rect.height;

  if (fromLeft) {
    ball.x = rect.x - ball.radius;
    ball.vx = -Math.abs(ball.vx);
    return;
  }

  if (fromRight) {
    ball.x = rect.x + rect.width + ball.radius;
    ball.vx = Math.abs(ball.vx);
    return;
  }

  if (fromTop) {
    ball.y = rect.y - ball.radius;
    ball.vy = -Math.abs(ball.vy);
    return;
  }

  if (fromBottom) {
    ball.y = rect.y + rect.height + ball.radius;
    ball.vy = Math.abs(ball.vy);
    return;
  }

  // Resolve corner impacts or existing overlaps by
  // moving the ball toward the nearest exit.
  const left = Math.abs(
    ball.x + ball.radius - rect.x
  );

  const right = Math.abs(
    rect.x + rect.width - (ball.x - ball.radius)
  );

  const top = Math.abs(
    ball.y + ball.radius - rect.y
  );

  const bottom = Math.abs(
    rect.y + rect.height - (ball.y - ball.radius)
  );

  const smallest = Math.min(
    left,
    right,
    top,
    bottom
  );

  if (smallest === left) {
    ball.x = rect.x - ball.radius;
    ball.vx = -Math.abs(ball.vx);
  } else if (smallest === right) {
    ball.x = rect.x + rect.width + ball.radius;
    ball.vx = Math.abs(ball.vx);
  } else if (smallest === top) {
    ball.y = rect.y - ball.radius;
    ball.vy = -Math.abs(ball.vy);
  } else {
    ball.y = rect.y + rect.height + ball.radius;
    ball.vy = Math.abs(ball.vy);
  }
}

// ==========================================================
// Physics Class
// ==========================================================

export class Physics {
  constructor(game) {
    this.game = game;
  }

  // --------------------------------------------------------
  // Main Update
  // --------------------------------------------------------

  update(dt) {
    if (this.game.state !== "playing") return;

    // Update the defender before moving the balls.
    this.updateDefender(dt);

    // Substeps help prevent fast balls from passing
    // through thin bricks or moving obstacles.
    const steps = Math.min(
      MAX_STEPS,
      Math.max(1, Math.ceil(dt / MAX_DELTA))
    );

    const stepTime = dt / steps;

    for (let step = 0; step < steps; step++) {
      if (this.game.state !== "playing") break;

      for (const ball of [...this.game.balls]) {
        this.updateBall(ball, stepTime);
      }
    }

    // Remove balls that have fallen below the playfield.
    this.game.balls = this.game.balls.filter(
      ball => ball.y - ball.radius <= this.game.height + 10
    );

    if (
      this.game.state === "playing" &&
      this.game.balls.length === 0
    ) {
      this.game.loseLife();
    }
  }

  // --------------------------------------------------------
  // Ball Movement
  // --------------------------------------------------------

  updateBall(ball, dt) {
    const previousX = ball.x;
    const previousY = ball.y;

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    this.checkWalls(ball);

    if (
      this.checkBricks(ball, previousX, previousY)
    ) {
      this.recordTrail(ball);
      return;
    }

    if (
      this.checkDefender(ball, previousX, previousY)
    ) {
      this.recordTrail(ball);
      return;
    }

    this.checkPaddle(ball, previousY);
    this.recordTrail(ball);
  }

  recordTrail(ball) {
    // Only record trail positions once per rendered
    // frame, not once for every physics substep.
    if (!ball.trail) ball.trail = [];

    const last = ball.trail[ball.trail.length - 1];

    if (
      !last ||
      Math.hypot(
        ball.x - last.x,
        ball.y - last.y
      ) >= 3
    ) {
      ball.trail.push({
        x: ball.x,
        y: ball.y
      });
    }

    if (ball.trail.length > 9) {
      ball.trail.shift();
    }
  }

  // --------------------------------------------------------
  // Wall Collisions
  // --------------------------------------------------------

  checkWalls(ball) {
    const game = this.game;

    if (ball.x - ball.radius <= 0) {
      ball.x = ball.radius;
      ball.vx = Math.abs(ball.vx);

      game.audio.play("wall");
    }

    if (
      ball.x + ball.radius >= game.width
    ) {
      ball.x = game.width - ball.radius;
      ball.vx = -Math.abs(ball.vx);

      game.audio.play("wall");
    }

    if (ball.y - ball.radius <= 0) {
      ball.y = ball.radius;
      ball.vy = Math.abs(ball.vy);

      game.audio.play("wall");
    }

    // No bottom bounce. Balls can be lost.
  }

  // --------------------------------------------------------
  // Player Paddle
  // --------------------------------------------------------

  checkPaddle(ball, previousY) {
    const game = this.game;
    const paddle = game.paddle;

    if (ball.vy <= 0) return false;

    if (
      previousY + ball.radius > paddle.y
    ) {
      return false;
    }

    if (
      !circleIntersectsRect(ball, paddle)
    ) {
      return false;
    }

    ball.y = paddle.y - ball.radius;

    const center =
      paddle.x + paddle.width / 2;

    const hitPosition = clamp(
      (ball.x - center) / (paddle.width / 2),
      -1,
      1
    );

    const angle =
      hitPosition * MAX_BOUNCE_ANGLE;

    const speed = Math.max(
      300,
      Math.hypot(ball.vx, ball.vy)
    );

    ball.vx = speed * Math.sin(angle);
    ball.vy = -speed * Math.cos(angle);

    // Avoid repeated near-vertical trajectories.
    if (
      Math.abs(ball.vx) < MIN_HORIZONTAL_SPEED
    ) {
      ball.vx =
        MIN_HORIZONTAL_SPEED *
        (hitPosition < 0 ? -1 : 1);

      // Preserve the overall speed.
      ball.vy = -Math.sqrt(
        Math.max(
          0,
          speed * speed - ball.vx * ball.vx
        )
      );
    }

    game.spawnParticles(
      ball.x,
      paddle.y,
      "#38bdf8",
      7
    );

    game.audio.play("paddle");

    return true;
  }

  // --------------------------------------------------------
  // Brick Collisions
  // --------------------------------------------------------

  checkBricks(ball, previousX, previousY) {
    const game = this.game;

    for (const brick of game.bricks) {
      if (!brick.active) continue;

      if (!circleIntersectsRect(ball, brick)) {
        continue;
      }

      reflectFromRect(
        ball,
        brick,
        previousX,
        previousY
      );

      if (brick.type === "permanent") {
        // Permanent obstacles never take damage.
        game.spawnParticles(
          ball.x,
          ball.y,
          "#e2e8f0",
          5
        );

        game.audio.play("armor");
      } else {
        // Game.js handles health, scoring,
        // explosions, and power-up drops.
        game.damageBrick(brick, 1);
      }

      return true;
    }

    return false;
  }

  // --------------------------------------------------------
  // Moving Defensive Paddle
  // --------------------------------------------------------

  updateDefender(dt) {
    const game = this.game;
    const defender = game.defender;

    if (!defender || !defender.active) return;

    defender.x +=
      defender.direction *
      defender.speed *
      dt;

    const minX = defender.minX;
    const maxX = defender.maxX;

    if (defender.x <= minX) {
      defender.x = minX;
      defender.direction = 1;
    } else if (defender.x >= maxX) {
      defender.x = maxX;
      defender.direction = -1;
    }
  }

  checkDefender(ball, previousX, previousY) {
    const game = this.game;
    const defender = game.defender;

    if (!defender || !defender.active) {
      return false;
    }

    if (!circleIntersectsRect(ball, defender)) {
      return false;
    }

    reflectFromRect(
      ball,
      defender,
      previousX,
      previousY
    );

    // The defender's movement slightly affects
    // horizontal ball velocity.
    const speed = Math.hypot(
      ball.vx,
      ball.vy
    );

    ball.vx +=
      defender.direction *
      defender.speed *
      0.15;

    // Preserve the ball's speed after deflection.
    const newSpeed = Math.hypot(
      ball.vx,
      ball.vy
    );

    if (newSpeed > 0) {
      ball.vx *= speed / newSpeed;
      ball.vy *= speed / newSpeed;
    }

    game.spawnParticles(
      ball.x,
      ball.y,
      "#fb7185",
      9
    );

    game.audio.play("paddle");

    return true;
  }
}
