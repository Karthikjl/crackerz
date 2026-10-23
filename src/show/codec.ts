// Compact, URL-safe encoding of a show for share links (no backend: the show lives in the URL).
import { CRACKERS, type CrackerId } from "@/crackers";
import type { Show, ShowEvent } from "./types";

const PREFIX = "v1.";
const MAX_EVENTS = 600;
const MAX_DURATION = 300;
const IDS: readonly CrackerId[] = CRACKERS.map((c) => c.id);

type Packed = { n: string; d: number; e: [number, number, number, number][] };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(code: string): string {
  const b64 = code.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeShow(show: Show): string {
  const packed: Packed = {
    n: show.name.slice(0, 40),
    d: show.duration,
    e: show.events
      .slice(0, MAX_EVENTS)
      .map((ev) => [Math.round(ev.t * 10), IDS.indexOf(ev.id), Math.round(ev.x * 1000), Math.round(ev.y * 1000)]),
  };
  return PREFIX + toBase64Url(JSON.stringify(packed));
}

/** Returns null for anything that isn't a valid encoded show. Unknown crackers are dropped. */
export function decodeShow(code: string): Show | null {
  if (!code.startsWith(PREFIX)) return null;
  try {
    const packed = JSON.parse(fromBase64Url(code.slice(PREFIX.length))) as Partial<Packed>;
    if (!packed || !Array.isArray(packed.e)) return null;
    const duration = clamp(Number(packed.d) || 60, 5, MAX_DURATION);
    const events: ShowEvent[] = [];
    for (const item of packed.e.slice(0, MAX_EVENTS)) {
      if (!Array.isArray(item) || item.length < 4) continue;
      const [t, idIndex, x, y] = item.map(Number);
      const id = IDS[idIndex];
      if (!id || !Number.isFinite(t)) continue;
      events.push({ t: clamp(t / 10, 0, duration), id, x: clamp(x / 1000, 0, 1), y: clamp(y / 1000, 0, 1) });
    }
    events.sort((a, b) => a.t - b.t);
    return { name: String(packed.n ?? "Shared show").slice(0, 40), duration, events };
  } catch {
    return null;
  }
}
