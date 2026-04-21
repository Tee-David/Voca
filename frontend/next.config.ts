import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const isMobile = process.env.MOBILE_BUILD === "1";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: isMobile || process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  turbopack: {},

  ...(isMobile && {
    output: "export",
    trailingSlash: true,
    pageExtensions: ["tsx", "jsx"],
    images: {
      unoptimized: true,
      remotePatterns: [{ protocol: "https", hostname: "*.r2.dev" }],
    },
  }),

  ...(!isMobile && {
    async headers() {
      return [
        {
          source: "/(.*)",
          headers: [
            { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
            { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
          ],
        },
      ];
    },

    images: {
      remotePatterns: [{ protocol: "https", hostname: "*.r2.dev" }],
    },
  }),
};

export default isMobile ? nextConfig : withSerwist(nextConfig);
