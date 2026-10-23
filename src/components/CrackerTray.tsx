"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import { CATEGORIES, CRACKERS, CRACKERS_BY_ID, type CrackerCategory, type CrackerId } from "@/crackers";
import { getEngine } from "@/engine/instance";
import { useGameStore } from "@/store/game";
import CrackerIcon from "./CrackerIcon";

/** Glow color behind the selected tile, per category. */
const CATEGORY_GLOW: Record<CrackerCategory, string> = {
  ground: "rgba(255,182,39,0.35)",
  sound: "rgba(232,69,122,0.38)",
  sky: "rgba(92,208,255,0.32)",
  shell: "rgba(139,92,246,0.4)",
};

interface Props {
  exclude?: readonly CrackerId[];
  showFinale?: boolean;
}

export default function CrackerTray({ exclude = [], showFinale = true }: Props) {
  const selectedId = useGameStore((s) => s.selectedId);
  const select = useGameStore((s) => s.select);
  const selected = CRACKERS_BY_ID[selectedId];
  const [tab, setTab] = useState<CrackerCategory>(selected.category);
  const items = CRACKERS.filter((c) => c.category === tab && !exclude.includes(c.id));

  return (
    <nav className="shrink-0 border-t border-white/8 bg-plum pb-[env(safe-area-inset-bottom)]" aria-label="Crackers">
      <div className="flex items-center gap-2 px-3 pt-2.5 sm:px-5">
        <div className="flex gap-1 rounded-full bg-night/60 p-1 ring-1 ring-white/8" role="tablist">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={tab === c.id}
              onClick={() => setTab(c.id)}
              className={`rounded-full px-3 py-1 text-[13px] font-medium ${
                tab === c.id ? "bg-cream text-ink" : "text-cream/65 hover:text-cream"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <p className="hidden min-w-0 flex-1 truncate text-center text-[13px] text-cream/55 md:block">
          <span className="font-semibold text-cream/85">{selected.name}.</span> {selected.hint}
        </p>
        {showFinale && (
          <button
            type="button"
            onClick={() => getEngine()?.grandFinale()}
            className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full bg-rani px-3.5 py-1.5 text-[13px] font-semibold text-white shadow-[0_0_20px_-6px] shadow-rani transition hover:bg-[#f0588b] active:scale-95 md:ml-0"
          >
            <Sparkles size={14} />
            Grand finale
          </button>
        )}
      </div>

      <p className="truncate px-4 pt-1.5 text-center text-xs text-cream/55 md:hidden">
        <span className="font-semibold text-cream/85">{selected.name}.</span> {selected.hint}
      </p>

      <ul className="flex gap-1.5 overflow-x-auto px-3 py-2.5 sm:justify-center sm:px-5 [scrollbar-width:none]">
        {items.map((c) => {
          const active = c.id === selectedId;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => select(c.id)}
                aria-pressed={active}
                className={`group flex w-[84px] flex-col items-center gap-1.5 rounded-2xl px-1.5 pb-2 pt-2 transition active:scale-95 ${
                  active ? "bg-plum-3 ring-1 ring-marigold/70" : "hover:bg-plum-2"
                }`}
                style={active ? { backgroundImage: `radial-gradient(circle at 50% 38%, ${CATEGORY_GLOW[c.category]}, transparent 62%)` } : undefined}
              >
                <span
                  className={`grid h-13 w-13 place-items-center rounded-full transition ${
                    active ? "bg-night/40" : "bg-night/55 ring-1 ring-white/6 group-hover:ring-white/15"
                  }`}
                >
                  <CrackerIcon id={c.id} size={42} className={`transition ${active ? "scale-110" : "opacity-90 group-hover:opacity-100"}`} />
                </span>
                {/* Always two lines tall: if the tray's height changed between tabs, the canvas
                    above would resize and flash black. */}
                <span className={`line-clamp-2 h-[2.5em] text-center text-[11.5px] leading-tight ${active ? "font-semibold text-cream" : "text-cream/70"}`}>
                  {c.name}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
