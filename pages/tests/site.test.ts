import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  EN_NAV_ITEMS,
  getAlternatePath,
  getNavItems,
  isCurrentPath,
  NAV_ITEMS,
} from "../src/lib/site";

const docsCss = readFileSync(new URL("../src/styles/docs.css", import.meta.url), "utf8");

describe("documentation navigation", () => {
  it("has one unique absolute path for every required section", () => {
    const paths = NAV_ITEMS.map(({ href }) => href);

    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).toEqual(["/", "/foundations/", "/components/", "/guides/", "/distribution/"]);
    expect(paths.every((path) => path.startsWith("/") && !path.includes("//"))).toBe(true);
  });

  it("marks only an exact canonical route as current", () => {
    expect(isCurrentPath("/components/", "/components/")).toBe(true);
    expect(isCurrentPath("/components/example/", "/components/")).toBe(false);
    expect(isCurrentPath("/components", "/components/")).toBe(false);
  });

  it("keeps localized navigation and alternate paths within their locale", () => {
    expect(EN_NAV_ITEMS.map(({ href }) => href)).toEqual([
      "/en/",
      "/en/foundations/",
      "/en/components/",
      "/en/guides/",
      "/en/distribution/",
    ]);
    expect(getNavItems("en")).toBe(EN_NAV_ITEMS);
    expect(getNavItems("zh-CN")).toBe(NAV_ITEMS);
    expect(getAlternatePath("/", "zh-CN")).toBe("/en/");
    expect(getAlternatePath("/foundations/", "zh-CN")).toBe("/en/foundations/");
    expect(getAlternatePath("/en/", "en")).toBe("/");
    expect(getAlternatePath("/en/foundations/", "en")).toBe("/foundations/");
  });
});

describe("documentation theme contract", () => {
  it("maps its palette to the library's supported semantic tokens", () => {
    const mappings = [
      ["paper", "background"],
      ["paper-raised", "surface-strong"],
      ["ink", "text"],
      ["muted", "text-soft"],
      ["line", "border"],
      ["accent", "accent"],
      ["accent-soft", "accent-wash"],
      ["leaf", "success"],
    ] as const;

    for (const [docsToken, libraryToken] of mappings) {
      expect(docsCss).toContain(`--docs-${docsToken}: var(--moe-color-${libraryToken});`);
    }
    expect(docsCss).toContain("--docs-shadow: var(--moe-shadow-md);");
  });

  it("does not replace the library dark theme or reference retired palette tokens", () => {
    expect(docsCss).not.toMatch(/\[data-moe-theme=["']dark["']\]\s*\{/);
    expect(docsCss).not.toMatch(/--moe-color-(?:paper|ink-muted|accent-soft)(?:\s*[,)]|\s*:)/);
    expect(docsCss).not.toMatch(/--docs-(?:paper|ink|accent|leaf|shadow):\s*#[\da-f]/i);
  });
});
