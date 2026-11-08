import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { elevaPwa } from "./scripts/pwa.mjs";
export default defineConfig({
  plugins: [react(), elevaPwa()],
  build: {
    rollupOptions: { output: { manualChunks: { charts: ["recharts"] } } },
  },
});
