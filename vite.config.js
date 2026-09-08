import { defineConfig } from "vite";
import { sites } from "@openai/sites-vite-plugin";
import { gameApi } from "./server/vite-api.js";

export default defineConfig({
  plugins: [sites(), gameApi()],
  server: { host: "0.0.0.0", port: 5198, strictPort: true },
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/three/")) return "three";
        },
      },
    },
  },
});
