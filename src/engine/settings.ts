// Settings types and lists shared by the engine and the UI (no Pixi import).

export type SceneKind = "city" | "village" | "temple" | "beach";
export type QualitySetting = "auto" | "low" | "medium" | "high";

export interface EngineSettings {
  scene: SceneKind;
  quality: QualitySetting;
  reducedFlash: boolean;
  haptics: boolean;
}

export const SCENES: readonly { id: SceneKind; label: string }[] = [
  { id: "city", label: "City" },
  { id: "village", label: "Village" },
  { id: "temple", label: "Temple" },
  { id: "beach", label: "Beach" },
];

export const QUALITIES: readonly { id: QualitySetting; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];
