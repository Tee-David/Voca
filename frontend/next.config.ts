import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow ONNX runtime WebAssembly files for kokoro-js
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    // Allow .wasm files
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    return config;
  },

  // Headers for SharedArrayBuffer (needed for ONNX WASM threads)
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
