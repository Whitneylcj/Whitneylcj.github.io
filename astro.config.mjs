import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  site: "https://whitneylcj.github.io",
  output: "static",
  trailingSlash: "always",
  integrations: [react()],
  vite: {
    build: {
      chunkSizeWarningLimit: 900
    }
  }
});
