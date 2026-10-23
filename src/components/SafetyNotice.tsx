"use client";

import { CircleHelp, Droplets, Leaf, PawPrint, ShieldCheck, Users, X, type LucideIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { hydrateStore, useGameStore } from "@/store/game";
import { iconButton, panel, primaryButton } from "./ui";

const TIPS: readonly { icon: LucideIcon; text: string }[] = [
  { icon: ShieldCheck, text: "Light crackers outdoors at arm's length, and never hold one in your hand." },
  { icon: Users, text: "Children should always have an adult with them." },
  { icon: Droplets, text: "Keep a bucket of water or sand nearby, and never relight a cracker that didn't go off." },
  { icon: Leaf, text: "Choose green crackers, follow local time limits, and burst fewer to keep the air clean." },
  { icon: PawPrint, text: "Loud bangs frighten pets, birds and older people, so keep the noise down near them." },
];

/**
 * Safety and pollution reminder. Opens by itself on the first visit; after that only from
 * SafetyButton. Mount once per page.
 */
export default function SafetyNotice() {
  const open = useGameStore((s) => s.safetyOpen);
  const setOpen = useGameStore((s) => s.setSafetyOpen);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    void hydrateStore().then(() => {
      if (!useGameStore.getState().safetySeen) useGameStore.getState().setSafetyOpen(true);
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-night/80 sm:items-center" onClick={() => setOpen(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="safety-title"
        onClick={(e) => e.stopPropagation()}
        className={`${panel} max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-b-none p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:rounded-b-3xl sm:p-7`}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="safety-title" className="font-display text-3xl text-marigold">
            Celebrate safely
          </h2>
          <button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-plum-2 hover:bg-plum-3" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <p className="mt-2 text-[15px] leading-relaxed text-cream/75">
          Here you can burst crackers with no smoke, burns or noise for the neighbours. When you celebrate for real, please keep these in mind:
        </p>

        <ul className="mt-5 space-y-3.5">
          {TIPS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-plum-2 text-marigold">
                <Icon size={18} />
              </span>
              <span className="pt-1.5 text-[15px] leading-snug text-cream/90">{text}</span>
            </li>
          ))}
        </ul>

        <p className="mt-5 rounded-2xl bg-night/60 px-4 py-3 text-[13px] leading-relaxed text-cream/60">
          This site has flashing lights. If they bother you, turn on <span className="text-cream/85">Reduce flashing</span> in Settings.
        </p>

        <button ref={confirmRef} type="button" onClick={() => setOpen(false)} className={`${primaryButton} mt-6 h-12 w-full text-base`}>
          Got it, let&apos;s celebrate
        </button>
      </div>
    </div>
  );
}

/** "?" button that reopens the safety notice. */
export function SafetyButton({ className = "" }: { className?: string }) {
  const setOpen = useGameStore((s) => s.setSafetyOpen);
  return (
    <button type="button" onClick={() => setOpen(true)} className={`${iconButton} ${className}`} aria-label="Safety tips" title="Safety tips">
      <CircleHelp size={18} />
    </button>
  );
}
