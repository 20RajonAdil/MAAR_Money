import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    // Offline support. `generateSW` rebuilds the service worker and its
    // precache list from whatever's actually in dist/ on every build, so
    // future changes here stay offline-ready automatically without
    // needing this config touched again. `manifest: false` because
    // public/manifest.webmanifest is already hand-authored and linked
    // from index.html.
    VitePWA({
      registerType: "autoUpdate",
      manifest: false,
      includeAssets: ["favicon.svg", "og-image.png", "robots.txt"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,json}"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            // All your entries, bundles and Fraunces/IBM Plex Sans font
            // files, so the app (and its look) works with no connection.
            urlPattern: ({ url }) =>
              url.origin === self.location.origin ||
              url.origin === "https://fonts.googleapis.com" ||
              url.origin === "https://fonts.gstatic.com",
            handler: "CacheFirst",
            options: {
              cacheName: "maar-money-runtime",
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
