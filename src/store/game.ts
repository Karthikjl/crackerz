import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { sound } from "@/audio/sound";
import type { CrackerId } from "@/crackers";
import { migrateStorageKey } from "@/storageMigration";
import type { EngineSettings, QualitySetting, SceneKind } from "@/engine/settings";

interface GameState extends EngineSettings {
  selectedId: CrackerId;
  volume: number;
  muted: boolean;
  /** Home page sound toggle; independent of the global mute. */
  homeMuted: boolean;
  /** Placed crackers waiting to be lit (reported by the engine). */
  placedCount: number;
  settingsOpen: boolean;
  /** The safety notice has been dismissed once (it auto-opens only on the first visit). */
  safetySeen: boolean;
  safetyOpen: boolean;
  select: (id: CrackerId) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleHomeMute: () => void;
  setPlacedCount: (count: number) => void;
  setScene: (scene: SceneKind) => void;
  setQuality: (quality: QualitySetting) => void;
  setReducedFlash: (reducedFlash: boolean) => void;
  setHaptics: (haptics: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setSafetyOpen: (open: boolean) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      selectedId: "peony",
      volume: 0.8,
      muted: false,
      homeMuted: false,
      placedCount: 0,
      settingsOpen: false,
      safetySeen: false,
      safetyOpen: false,
      scene: "city",
      quality: "auto",
      reducedFlash: false,
      haptics: true,
      select: (selectedId) => set({ selectedId }),
      setVolume: (volume) => set({ volume, muted: false }),
      toggleMute: () => set((s) => ({ muted: !s.muted })),
      toggleHomeMute: () => set((s) => ({ homeMuted: !s.homeMuted })),
      setPlacedCount: (placedCount) => set({ placedCount }),
      setScene: (scene) => set({ scene }),
      setQuality: (quality) => set({ quality }),
      setReducedFlash: (reducedFlash) => set({ reducedFlash }),
      setHaptics: (haptics) => set({ haptics }),
      setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
      // Closing the notice counts as having seen it.
      setSafetyOpen: (safetyOpen) => set(safetyOpen ? { safetyOpen } : { safetyOpen, safetySeen: true }),
    }),
    {
      name: "crackerz-settings",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        volume: s.volume,
        muted: s.muted,
        homeMuted: s.homeMuted,
        scene: s.scene,
        quality: s.quality,
        reducedFlash: s.reducedFlash,
        haptics: s.haptics,
        safetySeen: s.safetySeen,
      }),
      // Rehydrated in a client effect to avoid SSR hydration mismatches.
      skipHydration: true,
    },
  ),
);

/** Loads persisted settings once (client only). */
export function hydrateStore(): Promise<void> {
  if (useGameStore.persist.hasHydrated()) return Promise.resolve();
  migrateStorageKey("crackerverse-settings", "crackerz-settings");
  return Promise.resolve(useGameStore.persist.rehydrate());
}

export function engineSettings(s: EngineSettings): EngineSettings {
  return { scene: s.scene, quality: s.quality, reducedFlash: s.reducedFlash, haptics: s.haptics };
}

/** Keeps the sound engine in sync with the saved volume and mute. Returns an unsubscribe. */
export function syncSoundSettings(): () => void {
  const apply = ({ volume, muted }: { volume: number; muted: boolean }) => {
    sound.setVolume(volume);
    sound.setMuted(muted);
  };
  apply(useGameStore.getState());
  return useGameStore.subscribe(apply);
}
