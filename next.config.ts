import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Photos d'étiquettes envoyées pour lecture (lot 2) : jusqu'à 6 photos réduites par le navigateur.
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
};

export default nextConfig;
