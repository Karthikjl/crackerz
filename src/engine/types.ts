import type { Container, Texture } from "pixi.js";
import type { ParticleStore } from "./ParticleStore";
import type { SmokeSystem } from "./smoke";

/** What entities (crackers, shells, effects) may use from the engine. */
export interface EngineContext {
  readonly particles: ParticleStore;
  readonly smoke: SmokeSystem;
  /** Scale unit: 1 at a 900px-tall reference screen. */
  readonly u: number;
  readonly width: number;
  readonly height: number;
  readonly groundY: number;
  /** Multiplier for particle counts (quality tier × adaptive FPS scaling). */
  readonly spawnScale: number;
  readonly glowTexture: Texture;
  readonly glowLayer: Container;
  readonly bodyLayer: Container;
  /** Lights up the sky. color is RGB. */
  flash(color: number, strength: number): void;
  shake(amount: number): void;
  vibrate(ms: number): void;
  /** Stereo pan (-1..1) for a screen x position. */
  pan(x: number): number;
  /** Adds a free-running entity (shell, shockwave, timer). */
  addEffect(effect: Entity): void;
  /** Runs fn after delay seconds of game time. */
  after(delay: number, fn: () => void): void;
}

export interface Entity {
  /** Returns false when finished and ready to be destroyed. */
  update(dt: number): boolean;
  destroy(): void;
}

/** A cracker sitting on the ground that the user can light. */
export interface PlacedCracker extends Entity {
  readonly x: number;
  /** Placed and not yet lit (scheduled or not). */
  readonly isPlaced: boolean;
  /** Placed and not yet lit or scheduled to light. */
  readonly waiting: boolean;
  hitTest(px: number, py: number): boolean;
  light(): void;
  scheduleLight(delay: number): void;
  relayout(scaleX: number): void;
}
