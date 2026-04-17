import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, CacheFirst, ExpirationPlugin, NetworkFirst, StaleWhileRevalidate } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Kokoro ONNX model + tokenizer (largest assets, cache forever)
    {
      matcher: /https:\/\/huggingface\.co\/.*\.(onnx|json|bin|txt)/i,
      handler: new CacheFirst({
        cacheName: "kokoro-model",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 20,
            maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
    // Book covers and static files from R2
    {
      matcher: /\/api\/files\/.*/i,
      handler: new StaleWhileRevalidate({
        cacheName: "book-files",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: 60 * 60 * 24 * 30,
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
    // Next.js static chunks
    {
      matcher: /\/_next\/static\/.*/i,
      handler: new CacheFirst({
        cacheName: "next-static",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 30,
          }),
        ],
      }),
    },
    // API: network-first so fresh data wins but offline works
    {
      matcher: /\/api\/(library|progress|bookmarks|user).*/i,
      handler: new NetworkFirst({
        cacheName: "api-data",
        networkTimeoutSeconds: 4,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: 60 * 60 * 24 * 7,
          }),
        ],
      }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
