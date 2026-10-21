
import { Input } from "./Input.js";

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    this.width = canvas.width;
    this.height = canvas.height;

    this.input = new Input(canvas);

    this.paddle = {
      x: 340,
      y: 550,
      width: 120,
      height: 16,
      speed: 550
    };

    this.ball = {
      x: 400,
      y: 530,
      radius: 8,
      vx: 180,
      vy: -240
    };

    this.bricks = [];
    this.score = 0;
    this.lives = 3;
    this.state = "ready";

    this.createBricks();
    this.attachBall();

    this.lastTime = null;
    this.running = false;

    this.loop = this.loop.bind(this);
  }

  start() {
    if (this.running) return;

    this.running = true;
    this.lastTime = null;

    requestAnimationFrame(this.loop);
  }

  loop(timestamp) {
    if (!this.running) return;

    if (this.lastTime === null) {
      this.lastTime = timestamp;
    }

    const dt = Math.min(
      (timestamp - this.lastTime) / 1000,
      0.05
    );

    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame(this.loop);
  }

  createBricks() {
    const rows = 5;
    const columns = 10;

    const brickWidth = 68;
    const brickHeight = 22;
    const padding = 8;
    const offsetTop = 70;

    const gridWidth =
      columns * brickWidth + (columns - 1) * padding;

    const offsetLeft = (this.width - gridWidth) / 2;

    this.bricks = [];

    const colors = [
      "#ef4444",
      "#f97316",
      "#facc15",
      "#22c55e",
      "#38bdf8"
    ];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        this.bricks.push({
          x: offsetLeft + col * (brickWidth + padding),
          y: offsetTop + row * (brickHeight + padding),
          width: brickWidth,
          height: brickHeight,
          color: colors[row],
          active: true
        });
      }
    }
  }

  update(dt) {
    this.updatePaddle(dt);

    const action = this.input.consumeAction();

    if (this.state === "ready") {
      this.attachBall();

      if (action) {
        this.state = "playing";
      }

      return;
    }

    if (this.state === "won" || this.state === "lost") {
      if (action) {
        this.restart();
      }

      return;
    }

    if (this.state === "playing") {
      this.updateBall(dt);
    }
  }

  updatePaddle(dt) {
    const paddle = this.paddle;
    const direction = this.input.getHorizontalDirection();

    if (direction !== 0) {
      paddle.x += direction * paddle.speed * dt;
    } else if (this.input.pointerX !== null) {
      paddle.x = this.input.pointerX - paddle.width / 2;
    }

    paddle.x = Math.max(
      0,
      Math.min(paddle.x, this.width - paddle.width)
    );
  }

  attachBall() {
    this.ball.x =
      this.paddle.x + this.paddle.width / 2;

    this.ball.y =
      this.paddle.y - this.ball.radius - 4;
  }

  updateBall(dt) {
    const ball = this.ball;
    const paddle = this.paddle;

    const previousX = ball.x;
    const previousY = ball.y;

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Left and right walls.
    if (ball.x - ball.radius <= 0) {
      ball.x = ball.radius;
      ball.vx = Math.abs(ball.vx);
    } else if (ball.x + ball.radius >= this.width) {
      ball.x = this.width - ball.radius;
      ball.vx = -Math.abs(ball.vx);
    }

    // Ceiling.
    if (ball.y - ball.radius <= 0) {
      ball.y = ball.radius;
      ball.vy = Math.abs(ball.vy);
    }

    // Bricks.
    this.checkBrickCollisions(previousX, previousY);

    // Paddle collision.
    const hitsPaddle =
      ball.vy > 0 &&
      ball.x + ball.radius > paddle.x &&
      ball.x - ball.radius < paddle.x + paddle.width &&
      ball.y + ball.radius >= paddle.y &&
      ball.y - ball.radius < paddle.y + paddle.height;

    if (hitsPaddle) {
      ball.y = paddle.y - ball.radius;

      const paddleCenter =
        paddle.x + paddle.width / 2;

      const hitPosition = Math.max(
        -1,
        Math.min(
          1,
          (ball.x - paddleCenter) / (paddle.width / 2)
        )
      );

      const maxAngle = Math.PI / 3;
      const angle = hitPosition * maxAngle;

      const speed = Math.hypot(ball.vx, ball.vy);

      ball.vx = speed * Math.sin(angle);
      ball.vy = -speed * Math.cos(angle);
    }

    // Ball leaves the bottom of the canvas.
    if (ball.y - ball.radius > this.height) {
      this.loseLife();
    }
  }

  checkBrickCollisions(previousX, previousY) {
    const ball = this.ball;

    for (const brick of this.bricks) {
      if (!brick.active) continue;

      const closestX = Math.max(
        brick.x,
        Math.min(ball.x, brick.x + brick.width)
      );

      const closestY = Math.max(
        brick.y,
        Math.min(ball.y, brick.y + brick.height)
      );

      const dx = ball.x - closestX;
      const dy = ball.y - closestY;

      const distanceSquared = dx * dx + dy * dy;

      if (distanceSquared <= ball.radius * ball.radius) {
        brick.active = false;
        this.score += 10;

        const cameFromLeft =
          previousX + ball.radius <= brick.x;

        const cameFromRight =
          previousX - ball.radius >= brick.x + brick.width;

        const cameFromTop =
          previousY + ball.radius <= brick.y;

        const cameFromBottom =
          previousY - ball.radius >= brick.y + brick.height;

        if (cameFromLeft || cameFromRight) {
          ball.vx = -ball.vx;
          ball.x = cameFromLeft
            ? brick.x - ball.radius
            : brick.x + brick.width + ball.radius;
        } else if (cameFromTop || cameFromBottom) {
          ball.vy = -ball.vy;
          ball.y = cameFromTop
            ? brick.y - ball.radius
            : brick.y + brick.height + ball.radius;
        } else {
          ball.vy = -ball.vy;
        }

        if (this.bricks.every((brick) => !brick.active)) {
          this.state = "won";
        }

        break;
      }
    }
  }

  loseLife() {
    this.lives--;

    if (this.lives <= 0) {
      this.state = "lost";
      return;
    }

    this.resetBall();
    this.state = "ready";
  }

  resetBall() {
    this.ball.vx = 180;
    this.ball.vy = -240;
    this.attachBall();
  }

  restart() {
    this.score = 0;
    this.lives = 3;
    this.state = "ready";

    this.paddle.x =
      (this.width - this.paddle.width) / 2;

    // Ignore an old pointer position until moved again.
    this.input.pointerX = null;

    this.createBricks();
    this.resetBall();
  }

  render() {
    const ctx = this.ctx;

    // Background.
    ctx.fillStyle = "#080d18";
    ctx.fillRect(0, 0, this.width, this.height);

    // Bricks.
    for (const brick of this.bricks) {
      if (!brick.active) continue;

      ctx.fillStyle = brick.color;

      ctx.fillRect(
        brick.x,
        brick.y,
        brick.width,
        brick.height
      );
    }

    // Paddle.
    ctx.fillStyle = "#38bdf8";

    ctx.fillRect(
      this.paddle.x,
      this.paddle.y,
      this.paddle.width,
      this.paddle.height
    );

    // Ball.
    if (this.state !== "lost") {
      ctx.beginPath();

      ctx.arc(
        this.ball.x,
        this.ball.y,
        this.ball.radius,
        0,
        Math.PI * 2
      );

      ctx.fillStyle = "#ffffff";
      ctx.fill();
    }

    // Score.
    ctx.fillStyle = "#ffffff";
    ctx.font = "18px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${this.score}`, 20, 30);

    // Lives.
    ctx.textAlign = "right";
    ctx.fillText(`Lives: ${this.lives}`, this.width - 20, 30);

    // Ready message.
    if (this.state === "ready") {
      this.drawMessage(
        "READY",
        "Press SPACE or click/tap to launch"
      );
    }

    // Victory message.
    if (this.state === "won") {
      this.drawMessage(
        "YOU WIN!",
        "Press SPACE or click/tap to restart"
      );
    }

    // Game over message.
    if (this.state === "lost") {
      this.drawMessage(
        "GAME OVER",
        "Press SPACE or click/tap to restart"
      );
    }
  }

  drawMessage(title, subtitle) {
    const ctx = this.ctx;

    // Dark translucent overlay.
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.textAlign = "center";

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 42px Arial";

    ctx.fillText(
      title,
      this.width / 2,
      this.height / 2 - 20
    );

    ctx.font = "18px Arial";
    ctx.fillStyle = "#cbd5e1";

    ctx.fillText(
      subtitle,
      this.width / 2,
      this.height / 2 + 25
    );
  }
}
