import { useId, useMemo, useState, type HTMLAttributes, type ReactElement } from "react";
import { highlightCode } from "../code.js";
import { mergeClassNames } from "./utils";

/** 带可选复制功能的代码框属性。Code block props with optional clipboard interaction. */
export interface CodeBlockProps
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "dangerouslySetInnerHTML"> {
  /** 原始代码，绝不是 HTML。Raw source code, never HTML. */
  code: string;
  /** 显式语言；未知语言以纯文本显示。Explicit grammar; unknown languages render as plain text. */
  language?: string;
  /** 可访问的代码标题。Accessible code caption. */
  label?: string;
  /** 可选文件名。Optional filename. */
  filename?: string;
  /** 显示复制按钮；需要浏览器剪贴板权限。Show copy action; requires browser clipboard access. */
  copyable?: boolean;
  /** 长行换行，默认保持源代码布局。Wrap long lines; preserve source layout by default. */
  wrap?: boolean;
  /** 可本地化的复制按钮名称。Localizable copy button name. */
  copyLabel?: string;
  /** 可本地化的成功反馈。Localizable success feedback. */
  copiedLabel?: string;
  /** 可本地化的失败反馈。Localizable failure feedback. */
  copyErrorLabel?: string;
}

/**
 * 服务端可渲染且无需远程资源的语法高亮代码框。SSR-safe highlighted code, without remote resources.
 * @example <CodeBlock code="const n = 42;" language="typescript" filename="answer.ts" />
 */
export function CodeBlock({
  code,
  language = "text",
  label = "代码示例",
  filename,
  copyable = true,
  wrap = false,
  copyLabel = "复制",
  copiedLabel = "已复制",
  copyErrorLabel = "复制失败，请选择代码复制",
  className,
  ...props
}: CodeBlockProps): ReactElement {
  const captionId = useId();
  const html = useMemo(() => highlightCode(code, language), [code, language]);
  const [status, setStatus] = useState("");

  /** 失败时明确反馈，绝不谎报成功。Report clipboard failures rather than claiming success. */
  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
      setStatus(copiedLabel);
    } catch {
      setStatus(copyErrorLabel);
    }
  }

  return (
    <figure
      {...props}
      className={mergeClassNames("moe-code-block", className)}
      data-wrap={wrap || undefined}
    >
      <figcaption className="moe-code-block__header" id={captionId}>
        <span className="moe-code-block__title">{filename || label}</span>
        <span className="moe-code-block__language">{language}</span>
        {copyable && (
          <button
            type="button"
            className="moe-code-block__copy"
            onClick={copy}
            aria-label={`${copyLabel}: ${filename || label}`}
          >
            {copyLabel}
          </button>
        )}
      </figcaption>
      {/* biome-ignore lint/a11y/useSemanticElements: pre 保留代码空白语义且同时命名滚动区域。pre preserves source whitespace and labels the scroll region. */}
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: 可滚动代码需要键盘焦点。Scrollable code requires keyboard focus. */}
      <pre className="moe-code-block__pre" tabIndex={0} role="region" aria-labelledby={captionId}>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: 只接收内部高亮器转义后的文本，无外部 HTML。Only escaped internal highlighter output, never caller HTML. */}
        <code className="moe-code-block__code" dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
      <span className="moe-code-block__status" role="status">
        {status}
      </span>
    </figure>
  );
}
