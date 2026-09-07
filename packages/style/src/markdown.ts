import type { Element, Root } from "hast";
import katex from "katex";
import rehypeKatex from "rehype-katex";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { highlightCode } from "./code.js";

/** 保守的同步渲染预算；超限保留纯文本。Conservative synchronous budgets; excess content remains plain text. */
const MAX_SOURCE_LENGTH = 50_000;
const MAX_MATH_LENGTH = 4_096;
const MAX_MATH_COUNT = 128;
/** 括号深度保护 KaTeX 的递归解析器。Brace depth protects KaTeX's recursive parser. */
const MAX_MATH_DEPTH = 64;
/** 禁用可信扩展、限制尺寸与宏展开；每次渲染使用新宏表。Disable trusted extensions and bound layout/expansion; fresh macros per render. */
const mathOptions = {
  trust: false,
  strict: "ignore" as const,
  maxSize: 20,
  maxExpand: 200,
  throwOnError: false,
};

/** 转义括号不参与结构深度，超限只显示源码。Escaped braces do not affect depth; excessive inputs remain source text. */
function withinMathBudget(source: string): boolean {
  if (source.length > MAX_MATH_LENGTH) return false;
  let depth = 0;
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === "\\") {
      index += 1;
      continue;
    }
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth = Math.max(0, depth - 1);
    if (depth > MAX_MATH_DEPTH) return false;
  }
  return true;
}

/** 只访问元素，避免递归遍历深度限制。Visit elements iteratively to avoid recursive traversal limits. */
function elements(tree: Root): Element[] {
  const pending: (Root | Element)[] = [tree];
  const result: Element[] = [];
  while (pending.length) {
    const node = pending.pop();
    if (!node) continue;
    for (const child of node.children) {
      if (child.type !== "element") continue;
      result.push(child);
      pending.push(child);
    }
  }
  return result;
}

/** 数学解析前设预算；超限公式仍可读但不交给 KaTeX。Budget math before parsing; excess formulas remain readable without KaTeX. */
function limitMath() {
  return (tree: Root): void => {
    let count = 0;
    for (const node of elements(tree)) {
      const classes = node.properties.className;
      if (node.tagName !== "code" || !Array.isArray(classes) || !classes.includes("language-math"))
        continue;
      const source = node.children
        .map((child) => (child.type === "text" ? child.value : ""))
        .join("");
      count += 1;
      if (!withinMathBudget(source) || count > MAX_MATH_COUNT) node.properties.className = [];
    }
  };
}

/** 清洗后仅插入内部转义高亮器的 HTML，绝不保留用户 HTML。After sanitization insert only internally escaped highlighter HTML, never user HTML. */
function highlightFences() {
  return (tree: Root): void => {
    for (const pre of elements(tree)) {
      if (
        Array.isArray(pre.properties.className) &&
        pre.properties.className.includes("katex-display")
      ) {
        pre.properties.tabIndex = 0;
        pre.properties.role = "region";
        pre.properties.ariaLabel = "数学公式 / Mathematical expression";
      }
      if (pre.tagName !== "pre") continue;
      const code = pre.children[0];
      if (code?.type !== "element" || code.tagName !== "code") continue;
      const source = code.children
        .map((child) => (child.type === "text" ? child.value : ""))
        .join("");
      const classes = code.properties.className;
      const language = Array.isArray(classes)
        ? String(classes.find((value) => String(value).startsWith("language-")) || "").slice(9)
        : "text";
      pre.properties.className = ["moe-code-block__pre"];
      pre.properties.tabIndex = 0;
      pre.properties.role = "region";
      pre.properties.ariaLabel = language || "code";
      code.properties.className = ["moe-code-block__code"];
      code.children = [{ type: "raw", value: highlightCode(source, language) }];
      const inner: Element = { ...pre };
      pre.tagName = "div";
      pre.properties = { className: ["moe-code-block"] };
      pre.children = [inner];
    }
  };
}

/** 只允许数学标记通过清洗，再运行受约束的可信渲染器。Allow only math markers through sanitization, then run constrained trusted renderers. */
function createProcessor() {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype)
    .use(rehypeSanitize, {
      ...defaultSchema,
      attributes: {
        ...defaultSchema.attributes,
        code: [["className", /^language-./, "math-inline", "math-display"]],
      },
    })
    .use(limitMath)
    .use(rehypeKatex, mathOptions)
    .use(highlightFences)
    .use(rehypeStringify, { allowDangerousHtml: true });
}

/** 按需初始化，不为未使用 Markdown 的入口构造管线。Initialize lazily; unused Markdown imports do not construct the pipeline. */
let processor: ReturnType<typeof createProcessor> | undefined;

/**
 * 安全的 GFM + TeX；原始 HTML 被丢弃，危险 URL 被清洗，不执行脚本。
 * Safe GFM + TeX: raw HTML is dropped, unsafe URLs sanitized, and scripts never executed.
 * 超过 50,000 UTF-16 单元时完整显示转义原文。Beyond 50,000 UTF-16 units, preserve the entire escaped source.
 * @example renderMarkdown("**Hello** $E=mc^2$")
 */
export function renderMarkdown(content: string): string {
  if (content.length > MAX_SOURCE_LENGTH)
    return `<pre class="moe-markdown__fallback">${highlightCode(content)}</pre>`;
  processor ??= createProcessor();
  try {
    return String(processor.processSync(content));
  } catch {
    return `<pre class="moe-markdown__fallback">${highlightCode(content)}</pre>`;
  }
}

/**
 * 渲染独立 TeX，不接受任意 KaTeX 选项以维持安全边界。Render standalone TeX without arbitrary options that could bypass safety.
 * 非法/超长公式保留可读源文本。Invalid/oversized formulas preserve readable source text.
 * @example renderMath(String.raw`\int_0^1 x^2\,dx`, true)
 */
export function renderMath(tex: string, display = false): string {
  if (!withinMathBudget(tex))
    return `<code class="moe-math__fallback">${highlightCode(tex)}</code>`;
  try {
    return katex
      .renderToString(tex, {
        ...mathOptions,
        displayMode: display,
        output: "htmlAndMathml",
        macros: {},
      })
      .replace(
        '<span class="katex-display">',
        '<span class="katex-display" tabindex="0" role="region" aria-label="数学公式 / Mathematical expression">',
      );
  } catch {
    return `<code class="moe-math__fallback">${highlightCode(tex)}</code>`;
  }
}
