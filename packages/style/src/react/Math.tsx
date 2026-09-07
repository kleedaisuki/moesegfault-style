import { useMemo, type HTMLAttributes, type ReactElement } from "react";
import { renderMath } from "../markdown.js";
import { mergeClassNames } from "./utils";

/** 独立公式属性，不暴露不安全渲染选项。Standalone formula properties without unsafe renderer options. */
export interface MathProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "children" | "dangerouslySetInnerHTML"> {
  /** 未包裹美元符号的 TeX。TeX without dollar delimiters. */
  tex: string;
  /** 块级公式，默认行内。Display formula; inline by default. */
  display?: boolean;
}

/**
 * 同时输出视觉 HTML 与可访问 MathML；需 math.css 与 markdown.css。
 * Emit visual HTML and accessible MathML; requires math.css and markdown.css.
 * @example <Math tex="E=mc^2" display />
 */
function MathComponent({ tex, display = false, className, ...props }: MathProps): ReactElement {
  const html = useMemo(() => renderMath(tex, display), [tex, display]);
  return (
    <span
      {...props}
      className={mergeClassNames("moe-math", className)}
      data-display={display || undefined}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: KaTeX 禁用可信扩展，限制尺寸和宏展开。KaTeX disables trusted extensions and bounds sizes and expansion.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export { MathComponent as Math };
