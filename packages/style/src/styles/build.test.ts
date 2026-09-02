import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildTokens, cleanOutput, validateDocument } from "../../scripts/build-tokens.mjs";

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
    expect(dtcg.color["cream-200"].$value).toEqual({
      colorSpace: "srgb",
      components: [1, 0.9647058823529412, 0.9176470588235294],
      hex: "#fff6ea",
    });
    expect(dtcg.shadow.sm.$value.color).toMatchObject({
      colorSpace: "srgb",
      alpha: 0.10196078431372549,
      hex: "#9e4e25",
    });
    expect(dtcg.shadow.sm.$value.offsetY).toEqual({ value: 8, unit: "px" });
    expect(resolved["semantic.light.background"]).toEqual({ value: "#fff6ea", type: "color" });
    expect(resolved["shadow.sm"]).toEqual({
      value: "0px 8px 18px 0px #9e4e251a",
      type: "shadow",
    });
  });

  it("rejects legacy scalar colors and malformed typed shadow members", () => {
    expect(() =>
      validateDocument({ color: { $type: "color", bad: { $value: "#ffffff" } } }),
    ).toThrow("color.bad must be a color object");
    expect(() =>
      validateDocument({
        shadow: {
          $type: "shadow",
          bad: {
            $value: {
              color: { colorSpace: "srgb", components: [0, 0, 0], hex: "#000000" },
              offsetX: "0px",
              offsetY: { value: 0, unit: "px" },
              blur: { value: 1, unit: "px" },
              spread: { value: 0, unit: "px" },
            },
          },
        },
      }),
    ).toThrow("shadow.bad[0].offsetX must be an object");
  });

  it("removes stale output before a reproducible token build", async () => {
    const outputRoot = await mkdtemp(join(tmpdir(), "moesegfault-style-"));
    const stalePath = join(outputRoot, "stale.js");
    try {
      await writeFile(stalePath, "stale");
      await cleanOutput(outputRoot);
      await buildTokens({
        outputRoot,
        generatedPath: join(outputRoot, "generated", "tokens.generated.ts"),
      });
      await expect(access(stalePath)).rejects.toThrow();
      await expect(access(join(outputRoot, "tokens", "tokens.dtcg.json"))).resolves.toBeUndefined();
    } finally {
      await rm(outputRoot, { recursive: true, force: true });
    }
  });
});
