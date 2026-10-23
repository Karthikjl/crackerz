"use client";

import dynamic from "next/dynamic";

const FireworksCanvas = dynamic(() => import("./FireworksCanvas"), { ssr: false });

/** Self-running fireworks behind the landing page. */
export default function AmbientBackground() {
  return <FireworksCanvas ambient />;
}
