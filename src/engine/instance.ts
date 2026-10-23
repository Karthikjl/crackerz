// Lets UI components call the running engine without importing PixiJS.
import type { CrackerId } from "@/crackers";
import type { ShowEvent } from "@/show/types";

export interface EngineApi {
  lightAll(): void;
  clearPlaced(): void;
  grandFinale(): void;
  /** Removes every cracker, effect, particle and smoke puff. */
  reset(): void;
  /** Fires a cracker at canvas fractions (x, y): shells burst at y, ground crackers light at once. */
  fireEvent(id: CrackerId, x: number, y: number): void;
  /** Launches a shell that bursts into the given lines of text. */
  writeText(lines: readonly string[]): void;

  setShowEvents(events: readonly ShowEvent[], duration: number): void;
  playShow(): void;
  pauseShow(): void;
  seekShow(t: number): void;
  getShowTime(): number;
  isShowPlaying(): boolean;

  screenshot(): Promise<Blob | null>;
  /** Starts recording canvas + sound. Returns false if unsupported. */
  startRecording(): boolean;
  stopRecording(): Promise<Blob | null>;
  isRecording(): boolean;

  /** Live performance numbers (frame rate, adaptive level, render resolution, particle count). */
  stats(): { fps: number; level: number; resolution: number; particles: number; tier: string; auto: boolean };
}

let current: EngineApi | null = null;

export function setEngine(engine: EngineApi | null): void {
  current = engine;
}

export function getEngine(): EngineApi | null {
  return current;
}
