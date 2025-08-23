import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Build into ../client-dist so server.js can serve it from repo root
export default defineConfig({
  plugins: [react()],
  base: "/",
  build: {
    outDir: "../client-dist",
    emptyOutDir: true,
    sourcemap: true,
    cssCodeSplit: true,
    manifest: true
  },
  server: {
    port: 5173,
    strictPort: true
  }
});
