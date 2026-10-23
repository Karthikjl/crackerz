import type { CrackerId } from "@/crackers";

/** One cracker fired at time t. x/y are fractions of the canvas (y only matters for shells). */
export interface ShowEvent {
  t: number;
  id: CrackerId;
  x: number;
  y: number;
}

export interface Show {
  name: string;
  /** Seconds. */
  duration: number;
  events: ShowEvent[];
}

export const SHOW_DURATIONS = [30, 60, 120] as const;
