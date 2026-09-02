import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const packageRoot = join(import.meta.dirname, "..", "..");

describe("token build artifacts", () => {
  it("ships a complete layered CSS bundle", async () => {
    const css = await readFile(join(packageRoot, "dist", "css", "all.css"), "utf8");
    expect(css).toContain("@layer moe.tokens, moe.reset, moe.foundation, moe.components");
    expect(css).toContain("--moe-color-background: #fff6ea");
    expect(css).toContain(':root[data-moe-theme="dark"]');
    expect(css).toContain(".moe-message-bubble");
    expect(css).toContain(".moe-composer");
  });

  it("preserves the DTCG source and emits resolved JSON", async () => {
    const dtcg = JSON.parse(
      await readFile(join(packageRoot, "dist", "tokens", "tokens.dtcg.json"), "utf8"),
    );
    const resolved = JSON.parse(
      await readFile(join(packageRoot, "dist", "tokens", "tokens.json"), "utf8"),
    );
    expect(dtcg.semantic.light.background.$value).toBe("{color.cream-200}");
    expect(resolved["semantic.light.background"]).toEqual({ value: "#fff6ea", type: "color" });
  });
});
