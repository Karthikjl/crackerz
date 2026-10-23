"use client";

import { useEffect, useRef } from "react";
import { CRACKERS_BY_ID, type CrackerId } from "@/crackers";
import { Engine } from "@/engine/Engine";
import { setEngine, type EngineApi } from "@/engine/instance";
import { engineSettings, hydrateStore, useGameStore } from "@/store/game";

interface Props {
  /** Shells launch on their own. */
  ambient?: boolean;
  /** Listen to taps. Defaults to !ambient. */
  interactive?: boolean;
  /** Always use this cracker instead of the tray selection. */
  fixedCracker?: CrackerId;
  /** Register as the global engine for TopBar/CrackerTray. Defaults to !ambient. */
  register?: boolean;
  onTap?: (x: number, y: number) => boolean;
  onShowEnd?: () => void;
  onEngine?: (engine: EngineApi | null) => void;
}

/** Mounts the PixiJS engine. Load with next/dynamic and ssr: false. */
export default function FireworksCanvas(props: Props) {
  const { ambient = false, interactive = !ambient, fixedCracker, register = !ambient } = props;
  const hostRef = useRef<HTMLDivElement>(null);
  // Callbacks change identity on every render; the engine reads the latest through this ref.
  const callbacks = useRef(props);
  callbacks.current = props;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let engine: Engine | null = null;
    let cancelled = false;
    let unsubscribe = () => {};

    // Strict Mode mounts twice in dev: an engine that finishes init after unmount is destroyed.
    void hydrateStore()
      .then(() =>
        Engine.create(host, {
          ambient,
          interactive,
          settings: engineSettings(useGameStore.getState()),
          getSelected: () => CRACKERS_BY_ID[fixedCracker ?? useGameStore.getState().selectedId],
          onPlacedCountChange: (count) => useGameStore.getState().setPlacedCount(count),
          onTap: (x, y) => callbacks.current.onTap?.(x, y) ?? false,
          onShowEnd: () => callbacks.current.onShowEnd?.(),
        }),
      )
      .then((created) => {
        if (cancelled) {
          created.destroy();
          return;
        }
        engine = created;
        if (register) setEngine(created);
        callbacks.current.onEngine?.(created);
        unsubscribe = useGameStore.subscribe((s, prev) => {
          if (
            s.scene !== prev.scene ||
            s.quality !== prev.quality ||
            s.reducedFlash !== prev.reducedFlash ||
            s.haptics !== prev.haptics
          ) {
            created.applySettings(engineSettings(s));
          }
        });
      });

    return () => {
      cancelled = true;
      unsubscribe();
      if (engine) {
        if (register) setEngine(null);
        callbacks.current.onEngine?.(null);
        engine.destroy();
      }
    };
  }, [ambient, interactive, fixedCracker, register]);

  return (
    <div ref={hostRef} className={`absolute inset-0 overflow-hidden ${interactive ? "touch-none" : "pointer-events-none"}`} />
  );
}
