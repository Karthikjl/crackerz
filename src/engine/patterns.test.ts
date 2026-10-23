import { describe, expect, it } from "vitest";
import { armsBurst, heartBurst, hemisphereBurst, ringBurst, sphereBurst } from "./patterns";

describe("burst patterns", () => {
  it("sphereBurst emits n velocities within speed", () => {
    const speeds: number[] = [];
    sphereBurst(500, 100, (vx, vy) => speeds.push(Math.hypot(vx, vy)));
    expect(speeds).toHaveLength(500);
    expect(Math.max(...speeds)).toBeLessThanOrEqual(100);
  });

  it("hemisphereBurst only fires upward", () => {
    const ys: number[] = [];
    hemisphereBurst(300, 100, (_vx, vy) => ys.push(vy));
    expect(ys).toHaveLength(300);
    expect(Math.max(...ys)).toBeLessThanOrEqual(1e-9);
  });

  it("armsBurst spaces arms evenly", () => {
    const angles: number[] = [];
    armsBurst(8, 100, (vx, vy) => angles.push(Math.atan2(vy, vx)), () => 0.5);
    const sorted = angles.map((a) => (a + Math.PI * 2) % (Math.PI * 2)).sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i] - sorted[i - 1]).toBeCloseTo(Math.PI / 4);
  });

  it("ringBurst keeps constant speed when unsquashed", () => {
    const speeds: number[] = [];
    ringBurst(36, 50, 1, 0.7, (vx, vy) => speeds.push(Math.hypot(vx, vy)));
    for (const s of speeds) expect(s).toBeCloseTo(50);
  });

  it("heartBurst points up at the top cusp and down at the tip", () => {
    const pts: [number, number][] = [];
    heartBurst(4, 160, (vx, vy) => pts.push([vx, vy]));
    // t=0 is the top cusp (y negative = up), t=PI is the bottom tip.
    expect(pts[0][1]).toBeLessThan(0);
    expect(pts[2][1]).toBeGreaterThan(0);
    expect(Math.abs(pts[0][0])).toBeLessThan(1e-9);
  });
});
