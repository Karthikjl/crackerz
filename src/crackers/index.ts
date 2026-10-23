// Cracker catalog. Pure data: speeds/gravity are in px/s at a 900px-tall reference
// screen and get scaled by the engine's unit `u`.

export type CrackerKind =
  | "sparkler"
  | "fountain"
  | "spinner"
  | "snake"
  | "bomb"
  | "chain"
  | "rocket"
  | "cake"
  | "shell";

export type CrackerCategory = "ground" | "sound" | "sky" | "shell";

export type BodyKind = "cone" | "pencil" | "disc" | "tablet" | "bijli" | "bomb" | "laxmi" | "rocket" | "cake" | "cakeBig";

export type BurstPattern =
  | "peony"
  | "chrysanthemum"
  | "willow"
  | "palm"
  | "crossette"
  | "ring"
  | "heart"
  | "strobe"
  | "multibreak";

export interface CrackerConfig {
  id: string;
  name: string;
  category: CrackerCategory;
  kind: CrackerKind;
  hint: string;
  colors: readonly string[];
  /** Per second for emitters (sparkler/fountain/spinner), per burst for explosions. */
  particles: number;
  speed: number;
  gravity: number;
  /** Velocity multiplier per 1/60s frame. */
  drag: number;
  /** Particle lifespan in seconds. */
  lifespan: number;
  /** Seconds the fuse burns before ignition. */
  fuseTime: number;
  /** Seconds an emitter burns, or chain burn time. */
  duration: number;
  body?: BodyKind;
  /** Shell burst pattern; "random" picks any shell. */
  pattern?: BurstPattern | "random";
  /** Shots in a sky-shot cake, or pops in a chain. */
  shots?: number;
  /** Seconds between cake shots. */
  interval?: number;
  /** Bomb strength: scales flash, shake, sound and smoke. */
  power?: number;
}

const PLACE_HINT = "Tap the ground to place, tap it again to light";
const SHELL_HINT = "Tap the sky where you want it to burst - hold to keep firing";
const SHELL_COLORS = ["#ff3d6e", "#ffd23f", "#3dd9ff", "#9b5cff", "#5cff8a", "#ff8a3d"] as const;

const shell = <I extends string>(
  id: I,
  name: string,
  pattern: BurstPattern | "random",
  overrides: Partial<Omit<CrackerConfig, "id">> = {},
): CrackerConfig & { id: I } => ({
  id,
  name,
  category: "shell",
  kind: "shell",
  hint: SHELL_HINT,
  colors: SHELL_COLORS,
  particles: 240,
  speed: 340,
  gravity: 90,
  drag: 0.972,
  lifespan: 2,
  fuseTime: 0,
  duration: 0,
  pattern,
  ...overrides,
});

const cake = <I extends string>(
  id: I,
  shots: number,
  interval: number,
  body: BodyKind,
): CrackerConfig & { id: I } => ({
  id,
  name: `Sky Shot ${shots}`,
  category: "sky",
  kind: "cake",
  hint: `Tap to place, tap again to light - fires ${shots} shells`,
  colors: SHELL_COLORS,
  particles: 0,
  speed: 0,
  gravity: 0,
  drag: 1,
  lifespan: 0,
  fuseTime: 1.2,
  duration: 0,
  body,
  pattern: "random",
  shots,
  interval,
});

export const CRACKERS = [
  // ---- Ground ----
  {
    id: "sparkler",
    name: "Sparkler",
    category: "ground",
    kind: "sparkler",
    hint: "Press and drag to draw with light",
    colors: ["#fff6d5", "#ffd27a", "#ffe9a8", "#ffffff"],
    particles: 380,
    speed: 230,
    gravity: 260,
    drag: 0.93,
    lifespan: 0.45,
    fuseTime: 0,
    duration: 0,
  },
  {
    id: "anar",
    name: "Flower Pot",
    category: "ground",
    kind: "fountain",
    body: "cone",
    hint: PLACE_HINT,
    colors: ["#ffd27a", "#fff1c9", "#ffb347", "#ffffff"],
    particles: 420,
    speed: 600,
    gravity: 560,
    drag: 0.985,
    lifespan: 1.3,
    fuseTime: 1.2,
    duration: 6,
  },
  {
    id: "pencil",
    name: "Color Pencil",
    category: "ground",
    kind: "fountain",
    body: "pencil",
    hint: PLACE_HINT,
    colors: ["#5cff8a", "#b6ffc8", "#2ee86a"],
    particles: 280,
    speed: 190,
    gravity: -70,
    drag: 0.95,
    lifespan: 1.1,
    fuseTime: 0.8,
    duration: 7,
  },
  {
    id: "chakkar",
    name: "Ground Chakkar",
    category: "ground",
    kind: "spinner",
    body: "disc",
    hint: PLACE_HINT,
    colors: ["#7cff6b", "#ff5c5c", "#ffd27a", "#5cc8ff"],
    particles: 320,
    speed: 300,
    gravity: 320,
    drag: 0.95,
    lifespan: 0.6,
    fuseTime: 1,
    duration: 5,
  },
  {
    id: "snake",
    name: "Snake Tablet",
    category: "ground",
    kind: "snake",
    body: "tablet",
    hint: PLACE_HINT,
    colors: ["#ff8a3d"],
    particles: 0,
    speed: 0,
    gravity: 0,
    drag: 1,
    lifespan: 0,
    fuseTime: 0.8,
    duration: 7,
  },

  // ---- Sound ----
  {
    id: "bijli",
    name: "Bijli",
    category: "sound",
    kind: "bomb",
    body: "bijli",
    hint: "Tap to place, tap again to light",
    colors: ["#ffffff", "#ffe9a8"],
    particles: 70,
    speed: 420,
    gravity: 400,
    drag: 0.9,
    lifespan: 0.5,
    fuseTime: 1.2,
    duration: 0,
    power: 0.5,
  },
  {
    id: "bomb",
    name: "Atom Bomb",
    category: "sound",
    kind: "bomb",
    body: "bomb",
    hint: "Tap to place, tap again to light - then cover your ears!",
    colors: ["#ffffff", "#ffcf6b", "#ffe9a8"],
    particles: 180,
    speed: 650,
    gravity: 400,
    drag: 0.9,
    lifespan: 0.7,
    fuseTime: 2,
    duration: 0,
    power: 1,
  },
  {
    id: "laxmi",
    name: "Laxmi Bomb",
    category: "sound",
    kind: "bomb",
    body: "laxmi",
    hint: "The loudest one. Tap to place, tap again to light!",
    colors: ["#ffffff", "#ffcf6b", "#ff9b3d"],
    particles: 280,
    speed: 820,
    gravity: 420,
    drag: 0.9,
    lifespan: 0.8,
    fuseTime: 2.4,
    duration: 0,
    power: 1.5,
  },
  {
    id: "chain",
    name: "1000 Wala",
    category: "sound",
    kind: "chain",
    hint: "Tap to lay the chain, tap it again to light",
    colors: ["#ffffff", "#ffe9a8", "#ffcf6b"],
    particles: 12,
    speed: 380,
    gravity: 500,
    drag: 0.9,
    lifespan: 0.3,
    fuseTime: 1,
    duration: 7,
    shots: 100,
  },

  // ---- Sky ----
  {
    id: "rocket",
    name: "Rocket",
    category: "sky",
    kind: "rocket",
    body: "rocket",
    hint: "Tap to place, tap again to launch",
    colors: ["#5cc8ff", "#ffffff", "#9b5cff"],
    particles: 140,
    speed: 260,
    gravity: 110,
    drag: 0.965,
    lifespan: 1.4,
    fuseTime: 0.9,
    duration: 1.3,
  },
  cake("skyshot12", 12, 0.5, "cake"),
  cake("skyshot30", 30, 0.35, "cake"),
  cake("skyshot60", 60, 0.24, "cakeBig"),
  cake("skyshot120", 120, 0.15, "cakeBig"),

  // ---- Shells ----
  shell("peony", "Peony", "peony"),
  shell("chrysanthemum", "Chrysanthemum", "chrysanthemum", { particles: 200 }),
  shell("willow", "Golden Willow", "willow", {
    colors: ["#ffcf6b", "#ffb347", "#ffe9a8"],
    particles: 170,
    speed: 300,
    gravity: 140,
    drag: 0.955,
    lifespan: 3.6,
  }),
  shell("palm", "Palm", "palm", { colors: ["#ffcf6b", "#ff8a3d", "#5cff8a"], particles: 14, speed: 380 }),
  shell("crossette", "Crossette", "crossette", { particles: 16, speed: 300, lifespan: 0.65 }),
  shell("ring", "Ring", "ring", { particles: 80 }),
  shell("heart", "Heart", "heart", { colors: ["#ff3d6e", "#ff6b8a", "#ff9bb3"], particles: 90, gravity: 40 }),
  shell("strobe", "Strobe", "strobe", { colors: ["#ffffff", "#e8f4ff"], particles: 180, lifespan: 2.4 }),
  shell("multibreak", "Multi-break", "multibreak"),
  shell("random", "Surprise", "random"),
] as const satisfies readonly CrackerConfig[];

export type CrackerId = (typeof CRACKERS)[number]["id"];

export const CRACKERS_BY_ID = Object.fromEntries(
  CRACKERS.map((c): [CrackerId, CrackerConfig] => [c.id, c]),
) as Record<CrackerId, CrackerConfig>;

/** Every shell except "random" - used by random picks, cakes and the finale. */
export const SHELLS: readonly CrackerConfig[] = (CRACKERS as readonly CrackerConfig[]).filter(
  (c) => c.kind === "shell" && c.pattern !== "random",
);

export const CATEGORIES: readonly { id: CrackerCategory; label: string }[] = [
  { id: "ground", label: "Ground" },
  { id: "sound", label: "Sound" },
  { id: "sky", label: "Sky" },
  { id: "shell", label: "Shells" },
];
