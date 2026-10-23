"use client";

import { useEffect, useState } from "react";
import { getEngine } from "@/engine/instance";

type Stats = ReturnType<NonNullable<ReturnType<typeof getEngine>>["stats"]>;

/** FPS / quality overlay, shown only when the URL has ?debug. Handy for checking real phones. */
export default function PerfHud() {
  const [enabled, setEnabled] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("debug")) return;
    setEnabled(true);
    const id = setInterval(() => setStats(getEngine()?.stats() ?? null), 500);
    return () => clearInterval(id);
  }, []);

  if (!enabled || !stats) return null;
  const good = stats.fps >= 50;
  return (
    <div className="pointer-events-none fixed bottom-2 left-2 z-50 rounded-lg bg-night/85 px-2.5 py-1.5 font-mono text-[11px] leading-relaxed text-cream/85 ring-1 ring-white/10">
      <div className={good ? "text-[#6dff9e]" : stats.fps >= 30 ? "text-marigold" : "text-rani"}>{stats.fps} fps</div>
      <div>
        {stats.tier} · {stats.auto ? `auto L${stats.level}` : "manual"} · {stats.resolution}x
      </div>
      <div>{stats.particles} sparks</div>
    </div>
  );
}
