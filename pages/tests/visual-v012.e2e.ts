import { expect, type Page, test } from "@playwright/test";

/** 文档中的发布验收锚点，不绑定演示文案。Release acceptance anchors independent of demo copy. */
const specimens = ["glass", "motion", "code", "messages", "icons"];

/** 验证页面容器不被长代码或附件撑开。Ensure long code and attachments do not widen the page. */
async function expectNoOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

/** 清除交互焦点并回到页首，避免长截图重复绘制粘性导航。Reset focus and scroll for stable full-page captures. */
async function resetCapturePosition(page: Page): Promise<void> {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
}

/** 读取真实绘制颜色，避免仅检查主题属性。Read painted colors, not just theme attributes. */
async function codePalette(page: Page): Promise<{ surface: string; keyword: string }> {
  return page.getByTestId("v012-code").evaluate((root) => {
    const surface = root.querySelector(".moe-code-block");
    const keyword = root.querySelector(".hljs-keyword");
    if (!surface || !keyword) throw new Error("Highlighted code specimen is missing");
    return {
      surface: getComputedStyle(surface).background,
      keyword: getComputedStyle(keyword).color,
    };
  });
}

test("v0.1.2 specimens render in both themes without page overflow", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/components/");
  for (const specimen of specimens) {
    await expect(page.getByTestId(`v012-${specimen}`)).toBeVisible();
  }
  await expect(page.getByTestId("v012-glass").locator(".moe-glass").first()).toBeVisible();
  await expect(page.getByTestId("v012-icons").locator("svg").first()).toBeVisible();
  await expect(
    page.getByTestId("v012-messages").locator(".moe-message-bubble").first(),
  ).toBeVisible();
  const light = await codePalette(page);
  const font = await page
    .getByTestId("v012-code")
    .locator("code")
    .first()
    .evaluate((element) => getComputedStyle(element).fontFamily);
  expect(font).toMatch(/mono/i);
  await expectNoOverflow(page);
  await resetCapturePosition(page);
  await page.screenshot({ path: testInfo.outputPath("v012-light.png"), fullPage: true });
  for (const specimen of ["glass", "messages", "code"]) {
    await page.getByTestId(`v012-${specimen}`).screenshot({
      path: testInfo.outputPath(`v012-${specimen}-light.png`),
      // 组件特写不包含浮动站点导航；仅作用于截图。Hide sticky site chrome only in specimen captures.
      style: ".site-header, .skip-link { visibility: hidden !important; }",
    });
  }
  const toggle = page.getByRole("button", { name: "切换至深色主题" });
  await expect(toggle).toHaveAttribute("data-ready", "true");
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-moe-theme", "dark");
  await expect.poll(() => codePalette(page)).not.toEqual(light);
  const dark = await codePalette(page);
  expect(dark.surface).not.toBe(light.surface);
  expect(dark.keyword).not.toBe(light.keyword);
  await expectNoOverflow(page);
  await resetCapturePosition(page);
  await page.screenshot({ path: testInfo.outputPath("v012-dark.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("reduced motion keeps new content visible without entrance or typing animations", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/components/");
  const motion = page.getByTestId("v012-motion").locator(".moe-motion");
  expect(await motion.count()).toBeGreaterThan(0);
  const styles = await page
    .locator(".moe-motion, .moe-message-typing__dots i")
    .evaluateAll((elements) =>
      elements.map((element) => {
        const style = getComputedStyle(element);
        return {
          animation: style.animationName,
          opacity: style.opacity,
          transform: style.transform,
        };
      }),
    );
  for (const style of styles) {
    expect(style.animation).toBe("none");
    expect(style.opacity).toBe("1");
    expect(style.transform).toBe("none");
  }
  await expectNoOverflow(page);
});

test("forced colors removes glass blur and keeps native controls legible", async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(browserName !== "chromium", "Forced-colors emulation is validated in Chromium.");
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/components/");
  const glass = page.getByTestId("v012-glass").locator(".moe-glass").first();
  await expect(glass).toBeVisible();
  const style = await glass.evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      blur: computed.backdropFilter,
      shadow: computed.boxShadow,
      foreground: computed.color,
      background: computed.backgroundColor,
      border: computed.borderTopStyle,
    };
  });
  expect(style.blur).toBe("none");
  expect(style.shadow).toBe("none");
  expect(style.foreground).not.toBe(style.background);
  expect(style.border).not.toBe("none");
  await expectNoOverflow(page);
  await resetCapturePosition(page);
  await page.screenshot({ path: testInfo.outputPath("v012-forced-colors.png"), fullPage: true });
});

test("code regions and message actions retain native keyboard focus", async ({ page }) => {
  await page.goto("/components/");
  const code = page.getByTestId("v012-code").locator("pre").first();
  await expect(code).toHaveAttribute("tabindex", "0");
  await code.focus();
  await expect(code).toBeFocused();
  const action = page.getByTestId("v012-messages").locator("button:not(:disabled)").first();
  await expect(action).toBeVisible();
  await action.focus();
  await expect(action).toBeFocused();
  await expect(action).toHaveAttribute("aria-pressed", "false");
  await action.press("Space");
  await expect(action).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Tab");
  await expect(action).not.toBeFocused();
  await expectNoOverflow(page);
});

test("highlighted code resets legacy prose chrome", async ({ page }) => {
  await page.goto("/components/");
  const specimen = page.getByTestId("v012-code");
  await specimen.evaluate((element) => element.classList.add("moe-prose"));
  const style = await specimen
    .locator("pre")
    .first()
    .evaluate((element) => {
      const computed = getComputedStyle(element);
      return {
        background: computed.backgroundColor,
        border: computed.borderTopWidth,
        shadow: computed.boxShadow,
      };
    });
  expect(style.background).toBe("rgba(0, 0, 0, 0)");
  expect(style.border).toBe("0px");
  expect(style.shadow).toBe("none");
});
