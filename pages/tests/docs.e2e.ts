import { expect, test } from "@playwright/test";

const routes = ["/", "/foundations/", "/components/", "/guides/", "/distribution/"];

for (const route of routes) {
  test(`${route} has semantic navigation and no horizontal overflow`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "主要导航" })).toBeVisible();
    await expect(page.locator('nav a[aria-current="page"]')).toHaveCount(1);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test("theme preference survives navigation", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: /切换至深色主题/ });
  await expect(toggle).toHaveAttribute("data-ready", "true");
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-moe-theme", "dark");
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
