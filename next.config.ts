import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Enables forbidden() and app/forbidden.tsx (403 for insufficient roles).
    authInterrupts: true,
  },
};

export default nextConfig;
