import { SHELLS, type CrackerConfig } from "@/crackers";
import { sound } from "@/audio/sound";
import { hexToBgr, hexToRgb } from "./color";
import { F_FLICKER, F_HOT, F_SPLIT, F_STROBE, F_TRAIL } from "./ParticleStore";
import { armsBurst, heartBurst, ringBurst, sphereBurst } from "./patterns";
import type { EngineContext } from "./types";

const rand = Math.random;
export const pick = <T>(arr: readonly T[]): T => arr[(rand() * arr.length) | 0];

/** Resolves the "random" shell to a concrete one. */
export function resolveShell(cfg: CrackerConfig): CrackerConfig {
  return cfg.pattern === "random" || !cfg.pattern ? pick(SHELLS) : cfg;
}

/** Picks two different colors from a palette (hex). */
export function pickColors(colors: readonly string[]): [string, string] {
  const primary = pick(colors);
  const others = colors.filter((c) => c !== primary);
  return [primary, others.length ? pick(others) : primary];
}

/**
 * Aerial burst with flash, sound, smoke and haptics.
 * scale < 1 makes smaller bursts (cakes, multi-break sub-bursts).
 */
export function explode(
  ctx: EngineContext,
  cfg: CrackerConfig,
  x: number,
  y: number,
  primaryHex: string,
  secondaryHex: string,
  scale = 1,
): void {
  const u = ctx.u;
  const p = ctx.particles;
  const primary = hexToBgr(primaryHex);
  const secondary = hexToBgr(secondaryHex);
  const palette = cfg.colors.map(hexToBgr);
  const n = Math.max(4, Math.round(cfg.particles * ctx.spawnScale * Math.max(0.5, scale)));
  const speed = cfg.speed * u * scale;
  const g = cfg.gravity * u;
  const size = (base: number) => (base + rand() * 4) * u * Math.max(0.7, scale);
  const life = (k = 1) => cfg.lifespan * k * (0.75 + rand() * 0.35);

  switch (cfg.pattern) {
    case "chrysanthemum":
      sphereBurst(n, speed, (vx, vy) => p.spawn(x, y, vx, vy, life(), primary, size(7), g, cfg.drag, F_HOT | F_TRAIL));
      sphereBurst(n >> 2, speed * 0.4, (vx, vy) => p.spawn(x, y, vx, vy, life(0.7), secondary, size(6), g, cfg.drag, F_HOT));
      break;
    case "willow":
      sphereBurst(n, speed, (vx, vy) => p.spawn(x, y, vx, vy, life(), pick(palette), size(6), g, cfg.drag, F_TRAIL));
      break;
    case "palm":
      armsBurst(n, speed, (vx, vy) => p.spawn(x, y, vx, vy, life(0.8), primary, size(15), g * 1.6, 0.965, F_HOT | F_TRAIL));
      sphereBurst(n * 4, speed * 0.35, (vx, vy) => p.spawn(x, y, vx, vy, life(0.5), secondary, size(5), g, cfg.drag, F_HOT));
      break;
    case "crossette":
      armsBurst(n, speed, (vx, vy) => p.spawn(x, y, vx, vy, life(), primary, size(11), g, cfg.drag, F_HOT | F_TRAIL | F_SPLIT));
      break;
    case "ring":
      ringBurst(n, speed, 0.3 + rand() * 0.7, rand() * Math.PI, (vx, vy) =>
        p.spawn(x, y, vx, vy, life(0.9), primary, size(8), g * 0.6, cfg.drag, F_HOT),
      );
      sphereBurst(n >> 1, speed * 0.3, (vx, vy) => p.spawn(x, y, vx, vy, life(0.6), secondary, size(6), g, cfg.drag, F_HOT));
      break;
    case "heart":
      heartBurst(n, speed, (vx, vy) => p.spawn(x, y, vx, vy, life(0.9), primary, size(8), g, cfg.drag, F_HOT));
      break;
    case "strobe":
      sphereBurst(n, speed, (vx, vy) => p.spawn(x, y, vx, vy, life(), primary, size(8), g, cfg.drag, F_STROBE));
      break;
    case "multibreak": {
      sphereBurst(Math.round(n * 0.6), speed * 0.7, (vx, vy) =>
        p.spawn(x, y, vx, vy, life(0.7), primary, size(7), g, cfg.drag, F_HOT),
      );
      const subs = SHELLS.filter((s) => s.pattern === "peony" || s.pattern === "strobe" || s.pattern === "chrysanthemum");
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2 + rand();
        const d = (70 + rand() * 40) * u * scale;
        ctx.after(0.45 + k * 0.18, () => {
          const sub = pick(subs);
          const [c1, c2] = pickColors(sub.colors);
          explode(ctx, sub, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, c1, c2, scale * 0.5);
        });
      }
      break;
    }
    default:
      sphereBurst(n, speed, (vx, vy) =>
        p.spawn(x, y, vx, vy, life(), primary, size(7), g, cfg.drag, F_HOT | (rand() < 0.3 ? F_FLICKER : 0)),
      );
      sphereBurst(Math.round(n * 0.35), speed * 0.45, (vx, vy) =>
        p.spawn(x, y, vx, vy, life(0.75), secondary, size(6), g, cfg.drag, F_HOT),
      );
  }

  const loud = Math.min(1, 0.35 + scale * 0.65);
  ctx.flash(hexToRgb(primaryHex), 0.28 * loud);
  ctx.shake(0.15 * loud);
  ctx.vibrate(15);
  ctx.smoke.puff(x, y, 3, 60 * u * scale, 0.45);
  sound.boom(ctx.pan(x), loud, 0.12);
}
