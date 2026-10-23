// Procedural fireworks audio with the Web Audio API: no sound files to ship or license.
// Nothing touches `window` until unlock() is called from a user gesture.

export interface Stoppable {
  stop(): void;
}

export interface LoopHandle extends Stoppable {
  /** 0..1 */
  setLevel(level: number): void;
  setPan(pan: number): void;
}

export type LoopKind = "hiss" | "fuse" | "spark";

const NOOP_LOOP: LoopHandle = { setLevel() {}, setPan() {}, stop() {} };

const LOOP_SETTINGS: Record<LoopKind, { type: BiquadFilterType; freq: number; q: number; gain: number }> = {
  hiss: { type: "bandpass", freq: 4200, q: 0.5, gain: 0.32 },
  fuse: { type: "highpass", freq: 5200, q: 0.7, gain: 0.07 },
  spark: { type: "bandpass", freq: 6500, q: 0.8, gain: 0.22 },
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private output: AudioNode | null = null;
  private capture: MediaStreamAudioDestinationNode | null = null;
  private readonly media = new WeakSet<HTMLMediaElement>();
  private noise: AudioBuffer | null = null;
  private volume = 0.8;
  private muted = false;
  /** Mute for the current page only (e.g. home page toggle); never touches the saved setting. */
  private pageMuted = false;
  private lastCrackle = 0;
  private lastPop = 0;

  /**
   * Must be called from a user gesture (tap/click/key) for browsers to allow audio.
   * Resolves true once audio is actually running.
   */
  unlock(): Promise<boolean> {
    if (typeof window === "undefined") return Promise.resolve(false);
    if (!this.ctx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return Promise.resolve(false);
      const ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 12;
      comp.ratio.value = 6;
      comp.attack.value = 0.003;
      comp.release.value = 0.25;
      const master = ctx.createGain();
      master.connect(comp).connect(ctx.destination);

      const len = ctx.sampleRate * 2;
      const noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

      this.ctx = ctx;
      this.master = master;
      this.output = comp;
      this.noise = noise;
      this.applyVolume();
    }
    const ctx = this.ctx;
    if (ctx.state === "running") return Promise.resolve(true);
    return ctx.resume().then(
      () => ctx.state === "running",
      () => false,
    );
  }

  /**
   * Routes a media element (e.g. show music) through the master volume and the recording stream.
   * Call after unlock(); safe to call repeatedly.
   */
  connectMedia(el: HTMLMediaElement): void {
    if (!this.ctx || !this.master || this.media.has(el)) return;
    this.ctx.createMediaElementSource(el).connect(this.master);
    this.media.add(el);
  }

  /** Audio stream for video recording, or null before unlock(). */
  captureStream(): MediaStream | null {
    if (!this.ctx || !this.output) return null;
    if (!this.capture) {
      this.capture = this.ctx.createMediaStreamDestination();
      this.output.connect(this.capture);
    }
    return this.capture.stream;
  }

  setVolume(volume: number): void {
    this.volume = volume;
    this.applyVolume();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyVolume();
  }

  /** True once the browser has allowed audio to play. */
  get running(): boolean {
    return this.ctx?.state === "running";
  }

  setPageMuted(pageMuted: boolean): void {
    this.pageMuted = pageMuted;
    this.applyVolume();
  }

  private get silent(): boolean {
    return this.muted || this.pageMuted;
  }

  private applyVolume(): void {
    if (!this.ctx || !this.master) return;
    this.master.gain.setTargetAtTime(this.silent ? 0 : this.volume, this.ctx.currentTime, 0.02);
  }

  private get ready(): boolean {
    return !!this.ctx && this.ctx.state === "running" && !this.silent;
  }

  private panner(pan: number): StereoPannerNode {
    const ctx = this.ctx!;
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-0.85, Math.min(0.85, pan));
    p.connect(this.master!);
    return p;
  }

  private noiseSource(loop = false): AudioBufferSourceNode {
    const src = this.ctx!.createBufferSource();
    src.buffer = this.noise;
    src.loop = loop;
    return src;
  }

  /** Filtered noise burst with a fast attack and exponential decay. */
  private noiseHit(
    out: AudioNode,
    t: number,
    type: BiquadFilterType,
    freqFrom: number,
    freqTo: number,
    peak: number,
    decay: number,
  ): void {
    const ctx = this.ctx!;
    const src = this.noiseSource();
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freqFrom, t);
    filter.frequency.exponentialRampToValueAtTime(freqTo, t + decay);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    src.connect(filter).connect(gain).connect(out);
    src.start(t, Math.random() * 1.5);
    src.stop(t + decay + 0.05);
  }

  /** Sine thump with a falling pitch. */
  private thump(out: AudioNode, t: number, freqFrom: number, freqTo: number, peak: number, decay: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(freqFrom, t);
    osc.frequency.exponentialRampToValueAtTime(freqTo, t + decay);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    osc.connect(gain).connect(out);
    osc.start(t);
    osc.stop(t + decay + 0.05);
  }

  /** Deep aerial shell burst. */
  boom(pan: number, size = 1, delay = 0): void {
    if (!this.ready) return;
    const t = this.ctx!.currentTime + delay;
    const out = this.panner(pan);
    this.noiseHit(out, t, "highpass", 2000, 1500, 0.25 * size, 0.06);
    this.noiseHit(out, t, "lowpass", 900 * size + 200, 120, 0.9 * size, 1.3 * size + 0.3);
    this.thump(out, t, 90, 30, 0.8 * size, 0.6);
  }

  /** Sharp ground bomb bang. power ~0.5 (bijli) to 1.5 (laxmi). */
  bang(pan: number, power = 1): void {
    if (!this.ready) return;
    const t = this.ctx!.currentTime;
    const out = this.panner(pan);
    const p = Math.max(0.3, power);
    this.noiseHit(out, t, "highpass", 3000, 2000, 0.6 * Math.min(1, p), 0.04);
    this.noiseHit(out, t, "lowpass", 2600 / Math.sqrt(p), 300 / p, 1.1 * Math.sqrt(p), 0.35 + 0.25 * p);
    this.thump(out, t, 160 - 30 * p, 38, 0.8 + 0.3 * p, 0.25 + 0.2 * p);
  }

  /** Short firecracker pop for chains. Rate-limited. */
  pop(pan: number): void {
    if (!this.ready) return;
    const t = this.ctx!.currentTime;
    if (t - this.lastPop < 0.03) return;
    this.lastPop = t;
    const out = this.panner(pan);
    this.noiseHit(out, t, "highpass", 1200 + Math.random() * 800, 900, 0.45, 0.07);
    this.thump(out, t, 220, 90, 0.35, 0.08);
  }

  /** Mortar launch thoomp. */
  launch(pan: number, size = 1): void {
    if (!this.ready) return;
    const t = this.ctx!.currentTime;
    const out = this.panner(pan);
    this.noiseHit(out, t, "bandpass", 400, 1400, 0.45 * size, 0.35);
    this.thump(out, t, 150, 60, 0.45 * size, 0.2);
  }

  /** Cluster of tiny pops. Rate-limited so many crackling particles don't overload audio. */
  crackle(pan: number, count = 6, spread = 0.15): void {
    if (!this.ready) return;
    const now = this.ctx!.currentTime;
    if (now - this.lastCrackle < 0.05) return;
    this.lastCrackle = now;
    const out = this.panner(pan);
    for (let k = 0; k < count; k++) {
      const t = now + Math.random() * spread;
      this.noiseHit(out, t, "highpass", 2500 + Math.random() * 3000, 2000, 0.2 + Math.random() * 0.3, 0.025);
    }
  }

  /** Rising rocket whistle until stop() or duration ends. */
  whistle(pan: number, duration: number): Stoppable {
    if (!this.ready) return NOOP_LOOP;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const out = this.panner(pan);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.linearRampToValueAtTime(2400, t + duration);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 18;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 60;
    lfo.connect(lfoGain).connect(osc.frequency);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.07, t + 0.08);
    osc.connect(gain).connect(out);
    osc.start(t);
    lfo.start(t);
    const end = t + duration + 0.5;
    osc.stop(end);
    lfo.stop(end);
    let stopped = false;
    return {
      stop: () => {
        if (stopped) return;
        stopped = true;
        const now = ctx.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setTargetAtTime(0.0001, now, 0.03);
        osc.stop(now + 0.2);
        lfo.stop(now + 0.2);
      },
    };
  }

  /** Continuous filtered noise (fountain hiss, fuse fizz, sparkler). */
  loop(kind: LoopKind, pan: number): LoopHandle {
    if (!this.ready) return NOOP_LOOP;
    const ctx = this.ctx!;
    const settings = LOOP_SETTINGS[kind];
    const panner = this.panner(pan);
    const src = this.noiseSource(true);
    const filter = ctx.createBiquadFilter();
    filter.type = settings.type;
    filter.frequency.value = settings.freq;
    filter.Q.value = settings.q;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(settings.gain, ctx.currentTime, 0.05);
    src.connect(filter).connect(gain).connect(panner);
    src.start(ctx.currentTime, Math.random() * 1.5);
    let stopped = false;
    return {
      setLevel: (level) => {
        if (!stopped) gain.gain.setTargetAtTime(settings.gain * level, ctx.currentTime, 0.05);
      },
      setPan: (p) => {
        if (!stopped) panner.pan.setTargetAtTime(Math.max(-0.85, Math.min(0.85, p)), ctx.currentTime, 0.05);
      },
      stop: () => {
        if (stopped) return;
        stopped = true;
        gain.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
        src.stop(ctx.currentTime + 0.5);
      },
    };
  }
}

export const sound = new SoundEngine();
