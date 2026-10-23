"use client";

import { useEffect, useRef } from "react";
import { CRACKERS_BY_ID } from "@/crackers";
import type { ShowEvent } from "@/show/types";
import CrackerIcon from "./CrackerIcon";

export type KeyedEvent = ShowEvent & { key: number };

const PX_PER_SEC = 26;
const LANE_H = 44;
const LANES = [
  { label: "Ground", match: (cat: string) => cat === "ground" || cat === "sound" },
  { label: "Sky", match: (cat: string) => cat === "sky" },
  { label: "Shells", match: (cat: string) => cat === "shell" },
];

const laneOf = (e: ShowEvent) => Math.max(0, LANES.findIndex((l) => l.match(CRACKERS_BY_ID[e.id].category)));
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

interface Props {
  events: readonly KeyedEvent[];
  duration: number;
  selectedKey: number | null;
  playing: boolean;
  getTime: () => number;
  onSelect: (key: number | null) => void;
  onMove: (key: number, t: number) => void;
  onSeek: (t: number) => void;
}

/** Scrollable show timeline: three lanes of draggable cracker markers and a live playhead. */
export default function Timeline({ events, duration, selectedKey, playing, getTime, onSelect, onMove, onSeek }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const width = duration * PX_PER_SEC;

  // Move the playhead every frame without re-rendering React.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const x = getTime() * PX_PER_SEC;
      if (playheadRef.current) playheadRef.current.style.transform = `translateX(${x}px)`;
      const scroller = scrollRef.current;
      if (playing && scroller && (x < scroller.scrollLeft || x > scroller.scrollLeft + scroller.clientWidth - 60)) {
        scroller.scrollLeft = Math.max(0, x - 60);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getTime, playing]);

  const seekFromEvent = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onSeek(Math.max(0, Math.min(duration, (e.clientX - rect.left) / PX_PER_SEC)));
    onSelect(null);
  };

  const startDrag = (e: React.PointerEvent<HTMLButtonElement>, ev: KeyedEvent) => {
    e.stopPropagation();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const startX = e.clientX;
    let moved = false;
    onSelect(ev.key);
    const move = (m: PointerEvent) => {
      const dx = m.clientX - startX;
      if (Math.abs(dx) > 3) moved = true;
      if (moved) onMove(ev.key, Math.max(0, Math.min(duration, ev.t + dx / PX_PER_SEC)));
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };

  return (
    <div className="relative flex shrink-0 border-t border-white/8 bg-night/90">
      <div className="z-10 flex w-16 shrink-0 flex-col border-r border-white/8 bg-plum pt-6 text-[12px] text-cream/55">
        {LANES.map((l) => (
          <div key={l.label} className="flex items-center px-2.5" style={{ height: LANE_H }}>
            {l.label}
          </div>
        ))}
      </div>

      <div ref={scrollRef} className="relative overflow-x-auto overflow-y-hidden">
        <div className="relative" style={{ width: width + 40 }}>
          {/* Ruler */}
          <div className="relative h-6 cursor-pointer border-b border-white/8" onPointerDown={seekFromEvent}>
            {Array.from({ length: Math.floor(duration / 5) + 1 }, (_, i) => (
              <div key={i} className="absolute top-0 h-full border-l border-white/15 pl-1 text-[10.5px] leading-6 text-cream/45 tabular-nums" style={{ left: i * 5 * PX_PER_SEC }}>
                {fmt(i * 5)}
              </div>
            ))}
          </div>

          {/* Lanes */}
          {LANES.map((l, lane) => (
            <div
              key={l.label}
              className={`relative cursor-pointer ${lane % 2 ? "bg-white/2.5" : ""}`}
              style={{ height: LANE_H }}
              onPointerDown={seekFromEvent}
            >
              {events
                .filter((ev) => laneOf(ev) === lane)
                .map((ev) => (
                  <button
                    key={ev.key}
                    type="button"
                    onPointerDown={(e) => startDrag(e, ev)}
                    title={`${CRACKERS_BY_ID[ev.id].name} at ${ev.t.toFixed(1)}s`}
                    aria-label={`${CRACKERS_BY_ID[ev.id].name} at ${ev.t.toFixed(1)} seconds`}
                    className={`absolute top-1 grid h-9 w-9 -translate-x-1/2 cursor-grab touch-none place-items-center rounded-xl transition-shadow active:cursor-grabbing ${
                      ev.key === selectedKey ? "z-10 bg-plum-3 ring-2 ring-marigold" : "bg-plum-2 ring-1 ring-white/10 hover:ring-white/30"
                    }`}
                    style={{ left: ev.t * PX_PER_SEC }}
                  >
                    <CrackerIcon id={ev.id} size={28} />
                  </button>
                ))}
            </div>
          ))}

          {/* Playhead */}
          <div ref={playheadRef} className="pointer-events-none absolute inset-y-0 left-0 z-20 w-0.5 bg-marigold shadow-[0_0_10px] shadow-marigold">
            <div className="absolute -left-1.25 top-0 h-3 w-3 rotate-45 rounded-xs bg-marigold" />
          </div>
        </div>
      </div>
    </div>
  );
}
