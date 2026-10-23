import type { CrackerId } from "@/crackers";
import type { Show, ShowEvent } from "./types";

/** Deterministic built-in show so the builder has something to play right away. */
export function demoShow(): Show {
  const events: ShowEvent[] = [];
  const add = (t: number, id: CrackerId, x: number, y = 0.3) => events.push({ t, id, x, y });

  // Opening: flower pots and chakkars.
  add(0, "anar", 0.2);
  add(0.4, "anar", 0.8);
  add(1.5, "chakkar", 0.5);
  add(3, "pencil", 0.35);
  add(3, "pencil", 0.65);
  // Rockets and first shells.
  add(5, "rocket", 0.3);
  add(5.6, "rocket", 0.7);
  add(7, "peony", 0.5, 0.25);
  add(8, "ring", 0.3, 0.3);
  add(8.6, "ring", 0.7, 0.3);
  add(10, "heart", 0.5, 0.28);
  // Bombs and the chain.
  add(12, "bijli", 0.15);
  add(12.5, "bijli", 0.85);
  add(13.5, "chain", 0.5);
  add(15, "bomb", 0.3);
  // Shell parade.
  const parade: CrackerId[] = ["chrysanthemum", "palm", "crossette", "willow", "strobe", "peony", "multibreak"];
  parade.forEach((id, i) => add(18 + i * 1.6, id, 0.15 + (i % 4) * 0.23, 0.2 + (i % 3) * 0.08));
  // Sky shot and laxmi.
  add(30, "skyshot12", 0.5);
  add(33, "laxmi", 0.2);
  // Finale volley.
  for (let i = 0; i < 9; i++) add(37 + i * 0.35, i % 2 ? "willow" : "peony", 0.1 + i * 0.1, 0.18 + (i % 3) * 0.05);
  add(41, "strobe", 0.5, 0.2);

  return { name: "Diwali Night (demo)", duration: 45, events };
}
