import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { highlightCode } from "../../src/code";
import { CodeBlock } from "../../src/react/CodeBlock";

afterEach(() => vi.unstubAllGlobals());

describe("CodeBlock", () => {
  it("highlights explicit grammars and preserves source text", () => {
    const code = 'const greeting: string = "hello";';
    const { container } = render(
      <CodeBlock code={code} language="typescript" filename="hello.ts" />,
    );
    expect(container.querySelector(".hljs-keyword")).toHaveTextContent("const");
    expect(container.querySelector("code")?.textContent).toBe(code);
    expect(screen.getByRole("region", { name: /hello.ts/ })).toHaveAttribute("tabindex", "0");
  });

  it.each(["text", "unknown", "html", "javascript"])(
    "escapes hostile source with %s",
    (language) => {
      const code = '<img src=x onerror="alert(1)"><script>alert(1)</script>';
      const { container } = render(<CodeBlock code={code} language={language} />);
      expect(container.querySelector("code")?.textContent).toBe(code);
      expect(container.querySelector("img,script")).toBeNull();
    },
  );

  it("bounds grammar work for large inputs and does not auto-detect", () => {
    const code = "const value = '<x>';".repeat(3000);
    expect(highlightCode(code, "javascript")).not.toContain("hljs-");
    expect(highlightCode("const value = 1;")).toBe("const value = 1;");
    expect(highlightCode("<unknown>", "unknown")).toBe("&lt;unknown&gt;");
  });

  it("copies original source and announces localized success", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(<CodeBlock code="const n = 1;" copyLabel="Copy" copiedLabel="Copied" label="Example" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy: Example" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Copied"));
    expect(writeText).toHaveBeenCalledWith("const n = 1;");
  });

  it("announces clipboard rejection without claiming success", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    render(<CodeBlock code="secret" copyErrorLabel="Copy denied" />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Copy denied"));
  });

  it("supports static rendering, wrap, and native figure attributes", () => {
    const { container } = render(
      <CodeBlock code="x" copyable={false} wrap className="custom" data-testid="code" />,
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByTestId("code")).toHaveClass("moe-code-block", "custom");
    expect(container.querySelector("figure")).toHaveAttribute("data-wrap", "true");
  });
});
