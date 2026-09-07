import { useMemo, type HTMLAttributes, type ReactElement } from "react";
import { renderMarkdown } from "../markdown.js";
import { mergeClassNames } from "./utils";

/** 安全 Markdown 容器属性。Safe Markdown container properties. */
export interface MarkdownProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "dangerouslySetInnerHTML"> {
  /** GFM 和美元符号分隔的 TeX 源文本，不是 HTML。GFM and dollar-delimited TeX source, never HTML. */
  content: string;
}

/**
 * 可服务端渲染的暖色文稿；导入 markdown.css、math.css 和 code.css。
 * SSR-safe warm prose; import markdown.css, math.css, and code.css.
 * @example <Markdown content="**Hello** $E=mc^2$" />
 */
export function Markdown({ content, className, ...props }: MarkdownProps): ReactElement {
  const html = useMemo(() => renderMarkdown(content), [content]);
  return (
    <div
      {...props}
      className={mergeClassNames("moe-markdown", className)}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: 内部清洗后渲染，不接受 HTML 输入。Internally sanitized rendering, never caller HTML.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
