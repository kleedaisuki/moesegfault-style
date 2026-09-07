/** 富文本为显式可选入口，不让普通交互组件加载数学与 Markdown 依赖。
 * Rich text is an explicit opt-in entry; ordinary controls do not load math/Markdown dependencies.
 * @example import { Markdown, Math } from "@moesegfault/style/react/rich-text";
 */
export { Markdown } from "./Markdown.js";
export type { MarkdownProps } from "./Markdown.js";
export { Math } from "./Math.js";
export type { MathProps } from "./Math.js";
