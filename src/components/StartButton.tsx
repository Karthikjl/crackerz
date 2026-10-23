"use client";

import { Flame } from "lucide-react";
import { useRouter } from "next/navigation";
import { sound } from "@/audio/sound";
import { primaryButton } from "./ui";

/** Unlocks audio inside the click gesture, then opens the playground. */
export default function StartButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        void sound.unlock();
        router.push("/play");
      }}
      className={`${primaryButton} h-14 px-8 text-lg`}
    >
      <Flame size={20} strokeWidth={2.4} />
      Start celebrating
    </button>
  );
}
