// Adaptive performance: steps rendering quality down when frames are slow and back up when
// there is headroom. Pure logic (no Pixi, no DOM) so it can be unit-tested.

export interface PerfLevel {
  /** Multiplier on the quality tier's render resolution. */
  resolution: number;
  /** Multiplier on particle spawn counts. */
  spawn: number;
  /** Multiplier on smoke puffs (0 = off). */
  smoke: number;
}

/** Ordered best → lightest. Resolution drops early because pixel fill is the main cost on weak GPUs. */
export const PERF_LEVELS: readonly PerfLevel[] = [
  { resolution: 1, spawn: 1, smoke: 1 },
  { resolution: 1, spawn: 0.8, smoke: 0.7 },
  { resolution: 0.85, spawn: 0.7, smoke: 0.5 },
  { resolution: 0.75, spawn: 0.55, smoke: 0.3 },
  { resolution: 0.65, spawn: 0.45, smoke: 0 },
  { resolution: 0.55, spawn: 0.35, smoke: 0 },
];

const SLOW_FRAME = 1 / 45;
const VERY_SLOW_FRAME = 1 / 30;
const FAST_FRAME = 1 / 56;
const SLOW_SECONDS_TO_DROP = 1.2;
const FAST_SECONDS_TO_RAISE = 8;

export class PerfGovernor {
  level = 0;
  private avg = 1 / 60;
  private slowTime = 0;
  private fastTime = 0;
  private cooldown = 1;

  /**
   * Feed one frame's real duration (seconds) and whether the scene is busy (many particles).
   * Returns true when the level changed. Slow frames while idle only count when very slow,
   * so a 30 Hz display or a quiet scene doesn't strip quality for nothing.
   */
  sample(dt: number, busy: boolean): boolean {
    if (!(dt > 0) || dt > 0.5) return false; // tab switches and debugger pauses aren't real frames
    this.avg += (dt - this.avg) * 0.1;
    if (this.cooldown > 0) {
      this.cooldown -= dt;
      return false;
    }

    if (this.avg > SLOW_FRAME && (busy || this.avg > VERY_SLOW_FRAME)) {
      this.slowTime += dt;
      this.fastTime = 0;
    } else if (this.avg < FAST_FRAME) {
      this.fastTime += dt;
      this.slowTime = 0;
    } else {
      this.slowTime = Math.max(0, this.slowTime - dt);
    }

    if (this.slowTime > SLOW_SECONDS_TO_DROP && this.level < PERF_LEVELS.length - 1) {
      this.level++;
      this.slowTime = 0;
      this.cooldown = 1.5;
      return true;
    }
    if (this.fastTime > FAST_SECONDS_TO_RAISE && this.level > 0) {
      this.level--;
      this.fastTime = 0;
      this.cooldown = 3;
      return true;
    }
    return false;
  }

  get fps(): number {
    return 1 / this.avg;
  }

  get current(): PerfLevel {
    return PERF_LEVELS[this.level];
  }
}
