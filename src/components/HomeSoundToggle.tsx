"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { sound } from "@/audio/sound";
import { hydrateStore, syncSoundSettings, useGameStore } from "@/store/game";
import { iconButton, secondaryButton } from "./ui";

/**
 * Gestures that start audio. Not pointerdown: starting audio swaps the wide "Tap for sound" pill
 * for an icon, and doing that mid-press shifts the header so the press's click lands elsewhere.
 * A click still carries the browser's user-activation from the press before it.
 */
const GESTURES = ["click", "keydown"] as const;

/**
 * Sound on/off for the home page's background fireworks only.
 * It uses a page-level mute, so the playground's sound setting is untouched.
 *
 * Browsers block all audio until the visitor interacts with the page, so sound starts on the
 * first tap, click or key press anywhere. Until then the button says so instead of claiming it's on.
 */
export default function HomeSoundToggle() {
  const homeMuted = useGameStore((s) => s.homeMuted);
  const toggleHomeMute = useGameStore((s) => s.toggleHomeMute);
  const [running, setRunning] = useState(false);

  const start = useCallback(() => sound.unlock().then(setRunning), []);

  useEffect(() => {
    void hydrateStore();
    setRunning(sound.running);
    const unsubscribe = syncSoundSettings();
    return () => {
      unsubscribe();
      // Leaving the home page must never carry its mute into other pages.
      sound.setPageMuted(false);
    };
  }, []);

  useEffect(() => {
    sound.setPageMuted(homeMuted);
  }, [homeMuted]);

  // Start audio on the first interaction anywhere on the page.
  useEffect(() => {
    if (homeMuted || running) return;
    const onGesture = () => void start();
    for (const type of GESTURES) window.addEventListener(type, onGesture, { passive: true });
    return () => {
      for (const type of GESTURES) window.removeEventListener(type, onGesture);
    };
  }, [homeMuted, running, start]);

  if (!homeMuted && !running) {
    return (
      <button
        type="button"
        onClick={() => void start()}
        aria-label="Start sound for this page"
        className={`${secondaryButton} h-9 px-3.5 text-sm ring-marigold/50`}
      >
        <Volume2 size={16} className="text-marigold" />
        Tap for sound
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (homeMuted) void start();
        toggleHomeMute();
      }}
      aria-pressed={!homeMuted}
      aria-label={homeMuted ? "Turn home page sound on" : "Turn home page sound off"}
      title={homeMuted ? "Sound is off on this page" : "Sound is on for this page"}
      className={iconButton}
    >
      {homeMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
    </button>
  );
}
