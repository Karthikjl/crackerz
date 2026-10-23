// Burst patterns: each calls emit(vx, vy) once per particle. No allocation.

export type Emit = (vx: number, vy: number) => void;
export type Rand = () => number;

/** Points on a sphere projected to 2D: filled disk with a dense rim, like a real aerial shell. */
export function sphereBurst(n: number, speed: number, emit: Emit, rand: Rand = Math.random): void {
  for (let i = 0; i < n; i++) {
    const z = 2 * rand() - 1;
    const r = Math.sqrt(1 - z * z);
    const a = rand() * Math.PI * 2;
    const s = speed * (0.92 + rand() * 0.08) * r;
    emit(Math.cos(a) * s, Math.sin(a) * s);
  }
}

/** Upper half-plane spray with varied speeds, for ground explosions. */
export function hemisphereBurst(n: number, speed: number, emit: Emit, rand: Rand = Math.random): void {
  for (let i = 0; i < n; i++) {
    const a = -Math.PI * rand();
    const s = speed * (0.3 + 0.7 * rand());
    emit(Math.cos(a) * s, Math.sin(a) * s);
  }
}

/** Evenly spaced arms with a little jitter (palm, crossette comets). */
export function armsBurst(n: number, speed: number, emit: Emit, rand: Rand = Math.random): void {
  const offset = rand() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const a = offset + (i / n) * Math.PI * 2 + (rand() - 0.5) * 0.15;
    const s = speed * (0.9 + rand() * 0.1);
    emit(Math.cos(a) * s, Math.sin(a) * s);
  }
}

/** Constant-speed ring, squashed (0..1) and rotated to look tilted in 3D. */
export function ringBurst(n: number, speed: number, squash: number, rotation: number, emit: Emit): void {
  const cr = Math.cos(rotation);
  const sr = Math.sin(rotation);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = Math.cos(a) * speed;
    const y = Math.sin(a) * speed * squash;
    emit(x * cr - y * sr, x * sr + y * cr);
  }
}

/** Classic heart curve, scaled so the widest point moves at `speed`. */
export function heartBurst(n: number, speed: number, emit: Emit): void {
  const k = speed / 16;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const s = Math.sin(t);
    const x = 16 * s * s * s;
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    emit(x * k, y * k);
  }
}
