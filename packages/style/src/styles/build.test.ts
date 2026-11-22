import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildTokens,
  cleanOutput,
  springEasing,
  validateDocument,
} from "../../scripts/build-tokens.mjs";

const packageRoot = join(import.meta.dirname, "..", "..");

describe("token build artifacts", () => {
  it("ships a complete layered CSS bundle", async () => {
    const css = await readFile(join(packageRoot, "dist", "css", "all.css"), "utf8");
    expect(css).toContain("@layer moe.tokens, moe.reset, moe.foundation, moe.components");
    expect(css).toContain("--moe-color-background: #fffdf9");
    expect(css).toContain(':root[data-moe-theme="dark"]');
    expect(css).toContain(".moe-message-bubble");
    expect(css).toContain(".moe-composer");
    for (const component of [
      "glass",
      "motion",
      "message-attachment",
      "code-block",
      "icon",
      "panel",
      "field",
      "segmented",
      "table",
      "tabs",
      "dialog",
    ]) {
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
      "forms",
      "data",
      "navigation",
      "overlay",
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

  it("keeps fonts opt-in and ships every referenced font with its license", async () => {
    const fonts = await readFile(join(packageRoot, "dist", "css", "fonts.css"), "utf8");
    const urls = [...fonts.matchAll(/url\(([^)]+)\)/g)].map((match) => match[1] ?? "");
    expect(urls.length).toBe(4);
    for (const url of urls) await access(join(packageRoot, "dist", "css", url));
    for (const family of ["geist", "geist-mono"])
      await access(join(packageRoot, "dist", "assets", "fonts", `${family}-LICENSE.txt`));
    const all = await readFile(join(packageRoot, "dist", "css", "all.css"), "utf8");
    expect(all).not.toContain("assets/fonts/");
  });

  it("freezes the 0.1 palette variables and keeps roles off them", async () => {
    const resolved = JSON.parse(
      await readFile(join(packageRoot, "dist", "tokens", "tokens.json"), "utf8"),
    );
    const source = JSON.parse(
      await readFile(join(packageRoot, "dist", "tokens", "tokens.dtcg.json"), "utf8"),
    );
    // 0.1.x 变量是公开契约：继续可用、数值不变，但不再驱动界面。0.1.x variables stay public and unchanged, yet no longer drive the interface.
    const palette = {
      "color.cream-200": "#fff6ea",
      "color.coral-600": "#e66a3f",
      "color.coral-700": "#bd4525",
      "color.gold": "#ffb55e",
      "color.ink": "#26110b",
      "color.brown-500": "#4b2a1e",
      "color.green": "#4daf76",
      "color.red": "#d65345",
      "color.gray": "#9c8d86",
    };
    for (const [name, value] of Object.entries(palette)) {
      expect(resolved[name]).toEqual({ value, type: "color" });
      const primitive = name.slice("color.".length);
      expect(source.color[primitive].$deprecated).toEqual(expect.any(String));
      expect(JSON.stringify(source.semantic)).not.toContain(`{color.${primitive}}`);
    }
  });

  it("samples springs that start, settle, and overshoot as the physics says", async () => {
    for (const ratio of [0.78, 0.5]) {
      const stops = springEasing(ratio).slice("linear(".length, -1).split(", ").map(Number);
      expect([stops[0], stops.at(-1)]).toEqual([0, 1]);
      const overshoot = Math.exp((-Math.PI * ratio) / Math.sqrt(1 - ratio ** 2));
      expect(Math.max(...stops) - 1).toBeCloseTo(overshoot, 2);
    }
    const css = await readFile(join(packageRoot, "dist", "css", "tokens.css"), "utf8");
    // 三次贝塞尔先行，linear() 仅在支持处覆盖。The cubic-bezier comes first; linear() overrides it only where supported.
    const fallback = css.indexOf("--moe-motion-ease-bounce: cubic-bezier(");
    const upgrade = css.indexOf(`--moe-motion-ease-bounce: ${springEasing(0.5)}`);
    expect(fallback).toBeGreaterThan(0);
    expect(upgrade).toBeGreaterThan(css.indexOf("@supports (transition-timing-function: linear"));
    expect(css.indexOf("@supports (transition-timing-function: linear")).toBeGreaterThan(fallback);
  });

  it("moves geometry only through the gated motion pairs", async () => {
    // 位移、缩放只能用会在减少动态时归零的成对变量。Geometry may only use the pairs that reduced motion zeroes.
    for (const name of ["components", "forms", "data", "navigation", "overlay", "messages"]) {
      const css = await readFile(join(packageRoot, "src", "styles", `${name}.css`), "utf8");
      const geometry = css.match(
        /^\s*(?:transition:\s*)?(?:transform|translate|scale|rotate) [^;{]*[,;]$/gm,
      );
      for (const rule of geometry ?? [])
        expect(rule).toMatch(/var\(--moe-(?:spring|bounce|exit)\)/);
    }
  });

  it("keeps the danger role distinct from the crimson action", async () => {
    const resolved = JSON.parse(
      await readFile(join(packageRoot, "dist", "tokens", "tokens.json"), "utf8"),
    );
    const hue = (hex: string): number => {
      const [r = 0, g = 0, b = 0] = [1, 3, 5].map((at) =>
        Number.parseInt(hex.slice(at, at + 2), 16),
      );
      return (Math.atan2(Math.sqrt(3) * (g - b), 2 * r - g - b) * 180) / Math.PI;
    };
    for (const theme of ["light", "dark"]) {
      const role = (name: string): string => resolved[`semantic.${theme}.${name}`].value;
      expect(Math.abs(hue(role("danger")) - hue(role("action")))).toBeGreaterThan(15);
    }
  });

  it("preserves the DTCG source and emits resolved JSON", async () => {
    const dtcg = JSON.parse(
      await readFile(join(packageRoot, "dist", "tokens", "tokens.dtcg.json"), "utf8"),
    );
    const resolved = JSON.parse(
      await readFile(join(packageRoot, "dist", "tokens", "tokens.json"), "utf8"),
    );
    expect(dtcg.semantic.light.background.$value).toBe("{color.snow-50}");
    expect(dtcg.color["cream-200"].$value).toEqual({
      colorSpace: "srgb",
      components: [1, 0.9647058823529412, 0.9176470588235294],
      hex: "#fff6ea",
    });
    expect(dtcg.shadow.sm.$value.color).toMatchObject({
      colorSpace: "srgb",
      alpha: 15 / 255,
      hex: "#2b1816",
    });
    expect(dtcg.shadow.sm.$value.offsetY).toEqual({ value: 1, unit: "px" });
    expect(resolved["semantic.light.background"]).toEqual({ value: "#fffdf9", type: "color" });
    expect(resolved["shadow.sm"]).toEqual({
      value: "0px 1px 2px 0px #2b18160f",
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
