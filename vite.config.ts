import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "frontend",
  plugins: [react()],
  publicDir: "../public",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    target: "esnext",
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});

