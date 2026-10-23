// Struct-of-arrays particle pool. Pure data + physics, no rendering, no allocation in step().

export const F_FLICKER = 1; // strobes near end of life
export const F_CRACKLE = 2; // pops with tiny sparks + crackle sound on death
export const F_TRAIL = 4; // leaves short-lived sparks behind
export const F_BRANCH = 8; // splits into tiny sparks on death (sparkler look)
export const F_HOT = 16; // starts white-hot before showing its color
export const F_SPLIT = 32; // splits into a 4-way cross on death (crossette)
export const F_STROBE = 64; // blinks on and off for its whole life

export class ParticleStore {
  readonly capacity: number;
  /** Soft cap on live particles (quality setting), never above capacity. */
  limit: number;
  count = 0;

  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly vx: Float32Array;
  readonly vy: Float32Array;
  readonly life: Float32Array;
  readonly maxLife: Float32Array;
  readonly gravity: Float32Array;
  /** Velocity multiplier per 1/60s frame. */
  readonly drag: Float32Array;
  readonly size: Float32Array;
  /** BGR color. */
  readonly color: Uint32Array;
  readonly flags: Uint8Array;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.limit = capacity;
    this.x = new Float32Array(capacity);
    this.y = new Float32Array(capacity);
    this.vx = new Float32Array(capacity);
    this.vy = new Float32Array(capacity);
    this.life = new Float32Array(capacity);
    this.maxLife = new Float32Array(capacity);
    this.gravity = new Float32Array(capacity);
    this.drag = new Float32Array(capacity);
    this.size = new Float32Array(capacity);
    this.color = new Uint32Array(capacity);
    this.flags = new Uint8Array(capacity);
  }

  /** Returns the new particle index, or -1 when the pool is full. */
  spawn(
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    color: number,
    size: number,
    gravity: number,
    drag: number,
    flags = 0,
  ): number {
    if (this.count >= this.limit) return -1;
    const i = this.count++;
    this.x[i] = x;
    this.y[i] = y;
    this.vx[i] = vx;
    this.vy[i] = vy;
    this.life[i] = life;
    this.maxLife[i] = life;
    this.color[i] = color;
    this.size[i] = size;
    this.gravity[i] = gravity;
    this.drag[i] = drag;
    this.flags[i] = flags;
    return i;
  }

  /** Swap-remove: moves the last particle into slot i. */
  kill(i: number): void {
    const last = --this.count;
    if (i === last) return;
    this.x[i] = this.x[last];
    this.y[i] = this.y[last];
    this.vx[i] = this.vx[last];
    this.vy[i] = this.vy[last];
    this.life[i] = this.life[last];
    this.maxLife[i] = this.maxLife[last];
    this.color[i] = this.color[last];
    this.size[i] = this.size[last];
    this.gravity[i] = this.gravity[last];
    this.drag[i] = this.drag[last];
    this.flags[i] = this.flags[last];
  }

  clear(): void {
    this.count = 0;
  }

  /**
   * Integrates all particles. Particles below groundY bounce softly.
   * Callbacks may spawn new particles (they are appended and processed this frame).
   */
  step(
    dt: number,
    groundY: number,
    onDeath?: (i: number) => void,
    onTrail?: (i: number) => void,
  ): void {
    const frames = dt * 60;
    let i = 0;
    while (i < this.count) {
      const life = this.life[i] - dt;
      if (life <= 0) {
        onDeath?.(i);
        this.kill(i);
        continue;
      }
      this.life[i] = life;

      const f = Math.pow(this.drag[i], frames);
      this.vy[i] = (this.vy[i] + this.gravity[i] * dt) * f;
      this.vx[i] *= f;
      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;

      if (this.y[i] > groundY && this.vy[i] > 0) {
        this.y[i] = groundY;
        this.vy[i] *= -0.25;
        this.vx[i] *= 0.6;
      }

      if (onTrail && this.flags[i] & F_TRAIL) onTrail(i);
      i++;
    }
  }
}
