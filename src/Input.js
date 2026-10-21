
export class Input {
  constructor(canvas) {
    this.canvas = canvas;

    this.keys = new Set();
    this.pointerX = null;
    this.actionRequested = false;

    window.addEventListener("keydown", (event) => {
      if (
        ["ArrowLeft", "ArrowRight", "KeyA", "KeyD", "Space"].includes(
          event.code
        )
      ) {
        event.preventDefault();
      }

      if (event.code === "Space" && !event.repeat) {
        this.actionRequested = true;
      }

      if (
        ["ArrowLeft", "ArrowRight", "KeyA", "KeyD"].includes(
          event.code
        )
      ) {
        this.keys.add(event.code);
        this.pointerX = null;
      }
    });

    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.code);
    });

    window.addEventListener("blur", () => {
      this.keys.clear();
    });

    canvas.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch" && event.buttons === 0) {
        return;
      }

      this.updatePointer(event);
    });

    canvas.addEventListener("pointerdown", (event) => {
      this.updatePointer(event);
      this.actionRequested = true;

      if (event.pointerType !== "mouse") {
        canvas.setPointerCapture(event.pointerId);
      }
    });
  }

  updatePointer(event) {
    const rect = this.canvas.getBoundingClientRect();

    const scaleX = this.canvas.width / rect.width;

    this.pointerX = (event.clientX - rect.left) * scaleX;
  }

  getHorizontalDirection() {
    const left =
      this.keys.has("ArrowLeft") || this.keys.has("KeyA");

    const right =
      this.keys.has("ArrowRight") || this.keys.has("KeyD");

    return Number(right) - Number(left);
  }

  consumeAction() {
    if (!this.actionRequested) return false;

    this.actionRequested = false;
    return true;
  }
}
