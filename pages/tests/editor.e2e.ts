import { expect, type Locator, type Page, test } from "@playwright/test";

/** 等待懒加载岛就绪，使用公开语义定位。Wait for the lazy island using public semantics. */
async function openEditor(page: Page): Promise<Locator> {
  await page.goto("/en/components/");
  const demo = page.getByTestId("editor-demo");
  await demo.scrollIntoViewIfNeeded();
  await expect(demo.getByRole("button", { name: "Bold", exact: true })).toBeEnabled();
  return demo;
}

/** 真正浏览器选区而非直接操作编辑器内部状态。Use browser selection, not editor internals. */
async function selectAll(canvas: Locator): Promise<void> {
  await canvas.focus();
  await canvas.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
  });
}

test("visual selection, formatting, controlled echoes, undo and redo map to Markdown", async ({
  page,
}) => {
  const demo = await openEditor(page);
  const canvas = demo.locator('[contenteditable="true"]');
  const output = demo.getByTestId("editor-markdown-output");
  await selectAll(canvas);
  await canvas.press("Backspace");
  await page.keyboard.insertText("Warm little ideas");
  await expect(output).toHaveValue("Warm little ideas");
  await selectAll(canvas);
  await demo.getByRole("button", { name: "Bold", exact: true }).click();
  await expect(output).toHaveValue("**Warm little ideas**");
  await expect(canvas.locator("strong")).toHaveText("Warm little ideas");
  await demo.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(output).toHaveValue("Warm little ideas");
  await demo.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(output).toHaveValue("**Warm little ideas**");
  await canvas.press("ArrowRight");
  await canvas.pressSequentially(" grow");
  await expect(output).toHaveValue("**Warm little ideas grow**");
});

test("source and visual switching preserves untouched Markdown byte for byte", async ({ page }) => {
  const demo = await openEditor(page);
  const editor = demo.locator(".moe-editor");
  const source = "## Handwritten\n\n__warm__ and *quiet*\n\n- first\n- second\n";
  await editor.getByRole("button", { name: "Source", exact: true }).click();
  await editor.locator("textarea").fill(source);
  for (const mode of ["Edit", "Preview", "Source"]) {
    await editor.getByRole("button", { name: mode, exact: true }).click();
    await expect(demo.getByTestId("editor-markdown-output")).toHaveValue(source);
  }
  await expect(editor.locator("textarea")).toHaveValue(source);
});

test("portable block tools serialize headings, tasks and tables", async ({ page }) => {
  const demo = await openEditor(page);
  const editor = demo.locator(".moe-editor");
  const output = demo.getByTestId("editor-markdown-output");
  await editor.getByRole("button", { name: "Source", exact: true }).click();
  await editor.locator("textarea").fill("A small task");
  await editor.getByRole("button", { name: "Edit", exact: true }).click();
  const canvas = editor.locator('[contenteditable="true"]');
  await selectAll(canvas);
  await editor.getByRole("button", { name: "Heading 2", exact: true }).click();
  await expect(output).toHaveValue(/^## A small task\s*$/);
  await editor.getByRole("button", { name: "Heading 2", exact: true }).click();
  await editor.getByRole("button", { name: "Task list", exact: true }).click();
  await expect(output).toHaveValue(/^- \[ \] A small task\s*$/);
  await editor.getByRole("checkbox").check();
  await expect(output).toHaveValue(/^- \[x\] A small task\s*$/);
  await editor.getByRole("button", { name: "Source", exact: true }).click();
  await editor.locator("textarea").fill("");
  await editor.getByRole("button", { name: "Edit", exact: true }).click();
  await canvas.focus();
  await editor.getByRole("button", { name: "Insert table", exact: true }).click();
  await expect(canvas.locator("table")).toBeVisible();
  await expect(output).toHaveValue(/\|.*\|[\s\S]*\|\s*-+/);
  const firstCell = canvas.locator("th, td").first();
  await firstCell.click();
  await page.keyboard.insertText("Cell");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Shift+Enter");
  await expect(firstCell.locator("p")).toHaveCount(1);
  await expect(firstCell.locator("br:not(.ProseMirror-trailingBreak)")).toHaveCount(0);
  await page.keyboard.press("Tab");
  await page.keyboard.insertText("Next");
  await expect(canvas.locator("th, td").nth(1)).toHaveText("Next");
});

test("visual links reject unsafe protocols and HTML paste becomes literal text", async ({
  page,
}) => {
  const demo = await openEditor(page);
  const editor = demo.locator(".moe-editor");
  const canvas = editor.locator('[contenteditable="true"]');
  await selectAll(canvas);
  await canvas.press("Backspace");
  await page.keyboard.insertText("Reference");
  await selectAll(canvas);
  await editor.getByRole("button", { name: "Link", exact: true }).click();
  await editor.getByRole("textbox", { name: "Link URL", exact: true }).fill("javascript:alert(1)");
  await editor.getByRole("button", { name: "Apply", exact: true }).focus();
  await editor.getByRole("button", { name: "Apply", exact: true }).press("Space");
  await expect(editor.getByRole("alert")).toBeVisible();
  await editor
    .getByRole("textbox", { name: "Link URL", exact: true })
    .fill("https://example.com/notes");
  await editor.getByRole("button", { name: "Apply", exact: true }).focus();
  await editor.getByRole("button", { name: "Apply", exact: true }).press("Space");
  await expect(demo.getByTestId("editor-markdown-output")).toHaveValue(
    "[Reference](https://example.com/notes)",
  );
  await selectAll(canvas);
  await canvas.evaluate((element) => {
    const transfer = new DataTransfer();
    transfer.setData("text/html", '<img src=x onerror="window.__pasteXss=1"><b>safe text</b>');
    transfer.setData("text/plain", "safe text");
    element.dispatchEvent(
      new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: transfer }),
    );
  });
  await expect(canvas).toHaveText("safe text");
  expect(await canvas.locator("img, strong, script").count()).toBe(0);
  expect(await page.evaluate(() => "__pasteXss" in window)).toBe(false);
});

test("TeX and unsafe HTML stay intact in source and cannot execute in preview", async ({
  page,
}) => {
  const demo = await openEditor(page);
  const editor = demo.locator(".moe-editor");
  const output = demo.getByTestId("editor-markdown-output");
  await demo.getByRole("button", { name: "Try a formula", exact: true }).click();
  await expect(editor.locator("textarea")).toBeVisible();
  await expect(editor.getByRole("button", { name: "Edit", exact: true })).toBeDisabled();
  const original = await output.inputValue();
  await editor.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(editor.locator(".katex").first()).toBeVisible();
  await expect(output).toHaveValue(original);
  await editor.getByRole("button", { name: "Source", exact: true }).click();
  const unsafe =
    '<img src=x onerror="window.__editorXss=1">\n\n<script>window.__editorXss=1</script>\n\n[trap](javascript:alert(1))\n\nNote[^a]\n\n[^a]: retained';
  await editor.locator("textarea").fill(unsafe);
  await editor.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(output).toHaveValue(unsafe);
  expect(await editor.locator("script, iframe, img[onerror], a[href^='javascript:']").count()).toBe(
    0,
  );
  expect(await page.evaluate(() => "__editorXss" in window)).toBe(false);
  await editor.getByRole("button", { name: "Source", exact: true }).click();
  await expect(editor.locator("textarea")).toHaveValue(unsafe);
});

test("read-only and disabled states block edits without losing the draft", async ({ page }) => {
  const demo = await openEditor(page);
  const editor = demo.locator(".moe-editor");
  const output = demo.getByTestId("editor-markdown-output");
  const original = await output.inputValue();
  await demo.getByRole("checkbox", { name: "Read only", exact: true }).check();
  await expect(editor.getByRole("textbox")).toHaveAttribute("contenteditable", "false");
  await expect(editor.getByRole("button", { name: "Bold", exact: true })).toBeDisabled();
  await editor.getByRole("button", { name: "Source", exact: true }).click();
  await expect(editor.locator("textarea")).toHaveAttribute("readonly", "");
  await editor.locator("textarea").press("A");
  await expect(output).toHaveValue(original);
  await demo.getByRole("checkbox", { name: "Read only", exact: true }).uncheck();
  await demo.getByRole("checkbox", { name: "Disabled", exact: true }).check();
  await expect(editor.locator("textarea")).toBeDisabled();
  await expect(editor.getByRole("button", { name: "Preview", exact: true })).toBeDisabled();
  await expect(output).toHaveValue(original);
  await demo.getByRole("checkbox", { name: "Disabled", exact: true }).uncheck();
  await expect(editor.locator("textarea")).toBeEditable();
});

test("composition event regression retains Chinese text through controlled echoes", async ({
  page,
}) => {
  const demo = await openEditor(page);
  const canvas = demo.locator('[contenteditable="true"]');
  await selectAll(canvas);
  await canvas.press("Backspace");
  await canvas.focus();
  // 合成事件只覆盖生命周期回归，不替代系统输入法人工验收。Synthetic events are not a real OS IME test.
  await canvas.dispatchEvent("compositionstart", { data: "" });
  await page.keyboard.insertText("毛玻璃里的灵感");
  await canvas.dispatchEvent("compositionupdate", { data: "毛玻璃里的灵感" });
  await canvas.dispatchEvent("compositionend", { data: "毛玻璃里的灵感" });
  await expect(demo.getByTestId("editor-markdown-output")).toHaveValue("毛玻璃里的灵感");
  await page.keyboard.insertText("，继续写。");
  await expect(demo.getByTestId("editor-markdown-output")).toHaveValue("毛玻璃里的灵感，继续写。");
});

test("editor is keyboard reachable and contained in both themes", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const demo = await openEditor(page);
  const editor = demo.locator(".moe-editor");
  const colors: string[] = [];
  for (const theme of ["light", "dark"] as const) {
    await page
      .locator("html")
      .evaluate((element, value) => element.setAttribute("data-moe-theme", value), theme);
    await expect(editor).toBeVisible();
    colors.push(await editor.evaluate((element) => getComputedStyle(element).color));
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);
    const source = editor.getByRole("button", { name: "Source", exact: true });
    await source.focus();
    await source.press("Space");
    await expect(source).toHaveAttribute("aria-pressed", "true");
    await editor.getByRole("button", { name: "Edit", exact: true }).click();
    await demo.screenshot({
      path: testInfo.outputPath(`editor-${theme}.png`),
      style: ".site-header, .skip-link { visibility: hidden !important; }",
    });
  }
  expect(colors[0]).not.toBe(colors[1]);
  expect(errors).toEqual([]);
});
