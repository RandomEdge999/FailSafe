import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  transpilePackages: [
    "@failsafe/attack-packs",
    "@failsafe/schemas",
    "@failsafe/scoring-engine"
  ]
};

export default nextConfig;
