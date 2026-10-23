import type { NextConfig } from "next";

// "/crackerz" when built for GitHub Pages (set by .github/workflows/deploy.yml), "" otherwise.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // Static site: no server, no API routes.
  output: "export",
  images: { unoptimized: true },
  basePath,
  // Emit play/index.html etc. so every static host (GitHub Pages included) serves /play/ correctly.
  trailingSlash: true,
};

export default nextConfig;
