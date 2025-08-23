// client/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Builds into ../client-dist so server.js can serve it from repo root
export default defineConfig({
  plugins: [react()],
  base: "/",                 // ensure absolute URLs in built HTML
  build: {
    outDir: "../client-dist",
    emptyOutDir: true,
    sourcemap: true,
    cssCodeSplit: true,
    manifest: true
  },
  server: {
    port: 5173,
    strictPort: true,
    open: false
  }
});
