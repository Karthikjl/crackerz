"use client";

import { Circle, Square } from "lucide-react";
import { useEffect, useState } from "react";
import { getEngine } from "@/engine/instance";
import { downloadBlob } from "./download";
import { iconButton } from "./ui";

const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Toggles video recording of the global engine and downloads the result. */
export default function RecordButton({ className = "" }: { className?: string }) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    if (startedAt === null) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 500);
    return () => clearInterval(id);
  }, [startedAt]);

  const toggle = async () => {
    const engine = getEngine();
    if (!engine) return;
    if (startedAt === null) {
      if (engine.startRecording()) {
        setUnsupported(false);
        setElapsed(0);
        setStartedAt(Date.now());
      } else {
        setUnsupported(true);
      }
      return;
    }
    setStartedAt(null);
    const blob = await engine.stopRecording();
    if (blob) downloadBlob(blob, "crackerz");
  };

  if (startedAt !== null) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label="Stop recording and save the video"
        className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-rani px-3 text-sm font-semibold text-white tabular-nums shadow-[0_0_20px_-4px] shadow-rani transition active:scale-95 ${className}`}
      >
        <Square size={12} fill="currentColor" />
        {formatTime(elapsed)}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={unsupported ? "This browser can't record video" : "Record a video"}
      aria-label="Record a video"
      className={`${iconButton} ${unsupported ? "text-cream/40" : ""} ${className}`}
    >
      <Circle size={16} className="text-rani" fill="currentColor" />
    </button>
  );
}
