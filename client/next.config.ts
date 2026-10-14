import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the multi-stage Docker build (copies only necessary files)
  output: "standalone",

  transpilePackages: ["video.js", "@solar-icons/react"],

  // Keep builds anchored to the client package despite the backend lockfile at repo root.
  turbopack: {
    root: process.cwd(),
    resolveAlias: {
      '@solar-icons/react/outline': './node_modules/@solar-icons/react/dist/icons/style/outline.mjs',
    },
  },

  // The client renders same-origin image URLs; no remote optimizer hosts are needed.
  // Keep the allowlist empty so this app cannot be used as an arbitrary image proxy.
  images: { remotePatterns: [] },

  async rewrites() {
    const apiTarget = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
