import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { isSafeEditorUrl, supportsVisualEditing } from "../../src/editor/markdown";
import { RichTextEditor } from "../../src/react/RichTextEditor";

describe("RichTextEditor", () => {
  it("preserves source byte-for-byte through initialization and mode changes", async () => {
    const original = "# Notes\n\n__warm__   words\n\n";
    const changed = vi.fn();
    render(
      <RichTextEditor
        label="Notes"
        locale="en"
        defaultValue={original}
        name="body"
        onChange={changed}
      />,
    );
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Notes" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Source", exact: true }));
    expect(screen.getByRole("textbox", { name: "Notes Markdown" })).toHaveValue(original);
    fireEvent.click(screen.getByRole("button", { name: "Preview", exact: true }));
    expect(screen.getByLabelText("Document preview").querySelector("strong")).toHaveTextContent(
      "warm",
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit", exact: true }));
    expect(changed).not.toHaveBeenCalled();
    expect(document.querySelector('input[name="body"]')).toHaveValue(original);
  });

  it("maps source changes into Markdown and accepts controlled replacements", () => {
    const changed = vi.fn();
    const { rerender } = render(
      <RichTextEditor
        label="Notes"
        locale="en"
        value="first"
        defaultMode="source"
        onChange={changed}
      />,
    );
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "**next**" } });
    expect(changed).toHaveBeenLastCalledWith("**next**");
    rerender(
      <RichTextEditor
        label="Notes"
        locale="en"
        value="external"
        defaultMode="source"
        onChange={changed}
      />,
    );
    expect(screen.getByRole("textbox")).toHaveValue("external");
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it.each([
    "$E=mc^2$",
    "<script>alert(1)</script>",
    "![art](https://example.com/a.png)",
    "word[^1]\n\n[^1]: footnote",
    "[word][ref]\n\n[ref]: https://example.com",
    "| A |\n| :- |\n| B |",
    "```js title\nlet x;\n```",
  ])("protects unsupported source: %s", (source) => {
    const changed = vi.fn();
    render(<RichTextEditor locale="en" label="Notes" defaultValue={source} onChange={changed} />);
    expect(screen.getByRole("textbox", { name: "Notes Markdown" })).toHaveValue(source);
    expect(screen.getByRole("button", { name: "Edit", exact: true })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Source editing preserves it");
    fireEvent.click(screen.getByRole("button", { name: "Preview", exact: true }));
    expect(document.querySelector("script")).toBeNull();
    expect(changed).not.toHaveBeenCalled();
  });

  it("restores visual mode once unsupported syntax is removed", async () => {
    render(<RichTextEditor locale="en" label="Notes" defaultValue="$x$" />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Plain notes" } });
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Notes", exact: true })).toHaveTextContent(
        "Plain notes",
      ),
    );
  });

  it("locks source input and excludes disabled form values", () => {
    const changed = vi.fn();
    const { rerender, container } = render(
      <form>
        <RichTextEditor
          locale="en"
          defaultMode="source"
          defaultValue="locked"
          readOnly
          name="body"
          onChange={changed}
        />
      </form>,
    );
    expect(screen.getByRole("textbox")).toHaveAttribute("readonly");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "attack" } });
    expect(changed).not.toHaveBeenCalled();
    expect(new FormData(container.querySelector("form") as HTMLFormElement).get("body")).toBe(
      "locked",
    );
    rerender(
      <form>
        <RichTextEditor
          locale="en"
          defaultMode="source"
          defaultValue="locked"
          disabled
          name="body"
          onChange={changed}
        />
      </form>,
    );
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(new FormData(container.querySelector("form") as HTMLFormElement).has("body")).toBe(
      false,
    );
  });

  it("renders on the server without creating an editor DOM", () => {
    const html = renderToString(
      <RichTextEditor label="Server notes" defaultValue="**text**" name="body" />,
    );
    expect(html).toContain("Server notes");
    expect(html).toContain('value="**text**"');
    expect(html).not.toContain('contenteditable="true"');
    expect(html).toContain("<strong>text</strong>");
  });

  it("restores controlled source when the parent rejects a visual edit", async () => {
    const changed = vi.fn();
    render(
      <RichTextEditor label="Notes" locale="en" value="original" name="body" onChange={changed} />,
    );
    const canvas = await screen.findByRole("textbox", { name: "Notes", exact: true });
    fireEvent.paste(canvas, { clipboardData: { getData: () => "new" } });
    expect(changed).toHaveBeenCalled();
    await waitFor(() => expect(canvas).toHaveTextContent(/^original$/));
    expect(document.querySelector('input[name="body"]')).toHaveValue("original");
  });

  it("defers external replacement until composition ends", async () => {
    const { rerender } = render(<RichTextEditor label="Notes" value="original" />);
    const canvas = await screen.findByRole("textbox", { name: "Notes", exact: true });
    fireEvent.compositionStart(canvas);
    rerender(<RichTextEditor label="Notes" value="replacement" />);
    expect(canvas).toHaveTextContent("original");
    fireEvent.compositionEnd(canvas);
    await waitFor(() => expect(canvas).toHaveTextContent("replacement"));
  });

  it("restores repeated identical edits rejected by a controlled parent", async () => {
    const changed = vi.fn();
    render(<RichTextEditor label="Notes" value="" name="body" onChange={changed} />);
    const canvas = await screen.findByRole("textbox", { name: "Notes", exact: true });
    for (let attempt = 0; attempt < 2; attempt += 1) {
      fireEvent.paste(canvas, { clipboardData: { getData: () => "same" } });
      await waitFor(() => expect(canvas.textContent).toBe(""));
      expect(document.querySelector('input[name="body"]')).toHaveValue("");
    }
    expect(changed).toHaveBeenCalledTimes(2);
  });
});

describe("editor Markdown boundaries", () => {
  it("keeps deeply nested documents in source mode without changing their text", () => {
    const source = `${"> ".repeat(80)}deep thought`;
    expect(supportsVisualEditing(source)).toBe(false);
    render(<RichTextEditor label="Notes" locale="en" defaultValue={source} />);
    expect(screen.getByRole("textbox", { name: "Notes Markdown" })).toHaveValue(source);
    expect(screen.getByRole("button", { name: "Edit", exact: true })).toBeDisabled();
  });
  it("bounds node count independently of source length", () => {
    expect(supportsVisualEditing("x\n\n".repeat(2_500))).toBe(false);
    expect(supportsVisualEditing("x\n\n".repeat(100))).toBe(true);
  });
  it("accepts basic and GFM structures", () => {
    expect(
      supportsVisualEditing(
        "###### Title\n\n**bold** *italic* ~~old~~ `code`\n\n> quote\n\n- [x] done\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n```ts\nconst x = 1;\n```",
      ),
    ).toBe(true);
  });
  it.each([
    "javascript:alert(1)",
    "data:text/html,x",
    "vbscript:alert(1)",
    "java\nscript:x",
    "https:\\evil.com",
  ])("rejects unsafe links %s", (url) => {
    expect(isSafeEditorUrl(url)).toBe(false);
    if (!url.includes("\n")) expect(supportsVisualEditing(`[link](${url})`)).toBe(false);
  });
  it.each(["https://example.com", "mailto:hello@example.com", "/notes", "#anchor", "../notes"])(
    "accepts portable links %s",
    (url) => {
      expect(isSafeEditorUrl(url)).toBe(true);
    },
  );
});
