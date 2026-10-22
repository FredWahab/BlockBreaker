
import { Howl, Howler } from "howler";

// Generate short arcade sound effects as WAV audio.
function makeTone(frequency, duration, kind = "sine", slide = 0) {
  const sampleRate = 22050;
  const count = Math.floor(duration * sampleRate);

  const samples = new Uint8Array(44 + count * 2);
  const view = new DataView(samples.buffer);

  const writeText = (offset, text) => {
    for (let i = 0; i < text.length; i++) {
      samples[offset + i] = text.charCodeAt(i);
    }
  };

  // WAV file header.
  writeText(0, "RIFF");
  view.setUint32(4, samples.length - 8, true);

  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);

  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);

  writeText(36, "data");
  view.setUint32(40, count * 2, true);

  // Generate the waveform.
  let phase = 0;

  for (let i = 0; i < count; i++) {
    const t = i / count;

    const currentFrequency = frequency + slide * t;

    phase += (2 * Math.PI * currentFrequency) / sampleRate;

    let wave;

    switch (kind) {
      case "square":
        wave = Math.sign(Math.sin(phase));
        break;

      case "triangle":
        wave = (2 * Math.asin(Math.sin(phase))) / Math.PI;
        break;

      default:
        wave = Math.sin(phase);
        break;
    }

    // Quick attack followed by a smooth fade.
    const envelope =
      Math.pow(1 - t, 2) *
      Math.min(1, t * 80);

    const amplitude = wave * envelope * 12000;

    view.setInt16(
      44 + i * 2,
      Math.round(amplitude),
      true
    );
  }

  // Convert the WAV bytes into a base64 data URL.
  let binary = "";

  for (let i = 0; i < samples.length; i += 8192) {
    binary += String.fromCharCode(
      ...samples.subarray(i, i + 8192)
    );
  }

  return `data:audio/wav;base64,${btoa(binary)}`;
}

export class Audio {
  constructor() {
    this.muted = false;

    // Frequency, duration, waveform, frequency slide.
    const soundDefinitions = {
      wall: [380, 0.055, "sine", -130],
      paddle: [260, 0.11, "triangle", 190],
      brick: [650, 0.09, "square", -270],
      armor: [210, 0.13, "triangle", -100],
      explosion: [115, 0.3, "square", -105],
      power: [510, 0.28, "sine", 460],
      laser: [720, 0.09, "square", -560],
      win: [510, 0.55, "sine", 490],
      lose: [270, 0.4, "triangle", -210],
      launch: [340, 0.15, "sine", 320],
      level: [460, 0.4, "triangle", 400],
      start: [420, 0.25, "sine", 350]
    };

    this.sounds = {};

    // Create and preload each sound through Howler.
    for (const [name, settings] of Object.entries(soundDefinitions)) {
      this.sounds[name] = new Howl({
        src: [makeTone(...settings)],
        format: ["wav"],
        preload: true,
        html5: false,
        volume: name === "wall" ? 0.13 : 0.24,
        pool: 8
      });
    }
  }

  unlock() {
    // Resume the audio context following user interaction.
    // Particularly useful for mobile Safari.
    if (
      Howler.ctx &&
      Howler.ctx.state === "suspended"
    ) {
      Howler.ctx.resume().catch(() => {});
    }
  }

  play(name) {
    if (this.muted) return;

    const sound = this.sounds[name];

    if (!sound) return;

    sound.play();
  }

  toggleMute() {
    this.muted = !this.muted;

    Howler.mute(this.muted);

    return this.muted;
  }
}
