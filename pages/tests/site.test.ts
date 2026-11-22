import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  EN_NAV_ITEMS,
  getAlternatePath,
  getNavItems,
  isCurrentPath,
  NAV_ITEMS,
  pinned,
  VERSION,
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
  it("takes every color from library tokens", () => {
    expect(docsCss).not.toMatch(/#[\da-f]{3,8}\b/i);
    expect(docsCss).not.toMatch(/\b(?:rgb|hsl|oklch|oklab)a?\(/i);
    expect(docsCss).not.toMatch(/\[data-moe-theme/);
  });

  it("stays in its own cascade layer above the library", () => {
    expect(docsCss).toContain("moe.components, moe.utilities, site;");
    expect(docsCss.trimEnd().endsWith("}")).toBe(true);
    expect(docsCss).not.toContain("!important");
  });

  it("derives pinned URLs from the library version", () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(pinned("css/all.css")).toBe(`https://style.moesegfault.dev/v${VERSION}/css/all.css`);
  });
});
