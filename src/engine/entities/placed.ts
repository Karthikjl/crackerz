import { Container, Graphics, Sprite } from "pixi.js";
import type { CrackerConfig } from "@/crackers";
import { sound, type LoopHandle, type Stoppable } from "@/audio/sound";
import { drawBody, type Body } from "../bodies";
import { pick } from "../bursts";
import { GOLD_BGR, hexToBgr, hexToRgb } from "../color";
import { F_BRANCH, F_CRACKLE, F_FLICKER, F_HOT } from "../ParticleStore";
import { hemisphereBurst, sphereBurst } from "../patterns";
import { GLOW_SIZE } from "../textures";
import type { EngineContext, PlacedCracker } from "../types";
import { Shell, Shockwave } from "./effects";

const rand = Math.random;
const DEBRIS_BGR = ["#a8322a", "#d9a441", "#6b2a1a"].map(hexToBgr);

/** Ramp up, hold, ramp down over normalized time p (0..1). */
function envelope(p: number): number {
  if (p < 0.08) return p / 0.08;
  if (p > 0.85) return Math.max(0, (1 - p) / 0.15);
  return 1;
}

type State = "placed" | "fuse" | "active" | "spent";

/** Shared lifecycle: placed → (scheduled) → fuse → active → spent (fade out). */
abstract class PlacedBase implements PlacedCracker {
  x: number;
  y: number;
  protected state: State = "placed";
  protected t = 0;
  protected acc = 0;
  protected spentDuration = 1.5;
  protected loop: LoopHandle | null = null;
  protected readonly view = new Container();
  protected readonly palette: number[];
  private lightDelay = -1;

  constructor(
    readonly cfg: CrackerConfig,
    protected readonly ctx: EngineContext,
    x: number,
  ) {
    this.x = x;
    this.y = ctx.groundY;
    this.palette = cfg.colors.map(hexToBgr);
    this.view.position.set(this.x, this.y);
    ctx.bodyLayer.addChild(this.view);
  }

  get isPlaced(): boolean {
    return this.state === "placed";
  }

  get waiting(): boolean {
    return this.state === "placed" && this.lightDelay < 0;
  }

  hitTest(px: number, py: number): boolean {
    const u = this.ctx.u;
    return this.isPlaced && Math.hypot(px - this.x, py - (this.y - 18 * u)) < 36 * u;
  }

  scheduleLight(delay: number): void {
    if (this.state === "placed") this.lightDelay = delay;
  }

  light(): void {
    if (this.state !== "placed") return;
    this.state = "fuse";
    this.t = 0;
    this.lightDelay = -1;
    this.loop = sound.loop("fuse", this.ctx.pan(this.x));
  }

  relayout(scaleX: number): void {
    this.x *= scaleX;
    this.y = this.ctx.groundY;
    this.view.position.set(this.x, this.y);
  }

  update(dt: number): boolean {
    this.t += dt;
    switch (this.state) {
      case "placed":
        if (this.lightDelay >= 0) {
          this.lightDelay -= dt;
          if (this.lightDelay <= 0) this.light();
        }
        return true;
      case "fuse":
        this.fuseSparks(dt);
        if (this.t >= this.cfg.fuseTime) {
          this.loop?.stop();
          this.loop = null;
          this.t = 0;
          this.acc = 0;
          this.state = "active";
          this.ignite();
        }
        return true;
      case "active":
        this.updateActive(dt);
        return true;
      case "spent":
        this.view.alpha = Math.max(0, 1 - this.t / this.spentDuration);
        return this.t < this.spentDuration;
    }
  }

  destroy(): void {
    this.loop?.stop();
    this.onDestroy();
    this.view.destroy({ children: true });
  }

  protected onDestroy(): void {}

  /** World position of the burning fuse. */
  protected abstract fuseTip(): [number, number];
  protected abstract ignite(): void;
  protected abstract updateActive(dt: number): void;

  protected toSpent(duration = 1.5): void {
    this.state = "spent";
    this.t = 0;
    this.spentDuration = duration;
    this.loop?.stop();
    this.loop = null;
  }

  protected fuseSparks(dt: number): void {
    const { ctx } = this;
    const u = ctx.u;
    const [fx, fy] = this.fuseTip();
    this.acc += 90 * dt * ctx.spawnScale;
    while (this.acc >= 1) {
      this.acc--;
      const a = rand() * Math.PI * 2;
      const s = (30 + rand() * 70) * u;
      ctx.particles.spawn(fx, fy, Math.cos(a) * s, Math.sin(a) * s - 30 * u, 0.15 + rand() * 0.2, GOLD_BGR, 5 * u, 200 * u, 0.94, F_HOT);
    }
  }

  protected createGlow(color: number, size: number, y: number): Sprite {
    const glow = new Sprite(this.ctx.glowTexture);
    glow.anchor.set(0.5);
    glow.blendMode = "add";
    glow.tint = color;
    glow.alpha = 0;
    glow.scale.set(size / GLOW_SIZE);
    glow.position.set(this.x, y);
    this.ctx.glowLayer.addChild(glow);
    return glow;
  }
}

/** A placed cracker drawn with a standard body. */
abstract class BodyCracker extends PlacedBase {
  protected readonly body: Body;

  constructor(cfg: CrackerConfig, ctx: EngineContext, x: number) {
    super(cfg, ctx, x);
    this.body = drawBody(cfg.body ?? "cone", ctx.u);
    this.view.addChild(this.body.graphics);
  }

  protected fuseTip(): [number, number] {
    return [this.x + this.body.tip[0], this.y + this.body.tip[1]];
  }
}

/** Flower pot and color pencil: a steady upward spray. */
class Fountain extends BodyCracker {
  private glow: Sprite | null = null;
  private smokeTimer = 0;

  protected ignite(): void {
    const u = this.ctx.u;
    this.loop = sound.loop("hiss", this.ctx.pan(this.x));
    this.glow = this.createGlow(hexToRgb(this.cfg.colors[0]), (100 + this.cfg.speed * 0.25) * u, this.y - 20 * u);
  }

  protected updateActive(dt: number): void {
    const { ctx, cfg } = this;
    const u = ctx.u;
    const intensity = envelope(this.t / cfg.duration) * (0.85 + 0.15 * Math.sin(this.t * 23) * Math.sin(this.t * 7.3));
    const [tx, ty] = this.fuseTip();
    const spread = cfg.gravity < 0 ? 0.9 : 0.42;

    this.acc += cfg.particles * intensity * dt * ctx.spawnScale;
    while (this.acc >= 1) {
      this.acc--;
      const a = -Math.PI / 2 + (rand() - 0.5) * spread;
      const s = cfg.speed * u * (0.55 + rand() * 0.45) * (0.7 + 0.3 * intensity);
      const flags = F_HOT | (rand() < 0.18 ? F_BRANCH : 0) | (rand() < 0.1 ? F_FLICKER : 0);
      ctx.particles.spawn(tx + (rand() - 0.5) * 4 * u, ty, Math.cos(a) * s, Math.sin(a) * s, cfg.lifespan * (0.6 + rand() * 0.6), pick(this.palette), (6 + rand() * 5) * u, cfg.gravity * u, cfg.drag, flags);
    }

    this.smokeTimer -= dt;
    if (this.smokeTimer <= 0) {
      this.smokeTimer = 0.3;
      ctx.smoke.puff(tx, ty - 10 * u, 1, 30 * u, 0.5 * intensity);
    }
    this.loop?.setLevel(intensity * Math.min(1, cfg.particles / 420 + 0.2));
    if (this.glow) this.glow.alpha = 0.55 * intensity * (0.85 + rand() * 0.15);

    if (this.t >= cfg.duration) {
      this.toSpent();
      this.removeGlow();
      this.body.graphics.tint = 0x555555;
    }
  }

  private removeGlow(): void {
    this.glow?.destroy();
    this.glow = null;
  }

  protected onDestroy(): void {
    this.removeGlow();
  }
}

/** Ground chakkar: spins, wanders, and sprays sparks tangentially. */
class Spinner extends BodyCracker {
  private glow: Sprite | null = null;
  private omega = 0;
  private drift = 0;

  constructor(cfg: CrackerConfig, ctx: EngineContext, x: number) {
    super(cfg, ctx, x);
    this.body.graphics.y = -10 * ctx.u;
  }

  protected fuseTip(): [number, number] {
    return [this.x + 11 * this.ctx.u, this.y - 10 * this.ctx.u];
  }

  protected ignite(): void {
    this.loop = sound.loop("hiss", this.ctx.pan(this.x));
    this.glow = this.createGlow(0xffb347, 240 * this.ctx.u, this.y - 20 * this.ctx.u);
  }

  protected updateActive(dt: number): void {
    const { ctx, cfg } = this;
    const u = ctx.u;
    const g = this.body.graphics;
    const p = this.t / cfg.duration;
    const intensity = envelope(p);

    this.omega = Math.min(24, this.omega + 30 * dt) * (p > 0.85 ? intensity : 1);
    g.rotation += this.omega * dt;

    this.drift = (this.drift + (rand() - 0.5) * dt * 6) * 0.98;
    this.x += (this.drift * 60 * u + Math.sin(this.t * 1.3) * 25 * u) * dt;
    this.x = Math.max(20 * u, Math.min(ctx.width - 20 * u, this.x));
    this.view.x = this.x;
    this.loop?.setPan(ctx.pan(this.x));

    const colorIndex = Math.floor(this.t * 1.5) % this.palette.length;
    const color = this.palette[colorIndex];
    const cy = this.y - 10 * u;
    const r = 10 * u;

    this.acc += cfg.particles * intensity * dt * ctx.spawnScale;
    while (this.acc >= 1) {
      this.acc--;
      const a = g.rotation + (rand() < 0.5 ? 0 : Math.PI) + (rand() - 0.5) * 0.3;
      const tangent = a + Math.PI / 2;
      const s = cfg.speed * u * (0.6 + rand() * 0.4);
      ctx.particles.spawn(this.x + Math.cos(a) * r, cy + Math.sin(a) * r, Math.cos(tangent) * s, Math.sin(tangent) * s - 40 * u, cfg.lifespan * (0.6 + rand() * 0.6), rand() < 0.8 ? color : GOLD_BGR, (5 + rand() * 4) * u, cfg.gravity * u, cfg.drag, F_HOT);
    }

    this.loop?.setLevel(intensity * 0.8);
    if (this.glow) {
      this.glow.x = this.x;
      this.glow.tint = hexToRgb(cfg.colors[colorIndex]);
      this.glow.alpha = 0.5 * intensity;
    }

    if (this.t >= cfg.duration) {
      this.toSpent();
      this.glow?.destroy();
      this.glow = null;
      g.tint = 0x555555;
    }
  }

  protected onDestroy(): void {
    this.glow?.destroy();
  }
}

/** Bijli, atom bomb, laxmi bomb - strength comes from cfg.power. */
class Bomb extends BodyCracker {
  protected ignite(): void {
    const { ctx, cfg } = this;
    const u = ctx.u;
    const power = cfg.power ?? 1;
    const x = this.x;
    const y = this.y - 10 * u;

    ctx.flash(0xffe2a8, 0.45 * power);
    ctx.shake(0.7 * power);
    ctx.vibrate(60 * power);
    sound.bang(ctx.pan(x), power);

    hemisphereBurst(Math.round(cfg.particles * ctx.spawnScale), cfg.speed * u, (vx, vy) => {
      ctx.particles.spawn(x, y, vx, vy, cfg.lifespan * (0.4 + rand() * 0.8), pick(this.palette), (6 + rand() * 6) * u, cfg.gravity * u, cfg.drag, F_HOT);
    });
    const debris = Math.round(30 * power * ctx.spawnScale);
    for (let k = 0; k < debris; k++) {
      ctx.particles.spawn(x, y, (rand() - 0.5) * 300 * u * power, -(100 + rand() * 350) * u * power, 1.2 + rand() * 0.8, pick(DEBRIS_BGR), 4 * u, 600 * u, 0.96, 0);
    }
    ctx.smoke.puff(x, y - 10 * u, 6 * power, 60 * u * power, 1.3);
    if (power >= 1) ctx.addEffect(new Shockwave(ctx, x, y, 170 * u * power));

    this.body.graphics.visible = false;
    this.view.addChild(new Graphics().ellipse(0, 0, 22 * u * power, 5 * u).fill({ color: 0x000000, alpha: 0.6 }));
    this.toSpent(4);
  }

  protected updateActive(): void {}
}

const ROCKET_THRUST = 1100;
const ROCKET_GRAVITY = 300;
const ROCKET_LAUNCH_SPEED = 200;
/** Distance from the stick's base to the rocket's nose, in units of u. */
const ROCKET_NOSE = 64;

/** Rocket: flies with a whistle and bursts at a height inside the visible sky. */
class Rocket extends BodyCracker {
  private vy = 0;
  private drift = 0;
  private phase = 0;
  /** Screen y where the nose should burst. */
  private targetY = 0;
  private whistle: Stoppable | null = null;

  relayout(scaleX: number): void {
    if (this.state !== "active") super.relayout(scaleX);
  }

  protected ignite(): void {
    const { ctx } = this;
    const u = ctx.u;
    const pan = ctx.pan(this.x);
    // Burst in the upper sky, never closer to the top than the burst radius needs.
    this.targetY = Math.max(ctx.height * (0.14 + rand() * 0.24), 90 * u);
    // Gentle sideways drift, steered toward the middle when launched near an edge.
    const edge = this.x / ctx.width;
    this.drift = (edge < 0.2 ? 1 : edge > 0.8 ? -1 : rand() - 0.5) * (20 + rand() * 30) * u;
    this.phase = rand() * Math.PI * 2;
    this.vy = -ROCKET_LAUNCH_SPEED * u;

    const climb = Math.max(0, this.y - ROCKET_NOSE * u - this.targetY);
    const a = (ROCKET_THRUST - ROCKET_GRAVITY) * u;
    const v0 = ROCKET_LAUNCH_SPEED * u;
    const flightTime = (-v0 + Math.sqrt(v0 * v0 + 2 * a * climb)) / a;
    sound.launch(pan, 0.5);
    this.whistle = sound.whistle(pan, flightTime + 0.1);
  }

  protected updateActive(dt: number): void {
    const { ctx, cfg } = this;
    const u = ctx.u;

    this.vy += (ROCKET_GRAVITY - ROCKET_THRUST) * u * dt;
    // Bounded wobble instead of a random walk, and never past the side margins.
    if (this.x < ctx.width * 0.06) this.drift = Math.abs(this.drift) + 10 * u;
    else if (this.x > ctx.width * 0.94) this.drift = -Math.abs(this.drift) - 10 * u;
    const vx = this.drift + Math.sin(this.t * 7 + this.phase) * 28 * u;
    this.x += vx * dt;
    this.y += this.vy * dt;
    const rot = Math.atan2(this.vy, vx) + Math.PI / 2;
    this.view.position.set(this.x, this.y);
    this.view.rotation = rot;

    // Exhaust from the bottom of the rocket body.
    const ex = this.x + 36 * u * Math.sin(rot);
    const ey = this.y - 36 * u * Math.cos(rot);
    this.acc += 260 * dt * ctx.spawnScale;
    while (this.acc >= 1) {
      this.acc--;
      ctx.particles.spawn(ex, ey, -vx * 0.2 + (rand() - 0.5) * 60 * u, -this.vy * 0.2 + (rand() - 0.5) * 60 * u, 0.3 + rand() * 0.3, GOLD_BGR, 5 * u, 150 * u, 0.95, F_HOT);
    }

    // Burst when the nose (not the stick's base) reaches the target; time limit as a safety net.
    const hx = this.x + ROCKET_NOSE * u * Math.sin(rot);
    const hy = this.y - ROCKET_NOSE * u * Math.cos(rot);
    if (hy <= this.targetY || this.t > 4) {
      sphereBurst(Math.round(cfg.particles * ctx.spawnScale), cfg.speed * u, (vx, vy) => {
        const flags = F_HOT | (rand() < 0.35 ? F_CRACKLE : 0) | (rand() < 0.2 ? F_FLICKER : 0);
        ctx.particles.spawn(hx, hy, vx, vy, cfg.lifespan * (0.7 + rand() * 0.5), pick(this.palette), 7 * u, cfg.gravity * u, cfg.drag, flags);
      });
      ctx.flash(hexToRgb(cfg.colors[0]), 0.18);
      ctx.vibrate(15);
      ctx.smoke.puff(hx, hy, 2, 40 * u, 0.6);
      sound.boom(ctx.pan(hx), 0.55, 0.05);
      this.whistle?.stop();
      this.whistle = null;
      this.view.visible = false;
      this.toSpent(0.1);
    }
  }

  protected onDestroy(): void {
    this.whistle?.stop();
  }
}

/** Snake tablet: grows a wriggling ash snake with smoke. */
class Snake extends BodyCracker {
  private readonly ash = new Graphics();
  private readonly points: number[] = [];
  private headX = 0;
  private headY = 0;
  private glow: Sprite | null = null;
  private stepTimer = 0;
  private smokeTimer = 0;

  protected ignite(): void {
    const u = this.ctx.u;
    this.view.addChild(this.ash);
    this.headX = 0;
    this.headY = -4 * u;
    this.points.push(this.headX, this.headY);
    this.loop = sound.loop("fuse", this.ctx.pan(this.x));
    this.loop.setLevel(1.6);
    this.glow = this.createGlow(0xff7a2a, 30 * u, this.y);
  }

  protected updateActive(dt: number): void {
    const { ctx, cfg } = this;
    const u = ctx.u;
    const p = this.t / cfg.duration;

    this.stepTimer -= dt;
    if (this.stepTimer <= 0 && p < 1) {
      this.stepTimer = 0.04;
      const angle = -Math.PI / 2 + Math.sin(this.t * 1.4) * 1.5 + Math.sin(this.t * 4.1) * 0.25;
      const step = 1.4 * u * (1 - p * 0.6);
      this.headX += Math.cos(angle) * step;
      this.headY = Math.min(-3 * u, this.headY + Math.sin(angle) * step);
      this.points.push(this.headX, this.headY);
      this.redraw(4 * u + p * 6 * u);
    }

    this.smokeTimer -= dt;
    if (this.smokeTimer <= 0) {
      this.smokeTimer = 0.12;
      ctx.smoke.puff(this.x + this.headX, this.y + this.headY, 1, 18 * u, 0.7);
    }
    if (this.glow) {
      this.glow.position.set(this.x + this.headX, this.y + this.headY);
      this.glow.alpha = 0.6 + rand() * 0.3;
    }

    if (this.t >= cfg.duration) {
      this.glow?.destroy();
      this.glow = null;
      this.toSpent(5);
    }
  }

  private redraw(width: number): void {
    const g = this.ash;
    const pts = this.points;
    g.clear();
    g.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    g.stroke({ width, color: 0x4a4540, cap: "round", join: "round" });
    g.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i] - width * 0.15, pts[i + 1] - width * 0.15);
    g.stroke({ width: width * 0.35, color: 0x6e665c, cap: "round", join: "round" });
  }

  protected onDestroy(): void {
    this.glow?.destroy();
  }
}

/** Sky-shot cake: fires a sequence of shells from a box. */
class Cake extends BodyCracker {
  private fired = 0;
  private nextShot = 0;

  protected ignite(): void {
    this.nextShot = 0;
  }

  protected updateActive(): void {
    const { ctx, cfg } = this;
    const u = ctx.u;
    const shots = cfg.shots ?? 12;
    const topY = this.y - (cfg.body === "cakeBig" ? 40 : 28) * u;

    while (this.fired < shots && this.t >= this.nextShot) {
      this.fired++;
      this.nextShot += (cfg.interval ?? 0.4) * (0.7 + rand() * 0.6);
      const x = this.x + (rand() - 0.5) * 16 * u;
      // Fan the shots out, but always toward the middle when the box sits near an edge.
      const edge = x / ctx.width;
      const spread = (rand() - 0.5) * 180 * u;
      const vx = edge < 0.25 ? Math.abs(spread) : edge > 0.75 ? -Math.abs(spread) : spread;
      ctx.addEffect(
        new Shell(cfg, ctx, {
          x,
          y0: topY,
          vx,
          targetY: ctx.height * 0.1 + rand() * (ctx.groundY - ctx.height * 0.45),
          scale: 0.55 + rand() * 0.2,
        }),
      );
      for (let k = 0; k < 8; k++) {
        ctx.particles.spawn(x, topY, (rand() - 0.5) * 80 * u, -(80 + rand() * 120) * u, 0.2 + rand() * 0.2, GOLD_BGR, 6 * u, 200 * u, 0.92, F_HOT);
      }
      ctx.smoke.puff(x, topY - 10 * u, 1, 26 * u, 0.6);
      ctx.shake(0.04);
    }
    if (this.fired >= shots && this.t >= this.nextShot) {
      this.body.graphics.tint = 0x555555;
      this.toSpent(2);
    }
  }
}

/** 1000-wala: a chain of small crackers popping in sequence along the ground. */
class Chain extends PlacedBase {
  private readonly g = new Graphics();
  private readonly count: number;
  private readonly segX: Float32Array;
  private readonly segY: Float32Array;
  private length = 0;
  private x0 = 0;
  private popped = 0;

  constructor(cfg: CrackerConfig, ctx: EngineContext, x: number) {
    super(cfg, ctx, x);
    this.count = cfg.shots ?? 100;
    this.segX = new Float32Array(this.count);
    this.segY = new Float32Array(this.count);
    // Drawn in world coordinates.
    this.view.position.set(0, 0);
    this.view.addChild(this.g);
    this.layoutSegments(x);
  }

  hitTest(px: number, py: number): boolean {
    const u = this.ctx.u;
    return (
      this.isPlaced && px > this.x0 - 12 * u && px < this.x0 + this.length + 12 * u && Math.abs(py - (this.y - 8 * u)) < 34 * u
    );
  }

  relayout(scaleX: number): void {
    this.y = this.ctx.groundY;
    this.layoutSegments((this.x0 + this.length / 2) * scaleX);
  }

  private layoutSegments(center: number): void {
    const { ctx } = this;
    const u = ctx.u;
    this.length = Math.min(ctx.width * 0.6, 420 * u);
    this.x0 = Math.max(20 * u, Math.min(ctx.width - 20 * u - this.length, center - this.length / 2));
    this.x = this.x0;
    for (let i = 0; i < this.count; i++) {
      this.segX[i] = this.x0 + ((i + 0.5) / this.count) * this.length;
      this.segY[i] = this.y - 4 * u + Math.sin(i * 0.9) * 2 * u;
    }
    this.redraw();
  }

  private redraw(): void {
    const u = this.ctx.u;
    const g = this.g;
    g.clear();
    if (this.popped >= this.count) return;
    g.moveTo(this.segX[this.popped], this.segY[this.popped]);
    for (let i = this.popped + 1; i < this.count; i++) g.lineTo(this.segX[i], this.segY[i]);
    g.stroke({ width: 1 * u, color: 0xbba98a });
    for (let i = this.popped; i < this.count; i++) {
      const up = i % 2 === 0 ? -1 : 1;
      g.rect(this.segX[i] - 1.3 * u, this.segY[i] - 3 * u + up * 2 * u, 2.6 * u, 6 * u).fill(i % 2 ? 0xd63031 : 0xc0392b);
    }
  }

  protected fuseTip(): [number, number] {
    const i = Math.min(this.popped, this.count - 1);
    return [this.segX[i] - (this.popped === 0 && this.state === "fuse" ? 4 * this.ctx.u : 0), this.segY[i]];
  }

  protected ignite(): void {
    this.loop = sound.loop("fuse", this.ctx.pan(this.x0));
  }

  protected updateActive(dt: number): void {
    const { ctx, cfg } = this;
    const rate = this.count / cfg.duration;

    this.fuseSparks(dt);
    this.acc += rate * dt * (0.5 + rand());
    let changed = false;
    while (this.acc >= 1 && this.popped < this.count) {
      this.acc--;
      this.pop(this.popped++);
      changed = true;
    }
    if (changed) {
      this.redraw();
      this.loop?.setPan(ctx.pan(this.segX[Math.min(this.popped, this.count - 1)]));
    }
    if (this.popped >= this.count) this.toSpent(2);
  }

  private pop(i: number): void {
    const { ctx, cfg } = this;
    const u = ctx.u;
    const x = this.segX[i];
    const y = this.segY[i];
    hemisphereBurst(Math.max(3, Math.round(cfg.particles * ctx.spawnScale)), cfg.speed * u, (vx, vy) => {
      ctx.particles.spawn(x, y, vx, vy, cfg.lifespan * (0.5 + rand()), pick(this.palette), (5 + rand() * 4) * u, cfg.gravity * u, cfg.drag, F_HOT);
    });
    for (let k = 0; k < 2; k++) {
      ctx.particles.spawn(x, y, (rand() - 0.5) * 160 * u, -(60 + rand() * 160) * u, 1 + rand(), pick(DEBRIS_BGR), 3.5 * u, 500 * u, 0.96, 0);
    }
    ctx.flash(0xfff0c0, 0.05);
    ctx.shake(0.03);
    sound.pop(ctx.pan(x));
    if (i % 6 === 0) ctx.smoke.puff(x, y - 8 * u, 1, 26 * u, 0.6);
    if (i % 10 === 0) ctx.vibrate(8);
  }
}

export function createPlacedCracker(cfg: CrackerConfig, ctx: EngineContext, x: number): PlacedCracker | null {
  switch (cfg.kind) {
    case "fountain":
      return new Fountain(cfg, ctx, x);
    case "spinner":
      return new Spinner(cfg, ctx, x);
    case "bomb":
      return new Bomb(cfg, ctx, x);
    case "rocket":
      return new Rocket(cfg, ctx, x);
    case "snake":
      return new Snake(cfg, ctx, x);
    case "cake":
      return new Cake(cfg, ctx, x);
    case "chain":
      return new Chain(cfg, ctx, x);
    default:
      return null;
  }
}
