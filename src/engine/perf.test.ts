import { describe, expect, it } from "vitest";
import { PERF_LEVELS, PerfGovernor } from "./perf";

/** Feeds `seconds` worth of frames of duration dt. Returns how many level changes happened. */
function run(g: PerfGovernor, dt: number, seconds: number, busy = true): number {
  let changes = 0;
  for (let t = 0; t < seconds; t += dt) if (g.sample(dt, busy)) changes++;
  return changes;
}

describe("PerfGovernor", () => {
  it("stays at full quality at 60 fps", () => {
    const g = new PerfGovernor();
    run(g, 1 / 60, 20);
    expect(g.level).toBe(0);
  });

  it("steps down when busy frames are slow", () => {
    const g = new PerfGovernor();
    run(g, 1 / 25, 6);
    expect(g.level).toBeGreaterThan(0);
  });

  it("never goes past the lightest level", () => {
    const g = new PerfGovernor();
    run(g, 1 / 10, 120);
    expect(g.level).toBe(PERF_LEVELS.length - 1);
  });

  it("ignores moderately slow frames while idle (e.g. a 40 Hz display)", () => {
    const g = new PerfGovernor();
    run(g, 1 / 40, 20, false);
    expect(g.level).toBe(0);
  });

  it("still steps down when even an idle scene is very slow", () => {
    const g = new PerfGovernor();
    run(g, 1 / 20, 8, false);
    expect(g.level).toBeGreaterThan(0);
  });

  it("recovers when frames are fast again", () => {
    const g = new PerfGovernor();
    run(g, 1 / 20, 10);
    const dropped = g.level;
    run(g, 1 / 60, 40);
    expect(g.level).toBeLessThan(dropped);
  });

  it("ignores huge gaps like tab switches", () => {
    const g = new PerfGovernor();
    for (let i = 0; i < 50; i++) g.sample(2, true);
    expect(g.level).toBe(0);
  });
});
