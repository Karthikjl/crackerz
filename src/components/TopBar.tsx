"use client";

import { Camera, Eraser, Flame, Maximize, Settings, Volume2, VolumeX } from "lucide-react";
import { getEngine } from "@/engine/instance";
import { useGameStore } from "@/store/game";
import { saveScreenshot } from "./download";
import RecordButton from "./RecordButton";
import Slider from "./Slider";
import { iconButton, primaryButton } from "./ui";
import Wordmark from "./Wordmark";

export function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen?.();
}

export function takeScreenshot() {
  const engine = getEngine();
  if (engine) void saveScreenshot(() => engine.screenshot());
}

export default function TopBar() {
  const volume = useGameStore((s) => s.volume);
  const muted = useGameStore((s) => s.muted);
  const placedCount = useGameStore((s) => s.placedCount);
  const setVolume = useGameStore((s) => s.setVolume);
  const toggleMute = useGameStore((s) => s.toggleMute);
  const setSettingsOpen = useGameStore((s) => s.setSettingsOpen);
  const silent = muted || volume === 0;

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-linear-to-b from-night/80 to-transparent px-3 pb-8 pt-3 sm:px-5">
      <Wordmark compact />

      <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
        <button type="button" onClick={() => getEngine()?.lightAll()} disabled={placedCount === 0} className={`${primaryButton} h-9 px-4 text-sm`}>
          <Flame size={16} strokeWidth={2.4} />
          Light all
          {placedCount > 0 && <span className="rounded-full bg-ink/15 px-1.5 text-xs tabular-nums">{placedCount}</span>}
        </button>
        <button
          type="button"
          onClick={() => getEngine()?.clearPlaced()}
          disabled={placedCount === 0}
          className={iconButton}
          aria-label="Remove unlit crackers"
          title="Remove unlit crackers"
        >
          <Eraser size={17} />
        </button>
        <button type="button" onClick={toggleMute} className={iconButton} aria-label={silent ? "Unmute" : "Mute"} title={silent ? "Unmute" : "Mute"}>
          {silent ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </button>
        <Slider value={muted ? 0 : volume} onChange={setVolume} label="Volume" className="hidden w-24 lg:flex" />
        <RecordButton />
        <button type="button" onClick={takeScreenshot} className={`${iconButton} hidden md:grid`} aria-label="Save a photo" title="Save a photo">
          <Camera size={17} />
        </button>
        <button type="button" onClick={() => setSettingsOpen(true)} className={iconButton} aria-label="Settings" title="Settings">
          <Settings size={17} />
        </button>
        <button type="button" onClick={toggleFullscreen} className={`${iconButton} hidden sm:grid`} aria-label="Fullscreen" title="Fullscreen">
          <Maximize size={16} />
        </button>
      </div>
    </header>
  );
}
