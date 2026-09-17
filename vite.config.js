import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { aiPlugin } from "./server/aiPlugin.js";
import { tilesPlugin } from "./server/tilesPlugin.js";

export default defineConfig({
  plugins: [react(), tailwindcss(), aiPlugin(), tilesPlugin()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    hmr: {
      port: 3000,
    },
    proxy: {
      "/api/usgs": {
        target: "https://earthquake.usgs.gov",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/usgs/, ""),
      },
      "/api/usgs-volcano": {
        target: "https://volcanoes.usgs.gov",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/usgs-volcano/, ""),
      },
      "/api/emsc": {
        target: "https://www.seismicportal.eu",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/emsc/, ""),
      },
    },
  },
});
