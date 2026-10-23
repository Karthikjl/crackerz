import { Texture } from "pixi.js";

export const GLOW_SIZE = 64;

/** Soft white radial glow; tinted per particle. */
export function createGlowTexture(): Texture {
  const c = document.createElement("canvas");
  c.width = c.height = GLOW_SIZE;
  const g = c.getContext("2d")!;
  const r = GLOW_SIZE / 2;
  const grd = g.createRadialGradient(r, r, 0, r, r, r);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.18, "rgba(255,255,255,1)");
  grd.addColorStop(0.4, "rgba(255,255,255,0.4)");
  grd.addColorStop(0.72, "rgba(255,255,255,0.07)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, GLOW_SIZE, GLOW_SIZE);
  return Texture.from(c);
}

/** Soft blob with no hard core, for smoke. */
export function createSmokeTexture(): Texture {
  const c = document.createElement("canvas");
  c.width = c.height = GLOW_SIZE;
  const g = c.getContext("2d")!;
  const r = GLOW_SIZE / 2;
  const grd = g.createRadialGradient(r, r, 0, r, r, r);
  grd.addColorStop(0, "rgba(255,255,255,0.55)");
  grd.addColorStop(0.5, "rgba(255,255,255,0.25)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, GLOW_SIZE, GLOW_SIZE);
  return Texture.from(c);
}

/** Vertical night-sky gradient with warm city haze at the horizon. */
export function createSkyTexture(): Texture {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 512;
  const g = c.getContext("2d")!;
  const grd = g.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, "#03020a");
  grd.addColorStop(0.5, "#0b0720");
  grd.addColorStop(0.82, "#1d1032");
  grd.addColorStop(1, "#3b1b3c");
  g.fillStyle = grd;
  g.fillRect(0, 0, 4, 512);
  return Texture.from(c);
}
