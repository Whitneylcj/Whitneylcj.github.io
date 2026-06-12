import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";

export default defineConfig({
  site: "https://whitneylcj.github.io",
  output: "static",
  trailingSlash: "always",
  integrations: [mdx(), react()],
  vite: {
    build: {
      chunkSizeWarningLimit: 900
    }
  }
});
