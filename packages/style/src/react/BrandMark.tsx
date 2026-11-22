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
 * @brief 渲染带星芒的 moeSegFault 品牌标记。Render the moeSegFault brand mark with a sparkle.
 * @param props 品牌文字、紧凑模式和原生 span 属性。Label, compact mode, and native span props.
 * @return React span 元素。React span element.
 */
export function BrandMark({
  className,
  compact = false,
  label = "moeSegFault",
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
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="currentColor">
          <title>K</title>
          <path d="M18 13h9v14.4L40.2 13H51L35.7 30.2 52 51H40.6L28.3 35.3 27 36.7V51h-9V13Z" />
          <path
            className="moe-brand-mark__spark"
            d="m49.5 7 1.8 4.7L56 13.5l-4.7 1.8L49.5 20l-1.8-4.7-4.7-1.8 4.7-1.8L49.5 7Z"
          />
        </svg>
      </span>
      {!compact && (
        <span className="moe-brand-mark__text">
          <span className="moe-brand-mark__title">{label}</span>
        </span>
      )}
    </span>
  );
}
