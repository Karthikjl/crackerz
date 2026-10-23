import { Container, Sprite, type Texture } from "pixi.js";
import { GLOW_SIZE } from "./textures";

interface Puff {
  sprite: Sprite;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  growth: number;
  alpha: number;
}

/** Small pool of normal-blended smoke puffs that drift up and with the wind. */
export class SmokeSystem {
  readonly container = new Container();
  private readonly puffs: Puff[];
  private live = 0;
  /** Multiplier for puff counts (quality). */
  scale = 1;
  private wind = 12;

  constructor(texture: Texture, capacity = 220) {
    this.puffs = Array.from({ length: capacity }, () => {
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.tint = 0x9a90a8;
      sprite.visible = false;
      this.container.addChild(sprite);
      return { sprite, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 1, growth: 0, alpha: 0 };
    });
  }

  /** Emits `count` puffs around (x, y). size is the starting diameter in px. */
  puff(x: number, y: number, count: number, size: number, strength = 1): void {
    if (this.scale <= 0) return;
    const n = Math.max(1, Math.round(count * this.scale));
    for (let k = 0; k < n && this.live < this.puffs.length; k++) {
      const p = this.puffs[this.live++];
      p.x = x + (Math.random() - 0.5) * size * 0.6;
      p.y = y + (Math.random() - 0.5) * size * 0.4;
      p.vx = (Math.random() - 0.5) * size * 0.4;
      p.vy = -(0.2 + Math.random() * 0.4) * size;
      p.maxLife = p.life = 2.5 + Math.random() * 3;
      p.size = size * (0.7 + Math.random() * 0.6);
      p.growth = size * (0.5 + Math.random() * 0.6);
      p.alpha = Math.min(0.5, 0.16 * strength);
      p.sprite.visible = true;
    }
  }

  update(dt: number, u: number): void {
    this.wind += (Math.random() - 0.5) * dt * 4;
    this.wind = Math.max(4, Math.min(24, this.wind));
    let i = 0;
    while (i < this.live) {
      const p = this.puffs[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.sprite.visible = false;
        const last = this.puffs[--this.live];
        this.puffs[i] = last;
        this.puffs[this.live] = p;
        continue;
      }
      const t = p.life / p.maxLife;
      p.vx += (this.wind * u - p.vx) * dt * 0.3;
      p.vy *= 1 - dt * 0.4;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.size += p.growth * dt;
      const s = p.sprite;
      s.position.set(p.x, p.y);
      s.scale.set(p.size / GLOW_SIZE);
      s.alpha = p.alpha * (t > 0.85 ? (1 - t) / 0.15 : t / 0.85);
      i++;
    }
  }

  clear(): void {
    for (let i = 0; i < this.live; i++) this.puffs[i].sprite.visible = false;
    this.live = 0;
  }
}
