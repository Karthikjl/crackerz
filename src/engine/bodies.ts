import { Graphics } from "pixi.js";
import type { BodyKind } from "@/crackers";

export interface Body {
  graphics: Graphics;
  /** Fuse tip / emission point relative to the ground anchor, in px. */
  tip: [number, number];
}

const RED = 0xc0392b;
const GOLD = 0xf1c40f;

/** Draws a cracker body anchored at its ground contact point (0, 0). */
export function drawBody(kind: BodyKind, u: number): Body {
  const g = new Graphics();
  let tip: [number, number] = [0, -20];
  switch (kind) {
    case "cone":
      g.poly([-12 * u, 0, 12 * u, 0, 5 * u, -26 * u, -5 * u, -26 * u]).fill(RED);
      g.rect(-10 * u, -10 * u, 20 * u, 4 * u).fill(GOLD);
      g.rect(-7 * u, -20 * u, 14 * u, 3 * u).fill(GOLD);
      g.circle(0, -27 * u, 2.5 * u).fill(0x5d4037);
      tip = [0, -28];
      break;
    case "pencil":
      g.rect(-2.5 * u, -40 * u, 5 * u, 40 * u).fill(0x27ae60);
      for (let k = 0; k < 4; k++) g.rect(-2.5 * u, (-34 + k * 9) * u, 5 * u, 2 * u).fill(0xffffff);
      tip = [0, -41];
      break;
    case "disc":
      // Drawn around its own center so it can rotate; the entity lifts it off the ground.
      g.circle(0, 0, 10 * u).fill(0x2e86de);
      g.circle(0, 0, 10 * u).stroke({ width: 2 * u, color: GOLD });
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 2;
        g.moveTo(0, 0)
          .lineTo(Math.cos(a) * 9 * u, Math.sin(a) * 9 * u)
          .stroke({ width: 2 * u, color: 0xffffff });
      }
      g.circle(0, 0, 2.5 * u).fill(0xe74c3c);
      tip = [11, -10];
      break;
    case "tablet":
      g.ellipse(0, -2 * u, 8 * u, 3 * u).fill(0x1a1a1a);
      g.ellipse(0, -3.5 * u, 7 * u, 2.2 * u).fill(0x333333);
      tip = [0, -5];
      break;
    case "bijli":
      g.rect(-3 * u, -16 * u, 6 * u, 16 * u).fill(0xd63031);
      g.rect(-3 * u, -9 * u, 6 * u, 2 * u).fill(GOLD);
      g.moveTo(0, -16 * u)
        .lineTo(3 * u, -20 * u)
        .stroke({ width: 1.2 * u, color: 0xdddddd });
      tip = [3, -20];
      break;
    case "bomb":
      g.circle(0, -11 * u, 11 * u).fill(0x8e1b1b);
      g.rect(-11 * u, -13 * u, 22 * u, 4 * u).fill(GOLD);
      g.moveTo(5 * u, -20 * u)
        .quadraticCurveTo(9 * u, -26 * u, 10 * u, -24 * u)
        .stroke({ width: 1.5 * u, color: 0xdddddd });
      tip = [10, -24];
      break;
    case "laxmi":
      g.roundRect(-13 * u, -32 * u, 26 * u, 32 * u, 3 * u).fill(0x1e8449);
      g.rect(-13 * u, -22 * u, 26 * u, 12 * u).fill(RED);
      g.circle(0, -16 * u, 4 * u).fill(GOLD);
      g.moveTo(0, -32 * u)
        .quadraticCurveTo(4 * u, -38 * u, 2 * u, -40 * u)
        .stroke({ width: 1.5 * u, color: 0xdddddd });
      tip = [2, -40];
      break;
    case "rocket":
      g.moveTo(0, 0)
        .lineTo(0, -38 * u)
        .stroke({ width: 2 * u, color: 0x8d6e63 });
      g.rect(-4 * u, -58 * u, 8 * u, 22 * u).fill(0xe74c3c);
      g.rect(-4 * u, -50 * u, 8 * u, 3 * u).fill(GOLD);
      g.poly([-5 * u, -58 * u, 5 * u, -58 * u, 0, -68 * u]).fill(GOLD);
      tip = [0, -36];
      break;
    case "cake":
    case "cakeBig": {
      const w = (kind === "cake" ? 22 : 34) * u;
      const h = (kind === "cake" ? 28 : 40) * u;
      g.rect(-w, -h, w * 2, h).fill(0x8e44ad);
      g.rect(-w, -h * 0.55, w * 2, h * 0.18).fill(GOLD);
      const cols = kind === "cake" ? 4 : 6;
      for (let k = 0; k < cols; k++) {
        g.circle(-w + ((k + 0.5) / cols) * w * 2, -h, (w / cols) * 0.6).fill(0x2c1338);
      }
      tip = [w / u + 2, -10];
      break;
    }
  }
  return { graphics: g, tip: [tip[0] * u, tip[1] * u] };
}
