import { describe, expect, it } from "vitest";
import { decodeShow, encodeShow } from "./codec";
import { demoShow } from "./demo";

describe("show codec", () => {
  it("round-trips a show", () => {
    const show = demoShow();
    const decoded = decodeShow(encodeShow(show));
    expect(decoded).not.toBeNull();
    expect(decoded!.name).toBe(show.name);
    expect(decoded!.duration).toBe(show.duration);
    expect(decoded!.events).toHaveLength(show.events.length);
    decoded!.events.forEach((ev, i) => {
      const orig = [...show.events].sort((a, b) => a.t - b.t)[i];
      expect(ev.id).toBe(orig.id);
      // Times are stored at 0.1s resolution.
      expect(Math.abs(ev.t - orig.t)).toBeLessThanOrEqual(0.05 + 1e-9);
      expect(ev.x).toBeCloseTo(orig.x, 2);
    });
  });

  it("keeps unicode names", () => {
    const decoded = decodeShow(encodeShow({ name: "दीपावली 🎆", duration: 30, events: [] }));
    expect(decoded!.name).toBe("दीपावली 🎆");
  });

  it("produces URL-safe codes", () => {
    expect(encodeShow(demoShow())).toMatch(/^v1\.[A-Za-z0-9_-]+$/);
  });

  it("rejects garbage", () => {
    expect(decodeShow("hello")).toBeNull();
    expect(decodeShow("v1.!!!")).toBeNull();
    expect(decodeShow("v1." + btoa("{}"))).toBeNull();
  });

  it("drops unknown crackers and clamps values", () => {
    const code = "v1." + btoa(JSON.stringify({ n: "x", d: 9999, e: [[50, 999, 500, 500], [-20, 0, 5000, -3]] }));
    const decoded = decodeShow(code)!;
    expect(decoded.duration).toBe(300);
    expect(decoded.events).toHaveLength(1);
    expect(decoded.events[0]).toEqual({ t: 0, id: "sparkler", x: 1, y: 0 });
  });
});
