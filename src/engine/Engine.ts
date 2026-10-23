import { Application, Container, Graphics, Rectangle, Sprite, type Texture } from "pixi.js";
import { CRACKERS_BY_ID, SHELLS, type CrackerConfig, type CrackerId } from "@/crackers";
import type { ShowEvent } from "@/show/types";
import { sound, type LoopHandle } from "@/audio/sound";
import { pick } from "./bursts";
import { hexToBgr, WHITE } from "./color";
import { Finale, Shell, TextShell, Timer } from "./entities/effects";
import { createPlacedCracker } from "./entities/placed";
import type { EngineApi } from "./instance";
import { ParticleRenderer } from "./ParticleRenderer";
import { F_BRANCH, F_CRACKLE, F_HOT, F_SPLIT, F_TRAIL, ParticleStore } from "./ParticleStore";
import { PerfGovernor } from "./perf";
import { MAX_PARTICLES, prefersReducedMotion, qualitySettings, type QualitySettings } from "./quality";
import { CanvasRecorder } from "./recorder";
import { Scene } from "./scene";
import type { EngineSettings } from "./settings";
import { SmokeSystem } from "./smoke";
import { createGlowTexture, createSmokeTexture, GLOW_SIZE } from "./textures";
import type { EngineContext, Entity, PlacedCracker } from "./types";

const MAX_PLACED = 30;
const SHELL_REPEAT = 0.22;
const MAX_DT = 0.05;
const SPARKLER_BGR = CRACKERS_BY_ID.sparkler.colors.map(hexToBgr);

export interface EngineOptions {
  settings: EngineSettings;
  getSelected?: () => CrackerConfig;
  onPlacedCountChange?: (count: number) => void;
  /** Shells launch on their own (landing page, greeting). */
  ambient?: boolean;
  /** Listen to taps on the canvas. Defaults to !ambient. */
  interactive?: boolean;
  /** Intercepts taps; return true to skip the default place/light/launch behaviour. */
  onTap?: (x: number, y: number) => boolean;
  /** Called when show playback reaches the end. */
  onShowEnd?: () => void;
}

type PointerMode = "sparkler" | "shell" | "none";

interface ActivePointer {
  x: number;
  y: number;
  mode: PointerMode;
  repeat: number;
  acc: number;
  stick?: Graphics;
  core?: Sprite;
}

export class Engine implements EngineContext, EngineApi {
  readonly particles = new ParticleStore(MAX_PARTICLES);
  readonly glowTexture: Texture;
  readonly glowLayer = new Container();
  readonly bodyLayer = new Container();
  readonly smoke: SmokeSystem;
  u = 1;
  width = 0;
  height = 0;
  groundY = 0;
  spawnScale = 1;

  private readonly world = new Container();
  private readonly flashRect = new Graphics();
  private readonly sparklerLayer = new Container();
  private readonly scene: Scene;
  private readonly renderer: ParticleRenderer;
  private readonly resizeObserver: ResizeObserver;
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly systemReducedMotion: boolean;

  private settings: EngineSettings;
  private quality: QualitySettings;
  private reducedFlash = false;
  private crackers: PlacedCracker[] = [];
  private effects: Entity[] = [];
  private finale: Finale | null = null;
  private pointers = new Map<number, ActivePointer>();
  private sparklerLoop: LoopHandle | null = null;
  private flashAlpha = 0;
  private trauma = 0;
  private lastPlacedCount = -1;
  private crackleCount = 0;
  private crackleX = 0;
  /** Adapts resolution/particles/smoke to real frame times; only in "auto" quality. */
  private governor: PerfGovernor | null = null;
  private resolution = 1;
  private ambientTimer = 0.4;
  private readonly recorder = new CanvasRecorder();
  private showEvents: ShowEvent[] = [];
  private showDuration = 60;
  private showTime = 0;
  private showIndex = 0;
  private showPlaying = false;

  private constructor(
    private readonly app: Application,
    private readonly host: HTMLElement,
    private readonly options: EngineOptions,
  ) {
    this.settings = options.settings;
    this.quality = qualitySettings(options.settings.quality);
    this.governor = options.settings.quality === "auto" ? new PerfGovernor() : null;
    this.systemReducedMotion = prefersReducedMotion();
    this.glowTexture = createGlowTexture();
    this.scene = new Scene(this.glowTexture);
    this.scene.kind = options.settings.scene;
    this.smoke = new SmokeSystem(createSmokeTexture());
    this.renderer = new ParticleRenderer(this.particles, this.glowTexture);
    this.applyQuality();
    this.applyFlashSetting();

    this.flashRect.blendMode = "add";
    this.flashRect.alpha = 0;
    this.world.addChild(
      this.scene.back,
      this.flashRect,
      this.scene.front,
      this.glowLayer,
      this.bodyLayer,
      this.smoke.container,
      this.renderer.container,
      this.sparklerLayer,
    );
    app.stage.addChild(this.world);

    const canvas = app.canvas;
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    if (options.interactive ?? !options.ambient) {
      canvas.style.touchAction = "none";
      canvas.addEventListener("pointerdown", this.onPointerDown);
      canvas.addEventListener("pointermove", this.onPointerMove);
      canvas.addEventListener("pointerup", this.onPointerUp);
      canvas.addEventListener("pointercancel", this.onPointerUp);
      canvas.addEventListener("contextmenu", preventDefault);
    }

    this.resizeObserver = new ResizeObserver(() => this.scheduleResize());
    this.resizeObserver.observe(host);
    this.resize();

    app.ticker.add((ticker) => {
      const raw = ticker.deltaMS / 1000;
      this.update(Math.min(raw, MAX_DT));
      if (this.governor?.sample(raw, this.particles.count > 300)) {
        this.applyQuality();
        this.app.renderer.resize(this.width, this.height, this.resolution);
      }
    });
  }

  static async create(host: HTMLElement, options: EngineOptions): Promise<Engine> {
    const app = new Application();
    await app.init({
      width: Math.max(1, host.clientWidth),
      height: Math.max(1, host.clientHeight),
      background: "#03020a",
      antialias: false,
      // We size the canvas with CSS (100%) so it stretches during resizes instead of leaving gaps.
      autoDensity: false,
      resolution: qualitySettings(options.settings.quality).resolution,
      preference: "webgl",
      powerPreference: "high-performance",
    });
    host.appendChild(app.canvas);
    return new Engine(app, host, options);
  }

  // ---- EngineContext ----

  flash(color: number, strength: number): void {
    const s = this.reducedFlash ? strength * 0.25 : strength;
    if (s >= this.flashAlpha) {
      this.flashRect.tint = color;
      this.flashAlpha = Math.min(0.6, s);
    }
  }

  shake(amount: number): void {
    if (this.reducedFlash) return;
    this.trauma = Math.min(1, this.trauma + amount);
  }

  vibrate(ms: number): void {
    if (this.settings.haptics && !this.options.ambient && "vibrate" in navigator) navigator.vibrate(ms);
  }

  pan(x: number): number {
    return this.width ? (x / this.width) * 2 - 1 : 0;
  }

  addEffect(effect: Entity): void {
    this.effects.push(effect);
  }

  after(delay: number, fn: () => void): void {
    this.effects.push(new Timer(delay, fn));
  }

  // ---- EngineApi ----

  lightAll(): void {
    const waiting = this.crackers.filter((c) => c.waiting).sort((a, b) => a.x - b.x);
    waiting.forEach((c, i) => c.scheduleLight(i * 0.25));
  }

  clearPlaced(): void {
    this.crackers = this.crackers.filter((c) => {
      if (!c.isPlaced) return true;
      c.destroy();
      return false;
    });
  }

  /** Live performance numbers for the ?debug overlay. */
  stats(): { fps: number; level: number; resolution: number; particles: number; tier: string; auto: boolean } {
    return {
      fps: Math.round(this.governor?.fps ?? this.app.ticker.FPS),
      level: this.governor?.level ?? 0,
      resolution: Math.round(this.resolution * 100) / 100,
      particles: this.particles.count,
      tier: this.quality.tier,
      auto: !!this.governor,
    };
  }

  grandFinale(): void {
    if (this.finale) return;
    this.lightAll();
    this.finale = new Finale(this);
    this.effects.push(this.finale);
  }

  applySettings(settings: EngineSettings): void {
    const prev = this.settings;
    this.settings = settings;
    if (settings.quality !== prev.quality) {
      this.quality = qualitySettings(settings.quality);
      this.governor = settings.quality === "auto" ? new PerfGovernor() : null;
      this.applyQuality();
      this.app.renderer.resize(this.width, this.height, this.resolution);
      this.app.render();
    }
    if (settings.reducedFlash !== prev.reducedFlash) this.applyFlashSetting();
    if (settings.scene !== prev.scene) {
      this.scene.kind = settings.scene;
      this.scene.layout(this.width, this.height, this.u, this.groundY);
    }
  }

  reset(): void {
    for (const c of this.crackers) c.destroy();
    for (const e of this.effects) e.destroy();
    this.crackers = [];
    this.effects = [];
    this.finale = null;
    this.particles.clear();
    this.smoke.clear();
    this.flashAlpha = 0;
    this.trauma = 0;
  }

  fireEvent(id: CrackerId, xf: number, yf: number): void {
    const cfg = CRACKERS_BY_ID[id];
    if (!cfg) return;
    const x = xf * this.width;
    if (cfg.kind === "shell") {
      this.launchShell(cfg, x, yf * this.height);
      return;
    }
    const margin = 24 * this.u;
    const cracker = createPlacedCracker(cfg, this, Math.max(margin, Math.min(this.width - margin, x)));
    if (!cracker) return;
    cracker.light();
    this.crackers.push(cracker);
  }

  writeText(lines: readonly string[]): void {
    const clean = lines.map((l) => l.trim()).filter(Boolean);
    if (clean.length) this.effects.push(new TextShell(this, clean, this.width / 2, this.height * 0.34));
  }

  // ---- Show playback ----

  setShowEvents(events: readonly ShowEvent[], duration: number): void {
    this.showEvents = [...events].sort((a, b) => a.t - b.t);
    this.showDuration = duration;
    this.showIndex = this.firstEventAfter(this.showTime);
  }

  playShow(): void {
    if (this.showTime >= this.showDuration) this.seekShow(0);
    this.showPlaying = true;
  }

  pauseShow(): void {
    this.showPlaying = false;
  }

  seekShow(t: number): void {
    this.showTime = Math.max(0, Math.min(this.showDuration, t));
    this.showIndex = this.firstEventAfter(this.showTime);
  }

  getShowTime(): number {
    return this.showTime;
  }

  isShowPlaying(): boolean {
    return this.showPlaying;
  }

  private firstEventAfter(t: number): number {
    const i = this.showEvents.findIndex((e) => e.t >= t);
    return i < 0 ? this.showEvents.length : i;
  }

  private updateShow(dt: number): void {
    if (!this.showPlaying) return;
    this.showTime += dt;
    while (this.showIndex < this.showEvents.length && this.showEvents[this.showIndex].t <= this.showTime) {
      const e = this.showEvents[this.showIndex++];
      this.fireEvent(e.id, e.x, e.y);
    }
    if (this.showTime >= this.showDuration) {
      this.showTime = this.showDuration;
      this.showPlaying = false;
      this.options.onShowEnd?.();
    }
  }

  // ---- Capture ----

  async screenshot(): Promise<Blob | null> {
    try {
      const url = await this.app.renderer.extract.base64({
        target: this.app.stage,
        frame: new Rectangle(0, 0, this.width, this.height),
        format: "png",
      });
      return await (await fetch(url)).blob();
    } catch {
      return null;
    }
  }

  startRecording(): boolean {
    return this.recorder.start(this.app.canvas, sound.captureStream());
  }

  stopRecording(): Promise<Blob | null> {
    return this.recorder.stop();
  }

  isRecording(): boolean {
    return this.recorder.recording;
  }

  destroy(): void {
    void this.recorder.stop();
    this.resizeObserver.disconnect();
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    const canvas = this.app.canvas;
    canvas.removeEventListener("pointerdown", this.onPointerDown);
    canvas.removeEventListener("pointermove", this.onPointerMove);
    canvas.removeEventListener("pointerup", this.onPointerUp);
    canvas.removeEventListener("pointercancel", this.onPointerUp);
    canvas.removeEventListener("contextmenu", preventDefault);
    this.sparklerLoop?.stop();
    for (const c of this.crackers) c.destroy();
    for (const e of this.effects) e.destroy();
    this.crackers = [];
    this.effects = [];
    this.app.destroy(true, { children: true, texture: true });
  }

  // ---- Settings ----

  private applyQuality(): void {
    const level = this.governor?.current ?? { resolution: 1, spawn: 1, smoke: 1 };
    this.particles.limit = Math.round(this.quality.maxParticles * Math.max(0.5, level.spawn));
    this.spawnScale = this.quality.spawnScale * level.spawn * (this.options.ambient ? 0.7 : 1);
    this.smoke.scale = (this.quality.tier === "low" ? 0.5 : 1) * level.smoke;
    this.resolution = Math.max(0.5, this.quality.resolution * level.resolution);
    this.scene.twinkle = this.quality.tier !== "low" && level.smoke > 0;
  }

  private applyFlashSetting(): void {
    this.reducedFlash = this.settings.reducedFlash || this.systemReducedMotion;
    this.renderer.reducedFlash = this.reducedFlash;
  }

  // ---- Layout ----

  /**
   * Resizing wipes the WebGL canvas and rebuilds the scenery, which phones can't do on every step
   * of an address-bar slide or rotation. Meanwhile the canvas just stretches via CSS; the real
   * resize runs once, shortly after the size stops changing.
   */
  private scheduleResize(): void {
    if (!this.width) {
      this.resize();
      return;
    }
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => {
      this.resizeTimer = null;
      this.resize();
    }, 120);
  }

  private resize(): void {
    const w = Math.max(1, this.host.clientWidth);
    const h = Math.max(1, this.host.clientHeight);
    if (w === this.width && h === this.height) return;
    const scaleX = this.width ? w / this.width : 1;

    this.app.renderer.resize(w, h, this.resolution);
    this.width = w;
    this.height = h;
    this.u = Math.max(0.45, Math.min(1.6, Math.min(h / 900, w / 500)));
    this.groundY = Math.round(h * 0.86);

    this.scene.layout(w, h, this.u, this.groundY);
    this.flashRect.clear().rect(0, 0, w, h).fill(WHITE);
    for (const c of this.crackers) c.relayout(scaleX);
    // Resizing wipes the WebGL canvas. Redraw now so the browser never paints that blank frame.
    this.app.render();
  }

  // ---- Input ----

  private selected(): CrackerConfig {
    return this.options.getSelected?.() ?? CRACKERS_BY_ID.peony;
  }

  private localPoint(e: PointerEvent): { x: number; y: number } {
    const rect = this.app.canvas.getBoundingClientRect();
    // Scale from on-screen size to stage size (they differ briefly while a resize is pending).
    const sx = rect.width ? this.width / rect.width : 1;
    const sy = rect.height ? this.height / rect.height : 1;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  }

  private onPointerDown = (e: PointerEvent): void => {
    void sound.unlock();
    this.app.canvas.setPointerCapture(e.pointerId);
    const { x, y } = this.localPoint(e);
    if (this.options.onTap?.(x, y)) return;
    const cfg = this.selected();
    const pointer: ActivePointer = { x, y, mode: "none", repeat: SHELL_REPEAT, acc: 0 };
    this.pointers.set(e.pointerId, pointer);

    if (cfg.kind === "sparkler") {
      this.startSparkler(pointer);
      return;
    }

    const hit = this.crackers.find((c) => c.hitTest(x, y));
    if (hit) {
      hit.light();
      return;
    }

    if (cfg.kind === "shell") {
      pointer.mode = "shell";
      this.launchShell(cfg, x, y);
    } else {
      this.placeCracker(cfg, x);
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    const pointer = this.pointers.get(e.pointerId);
    if (!pointer) return;
    const { x, y } = this.localPoint(e);
    pointer.x = x;
    pointer.y = y;
  };

  private onPointerUp = (e: PointerEvent): void => {
    const pointer = this.pointers.get(e.pointerId);
    if (!pointer) return;
    pointer.stick?.destroy();
    pointer.core?.destroy();
    this.pointers.delete(e.pointerId);
    if (![...this.pointers.values()].some((p) => p.mode === "sparkler")) {
      this.sparklerLoop?.stop();
      this.sparklerLoop = null;
    }
  };

  private startSparkler(pointer: ActivePointer): void {
    const u = this.u;
    pointer.mode = "sparkler";
    pointer.stick = new Graphics()
      .moveTo(0, 0)
      .lineTo(22 * u, 60 * u)
      .stroke({ width: 3 * u, color: 0x6d6d6d });
    pointer.core = new Sprite(this.glowTexture);
    pointer.core.anchor.set(0.5);
    pointer.core.blendMode = "add";
    pointer.core.tint = 0xfff1c9;
    pointer.core.scale.set((46 * u) / GLOW_SIZE);
    this.sparklerLayer.addChild(pointer.stick, pointer.core);
    this.sparklerLoop ??= sound.loop("spark", this.pan(pointer.x));
  }

  private placeCracker(cfg: CrackerConfig, x: number): void {
    const placed = this.crackers.filter((c) => c.isPlaced).length;
    if (placed >= MAX_PLACED) return;
    const margin = 24 * this.u;
    const cracker = createPlacedCracker(cfg, this, Math.max(margin, Math.min(this.width - margin, x)));
    if (cracker) this.crackers.push(cracker);
  }

  private launchShell(cfg: CrackerConfig, x: number, y: number): void {
    const targetY = Math.max(this.height * 0.08, Math.min(y, this.groundY - 120 * this.u));
    this.effects.push(new Shell(cfg, this, { x, targetY }));
  }

  // ---- Frame ----

  private update(dt: number): void {
    this.scene.update(dt);
    if (this.options.ambient) this.updateAmbient(dt);
    this.updatePointers(dt);
    this.updateShow(dt);

    // Compact in place (no per-frame array allocation).
    let alive = 0;
    for (const c of this.crackers) {
      if (c.update(dt)) this.crackers[alive++] = c;
      else c.destroy();
    }
    this.crackers.length = alive;
    // Effects may push new effects while updating; those land past i and run this frame too.
    alive = 0;
    for (let i = 0; i < this.effects.length; i++) {
      const e = this.effects[i];
      if (e.update(dt)) this.effects[alive++] = e;
      else {
        e.destroy();
        if (e === this.finale) this.finale = null;
      }
    }
    this.effects.length = alive;

    this.crackleCount = 0;
    this.particles.step(dt, this.groundY, this.onParticleDeath, this.onParticleTrail);
    if (this.crackleCount > 0) sound.crackle(this.pan(this.crackleX), Math.min(8, this.crackleCount + 2));
    this.renderer.sync();
    this.smoke.update(dt, this.u);

    // The flash is a full-screen quad: skip drawing it entirely when it's invisible.
    this.flashAlpha *= Math.exp(-dt * 7);
    this.flashRect.alpha = this.flashAlpha;
    this.flashRect.visible = this.flashAlpha > 0.004;

    this.trauma = Math.max(0, this.trauma - dt * 1.8);
    const shake = this.trauma * this.trauma * 14 * this.u;
    this.world.position.set((Math.random() * 2 - 1) * shake, (Math.random() * 2 - 1) * shake);

    const placed = this.crackers.reduce((n, c) => n + (c.waiting ? 1 : 0), 0);
    if (placed !== this.lastPlacedCount) {
      this.lastPlacedCount = placed;
      this.options.onPlacedCountChange?.(placed);
    }

  }

  private updateAmbient(dt: number): void {
    this.ambientTimer -= dt;
    if (this.ambientTimer > 0) return;
    // Fewer background shells on weak devices.
    this.ambientTimer = (0.5 + Math.random() * 0.9) / Math.max(0.4, this.spawnScale / 0.7);
    this.effects.push(
      new Shell(pick(SHELLS), this, {
        x: this.width * (0.1 + Math.random() * 0.8),
        targetY: this.height * (0.12 + Math.random() * 0.3),
        scale: 0.7 + Math.random() * 0.3,
      }),
    );
  }

  private updatePointers(dt: number): void {
    const cfg = this.selected();
    const u = this.u;
    for (const p of this.pointers.values()) {
      if (p.mode === "shell") {
        p.repeat -= dt;
        if (p.repeat <= 0 && cfg.kind === "shell") {
          p.repeat = SHELL_REPEAT;
          this.launchShell(cfg, p.x, p.y);
        }
      } else if (p.mode === "sparkler") {
        this.emitSparkler(cfg, p, dt);
        p.stick?.position.set(p.x, p.y);
        if (p.core) {
          p.core.position.set(p.x, p.y);
          p.core.alpha = 0.75 + Math.random() * 0.25;
          p.core.scale.set(((40 + Math.random() * 14) * u) / GLOW_SIZE);
        }
        this.sparklerLoop?.setPan(this.pan(p.x));
      }
    }
  }

  private emitSparkler(cfg: CrackerConfig, p: ActivePointer, dt: number): void {
    if (cfg.kind !== "sparkler") return;
    const u = this.u;
    p.acc += cfg.particles * dt * this.spawnScale;
    while (p.acc >= 1) {
      p.acc--;
      const a = Math.random() * Math.PI * 2;
      const r = Math.random();
      const s = cfg.speed * u * (0.15 + r * r * 0.85);
      this.particles.spawn(
        p.x,
        p.y,
        Math.cos(a) * s,
        Math.sin(a) * s,
        cfg.lifespan * (0.4 + Math.random() * 0.8),
        SPARKLER_BGR[(Math.random() * SPARKLER_BGR.length) | 0],
        (5 + Math.random() * 5) * u,
        cfg.gravity * u,
        cfg.drag,
        Math.random() < 0.3 ? F_BRANCH : 0,
      );
    }
  }

  private onParticleDeath = (i: number): void => {
    const s = this.particles;
    const flags = s.flags[i];
    if (!(flags & (F_BRANCH | F_CRACKLE | F_SPLIT))) return;
    const u = this.u;
    const x = s.x[i];
    const y = s.y[i];

    if (flags & F_SPLIT) {
      // Crossette: four sparks at ±45° and ±135° from the travel direction.
      const base = Math.atan2(s.vy[i], s.vx[i]) + Math.PI / 4;
      const sp = 190 * u;
      for (let k = 0; k < 4; k++) {
        const a = base + (k * Math.PI) / 2;
        s.spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp, 0.8 + Math.random() * 0.3, s.color[i], 8 * u, 90 * u, 0.965, F_HOT | F_TRAIL);
      }
      this.crackleCount++;
      this.crackleX = x;
      return;
    }

    const isCrackle = flags & F_CRACKLE;
    const n = isCrackle ? 3 : 2 + ((Math.random() * 2) | 0);
    const color = isCrackle ? 0xffffff : s.color[i];
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (60 + Math.random() * 90) * u;
      s.spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp, 0.06 + Math.random() * 0.12, color, (isCrackle ? 5 : 4) * u, 60 * u, 0.9, 0);
    }
    if (isCrackle) {
      this.crackleCount++;
      this.crackleX = x;
    }
  };

  private onParticleTrail = (i: number): void => {
    if (Math.random() > 0.45 * this.spawnScale) return;
    const s = this.particles;
    const u = this.u;
    const long = s.maxLife[i] > 3;
    s.spawn(
      s.x[i],
      s.y[i],
      s.vx[i] * 0.05 + (Math.random() - 0.5) * 10 * u,
      s.vy[i] * 0.05 + (Math.random() - 0.5) * 10 * u,
      (long ? 0.6 : 0.25) + Math.random() * (long ? 0.6 : 0.3),
      s.color[i],
      s.size[i] * 0.55,
      (long ? 90 : 60) * u,
      0.92,
      0,
    );
  };

}

function preventDefault(e: Event): void {
  e.preventDefault();
}
