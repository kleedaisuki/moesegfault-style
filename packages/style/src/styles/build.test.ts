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
    for (const component of ["glass", "motion", "message-attachment", "code-block", "icon"]) {
      expect(css).toContain(`.moe-${component}`);
    }
    // 无回退的主题变量必须有定义，防止组件误拼令牌名。Theme references without fallbacks must resolve, catching misspelled component tokens.
    const defined = new Set([...css.matchAll(/(--moe-[a-z0-9-]+)\s*:/gi)].map((match) => match[1]));
    for (const match of css.matchAll(/var\((--moe-[a-z0-9-]+)\s*\)/gi)) {
      expect(defined.has(match[1]), `Undefined theme variable: ${match[1]}`).toBe(true);
    }
  });

  it("ships standalone enhancement styles and the original brand asset", async () => {
    const bundle = await readFile(join(packageRoot, "dist", "css", "components.css"), "utf8");
    for (const name of [
      "glass",
      "motion",
      "messages",
      "code",
      "icons",
      "markdown",
      "math",
      "editor",
    ]) {
      const css = await readFile(join(packageRoot, "dist", "css", `${name}.css`), "utf8");
      expect(bundle).toContain(css);
    }
    const brand = await readFile(join(packageRoot, "dist", "assets", "icons", "brand.svg"), "utf8");
    const original = await readFile(
      join(packageRoot, "..", "..", "pages", "public", "favicon.svg"),
      "utf8",
    );
    expect(brand).toBe(original);
  });

  it("isolates editing dependencies from ordinary and read-only content entry points", async () => {
    for (const entry of ["index.js", "react/index.js", "react/rich-text.js", "markdown.js"]) {
      const source = await readFile(join(packageRoot, "dist", entry), "utf8");
      expect(source).not.toMatch(/@tiptap\/|react\/editor/);
    }
    const css = await readFile(join(packageRoot, "dist", "css", "editor.css"), "utf8");
    expect(css).toContain(".moe-editor");
    await access(join(packageRoot, "dist", "react", "editor.js"));
  });

  it("ships every relative math font and keeps rich text out of ordinary entry points", async () => {
    const css = await readFile(join(packageRoot, "dist", "css", "math.css"), "utf8");
    const urls = [...css.matchAll(/url\(([^)]+)\)/g)].map((match) => match[1]);
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      expect(url).toMatch(/^\.\.\/assets\/katex\/fonts\//);
      await access(join(packageRoot, "dist", "css", url));
    }
    await access(join(packageRoot, "dist", "assets", "katex", "LICENSE.txt"));
    for (const entry of ["index.js", "react/index.js"]) {
      const source = await readFile(join(packageRoot, "dist", entry), "utf8");
      expect(source).not.toMatch(/(?:markdown|katex|unified|remark|rehype)/);
    }
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
