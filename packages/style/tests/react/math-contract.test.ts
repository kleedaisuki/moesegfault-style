import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderMarkdown, renderMath } from "../../src/markdown";

const packageRoot = join(import.meta.dirname, "..", "..");
const katexCss = readFileSync(join(packageRoot, "dist", "css", "math.css"), "utf8");
const formula = String.raw`\sqrt[3]{x}^2 + \frac{a}{b} + \underbrace{x+y}_{n}`;

function layoutClasses(html: string): string[] {
  const classes = [...html.matchAll(/class="([^"]*)"/g)].flatMap((match) =>
    (match[1] ?? "").split(/\s+/),
  );
  return [...new Set(classes)].filter((name) => /(?:strut|base|sizing|vlist|mfrac)/.test(name));
}

describe("math markup contract", () => {
  it.each([
    ["renderMath", renderMath(formula, true)],
    ["renderMarkdown display", renderMarkdown(`$$\n${formula}\n$$`)],
    ["renderMarkdown inline", renderMarkdown(`Inline $${formula}$ math`)],
  ])("%s emits only layout classes that math.css styles", (_, html) => {
    const names = layoutClasses(html);
    expect(names.length).toBeGreaterThan(3);
    for (const name of names)
      expect(katexCss, `unstyled KaTeX class: ${name}`).toMatch(new RegExp(`\\.${name}(?![\\w-])`));
  });

  it("typesets Markdown and standalone formulas identically", () => {
    expect(renderMarkdown(`$$\n${formula}\n$$`)).toBe(renderMath(formula, true));
  });

  it("pins KaTeX exactly because markup and stylesheet must share one version", () => {
    const manifest = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
    expect(manifest.dependencies.katex).toMatch(/^\d+\.\d+\.\d+$/);
    expect(manifest.dependencies).not.toHaveProperty("rehype-katex");
  });
});
