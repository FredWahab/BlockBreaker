
export class Input {
  constructor(canvas) {
    this.canvas = canvas;

    // Continuous input.
    this.keys = new Set();
    this.pointerX = null;
    this.pointerDown = false;
    this.activePointerId = null;

    // One-time actions.
    this.actionRequested = false;
    this.pauseRequested = false;
    this.muteRequested = false;
    this.restartRequested = false;

    // Spacebar tap / hold detection.
    this.spaceDown = false;
    this.spaceDownTime = 0;
    this.spaceHoldThreshold = 250;

    // Ignore game keyboard shortcuts while typing
    // into an input field, if one is added later.
    this.setupKeyboard();
    this.setupPointer();
  }

  setupKeyboard() {
    const gameKeys = new Set([
      "ArrowLeft",
      "ArrowRight",
      "KeyA",
      "KeyD",
      "Space",
      "KeyP",
      "KeyM",
      "KeyR"
    ]);

    window.addEventListener("keydown", (event) => {
      const target = event.target;

      if (
        target instanceof HTMLElement &&
        (
          target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
        )
      ) {
        return;
      }

      if (gameKeys.has(event.code)) {
        event.preventDefault();
      }

      if (event.code === "Space") {
        if (!this.spaceDown) {
          this.spaceDown = true;
          this.spaceDownTime = performance.now();
        }

        this.keys.add("Space");
        return;
      }

      if (!event.repeat) {
        switch (event.code) {
          case "KeyP":
            this.pauseRequested = true;
            break;

          case "KeyM":
            this.muteRequested = true;
            break;

          case "KeyR":
            this.restartRequested = true;
            break;
        }
      }

      if (
        ["ArrowLeft", "ArrowRight", "KeyA", "KeyD"].includes(
          event.code
        )
      ) {
        this.pointerX = null;
      }

      this.keys.add(event.code);
    });

    window.addEventListener("keyup", (event) => {
      if (event.code === "Space") {
        if (this.spaceDown) {
          const duration =
            performance.now() - this.spaceDownTime;

          if (duration < this.spaceHoldThreshold) {
            this.pauseRequested = true;
          }
        }

        this.spaceDown = false;
        this.keys.delete("Space");
        return;
      }

      this.keys.delete(event.code);
    });

    window.addEventListener("blur", () => {
      this.keys.clear();
      this.pointerDown = false;
      this.activePointerId = null;
      this.spaceDown = false;
      this.spaceDownTime = 0;
    });
  }

  setupPointer() {
    this.canvas.addEventListener("pointerdown", (event) => {
      if (this.activePointerId !== null) return;

      if (event.cancelable) {
        event.preventDefault();
      }

      this.activePointerId = event.pointerId;
      this.pointerDown = true;

      this.updatePointer(event);

      // Launch when ready.
      // Resume from pause remains a separate action.
      this.actionRequested = true;

      if (event.pointerType !== "mouse") {
        this.canvas.setPointerCapture(event.pointerId);
      }
    });

    this.canvas.addEventListener("pointermove", (event) => {
      if (
        this.activePointerId !== null &&
        event.pointerId !== this.activePointerId
      ) {
        return;
      }

      if (
        event.pointerType === "touch" &&
        !this.pointerDown
      ) {
        return;
      }

      this.updatePointer(event);
    });

    this.canvas.addEventListener("pointerup", (event) => {
      this.releasePointer(event);
    });

    this.canvas.addEventListener("pointercancel", (event) => {
      this.releasePointer(event);
    });

    window.addEventListener("pointerup", (event) => {
      if (event.pointerId === this.activePointerId) {
        this.releasePointer(event);
      }
    });
  }

  releasePointer(event) {
    if (event.pointerId !== this.activePointerId) {
      return;
    }

    this.pointerDown = false;
    this.activePointerId = null;

    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
  }

  updatePointer(event) {
    const rect = this.canvas.getBoundingClientRect();

    if (rect.width <= 0) return;

    const scaleX = this.canvas.width / rect.width;

    this.pointerX =
      (event.clientX - rect.left) * scaleX;
  }

  update() {
    // Input events are handled by browser event listeners.
  }

  getHorizontalDirection() {
    const left =
      this.keys.has("ArrowLeft") ||
      this.keys.has("KeyA");

    const right =
      this.keys.has("ArrowRight") ||
      this.keys.has("KeyD");

    return Number(right) - Number(left);
  }

  isFiring() {
    const spaceHeld =
      this.spaceDown &&
      performance.now() - this.spaceDownTime >=
        this.spaceHoldThreshold;

    return spaceHeld || this.pointerDown;
  }

  consumeAction() {
    if (!this.actionRequested) return false;

    this.actionRequested = false;
    return true;
  }

  consumePause() {
    if (!this.pauseRequested) return false;

    this.pauseRequested = false;
    return true;
  }

  consumeMute() {
    if (!this.muteRequested) return false;

    this.muteRequested = false;
    return true;
  }

  consumeRestart() {
    if (!this.restartRequested) return false;

    this.restartRequested = false;
    return true;
  }
}
