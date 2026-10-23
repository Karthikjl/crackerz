import { Particle, ParticleContainer, type Texture } from "pixi.js";
import { F_FLICKER, F_HOT, F_STROBE, type ParticleStore } from "./ParticleStore";
import { GLOW_SIZE } from "./textures";
import { WHITE } from "./color";

const MAX_STRETCH = 4;
const STRETCH_PER_SPEED = 0.005;

/** Mirrors ParticleStore into a batched, additive ParticleContainer each frame. */
export class ParticleRenderer {
  readonly container: ParticleContainer;
  private readonly sprites: Particle[];
  private shown = 0;
  /** Disables flicker/strobe blinking for photosensitive viewers. */
  reducedFlash = false;

  constructor(
    private readonly store: ParticleStore,
    texture: Texture,
  ) {
    this.container = new ParticleContainer({
      dynamicProperties: { position: true, rotation: true, vertex: true, color: true },
    });
    this.container.blendMode = "add";
    this.sprites = Array.from(
      { length: store.capacity },
      () => new Particle({ texture, anchorX: 0.5, anchorY: 0.5 }),
    );
  }

  sync(): void {
    const s = this.store;
    const n = s.count;
    const children = this.container.particleChildren;

    if (n !== this.shown) {
      for (let j = this.shown; j < n; j++) children[j] = this.sprites[j];
      children.length = n;
      this.shown = n;
      this.container.update();
    }

    for (let i = 0; i < n; i++) {
      const p = this.sprites[i];
      const t = s.life[i] / s.maxLife[i];
      const flags = s.flags[i];

      let alpha = t < 0.35 ? t / 0.35 : 1;
      if (!this.reducedFlash) {
        if (flags & F_FLICKER && t < 0.55 && Math.random() < 0.5) alpha *= 0.15;
        else if (flags & F_STROBE && Math.random() < 0.6) alpha *= 0.05;
      }
      const color = flags & F_HOT && t > 0.82 ? WHITE : s.color[i];

      const vx = s.vx[i];
      const vy = s.vy[i];
      const speed = Math.sqrt(vx * vx + vy * vy);
      const scale = (s.size[i] * (0.55 + 0.45 * t)) / GLOW_SIZE;

      p.x = s.x[i];
      p.y = s.y[i];
      p.rotation = Math.atan2(vy, vx);
      p.scaleY = scale;
      p.scaleX = scale * Math.min(MAX_STRETCH, 1 + speed * STRETCH_PER_SPEED);
      p.color = color + (((alpha * 255) | 0) << 24);
    }
  }
}
