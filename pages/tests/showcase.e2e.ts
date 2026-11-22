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
  return page.getByTestId("specimen-code").evaluate((root) => {
    const surface = root.querySelector(".moe-code-block");
    const keyword = root.querySelector(".hljs-keyword");
    if (!surface || !keyword) throw new Error("Highlighted code specimen is missing");
    return {
      surface: getComputedStyle(surface).backgroundColor,
      keyword: getComputedStyle(keyword).color,
    };
  });
}

test("specimens render in both themes without page overflow", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/components/");
  for (const specimen of specimens) {
    await expect(page.getByTestId(`specimen-${specimen}`)).toBeVisible();
  }
  await expect(page.getByTestId("specimen-glass").locator(".moe-glass").first()).toBeVisible();
  await expect(page.getByTestId("specimen-icons").locator("svg").first()).toBeVisible();
  await expect(
    page.getByTestId("specimen-messages").locator(".moe-message-bubble").first(),
  ).toBeVisible();
  const light = await codePalette(page);
  const font = await page
    .getByTestId("specimen-code")
    .locator("code")
    .first()
    .evaluate((element) => getComputedStyle(element).fontFamily);
  expect(font).toMatch(/mono/i);
  await expectNoOverflow(page);
  await resetCapturePosition(page);
  await page.screenshot({
    path: testInfo.outputPath("showcase-light.png"),
    fullPage: true,
    // Mobile pages at 3x exceed the 32767px bitmap limit.
    scale: "css",
  });
  for (const specimen of ["glass", "messages", "code"]) {
    await page.getByTestId(`specimen-${specimen}`).screenshot({
      path: testInfo.outputPath(`specimen-${specimen}-light.png`),
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
  await page.screenshot({
    path: testInfo.outputPath("showcase-dark.png"),
    fullPage: true,
    // Mobile pages at 3x exceed the 32767px bitmap limit.
    scale: "css",
  });
  expect(errors).toEqual([]);
});

test("reduced motion keeps new content visible without entrance or typing animations", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/components/");
  const motion = page.getByTestId("specimen-motion").locator(".moe-motion");
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
  const glass = page.getByTestId("specimen-glass").locator(".moe-glass").first();
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
  await page.screenshot({
    path: testInfo.outputPath("showcase-forced-colors.png"),
    fullPage: true,
  });
});

test("code regions and message actions retain native keyboard focus", async ({ page }) => {
  await page.goto("/components/");
  const code = page.getByTestId("specimen-code").locator("pre").first();
  await expect(code).toHaveAttribute("tabindex", "0");
  await code.focus();
  await expect(code).toBeFocused();
  const action = page.getByTestId("specimen-messages").locator("button:not(:disabled)").first();
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
  const specimen = page.getByTestId("specimen-code");
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

test("form wiring, tabs, and dialog work in a real browser", async ({ page }) => {
  await page.goto("/en/components/");
  const host = page.getByRole("textbox", { name: "Host" });
  await expect(host).toHaveAttribute("aria-invalid", "true");
  await expect(host).toHaveAccessibleDescription("This host does not resolve.");

  const first = page.getByRole("tab", { name: "Overview" });
  await first.focus();
  await first.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Tokens" })).toBeFocused();
  await expect(page.getByRole("tabpanel", { name: "Tokens" })).toBeVisible();

  const opener = page.getByRole("button", { name: "Open dialog" });
  await opener.focus();
  await opener.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Pin to v0.2.0?" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test("text and controls keep WCAG AA contrast in both themes", async ({ page }) => {
  await page.goto("/en/components/");
  for (const theme of ["light", "dark"] as const) {
    await page
      .locator("html")
      .evaluate((element, value) => element.setAttribute("data-moe-theme", value), theme);
    const ratios = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Canvas is unavailable");
      const root = getComputedStyle(document.documentElement);
      // 把令牌依次绘制到页面底色上，得到真实合成结果。Paint tokens over the page color to get composited results.
      const paint = (...layers: string[]): number[] => {
        context.clearRect(0, 0, 1, 1);
        for (const layer of layers) {
          context.fillStyle = root.getPropertyValue(`--moe-${layer}`).trim();
          context.fillRect(0, 0, 1, 1);
        }
        return [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)];
      };
      const luminance = (rgb: number[]): number => {
        const [r = 0, g = 0, b = 0] = rgb.map((byte) => {
          const channel = byte / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const contrast = (front: number[], back: number[]): number => {
        const [high = 0, low = 0] = [luminance(front), luminance(back)].sort((a, b) => b - a);
        return (high + 0.05) / (low + 0.05);
      };
      const surfaces = ["background", "surface-strong", "surface-muted"];
      const pairs: [string, number][] = surfaces.flatMap((surface) =>
        ["text", "text-soft", "heading", "accent-strong"].map((ink): [string, number] => [
          `${ink} on ${surface}`,
          contrast(paint("background", surface, ink), paint("background", surface)),
        ]),
      );
      for (const role of ["action", "highlight", "brand"])
        pairs.push([`on-${role} on ${role}`, contrast(paint(`on-${role}`), paint(role))]);
      for (const ink of ["color-klee-100", "color-honey-200"])
        pairs.push([`${ink} on brand`, contrast(paint(ink), paint("brand"))]);
      return pairs;
    });
    for (const [pair, ratio] of ratios)
      expect.soft(ratio, `${theme}: ${pair}`).toBeGreaterThanOrEqual(4.5);
  }
});

test("legacy modifier classes and data variants paint identically", async ({ page }) => {
  await page.goto("/components/");
  const painted = await page.evaluate(() =>
    ["primary", "secondary", "ghost", "danger"].map((variant) => {
      const modern = document.createElement("button");
      modern.className = "moe-button";
      modern.dataset.variant = variant;
      const legacy = document.createElement("button");
      legacy.className = `moe-button moe-button--${variant}`;
      document.body.append(modern, legacy);
      const read = (element: Element) => {
        const { backgroundColor, color, borderTopColor } = getComputedStyle(element);
        return { backgroundColor, color, borderTopColor };
      };
      return [read(modern), read(legacy)];
    }),
  );
  for (const [modern, legacy] of painted) expect(legacy).toEqual(modern);
});

test("the home clover detonates from the keyboard and recovers", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/en/");
  const detonator = page.locator(".detonator");
  await expect(detonator).toHaveAttribute("data-ready", "true");
  const canvas = detonator.locator("canvas");
  const pixels = () =>
    canvas.evaluate((element) =>
      element instanceof HTMLCanvasElement ? element.toDataURL() : undefined,
    );
  await expect.poll(async () => (await pixels())?.length ?? 0).toBeGreaterThan(2000);
  const resting = await pixels();
  await detonator.getByRole("button", { name: "Detonate" }).focus();
  await page.keyboard.press("Enter");
  await expect(detonator.locator("output")).toHaveText(/^SIGSEGV @ 0x[\da-f]{4}$/);
  await expect.poll(pixels).not.toBe(resting);
  await expect(detonator.locator("output")).toHaveText(/recovered in \d+ ms/, { timeout: 10_000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.keyboard.press("Enter");
  await expect(detonator.locator("output")).toHaveText(/recovered in 0 ms/);
  expect(errors).toEqual([]);
});

test("a held press charges the clover and a press elsewhere does not", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/en/");
  const detonator = page.locator(".detonator");
  await expect(detonator).toHaveAttribute("data-ready", "true");
  const output = detonator.locator("output");
  await page.locator("h1").click();
  await expect(output).toBeEmpty();
  await detonator.locator(".detonator__field").scrollIntoViewIfNeeded();
  await detonator.locator(".detonator__field").hover();
  await page.mouse.down();
  await page.waitForTimeout(300);
  await expect(output).toBeEmpty();
  await page.mouse.up();
  await expect(output).toHaveText(/SIGSEGV|recovered/);
});

test("one indicator follows the selected tab and segment", async ({ page }) => {
  await page.goto("/en/components/");
  const edges = (list: string, selected: string) =>
    page.evaluate(
      ([listSelector = "", selectedSelector = ""]) => {
        const element = document.querySelector(listSelector);
        const target = document.querySelector(selectedSelector);
        if (!element || !target) return undefined;
        const pseudo = element.matches(".moe-tabs__list") ? "::after" : "::before";
        const width = Number.parseFloat(getComputedStyle(element, pseudo).width);
        return Math.abs(width - target.getBoundingClientRect().width);
      },
      [list, selected],
    );
  test.skip(
    !(await page.evaluate(() => CSS.supports("anchor-scope: all"))),
    "Falls back to per-item indicators.",
  );
  const tabs = page.locator(".moe-tabs").first();
  await tabs.getByRole("tab").nth(1).click();
  await expect
    .poll(() => edges(".moe-tabs__list", ".moe-tabs__tab[aria-selected='true']"))
    .toBeLessThan(1.5);
  await page.locator(".moe-segmented__option").nth(1).click();
  await expect
    .poll(() => edges(".moe-segmented", ".moe-segmented__option:has(:checked)"))
    .toBeLessThan(1.5);
});

test("reduced motion zeroes every motion pair and shortens nothing else", async ({ page }) => {
  const pairs = () =>
    page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return ["--moe-spring", "--moe-bounce", "--moe-exit", "--moe-press"].map((name) =>
        style.getPropertyValue(name).trim(),
      );
    });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en/components/");
  expect(await pairs()).toEqual(["0s linear", "0s linear", "0s linear", "1"]);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  expect((await pairs()).every((value) => !value.startsWith("0s"))).toBe(true);
});

test("theme reveal applies the theme and cleans up after itself", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference", colorScheme: "light" });
  await page.goto("/en/");
  const toggle = page.getByRole("button", { name: "Switch to dark theme" });
  await expect(toggle).toHaveAttribute("data-ready", "true");
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-moe-theme", "dark");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme-shift");
  await expect(page.getByRole("button", { name: "Switch to light theme" })).toBeVisible();
});

test("palette bytes copy their color and announce it", async ({ page }) => {
  await page.goto("/en/foundations/");
  await page.evaluate(() => {
    const copied: string[] = [];
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: async (text: string) => void copied.push(text) },
    });
    Object.assign(window, { copied });
  });
  const cell = page.getByRole("button", { name: /klee-600/ });
  await cell.click();
  await expect(cell).toHaveAttribute("data-copied", "");
  await expect(page.locator("[data-copy-status]")).toHaveText("Copied");
  expect(await page.evaluate(() => Reflect.get(window, "copied"))).toEqual(["#bf2029"]);
  await expect(cell).not.toHaveAttribute("data-copied");
});
