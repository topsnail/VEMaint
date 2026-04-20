import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "frontend",
  plugins: [react()],
  publicDir: "../public",
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    },
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          if (id.includes("react") || id.includes("scheduler")) return "vendor-ui";
          if (id.includes("react-router-dom") || id.includes("@remix-run")) return "vendor-router";
          if (id.includes("antd") || id.includes("@ant-design") || id.includes("rc-")) return "vendor-ui";
          if (id.includes("i18next") || id.includes("react-i18next")) return "vendor-i18n";
          if (id.includes("gsap") || id.includes("@gsap/react")) return "vendor-gsap";

          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": "http://127.0.0.1:8788",
    },
  },
});

