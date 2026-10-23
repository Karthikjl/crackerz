"use client";

import type { CSSProperties } from "react";

interface Props {
  value: number;
  onChange: (value: number) => void;
  /** Accessible name. */
  label: string;
  min?: number;
  max?: number;
  step?: number;
  /** Shows the value as a percentage next to the track. */
  showValue?: boolean;
  className?: string;
}

/** The one range slider used across the app; styled by `.slider` in globals.css. */
export default function Slider({ value, onChange, label, min = 0, max = 1, step = 0.05, showValue = false, className = "" }: Props) {
  const fill = ((value - min) / (max - min)) * 100;
  const percent = Math.round(fill);
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        aria-valuetext={`${percent}%`}
        className="slider min-w-0 flex-1"
        style={{ "--fill": `${fill}%` } as CSSProperties}
      />
      {showValue && <span className="w-10 shrink-0 text-right text-sm tabular-nums text-cream/70">{percent}%</span>}
    </div>
  );
}
