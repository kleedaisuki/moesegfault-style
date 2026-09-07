import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    emptyOutDir: false,
    lib: {
      entry: {
        index: "src/index.ts",
        code: "src/code.ts",
        markdown: "src/markdown.ts",
        "react/index": "src/react/index.ts",
        "react/rich-text": "src/react/rich-text.ts",
      },
      formats: ["es"],
    },
    rolldownOptions: {
      // 重型内容管线保持包边界与上游许可证，消费端仍可按需拆包。Keep heavy content dependencies external for consumer splitting and upstream notices.
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "unified",
        "remark-parse",
        "remark-gfm",
        "remark-math",
        "remark-rehype",
        "rehype-sanitize",
        "rehype-katex",
        "rehype-stringify",
        "katex",
      ],
    },
  },
});
