import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const headers = readFileSync(new URL("../public/_headers", import.meta.url), "utf8");
const distributionView = readFileSync(
  new URL("../src/views/DistributionView.astro", import.meta.url),
  "utf8",
);
const distributionRoutes = ["distribution", "en/distribution"].map((route) =>
  readFileSync(new URL(`../src/pages/${route}/index.astro`, import.meta.url), "utf8"),
);

describe("Cloudflare static asset contract", () => {
  it("allows consumers to reuse every published artifact cross-origin", () => {
    expect(headers).toMatch(/\/\*\s+Access-Control-Allow-Origin:\s*\*/);
  });

  it("only gives immutable caching to fingerprinted assets and exact releases", () => {
    expect(headers).toMatch(/\/_astro\/\*\s+Cache-Control:\s*public, max-age=31536000, immutable/);
    expect(headers).toMatch(
      /\/v:release\/\*\s+Cache-Control:\s*public, max-age=31536000, immutable/,
    );
    expect(headers).not.toMatch(/\/(?:latest|css|colors|tokens|skills)\/\*/);
  });
});

describe("Agent Skill distribution", () => {
  it("publishes the archive, readable entrypoint, and verification manifest in both locales", () => {
    const links = [
      "/skills/moesegfault-style.zip",
      "/skills/moesegfault-style/SKILL.md",
      "/skills/manifest.json",
    ];

    for (const link of links) expect(distributionView).toContain(`href="${link}"`);
    expect(distributionView).toContain(
      'href="/skills/moesegfault-style.zip" download="moesegfault-style.zip"',
    );
    for (const route of distributionRoutes) expect(route).toContain("DistributionView");
  });
});
