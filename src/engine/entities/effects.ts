import { Graphics } from "pixi.js";
import { SHELLS, type CrackerConfig } from "@/crackers";
import { sound } from "@/audio/sound";
import { explode, pick, pickColors, resolveShell } from "../bursts";
import { GOLD_BGR, hexToBgr, WARM_WHITE_BGR } from "../color";
import { F_FLICKER, F_HOT } from "../ParticleStore";
import { sphereBurst } from "../patterns";
import { textPoints } from "../textPoints";
import type { EngineContext, Entity } from "../types";

const rand = Math.random;

export interface ShellOptions {
  x: number;
  targetY: number;
  /** Launch height; defaults to the ground. */
  y0?: number;
  vx?: number;
  /** Burst size multiplier. */
  scale?: number;
}

/** Aerial shell: launches, leaves a rising trail, and bursts at the target height. */
export class Shell implements Entity {
  private readonly cfg: CrackerConfig;
  private x: number;
  private y: number;
  private readonly vx: number;
  private vy: number;
  private readonly g: number;
  private readonly scale: number;
  private acc = 0;
  private readonly primary: string;
  private readonly secondary: string;

  constructor(
    cfg: CrackerConfig,
    private readonly ctx: EngineContext,
    opts: ShellOptions,
  ) {
    const u = ctx.u;
    this.cfg = resolveShell(cfg);
    this.scale = opts.scale ?? 1;
    this.x = opts.x + (opts.vx === undefined ? (rand() - 0.5) * 16 * u : 0);
    this.y = opts.y0 ?? ctx.groundY;
    this.g = 520 * u;
    this.vy = -Math.sqrt(2 * this.g * Math.max(0, this.y - opts.targetY));
    this.vx = opts.vx ?? (rand() - 0.5) * 20 * u;
    [this.primary, this.secondary] = pickColors(this.cfg.colors);
    sound.launch(ctx.pan(this.x), Math.min(1, this.scale));
  }

  update(dt: number): boolean {
    const { ctx } = this;
    const u = ctx.u;
    this.vy += this.g * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const palm = this.cfg.pattern === "palm";
    this.acc += (palm ? 260 : 140) * dt * ctx.spawnScale;
    while (this.acc >= 1) {
      this.acc--;
      const size = (palm ? 6 + rand() * 4 : 4 + rand() * 3) * u;
      ctx.particles.spawn(this.x + (rand() - 0.5) * 2 * u, this.y, (rand() - 0.5) * 30 * u, (30 + rand() * 40) * u, 0.35 + rand() * 0.35, GOLD_BGR, size, 150 * u, 0.95, 0);
    }
    ctx.particles.spawn(this.x, this.y, 0, 0, 0.05, WARM_WHITE_BGR, 9 * u, 0, 1, 0);

    if (this.vy >= -25 * u) {
      explode(ctx, this.cfg, this.x, this.y, this.primary, this.secondary, this.scale);
      return false;
    }
    return true;
  }

  destroy(): void {}
}

/** Expanding ring of light for big bombs. */
export class Shockwave implements Entity {
  private readonly g = new Graphics();
  private t = 0;

  constructor(
    private readonly ctx: EngineContext,
    private readonly x: number,
    private readonly y: number,
    private readonly radius: number,
  ) {
    this.g.blendMode = "add";
    ctx.glowLayer.addChild(this.g);
  }

  update(dt: number): boolean {
    this.t += dt;
    const p = Math.min(1, this.t / 0.55);
    const r = this.radius * (1 - (1 - p) * (1 - p));
    this.g
      .clear()
      .ellipse(this.x, this.y, r, r * 0.55)
      .stroke({ width: (8 * (1 - p) + 1) * this.ctx.u, color: 0xffe2a8, alpha: (1 - p) * 0.8 });
    return p < 1;
  }

  destroy(): void {
    this.g.destroy();
  }
}

/** Runs a callback after a delay (game time). */
export class Timer implements Entity {
  constructor(
    private remaining: number,
    private readonly fn: () => void,
  ) {}

  update(dt: number): boolean {
    this.remaining -= dt;
    if (this.remaining > 0) return true;
    this.fn();
    return false;
  }

  destroy(): void {}
}

const FINALE_BARRAGE = 9;
const FINALE_VOLLEY_AT = 9.4;

/** Grand finale: an accelerating barrage of random shells, then one huge volley. */
export class Finale implements Entity {
  private t = 0;
  private next = 0;

  constructor(private readonly ctx: EngineContext) {}

  update(dt: number): boolean {
    const { ctx } = this;
    this.t += dt;
    if (this.t < FINALE_BARRAGE) {
      while (this.next <= this.t) {
        ctx.addEffect(
          new Shell(pick(SHELLS), ctx, {
            x: ctx.width * (0.08 + rand() * 0.84),
            targetY: ctx.height * (0.12 + rand() * 0.38),
            scale: 0.75 + rand() * 0.25,
          }),
        );
        const rate = 2 + this.t * 0.9;
        this.next += (1 / rate) * (0.6 + rand() * 0.8);
      }
      return true;
    }
    if (this.t >= FINALE_VOLLEY_AT) {
      const finalists = SHELLS.filter((s) => s.pattern === "willow" || s.pattern === "strobe" || s.pattern === "peony");
      const count = 10;
      for (let k = 0; k < count; k++) {
        ctx.addEffect(
          new Shell(finalists[k % finalists.length], ctx, {
            x: ctx.width * (0.08 + (k / (count - 1)) * 0.84),
            targetY: ctx.height * (0.14 + rand() * 0.14),
            scale: 1.1,
          }),
        );
      }
      return false;
    }
    return true;
  }

  destroy(): void {}
}

const TEXT_COLORS = ["#ffd23f", "#ff5c8a", "#5cd9ff"].map(hexToBgr);
const TEXT_DRAG = 0.9;

/** Shell that bursts into glowing text (greeting mode). */
export class TextShell implements Entity {
  private x: number;
  private y: number;
  private vy: number;
  private readonly g: number;
  private acc = 0;

  constructor(
    private readonly ctx: EngineContext,
    private readonly lines: readonly string[],
    x: number,
    targetY: number,
  ) {
    this.x = x;
    this.y = ctx.groundY;
    this.g = 520 * ctx.u;
    this.vy = -Math.sqrt(2 * this.g * Math.max(0, ctx.groundY - targetY));
    sound.launch(ctx.pan(x));
  }

  update(dt: number): boolean {
    const { ctx } = this;
    const u = ctx.u;
    this.vy += this.g * dt;
    this.y += this.vy * dt;
    this.acc += 220 * dt * ctx.spawnScale;
    while (this.acc >= 1) {
      this.acc--;
      ctx.particles.spawn(this.x + (rand() - 0.5) * 3 * u, this.y, (rand() - 0.5) * 30 * u, (30 + rand() * 40) * u, 0.4 + rand() * 0.4, GOLD_BGR, (5 + rand() * 3) * u, 150 * u, 0.95, 0);
    }
    ctx.particles.spawn(this.x, this.y, 0, 0, 0.05, WARM_WHITE_BGR, 11 * u, 0, 1, 0);
    if (this.vy < -25 * u) return true;
    this.burst();
    return false;
  }

  destroy(): void {}

  private burst(): void {
    const { ctx, x, y } = this;
    const u = ctx.u;
    const maxPoints = Math.min(1800, ctx.particles.limit * 0.45) * Math.max(0.6, ctx.spawnScale);
    const pts = textPoints(this.lines, ctx.width * 0.9, ctx.height * 0.42, maxPoints);
    // With per-frame drag d, a particle launched at v travels v / k where k = -ln(d) * 60,
    // so v = distance * k lands it exactly on its letter pixel.
    const k = -Math.log(TEXT_DRAG) * 60;
    for (let i = 0; i < pts.count; i++) {
      const j = 0.99 + rand() * 0.02;
      ctx.particles.spawn(x, y, pts.x[i] * k * j, pts.y[i] * k * j, 3.4 + rand() * 0.8, TEXT_COLORS[pts.line[i] % TEXT_COLORS.length], (6 + rand() * 2) * u, 5 * u, TEXT_DRAG, F_HOT | F_FLICKER);
    }
    sphereBurst(Math.round(120 * ctx.spawnScale), 380 * u, (vx, vy) => {
      ctx.particles.spawn(x, y, vx, vy, 1.4 + rand() * 0.6, GOLD_BGR, 6 * u, 90 * u, 0.965, F_HOT | F_FLICKER);
    });
    ctx.flash(0xffe2a8, 0.3);
    ctx.shake(0.2);
    ctx.vibrate(30);
    ctx.smoke.puff(x, y, 3, 80 * u, 0.4);
    sound.boom(ctx.pan(x), 1, 0.1);
  }
}
