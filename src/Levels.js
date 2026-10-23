
/* ==========================================================
   BLOCK BREAKER - LEVEL CONFIGURATION

   N = Normal brick
   A = Armored brick
   X = Explosive brick
   # = Indestructible obstacle
   . = Empty space

   Level definitions are kept separate from gameplay logic.
   ========================================================== */

const THEMES = {
  classic: ["#fb7185", "#fb923c", "#facc15", "#4ade80", "#38bdf8"],
  ocean: ["#22d3ee", "#38bdf8", "#60a5fa", "#818cf8", "#a78bfa"],
  fire: ["#f43f5e", "#fb7185", "#fb923c", "#facc15", "#f97316"],
  forest: ["#4ade80", "#22c55e", "#14b8a6", "#2dd4bf", "#a3e635"],
  neon: ["#e879f9", "#c084fc", "#818cf8", "#38bdf8", "#f472b6"],
  gold: ["#facc15", "#fbbf24", "#fb923c", "#f59e0b", "#fde047"]
};

function level(name, theme, rows, options = {}) {
  return {
    name,
    colors: THEMES[theme],
    pattern: rows,
    ballSpeed: options.ballSpeed ?? 300,
    armorHealth: options.armorHealth ?? 2,
    defender: options.defender ?? null,
    powerChance: options.powerChance ?? 0.16
  };
}

// A defender moves horizontally between two relative
// positions in the playfield. It does not follow the ball.
function defender(speed, width = 110, range = 0.35) {
  return {
    speed,
    width,
    range
  };
}

export const LEVELS = [

  // ========================================================
  // WORLD 1 - CLASSIC ARCADE
  // Levels 1-5: Learn the basics.
  // ========================================================

  level("First Contact", "classic", [
    "NNNNNNNNNN",
    "NNNNNNNNNN",
    "NNNNNNNNNN",
    "NNNNNNNNNN"
  ], { ballSpeed: 300 }),

  level("The Staircase", "classic", [
    "NN........",
    "NNNN......",
    "NNNNNN....",
    "NNNNNNNN..",
    "NNNNNNNNNN"
  ], { ballSpeed: 310 }),

  level("Double Trouble", "ocean", [
    "NNNN..NNNN",
    "NNNN..NNNN",
    "AAAA..AAAA",
    "NNNN..NNNN",
    "NNNN..NNNN"
  ], { ballSpeed: 315 }),

  level("Chain Reaction", "fire", [
    "NNNNNNNNNN",
    "NNXNNNNXNN",
    "NNNNNNNNNN",
    "NNNXNNXNNN",
    "NNNNNNNNNN"
  ], { ballSpeed: 325 }),

  level("The Fortress", "gold", [
    "AAAAAAAAAA",
    "ANNNNNNNNA",
    "ANXNNNNXNA",
    "ANNNNNNNNA",
    "AAAAAAAAAA"
  ], { ballSpeed: 330 }),

  // ========================================================
  // WORLD 2 - OBSTACLE COURSE
  // Levels 6-10: Permanent bricks and narrow openings.
  // ========================================================

  level("Stone Walls", "forest", [
    "NNNNNNNNNN",
    "NNNNNNNNNN",
    "##......##",
    "NNNNNNNNNN",
    "NNNNNNNNNN"
  ], { ballSpeed: 335 }),

  level("The Passage", "ocean", [
    "NNNNNNNNNN",
    "AAAANAAAAA",
    "####..####",
    "NNNNNNNNNN",
    "NNNNNNNNNN"
  ], { ballSpeed: 340 }),

  level("The Maze", "neon", [
    "NNNNNNNNNN",
    "##NNNNNN##",
    "NN##NN##NN",
    "NNNN##NNNN",
    "NNNNNNNNNN"
  ], { ballSpeed: 345 }),

  level("Crossfire", "fire", [
    "NNNXNNXNNN",
    "N##NNNN##N",
    "NNNNXXNNNN",
    "N##NNNN##N",
    "NNNXNNXNNN"
  ], { ballSpeed: 350 }),

  level("Iron Curtain", "gold", [
    "AAAAAAAAAA",
    "ANNNNNNNNA",
    "###NNNN###",
    "ANNNXXNNNA",
    "AAAAAAAAAA",
    "####..####"
  ], { ballSpeed: 355 }),

  // ========================================================
  // WORLD 3 - MOVING TARGETS
  // Levels 11-15: More complex shapes and tighter angles.
  // ========================================================

  level("The Diamond", "neon", [
    "....NN....",
    "...NNNN...",
    "..NNXXNN..",
    ".NNN##NNN.",
    "..NNXXNN..",
    "...NNNN...",
    "....NN...."
  ], { ballSpeed: 360 }),

  level("Split Decision", "ocean", [
    "AAAA..AAAA",
    "NNNN..NNNN",
    "NN##..##NN",
    "NNNN..NNNN",
    "AAAA..AAAA"
  ], { ballSpeed: 365 }),

  level("The Spiral", "forest", [
    "NNNNNNNNNN",
    "N........N",
    "N.NNNNNN.N",
    "N.N....N.N",
    "N.N.XX.N.N",
    "N.NNNNNN.N",
    "NNNNNNNNNN"
  ], { ballSpeed: 370 }),

  level("Detonation", "fire", [
    "NNXNNNNXNN",
    "NNNNNNNNNN",
    "XNNXNNXNNX",
    "NNNNNNNNNN",
    "NNXNNNNXNN",
    "AAAA..AAAA"
  ], { ballSpeed: 380 }),

  level("The Gauntlet", "gold", [
    "AAAAAAAAAA",
    "##NNNNNN##",
    "NNXXNNXXNN",
    "NN##NN##NN",
    "NNNNNNNNNN",
    "####..####"
  ], { ballSpeed: 385, armorHealth: 3 }),

  // ========================================================
  // WORLD 4 - DEFENSIVE SYSTEMS
  // Levels 16-20: A moving paddle defends the bricks.
  // ========================================================

  level("First Defense", "ocean", [
    "NNNNNNNNNN",
    "NNNNNNNNNN",
    "AAAA..AAAA",
    "NNNNNNNNNN"
  ], {
    ballSpeed: 390,
    defender: defender(95, 115, 0.30)
  }),

  level("Patrol Zone", "forest", [
    "NNNNNNNNNN",
    "NNXNNNNXNN",
    "##NNNNNN##",
    "NNNNNNNNNN",
    "NNNNNNNNNN"
  ], {
    ballSpeed: 395,
    defender: defender(115, 110, 0.38)
  }),

  level("Moving Wall", "neon", [
    "AAAAAAAAAA",
    "NNNNNNNNNN",
    "NN##NN##NN",
    "NNNNNNNNNN",
    "NNXNNNNXNN"
  ], {
    ballSpeed: 400,
    defender: defender(130, 120, 0.40)
  }),

  level("The Interceptor", "fire", [
    "NNXXNNXXNN",
    "AAAA..AAAA",
    "NNNNNNNNNN",
    "##NNNNNN##",
    "NNNNNNNNNN"
  ], {
    ballSpeed: 410,
    armorHealth: 3,
    defender: defender(145, 105, 0.42)
  }),

  level("Security Grid", "gold", [
    "AAAAAAAAAA",
    "N##NNNN##N",
    "NNXXNNXXNN",
    "N##NNNN##N",
    "AAAAAAAAAA",
    "NNNNNNNNNN"
  ], {
    ballSpeed: 415,
    armorHealth: 3,
    defender: defender(155, 110, 0.43)
  }),

  // ========================================================
  // WORLD 5 - ADVANCED ARCADE
  // Levels 21-25: More dangerous combinations.
  // ========================================================

  level("Shockwave", "fire", [
    "XNNXNNXNNX",
    "NNNNNNNNNN",
    "####..####",
    "NNNNNNNNNN",
    "XNNXNNXNNX"
  ], {
    ballSpeed: 425,
    defender: defender(165, 105, 0.43)
  }),

  level("The Citadel", "gold", [
    "AAAAAAAAAA",
    "A##NNNN##A",
    "ANNNXXNNNA",
    "AN##NN##NA",
    "ANNNNNNNNA",
    "AAAAAAAAAA"
  ], {
    ballSpeed: 430,
    armorHealth: 3,
    defender: defender(175, 100, 0.44)
  }),

  level("Neon Labyrinth", "neon", [
    "NNNNNNNNNN",
    "##NNNNNN##",
    "NN##NN##NN",
    "NNNN##NNNN",
    "NNXXNNXXNN",
    "NNNNNNNNNN"
  ], {
    ballSpeed: 440,
    defender: defender(180, 100, 0.44)
  }),

  level("Collision Course", "ocean", [
    "NNXXNNXXNN",
    "AA##NN##AA",
    "NNNNNNNNNN",
    "##NNXXNN##",
    "NNNNNNNNNN",
    "AAAAAAAAAA"
  ], {
    ballSpeed: 445,
    armorHealth: 3,
    defender: defender(190, 100, 0.45)
  }),

  level("Overload", "fire", [
    "AXAXAXAXAX",
    "NNNNNNNNNN",
    "##NNXXNN##",
    "NNNNNNNNNN",
    "AXAXAXAXAX",
    "NNNNNNNNNN"
  ], {
    ballSpeed: 450,
    armorHealth: 3,
    defender: defender(200, 95, 0.46)
  }),

  // ========================================================
  // WORLD 6 - FINAL CHALLENGE
  // Levels 26-30: Master-level layouts and defense.
  // ========================================================

  level("The Last Stand", "forest", [
    "AAAAAAAAAA",
    "NNXXNNXXNN",
    "####..####",
    "NNNNNNNNNN",
    "NNXXNNXXNN",
    "AAAAAAAAAA"
  ], {
    ballSpeed: 455,
    armorHealth: 3,
    defender: defender(205, 100, 0.46)
  }),

  level("Chaos Theory", "neon", [
    "XNXNXNXNXN",
    "NNNNNNNNNN",
    "##NN##NN##",
    "NNNNNNNNNN",
    "NXNXNXNXNX",
    "AAAAAAAAAA"
  ], {
    ballSpeed: 460,
    armorHealth: 3,
    defender: defender(215, 95, 0.46)
  }),

  level("Final Barrier", "gold", [
    "AAAAAAAAAA",
    "A##NNNN##A",
    "ANXXNNXXNA",
    "ANNN##NNNA",
    "A##NNNN##A",
    "AAAAAAAAAA",
    "####..####"
  ], {
    ballSpeed: 470,
    armorHealth: 3,
    defender: defender(225, 95, 0.47)
  }),

  level("Last Resistance", "fire", [
    "AXAXAXAXAX",
    "NNNNNNNNNN",
    "##NNXXNN##",
    "AAAAAAAAAA",
    "NNXXNNXXNN",
    "##NNNNNN##",
    "AXAXAXAXAX"
  ], {
    ballSpeed: 480,
    armorHealth: 3,
    defender: defender(235, 90, 0.47)
  }),

  level("The Final Fortress", "neon", [
    "AAAAAAAAAA",
    "AXNNXXNNXA",
    "A##NNNN##A",
    "ANNN##NNNA",
    "AXNNXXNNXA",
    "AAAAAAAAAA",
    "####..####"
  ], {
    ballSpeed: 490,
    armorHealth: 3,
    defender: defender(250, 100, 0.48),
    powerChance: 0.20
  })
];

// ==========================================================
// Level Helpers
// ==========================================================

export const MAX_LEVEL = LEVELS.length;

export function getLevel(number) {
  const index = Math.max(
    0,
    Math.min(number - 1, LEVELS.length - 1)
  );

  return LEVELS[index];
}

export function getCheckpoint(levelNumber) {
  // Checkpoints begin at levels 1, 6, 11, 16, 21, 26.
  return Math.floor((levelNumber - 1) / 5) * 5 + 1;
}

export function isCheckpoint(levelNumber) {
  return levelNumber > 1 && (levelNumber - 1) % 5 === 0;
}

export function getWorld(levelNumber) {
  return Math.floor((levelNumber - 1) / 5) + 1;
}
