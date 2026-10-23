"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { hydrateStore, syncSoundSettings } from "@/store/game";
import CrackerTray from "./CrackerTray";
import PerfHud from "./PerfHud";
import SafetyNotice from "./SafetyNotice";
import SettingsPanel from "./SettingsPanel";
import TopBar from "./TopBar";

const FireworksCanvas = dynamic(() => import("./FireworksCanvas"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 grid place-items-center text-cream/50">Lighting the diyas…</div>,
});

export default function PlayClient() {
  useEffect(() => {
    void hydrateStore();
    return syncSoundSettings();
  }, []);

  return (
    <main className="fixed inset-0 flex select-none flex-col bg-night text-cream">
      <div className="relative min-h-0 flex-1">
        <FireworksCanvas />
        <TopBar />
      </div>
      <CrackerTray />
      <SettingsPanel />
      <PerfHud />
      <SafetyNotice />
    </main>
  );
}
