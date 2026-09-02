import { describe, expect, it } from "vitest";
import { isCurrentPath, NAV_ITEMS } from "../src/lib/site";

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
});
