import { Container, Graphics, Sprite, type Texture } from "pixi.js";
import type { SceneKind } from "./settings";
import { createSkyTexture, GLOW_SIZE } from "./textures";

/** Deterministic RNG so the landscape stays the same across resizes. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Flicker {
  sprite: Container;
  base: number;
  phase: number;
  speed: number;
}

const SILHOUETTE = 0x0b0714;
const FAR = 0x170e28;
const WINDOW = 0xffcf6b;

const GROUND: Record<SceneKind, [number, number]> = {
  city: [0x110a12, 0x2b1724],
  village: [0x140d0a, 0x2a1c14],
  temple: [0x120c10, 0x2e1c22],
  beach: [0x1e1710, 0x3a2c1c],
};

/** Night scene: sky, stars, moon (back) and landscape, ground, lights (front). */
export class Scene {
  readonly back = new Container();
  readonly front = new Container();
  kind: SceneKind = "city";
  /** Star twinkle redraws large Graphics every frame; off on weak devices. */
  twinkle = true;

  private readonly sky: Sprite;
  private readonly starsA = new Graphics();
  private readonly starsB = new Graphics();
  private readonly moon = new Graphics();
  private readonly moonGlow: Sprite;
  private readonly land = new Graphics();
  private readonly ground = new Graphics();
  private readonly decor = new Container();
  private flickers: Flicker[] = [];
  private t = 0;
  private moonX = 0;

  constructor(private readonly glowTexture: Texture) {
    this.sky = new Sprite(createSkyTexture());
    this.moonGlow = this.glow(0xfff2cc, 0, 0, 1);
    this.moonGlow.alpha = 0.22;
    this.back.addChild(this.sky, this.starsA, this.starsB, this.moonGlow, this.moon);
    this.front.addChild(this.land, this.ground, this.decor);
  }

  layout(w: number, h: number, u: number, groundY: number): void {
    const rng = mulberry32(42);

    this.sky.width = w;
    this.sky.height = groundY + 2;

    for (const stars of [this.starsA, this.starsB]) {
      stars.clear();
      const count = Math.round((w * groundY) / 9000);
      for (let i = 0; i < count; i++) {
        stars.circle(rng() * w, rng() * groundY * 0.75, (0.5 + rng() * 1.1) * u).fill({
          color: 0xffffff,
          alpha: 0.3 + rng() * 0.6,
        });
      }
    }

    const mx = w * 0.84;
    const my = h * 0.13;
    const mr = 24 * u;
    this.moonX = mx;
    this.moon.clear();
    this.moon.circle(mx, my, mr).fill(0xfff4d6);
    this.moon.circle(mx + mr * 0.45, my - mr * 0.2, mr * 0.95).fill(0x05030e);
    this.moonGlow.position.set(mx, my);
    this.moonGlow.scale.set((mr * 9) / GLOW_SIZE);

    for (const child of this.decor.removeChildren()) child.destroy();
    this.flickers = [];
    this.land.clear();

    switch (this.kind) {
      case "city":
        this.drawCity(w, u, groundY, rng);
        break;
      case "village":
        this.drawVillage(w, u, groundY, rng);
        break;
      case "temple":
        this.drawTemple(w, u, groundY, rng);
        break;
      case "beach":
        this.drawBeach(w, h, u, groundY, rng);
        break;
    }

    const [fill, edge] = GROUND[this.kind];
    this.ground.clear();
    this.ground.rect(0, groundY, w, h - groundY).fill(fill);
    this.ground.rect(0, groundY, w, 2 * u).fill(edge);

    if (this.kind !== "beach") {
      const count = Math.max(4, Math.floor(w / (this.kind === "temple" ? 120 : 200)));
      this.addDiyas(w, h, u, groundY, count);
    }
  }

  update(dt: number): void {
    this.t += dt;
    const t = this.t;
    if (this.twinkle) {
      this.starsA.alpha = 0.65 + 0.35 * Math.sin(t * 1.3);
      this.starsB.alpha = 0.65 + 0.35 * Math.sin(t * 1.7 + 2);
    }
    for (const f of this.flickers) {
      f.sprite.alpha = f.base * (0.8 + 0.2 * Math.sin(t * f.speed + f.phase) * Math.sin(t * f.speed * 0.4 + f.phase));
    }
  }

  // ---- helpers ----

  private glow(tint: number, x: number, y: number, size: number): Sprite {
    const s = new Sprite(this.glowTexture);
    s.anchor.set(0.5);
    s.tint = tint;
    s.blendMode = "add";
    s.position.set(x, y);
    s.scale.set(size / GLOW_SIZE);
    return s;
  }

  private flicker(sprite: Sprite, base: number, speed = 11): void {
    sprite.alpha = base;
    this.decor.addChild(sprite);
    this.flickers.push({ sprite, base, phase: Math.random() * 10, speed });
  }

  private addDiyas(w: number, h: number, u: number, groundY: number, count: number): void {
    const y = groundY + (h - groundY) * 0.5;
    for (let i = 0; i < count; i++) {
      const x = ((i + 0.5) / count) * w;
      this.flicker(this.glow(0xff8c2a, x, y - 4 * u, 70 * u), 0.35);
      const bowl = new Graphics().ellipse(x, y, 9 * u, 4 * u).fill(0xb5562b);
      bowl.ellipse(x, y - 2 * u, 7 * u, 1.6 * u).fill(0x6b2a14);
      this.decor.addChild(bowl);
      const flame = this.glow(0xffc457, x, y - 3 * u, 1);
      flame.anchor.set(0.5, 0.8);
      flame.scale.set((10 * u) / GLOW_SIZE, (20 * u) / GLOW_SIZE);
      this.flicker(flame, 1);
    }
  }

  /** Akash kandil: hanging star lantern. */
  private addLantern(x: number, y: number, u: number, color: number): void {
    const g = new Graphics();
    g.moveTo(x, y - 30 * u)
      .lineTo(x, y - 8 * u)
      .stroke({ width: 1 * u, color: 0x3a2a30 });
    g.poly([x, y - 9 * u, x + 7 * u, y, x, y + 9 * u, x - 7 * u, y]).fill(color);
    g.rect(x - 1 * u, y + 9 * u, 2 * u, 8 * u).fill(color);
    this.decor.addChild(g);
    this.flicker(this.glow(color, x, y, 60 * u), 0.5, 3);
  }

  private drawCity(w: number, u: number, groundY: number, rng: () => number): void {
    const g = this.land;
    for (let x = -10; x < w; ) {
      const bw = (40 + rng() * 70) * u;
      const bh = (30 + rng() * 90) * u;
      g.rect(x, groundY - bh, bw + 1, bh).fill(FAR);
      x += bw;
    }

    // Small temple left of center.
    const tx = w * 0.28;
    g.rect(tx - 35 * u, groundY - 40 * u, 70 * u, 40 * u).fill(SILHOUETTE);
    for (let k = 0; k < 4; k++) {
      const half = (30 - k * 7) * u;
      const top = groundY - (40 + (k + 1) * 22) * u;
      g.poly([tx - half, top + 22 * u, tx + half, top + 22 * u, tx + half * 0.7, top, tx - half * 0.7, top]).fill(SILHOUETTE);
    }
    const spire = groundY - 128 * u;
    g.poly([tx - 5 * u, spire + 4 * u, tx + 5 * u, spire + 4 * u, tx, spire - 14 * u]).fill(SILHOUETTE);
    g.poly([tx, spire - 14 * u, tx + 14 * u, spire - 10 * u, tx, spire - 6 * u]).fill(0xff8a3d);

    for (let x = -10; x < w; ) {
      const bw = (30 + rng() * 60) * u;
      const bh = (40 + rng() * 140) * u;
      const height = Math.abs(x + bw / 2 - tx) < 70 * u ? bh * 0.35 : bh;
      g.rect(x, groundY - height, bw + 1, height).fill(SILHOUETTE);
      const cell = 12 * u;
      for (let wy = groundY - height + 8 * u; wy < groundY - 10 * u; wy += cell) {
        for (let wx = x + 6 * u; wx < x + bw - 8 * u; wx += cell) {
          if (rng() < 0.22) g.rect(wx, wy, 4 * u, 6 * u).fill({ color: WINDOW, alpha: 0.35 + rng() * 0.5 });
        }
      }
      x += bw;
    }
  }

  private drawVillage(w: number, u: number, groundY: number, rng: () => number): void {
    const g = this.land;
    // Rolling hills.
    const hills: number[] = [0, groundY];
    for (let x = 0; x <= w; x += 20 * u) {
      hills.push(x, groundY - (60 + Math.sin(x / (140 * u)) * 30 + Math.sin(x / (53 * u)) * 12) * u);
    }
    hills.push(w, groundY);
    g.poly(hills).fill(0x140c22);

    // Trees and palms.
    for (let x = rng() * 60 * u; x < w; x += (70 + rng() * 120) * u) {
      if (rng() < 0.5) {
        const r = (16 + rng() * 14) * u;
        g.rect(x - 2 * u, groundY - r * 2, 4 * u, r * 2).fill(SILHOUETTE);
        g.circle(x, groundY - r * 2.2, r).fill(SILHOUETTE);
        g.circle(x - r * 0.7, groundY - r * 1.8, r * 0.7).fill(SILHOUETTE);
        g.circle(x + r * 0.7, groundY - r * 1.8, r * 0.7).fill(SILHOUETTE);
      } else {
        this.drawPalm(x, groundY, (90 + rng() * 40) * u, u, rng() < 0.5 ? -1 : 1);
      }
    }

    // Huts with lit doorways and lanterns.
    for (let x = 40 * u + rng() * 40 * u; x < w - 40 * u; x += (130 + rng() * 120) * u) {
      const hw = (34 + rng() * 14) * u;
      const hh = (26 + rng() * 8) * u;
      g.rect(x - hw / 2, groundY - hh, hw, hh).fill(0x0d0910);
      g.poly([x - hw * 0.7, groundY - hh, x + hw * 0.7, groundY - hh, x, groundY - hh - hw * 0.55]).fill(0x09060b);
      g.rect(x - 5 * u, groundY - 16 * u, 10 * u, 16 * u).fill({ color: 0xffb347, alpha: 0.75 });
      this.flicker(this.glow(0xff9b3d, x, groundY - 8 * u, 60 * u), 0.35, 6);
      if (rng() < 0.7) this.addLantern(x + hw * 0.55, groundY - hh - 4 * u, u, rng() < 0.5 ? 0xff8a3d : 0xff3d6e);
    }
  }

  private drawPalm(x: number, groundY: number, height: number, u: number, lean: number): void {
    const g = this.land;
    const topX = x + lean * height * 0.25;
    const topY = groundY - height;
    g.moveTo(x, groundY)
      .quadraticCurveTo(x + lean * height * 0.05, groundY - height * 0.5, topX, topY)
      .stroke({ width: 4 * u, color: SILHOUETTE });
    for (let k = 0; k < 7; k++) {
      const a = -Math.PI / 2 + (k - 3) * 0.45;
      const len = height * 0.32;
      g.moveTo(topX, topY)
        .quadraticCurveTo(topX + Math.cos(a) * len * 0.6, topY + Math.sin(a) * len * 0.6 - 6 * u, topX + Math.cos(a) * len, topY + Math.sin(a) * len * 0.4 + len * 0.35)
        .stroke({ width: 3 * u, color: SILHOUETTE });
    }
  }

  private drawTemple(w: number, u: number, groundY: number, rng: () => number): void {
    const g = this.land;
    // Far skyline of small shrines and trees.
    for (let x = -10; x < w; ) {
      const bw = (30 + rng() * 60) * u;
      const bh = (20 + rng() * 50) * u;
      g.rect(x, groundY - bh, bw + 1, bh).fill(FAR);
      x += bw;
    }

    // Courtyard wall.
    g.rect(0, groundY - 34 * u, w, 34 * u).fill(SILHOUETTE);
    for (let x = 10 * u; x < w; x += 26 * u) g.rect(x, groundY - 40 * u, 12 * u, 6 * u).fill(SILHOUETTE);

    // Central gopuram: stepped tiers, outlined with lamps.
    const cx = w / 2;
    const baseW = Math.min(w * 0.36, 220 * u);
    const tiers = 7;
    let y = groundY - 34 * u;
    let half = baseW / 2;
    const tierH = 22 * u;
    for (let k = 0; k < tiers; k++) {
      const nextHalf = half * 0.84;
      g.poly([cx - half, y, cx + half, y, cx + nextHalf, y - tierH, cx - nextHalf, y - tierH]).fill(SILHOUETTE);
      const lamps = Math.max(3, Math.round((half * 2) / (16 * u)));
      for (let i = 0; i <= lamps; i++) {
        const lx = cx - half + (i / lamps) * half * 2;
        this.flicker(this.glow(0xffc457, lx, y - 1 * u, 9 * u), 0.9, 8);
      }
      y -= tierH;
      half = nextHalf;
    }
    g.roundRect(cx - half, y - 16 * u, half * 2, 16 * u, 8 * u).fill(SILHOUETTE);
    g.poly([cx - 4 * u, y - 16 * u, cx + 4 * u, y - 16 * u, cx, y - 34 * u]).fill(0xd4a017);
    this.flicker(this.glow(0xffd27a, cx, y - 26 * u, 50 * u), 0.5, 2);

    // Doorway glow.
    g.roundRect(cx - 14 * u, groundY - 34 * u, 28 * u, 34 * u, 12 * u).fill({ color: 0xffb347, alpha: 0.8 });
    this.flicker(this.glow(0xff9b3d, cx, groundY - 18 * u, 120 * u), 0.4, 4);

    // Side shrines.
    for (const sx of [cx - baseW * 0.95, cx + baseW * 0.95]) {
      g.rect(sx - 26 * u, groundY - 70 * u, 52 * u, 36 * u).fill(SILHOUETTE);
      g.poly([sx - 30 * u, groundY - 70 * u, sx + 30 * u, groundY - 70 * u, sx, groundY - 104 * u]).fill(SILHOUETTE);
      this.flicker(this.glow(0xffc457, sx, groundY - 104 * u, 14 * u), 0.9, 8);
    }
  }

  private drawBeach(w: number, h: number, u: number, groundY: number, rng: () => number): void {
    const g = this.land;
    const horizon = groundY - Math.max(40 * u, (groundY - h * 0.5) * 0.35);
    const bands = [0x070b1f, 0x081028, 0x0a1430, 0x0c1838];
    const bandH = (groundY - horizon) / bands.length;
    bands.forEach((c, i) => g.rect(0, horizon + i * bandH, w, bandH + 1).fill(c));

    // Distant headland and lighthouse.
    g.poly([w * 0.62, horizon, w * 0.7, horizon - 14 * u, w * 0.8, horizon - 22 * u, w, horizon - 18 * u, w, horizon]).fill(SILHOUETTE);
    const lx = w * 0.88;
    const ly = horizon - 22 * u;
    g.poly([lx - 6 * u, ly, lx + 6 * u, ly, lx + 3 * u, ly - 50 * u, lx - 3 * u, ly - 50 * u]).fill(0x1a1428);
    g.rect(lx - 4 * u, ly - 56 * u, 8 * u, 6 * u).fill(0xfff2cc);
    this.flicker(this.glow(0xfff2cc, lx, ly - 53 * u, 70 * u), 0.6, 1.3);

    // Moon reflection and wave glints.
    for (let y = horizon + 4 * u; y < groundY - 4 * u; y += 7 * u) {
      const k = (y - horizon) / (groundY - horizon);
      const glint = new Graphics()
        .rect(this.moonX - (8 + k * 30) * u * (0.6 + rng() * 0.8), y, (16 + k * 60) * u * (0.6 + rng() * 0.8), 1.5 * u)
        .fill(0xfff4d6);
      glint.blendMode = "add";
      this.decor.addChild(glint);
      this.flickers.push({ sprite: glint, base: 0.35 * (1 - k * 0.5), phase: rng() * 10, speed: 3 + rng() * 3 });
    }
    for (let i = 0; i < 26; i++) {
      const wy = horizon + rng() * (groundY - horizon);
      const wave = new Graphics().rect(rng() * w, wy, (10 + rng() * 30) * u, 1 * u).fill(0x6a8ad0);
      this.decor.addChild(wave);
      this.flickers.push({ sprite: wave, base: 0.25, phase: rng() * 10, speed: 2 + rng() * 2 });
    }

    // Boats.
    for (const bx of [w * 0.22, w * 0.47]) {
      const by = horizon + 10 * u;
      g.poly([bx - 16 * u, by, bx + 16 * u, by, bx + 11 * u, by + 5 * u, bx - 11 * u, by + 5 * u]).fill(SILHOUETTE);
      g.poly([bx, by - 22 * u, bx, by, bx + 12 * u, by - 2 * u]).fill(0x1a1428);
    }

    // Palms at the edges.
    this.drawPalm(w * 0.04, groundY, 120 * u, u, 1);
    this.drawPalm(w * 0.96, groundY, 100 * u, u, -1);
  }
}
