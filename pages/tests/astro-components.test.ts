import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "astro";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/** @brief Astro 契约夹具的临时输出目录。Temporary output directory for the Astro contract fixture. */
const outputPath = join(tmpdir(), `moesegfault-style-astro-${process.pid}`);

/** @brief Astro 契约夹具根目录。Root directory of the Astro contract fixture. */
const fixtureRoot = new URL("./fixtures/astro-contract/", import.meta.url);

/** @brief 真实 Astro 构建产生的 HTML。HTML emitted by a real Astro build. */
let html = "";

beforeAll(async () => {
  await rm(outputPath, { force: true, recursive: true });
  await build({
    logLevel: "silent",
    outDir: outputPath,
    root: fileURLToPath(fixtureRoot),
  });
  html = await readFile(join(outputPath, "index.html"), "utf8");
});

afterAll(async () => {
  await rm(outputPath, { force: true, recursive: true });
});

describe("Astro 组件渲染契约", () => {
  it("通过标准 style 属性保留消费者样式并序列化全部布局属性", () => {
    expect(html).not.toContain("style:list");
    expect(html).not.toContain("[object Object]");

    const container = html.match(/<div[^>]*data-contract="container"[^>]*>/)?.[0] ?? "";
    expect(container).toContain("color: red");
    expect(container).toContain("--moe-container-max-width: 72rem");
    expect(container).toContain("--moe-container-gutter: 2rem");
    expect(container.lastIndexOf("--moe-container-gutter: 2rem")).toBeGreaterThan(
      container.lastIndexOf("--moe-container-gutter: ignored"),
    );

    const stack = html.match(/<div[^>]*data-contract="stack"[^>]*>/)?.[0] ?? "";
    expect(stack).toContain("color:blue");
    expect(stack).toContain("--moe-stack-gap:1rem");
    expect(stack).toContain("--moe-stack-align:end");

    const cluster = html.match(/<div[^>]*data-contract="cluster"[^>]*>/)?.[0] ?? "";
    expect(cluster).toContain("color: green");
    expect(cluster).toContain("--moe-cluster-gap: 0.5rem");
    expect(cluster).toContain("--moe-cluster-align: baseline");
    expect(cluster).toContain("--moe-cluster-justify: space-between");
    expect(cluster).toContain("--moe-cluster-wrap: nowrap");
  });

  it("将空字符串 href 保留为链接且不向 span 泄漏 href", () => {
    expect(html).toMatch(/<a[^>]*data-contract="button-link"[^>]*href(?:="")?(?=[ >])[^>]*>/);
    expect(html).toMatch(/<button[^>]*data-contract="button-native"[^>]*>/);
    expect(html).toMatch(/<a[^>]*data-contract="brand-link"[^>]*href(?:="")?(?=[ >])[^>]*>/);

    const brandSpan = html.match(/<span[^>]*data-contract="brand-span"[^>]*>/)?.[0] ?? "";
    expect(brandSpan).not.toContain("href=");
  });
});
