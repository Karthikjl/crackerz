import { describe, expect, it } from "vitest";
import { F_BRANCH, ParticleStore } from "./ParticleStore";

describe("ParticleStore", () => {
  it("refuses spawns beyond capacity", () => {
    const s = new ParticleStore(2);
    expect(s.spawn(0, 0, 0, 0, 1, 0, 1, 0, 1)).toBe(0);
    expect(s.spawn(0, 0, 0, 0, 1, 0, 1, 0, 1)).toBe(1);
    expect(s.spawn(0, 0, 0, 0, 1, 0, 1, 0, 1)).toBe(-1);
    expect(s.count).toBe(2);
  });

  it("swap-removes on kill", () => {
    const s = new ParticleStore(3);
    s.spawn(1, 0, 0, 0, 1, 0, 1, 0, 1);
    s.spawn(2, 0, 0, 0, 1, 0, 1, 0, 1);
    s.spawn(3, 0, 0, 0, 1, 0, 1, 0, 1);
    s.kill(0);
    expect(s.count).toBe(2);
    expect(s.x[0]).toBe(3);
    expect(s.x[1]).toBe(2);
  });

  it("applies gravity and velocity", () => {
    const s = new ParticleStore(1);
    s.spawn(0, 0, 10, 0, 5, 0, 1, 100, 1);
    s.step(0.1, 1000);
    expect(s.vy[0]).toBeCloseTo(10);
    expect(s.x[0]).toBeCloseTo(1);
    expect(s.y[0]).toBeCloseTo(1);
  });

  it("applies drag per 1/60s frame independent of dt", () => {
    const a = new ParticleStore(1);
    const b = new ParticleStore(1);
    a.spawn(0, 0, 100, 0, 5, 0, 1, 0, 0.9);
    b.spawn(0, 0, 100, 0, 5, 0, 1, 0, 0.9);
    a.step(1 / 30, 1000);
    b.step(1 / 60, 1000);
    b.step(1 / 60, 1000);
    expect(a.vx[0]).toBeCloseTo(b.vx[0]);
  });

  it("bounces off the ground", () => {
    const s = new ParticleStore(1);
    s.spawn(0, 99, 0, 100, 5, 0, 1, 0, 1);
    s.step(0.1, 100);
    expect(s.y[0]).toBe(100);
    expect(s.vy[0]).toBeLessThan(0);
  });

  it("calls onDeath before removing and processes spawned particles", () => {
    const s = new ParticleStore(10);
    s.spawn(5, 5, 0, 0, 0.05, 0, 1, 0, 1, F_BRANCH);
    const deaths: number[] = [];
    s.step(0.1, 1000, (i) => {
      deaths.push(s.x[i]);
      s.spawn(s.x[i], s.y[i], 0, 0, 1, 0, 1, 0, 1);
    });
    expect(deaths).toEqual([5]);
    expect(s.count).toBe(1);
    expect(s.flags[0]).toBe(0);
  });
});
