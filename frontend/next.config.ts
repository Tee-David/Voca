import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack handles WASM natively (no webpack config needed)
  turbopack: {},

  // Required for kokoro-js (SharedArrayBuffer for ONNX WASM threads)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.r2.dev",
      },
    ],
  },
};

export default nextConfig;
