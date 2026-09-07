import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import { unified } from "unified";

/** 视觉编辑仅接收可可靠往返的子集。Visual editing accepts only the reliably round-trippable subset. */
const supported = new Set([
  "root",
  "paragraph",
  "text",
  "heading",
  "emphasis",
  "strong",
  "delete",
  "inlineCode",
  "code",
  "blockquote",
  "list",
  "listItem",
  "thematicBreak",
  "break",
  "link",
  "table",
  "tableRow",
  "tableCell",
]);
/** 复用文稿解析规则；源码与预览支持更广的语法。Reuse prose parsing; source and preview support richer syntax. */
const parser = unified().use(remarkParse).use(remarkGfm).use(remarkMath);
/** 限制下游编辑器递归深度与节点工作量；超限原文留在源码模式。Bound downstream recursion and node work; excess source stays editable as text. */
const MAX_VISUAL_DEPTH = 64;
/** 避免大量短节点造成编辑器挂载阻塞。Prevent editor mount stalls from many short nodes. */
const MAX_VISUAL_NODES = 5_000;

/** 只允许网页、邮件、锚点和相对链接。Allow web, mail, anchor, and relative links only. */
export function isSafeEditorUrl(url: string): boolean {
  const normalized = url.trim();
  return (
    Boolean(normalized) &&
    !Array.from(normalized).some(
      (character) =>
        character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127 || character === "\\",
    ) &&
    (!/^[a-z][a-z\d+.-]*:/i.test(normalized) || /^(https?:|mailto:)/i.test(normalized))
  );
}

/** 不支持的节点留在源码模式，绝不静默丢弃。Unsupported nodes remain in source mode, never silently dropped. */
export function supportsVisualEditing(source: string): boolean {
  if (source.length > 50_000) return false;
  try {
    const pending: Array<{
      node: {
        type: string;
        children?: unknown[];
        url?: unknown;
        meta?: unknown;
        align?: unknown;
      };
      depth: number;
    }> = [{ node: parser.parse(source), depth: 0 }];
    let count = 0;
    while (pending.length) {
      const entry = pending.pop();
      if (!entry) return false;
      const { node, depth } = entry;
      count += 1;
      if (depth > MAX_VISUAL_DEPTH || count > MAX_VISUAL_NODES) return false;
      if (!supported.has(node.type)) return false;
      if ("url" in node && !isSafeEditorUrl(String(node.url))) return false;
      if ("meta" in node && node.meta) return false;
      if ("align" in node && Array.isArray(node.align) && node.align.some(Boolean)) return false;
      if (!Array.isArray(node.children)) continue;
      if (count + pending.length + node.children.length > MAX_VISUAL_NODES) return false;
      for (const child of node.children)
        pending.push({ node: child as typeof node, depth: depth + 1 });
    }
    return true;
  } catch {
    return false;
  }
}
