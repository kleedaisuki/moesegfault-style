import react from "@astrojs/react";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://style.moesegfault.dev",
  output: "static",
  integrations: [react()],
  vite: {
    build: {
      target: ["chrome128", "edge128", "firefox134", "safari18.2"],
    },
  },
});
