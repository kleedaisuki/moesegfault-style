import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";

/** 支持的语法与别名；未知语法仍安全显示原文。Supported grammars and aliases; unknown grammars remain plain text. */
export type CodeLanguage =
  | "text"
  | "javascript"
  | "js"
  | "jsx"
  | "typescript"
  | "ts"
  | "tsx"
  | "css"
  | "json"
  | "bash"
  | "sh"
  | "shell"
  | "html"
  | "xml"
  | "astro";

/** 独立实例避免修改应用自己的高亮注册表。An isolated instance avoids mutating the host application's grammar registry. */
const highlighter = hljs.newInstance();
for (const [name, grammar] of Object.entries({ bash, css, javascript, json, typescript, xml })) {
  highlighter.registerLanguage(name, grammar);
}
highlighter.registerAliases("astro", { languageName: "xml" });

/** 超大输入只转义，避免在渲染阶段阻塞主线程。Large inputs are escaped without grammar work to bound render-time cost. */
const MAX_HIGHLIGHT_LENGTH = 50_000;

/** 转义代码内容，而非接受调用者提供的 HTML。Escape source text; never accept caller-provided HTML. */
function escapeCode(code: string): string {
  return code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * 将纯文本转为仅含转义文本与高亮 span 的 HTML。Convert source text into escaped text and highlighting spans only.
 * 未知语法、超大输入和解析失败保留内容；不进行昂贵且不确定的自动检测。
 * Unknown grammars, large inputs, and parser failures preserve content; no expensive, ambiguous auto-detection.
 * @example highlightCode('const answer = 42;', 'typescript')
 */
export function highlightCode(code: string, language: string = "text"): string {
  const grammar = language.toLowerCase();
  if (code.length > MAX_HIGHLIGHT_LENGTH || !highlighter.getLanguage(grammar))
    return escapeCode(code);
  try {
    return highlighter.highlight(code, { language: grammar, ignoreIllegals: true }).value;
  } catch {
    return escapeCode(code);
  }
}
