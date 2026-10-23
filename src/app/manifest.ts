import type { MetadataRoute } from "next";
import { withBase } from "@/basePath";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Crackerz - Burst Crackers Online",
    short_name: "Crackerz",
    description: "Light sparklers, flower pots, bombs, rockets and sky shells in your browser.",
    id: withBase("/"),
    start_url: withBase("/play/"),
    scope: withBase("/"),
    display: "fullscreen",
    orientation: "any",
    background_color: "#03020a",
    theme_color: "#03020a",
    icons: [
      { src: withBase("/icons/icon-192.png"), sizes: "192x192", type: "image/png" },
      { src: withBase("/icons/icon-512.png"), sizes: "512x512", type: "image/png" },
      { src: withBase("/icons/icon-512-maskable.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
