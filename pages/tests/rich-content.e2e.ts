import { expect, type Page, test } from "@playwright/test";

/** 富文本验收区域，与展示文案解耦。Rich-content acceptance region independent of copy. */
const rich = '[data-testid="specimen-rich-text"]';

/** 长公式与代码只能在自身区域滚动。Long equations and code must not widen the document. */
async function expectContained(page: Page): Promise<void> {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
}

test("Markdown and TeX are server-rendered without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await page.goto(`${baseURL}/components/`);
    const specimen = page.locator(rich);
    await expect(specimen).toBeVisible();
    await expect(specimen.locator(".moe-markdown").first()).toBeVisible();
    await expect(specimen.locator(".katex").first()).toBeVisible();
    expect(await specimen.locator(".katex-mathml math").count()).toBeGreaterThan(0);
    expect(await specimen.locator("pre code").count()).toBeGreaterThan(0);
    await expectContained(page);
  } finally {
    await context.close();
  }
});

test("rich content stays contained and accessible in both themes", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/components/");
  const specimen = page.locator(rich);
  await expect(specimen).toBeVisible();
  for (const theme of ["light", "dark"] as const) {
    await page
      .locator("html")
      .evaluate((element, value) => element.setAttribute("data-moe-theme", value), theme);
    await expectContained(page);
    expect(await specimen.locator(".katex-display").count()).toBeGreaterThan(0);
    const equation = specimen.locator('.katex-display[tabindex="0"]').last();
    await expect(equation).toHaveAttribute("role", "region");
    await equation.focus();
    await expect(equation).toBeFocused();
    const scrollable = await equation.evaluate(
      (element) => element.scrollWidth > element.clientWidth,
    );
    if (scrollable) {
      await equation.press("ArrowRight");
      await expect
        .poll(() => equation.evaluate((element) => element.scrollLeft))
        .toBeGreaterThan(0);
      await equation.evaluate((element) => {
        element.scrollLeft = 0;
      });
    }
    const unsafe = await specimen
      .locator("a[href], img[src]")
      .evaluateAll(
        (nodes) =>
          nodes.filter((node) =>
            /^(?:javascript|vbscript|data):/i.test(
              (node.getAttribute("href") ?? node.getAttribute("src") ?? "").trim(),
            ),
          ).length,
      );
    expect(unsafe).toBe(0);
    expect(await specimen.locator("script, iframe, object, embed").count()).toBe(0);
    await equation.evaluate((element) => (element as HTMLElement).blur());
    await specimen.screenshot({
      path: testInfo.outputPath(`rich-content-${theme}.png`),
      style: ".site-header, .skip-link { visibility: hidden !important; }",
    });
  }
  expect(errors).toEqual([]);
});

test("frosted pane blurs live underlying text and artwork, with a working comparison", async ({
  page,
}, testInfo) => {
  await page.goto("/components/");
  const pane = page.getByTestId("frosted-pane");
  const backdrop = page.getByTestId("frosted-backdrop");
  await expect(pane).toBeVisible();
  expect(await backdrop.locator("p").count()).toBeGreaterThan(0);
  await expect(backdrop.locator("svg")).toBeVisible();
  const overlap = await pane.evaluate((element) => {
    const back = document.querySelector('[data-testid="frosted-backdrop"]');
    if (!back) return false;
    const a = element.getBoundingClientRect();
    const b = back.getBoundingClientRect();
    return (
      Math.min(a.right, b.right) > Math.max(a.left, b.left) &&
      Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top)
    );
  });
  expect(overlap).toBe(true);
  // 检查实际字形范围，而非空的全宽段落盒。Check text ranges, not empty full-width paragraph boxes.
  const textOverlap = await pane.evaluate((element) => {
    const a = element.getBoundingClientRect();
    return [...document.querySelectorAll('[data-testid="frosted-backdrop"] p')].some(
      (paragraph) => {
        const range = document.createRange();
        range.selectNodeContents(paragraph);
        return [...range.getClientRects()].some(
          (b) =>
            Math.min(a.right, b.right) > Math.max(a.left, b.left) &&
            Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top),
        );
      },
    );
  });
  expect(textOverlap).toBe(true);
  for (const theme of ["light", "dark"] as const) {
    await page
      .locator("html")
      .evaluate((element, value) => element.setAttribute("data-moe-theme", value), theme);
    const filter = await pane.evaluate((element) => getComputedStyle(element).backdropFilter);
    expect(filter).toMatch(/blur\(12px\)/);
    await page.getByTestId("frosted-demo").screenshot({
      path: testInfo.outputPath(`frosted-${theme}.png`),
      style: ".site-header, .skip-link { visibility: hidden !important; }",
    });
    await expectContained(page);
  }
  const toggle = page.getByTestId("frosted-demo").getByRole("switch");
  await expect(toggle).toBeChecked();
  await toggle.focus();
  await toggle.press("Space");
  await expect(toggle).not.toBeChecked();
  await expect(pane).toHaveAttribute("data-frosted", "false");
  expect(await pane.evaluate((element) => getComputedStyle(element).backdropFilter)).toMatch(
    /blur\(0px\)/,
  );
});

test("Markdown formulas use the same styled layout as standalone formulas", async ({ page }) => {
  await page.goto("/components/");
  const markdown = page.locator(`${rich} .moe-markdown .katex-display`).first();
  const layout = await markdown.evaluate((element) => {
    const limit = [...element.querySelectorAll(".katex-sizing")].map((node) =>
      Number.parseFloat(getComputedStyle(node).fontSize),
    );
    const body = Number.parseFloat(getComputedStyle(element).fontSize);
    return {
      body,
      smallest: Math.min(...limit),
      legacy: element.querySelectorAll(".strut").length,
    };
  });
  expect(layout.legacy).toBe(0);
  expect(layout.smallest).toBeLessThan(layout.body);
});

test("self-hosted mathematics fonts load without missing resources", async ({ page }) => {
  const failures: string[] = [];
  page.on("requestfailed", (request) =>
    failures.push(`${request.url()} ${request.failure()?.errorText}`),
  );
  page.on("response", (response) => {
    if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
  });
  await page.goto("/components/");
  await expect(page.locator(rich).locator(".katex").first()).toBeVisible();
  const loaded = await page.evaluate(async () => {
    await document.fonts.load("16px KaTeX_Main");
    await document.fonts.ready;
    return (
      [...document.fonts].some(
        (font) => font.family.includes("KaTeX_Main") && font.status === "loaded",
      ) && document.fonts.check("16px KaTeX_Main")
    );
  });
  expect(loaded).toBe(true);
  expect(failures).toEqual([]);
});
