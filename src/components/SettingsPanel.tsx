"use client";

import { Building2, Camera, CircleHelp, Clapperboard, Gift, House, Landmark, Maximize, Volume2, VolumeX, Waves, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { QUALITIES, SCENES, type SceneKind } from "@/engine/settings";
import { useGameStore } from "@/store/game";
import { takeScreenshot, toggleFullscreen } from "./TopBar";
import Slider from "./Slider";
import { panel, secondaryButton, sectionTitle } from "./ui";

const SCENE_ICONS: Record<SceneKind, LucideIcon> = {
  city: Building2,
  village: House,
  temple: Landmark,
  beach: Waves,
};

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2.5">
      <span>
        <span className="block text-[15px] font-medium">{label}</span>
        <span className="block text-[13px] text-cream/50">{hint}</span>
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className="relative h-6 w-11 shrink-0 rounded-full bg-white/15 transition peer-checked:bg-marigold peer-focus-visible:ring-2 peer-focus-visible:ring-marigold after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-cream after:transition peer-checked:after:translate-x-5" />
    </label>
  );
}

export default function SettingsPanel() {
  const open = useGameStore((s) => s.settingsOpen);
  const setOpen = useGameStore((s) => s.setSettingsOpen);
  const scene = useGameStore((s) => s.scene);
  const quality = useGameStore((s) => s.quality);
  const reducedFlash = useGameStore((s) => s.reducedFlash);
  const haptics = useGameStore((s) => s.haptics);
  const volume = useGameStore((s) => s.volume);
  const muted = useGameStore((s) => s.muted);
  const { setScene, setQuality, setReducedFlash, setHaptics, setVolume, toggleMute } = useGameStore.getState();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-night/80 sm:items-center" onClick={() => setOpen(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        onClick={(e) => e.stopPropagation()}
        className={`${panel} max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-b-none p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:rounded-b-3xl`}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-2xl">Settings</h2>
          <button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-plum-2 hover:bg-plum-3" aria-label="Close settings">
            <X size={18} />
          </button>
        </div>

        <section className="mb-6">
          <h3 className={sectionTitle}>Scene</h3>
          <div className="grid grid-cols-4 gap-2">
            {SCENES.map((s) => {
              const Icon = SCENE_ICONS[s.id];
              const active = scene === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setScene(s.id)}
                  aria-pressed={active}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl py-3 text-[13px] transition ${
                    active ? "bg-plum-3 text-cream ring-1 ring-marigold/70" : "bg-plum-2/70 text-cream/70 hover:bg-plum-2"
                  }`}
                >
                  <Icon size={22} className={active ? "text-marigold" : ""} />
                  {s.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mb-6">
          <h3 className={sectionTitle}>Sound</h3>
          <div className="flex items-center gap-3">
            <button type="button" onClick={toggleMute} className="text-cream/80" aria-label={muted ? "Unmute" : "Mute"}>
              {muted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <Slider value={muted ? 0 : volume} onChange={setVolume} label="Volume" showValue className="flex-1" />
          </div>
        </section>

        <section className="mb-6">
          <h3 className={sectionTitle}>Sparkle density</h3>
          <div className="grid grid-cols-4 gap-1 rounded-full bg-night/60 p-1 ring-1 ring-white/8">
            {QUALITIES.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => setQuality(q.id)}
                aria-pressed={quality === q.id}
                className={`rounded-full py-1.5 text-[13px] font-medium ${quality === q.id ? "bg-cream text-ink" : "text-cream/65 hover:text-cream"}`}
              >
                {q.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[13px] text-cream/45">Lower it if the show stutters on your device.</p>
        </section>

        <section className="mb-6 divide-y divide-white/6">
          <h3 className={sectionTitle}>Comfort</h3>
          <Toggle label="Reduce flashing" hint="Softer sky flashes, no strobes or screen shake" checked={reducedFlash} onChange={setReducedFlash} />
          <Toggle label="Vibration" hint="Feel the bangs on phones that support it" checked={haptics} onChange={setHaptics} />
        </section>

        <section className="mb-6">
          <h3 className={sectionTitle}>Capture</h3>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={takeScreenshot} className={`${secondaryButton} h-10 text-sm`}>
              <Camera size={16} /> Save a photo
            </button>
            <button type="button" onClick={toggleFullscreen} className={`${secondaryButton} h-10 text-sm`}>
              <Maximize size={15} /> Fullscreen
            </button>
          </div>
          <p className="mt-2 text-[13px] text-cream/45">Use the red record button at the top to save a video with sound.</p>
        </section>

        <section>
          <h3 className={sectionTitle}>More to try</h3>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/greeting" className={`${secondaryButton} h-10 text-sm`}>
              <Gift size={16} /> Send a greeting
            </Link>
            <Link href="/show" className={`${secondaryButton} h-10 text-sm`}>
              <Clapperboard size={16} /> Build a show
            </Link>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                useGameStore.getState().setSafetyOpen(true);
              }}
              className={`${secondaryButton} col-span-2 h-10 text-sm`}
            >
              <CircleHelp size={16} /> Safety tips
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
