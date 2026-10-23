import type { QualitySetting } from "./settings";

export type QualityTier = "low" | "medium" | "high";

export interface QualitySettings {
  tier: QualityTier;
  maxParticles: number;
  spawnScale: number;
  resolution: number;
}

/** Particle pool size; quality tiers set a soft limit below this. */
export const MAX_PARTICLES = 12000;

const TIERS: Record<QualityTier, { maxParticles: number; spawnScale: number; maxResolution: number }> = {
  low: { maxParticles: 3000, spawnScale: 0.5, maxResolution: 1 },
  medium: { maxParticles: 6000, spawnScale: 0.75, maxResolution: 1.5 },
  high: { maxParticles: MAX_PARTICLES, spawnScale: 1, maxResolution: 2 },
};

/**
 * Starting-point guess from CPU cores, device memory (Chrome/Android only) and touch input.
 * The PerfGovernor corrects it at runtime from real frame times. Browser only.
 */
export function detectTier(): QualityTier {
  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (cores <= 4 || (memory !== undefined && memory <= 3) || (coarse && memory !== undefined && memory <= 4)) return "low";
  if (!coarse && cores >= 8 && (memory === undefined || memory >= 8)) return "high";
  return "medium";
}

export function qualitySettings(setting: QualitySetting): QualitySettings {
  const tier = setting === "auto" ? detectTier() : setting;
  const { maxResolution, ...rest } = TIERS[tier];
  return { tier, ...rest, resolution: Math.min(window.devicePixelRatio || 1, maxResolution) };
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
