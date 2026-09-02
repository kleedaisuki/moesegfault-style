import type { HTMLAttributes, ReactElement } from "react";
import { mergeClassNames } from "./utils";

/** @brief 品牌标记属性。Brand mark props. */
export interface BrandMarkProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** @brief 是否隐藏可见品牌文字。Whether to hide the visible brand label. */
  compact?: boolean;
  /** @brief 品牌文字及紧凑模式下的无障碍名称。Brand text and accessible name in compact mode. */
  label?: string;
}

/**
 * @brief 渲染带星芒的 MoeSegfault 品牌标记。Render the MoeSegfault brand mark with a sparkle.
 * @param props 品牌文字、紧凑模式和原生 span 属性。Label, compact mode, and native span props.
 * @return React span 元素。React span element.
 */
export function BrandMark({
  className,
  compact = false,
  label = "MoeSegfault",
  ...props
}: BrandMarkProps): ReactElement {
  return (
    <span
      {...props}
      aria-label={props["aria-label"] ?? label}
      className={mergeClassNames("moe-brand-mark", compact && "moe-brand-mark--compact", className)}
      role="img"
    >
      <span aria-hidden="true" className="moe-brand-mark__glyph">
        K
      </span>
      {!compact && (
        <span className="moe-brand-mark__text">
          <span className="moe-brand-mark__title">{label}</span>
        </span>
      )}
    </span>
  );
}
