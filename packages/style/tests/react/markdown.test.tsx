import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderMarkdown, renderMath } from "../../src/markdown";
import { Markdown } from "../../src/react/Markdown";
import { Math as Formula } from "../../src/react/Math";

describe("Markdown", () => {
  it("renders GFM tables, tasks, strikethrough, links and accessible math", () => {
    const content =
      "# Notes\n\n~~old~~ **new** $E=mc^2$\n\n- [x] done\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\nhttps://example.com\n\n$$\n\\int_0^1 x^2\\,dx\n$$";
    const { container } = render(
      <Markdown content={content} className="custom" aria-label="Notes" />,
    );
    expect(container.querySelector(".moe-markdown")).toHaveClass("custom");
    expect(container.querySelector("h1")).toHaveTextContent("Notes");
    expect(container.querySelector("del")).toHaveTextContent("old");
    expect(container.querySelector("table")).not.toBeNull();
    expect(container.querySelector('input[type="checkbox"]')).toBeDisabled();
    expect(container.querySelector("a")).toHaveAttribute("href", "https://example.com");
    expect(container.querySelectorAll("math")).toHaveLength(2);
    expect(container.querySelector(".katex-display")).not.toBeNull();
  });

  it("drops raw HTML and strips unsafe link/image protocols", () => {
    const content =
      "<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[bad](javascript:alert%281%29)\n\n![bad](data:text/html;base64,PHNjcmlwdD4=)\n\n[encoded](jav&#x61;script:alert%281%29)";
    const { container } = render(<Markdown content={content} />);
    expect(container.querySelector("script,[onerror]")).toBeNull();
    expect(container.querySelector("a[href],img[src]")).toBeNull();
  });

  it("reuses escaped code highlighting without interpreting TeX inside fences", () => {
    const content =
      '```typescript\nconst html = "<img src=x onerror=alert(1)>";\n```\n\n```text\n$not_math$\n```';
    const { container } = render(<Markdown content={content} />);
    expect(container.querySelector(".hljs-keyword")).toHaveTextContent("const");
    expect(container.querySelector("img,.katex")).toBeNull();
    expect(container.querySelector("pre")).toHaveAttribute("tabindex", "0");
  });

  it("preserves oversized Markdown as escaped text without parsing", () => {
    const content = "<script>".repeat(7_000);
    const { container } = render(<Markdown content={content} />);
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector(".moe-markdown__fallback")?.textContent).toBe(content);
  });

  it("limits formula count and formula length", () => {
    const html = renderMarkdown(Array.from({ length: 140 }, () => "$x^2$").join("\n\n"));
    expect((html.match(/class="katex"/g) || []).length).toBe(128);
    expect(renderMarkdown(`$${"x".repeat(4_097)}$`)).not.toContain('class="katex"');
  });

  it("does not carry macro definitions across renders", () => {
    renderMarkdown("$\\gdef\\privateMacro{P}\\privateMacro$");
    expect(renderMarkdown("$\\privateMacro$")).toContain("privateMacro");
    expect(renderMarkdown("normal text")).toBe("<p>normal text</p>");
  });
});

describe("Math", () => {
  it("renders inline and display formulas with MathML", () => {
    const { container } = render(<Formula tex="E=mc^2" display className="custom" />);
    expect(container.querySelector(".moe-math")).toHaveAttribute("data-display", "true");
    expect(container.querySelector(".moe-math")).toHaveClass("custom");
    expect(container.querySelector("math")).not.toBeNull();
    expect(container.querySelector("annotation")).toHaveTextContent("E=mc^2");
  });

  it.each([
    String.raw`\href{javascript:alert(1)}{click}`,
    String.raw`\htmlClass{injected}{x}`,
    String.raw`\includegraphics{https://example.com/track.png}`,
  ])("disables trusted TeX extensions: %s", (tex) => {
    const { container } = render(<Formula tex={tex} />);
    expect(container.querySelector("a,img,.injected,script")).toBeNull();
  });

  it("recovers malformed TeX and bounds macro expansion without throwing", () => {
    expect(() => renderMath(String.raw`\frac{`)).not.toThrow();
    expect(() => renderMath(String.raw`\def\loop{\loop}\loop`)).not.toThrow();
    expect(renderMath(String.raw`\rule{500em}{500em}`)).not.toContain("500em;");
  });

  it("preserves deeply nested TeX without overflowing the parser stack", () => {
    for (const tex of [
      `${"{".repeat(2_000)}x${"}".repeat(2_000)}`,
      `${String.raw`\sqrt{`.repeat(570)}x${"}".repeat(570)}`,
    ]) {
      expect(() => renderMath(tex)).not.toThrow();
      expect(renderMath(tex)).toContain("moe-math__fallback");
      expect(() => renderMarkdown(`$${tex}$`)).not.toThrow();
      expect(renderMarkdown(`$${tex}$`)).not.toContain('class="katex"');
    }
  });

  it("preserves oversized TeX without creating HTML elements", () => {
    const tex = "<img>".repeat(1_000);
    const { container } = render(<Formula tex={tex} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".moe-math__fallback")?.textContent).toBe(tex);
  });
});
