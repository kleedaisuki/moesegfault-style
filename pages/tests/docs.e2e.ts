import { expect, test } from "@playwright/test";

const routes = ["/", "/foundations/", "/components/", "/guides/", "/distribution/"];
const englishRoutes = [
  "/en/",
  "/en/foundations/",
  "/en/components/",
  "/en/guides/",
  "/en/distribution/",
];

for (const route of routes) {
  test(`${route} has semantic navigation and no horizontal overflow`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "主要导航" })).toBeVisible();
    await expect(page.locator('nav a[aria-current="page"]')).toHaveCount(1);
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/favicon.svg");

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

for (const route of englishRoutes) {
  test(`${route} is fully localized and links stay in English`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
    await expect(page.locator('nav a[aria-current="page"]')).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Switch to Chinese" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Switch to (light|dark) theme/ })).toBeVisible();
    const navLinks = await page
      .locator("nav a")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    expect(navLinks.every((href) => href?.startsWith("/en/"))).toBe(true);
    const englishBody = (await page.locator("body").innerText()).replace("中文", "");
    expect(englishBody).not.toMatch(/[\u3400-\u9fff]/u);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `https://style.moesegfault.dev${route}`,
    );
    await expect(page.locator('link[rel="alternate"][hreflang="zh-CN"]')).toHaveCount(1);
  });
}

test("language switch preserves the current section", async ({ page }) => {
  await page.goto("/foundations/");
  await page.getByRole("link", { name: "Read in English" }).click();
  await expect(page).toHaveURL(/\/en\/foundations\/$/);
  await expect(page.locator("main h1")).toHaveText("Order you can feel.");
  await page.getByRole("link", { name: "Switch to Chinese" }).click();
  await expect(page).toHaveURL(/\/foundations\/$/);
});

test("theme preference survives navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#fff6ea");
  const toggle = page.getByRole("button", { name: /切换至深色主题/ });
  await expect(toggle).toHaveAttribute("data-ready", "true");
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-moe-theme", "dark");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#21130f");
  await expect
    .poll(() =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement)
          .getPropertyValue("--moe-color-background")
          .trim(),
      ),
    )
    .toBe("#21130f");

  await page.goto("/foundations/");
  await expect(page.locator("html")).toHaveAttribute("data-moe-theme", "dark");
  await expect(page.getByRole("button", { name: /切换至浅色主题/ })).toBeVisible();
});

test("skip link reaches the main content", async ({ page, isMobile }) => {
  await page.goto("/");
  const skip = page.getByRole("link", { name: "跳到主要内容" });
  if (isMobile) {
    await skip.focus();
  } else {
    await page.keyboard.press("Tab");
  }
  await expect(skip).toBeFocused();
  await skip.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});
