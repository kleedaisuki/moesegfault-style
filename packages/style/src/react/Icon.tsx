import { type ReactElement, type SVGProps, useId } from "react";
import { mergeClassNames } from "./utils";

/** 品牌资产名称；不混入第三方图标。Brand assets, without third-party glyphs. */
export type IconName = "brand" | "sparkle";

/** 非交互 SVG 属性；按钮行为应由外层按钮承担。Non-interactive SVG props; use a wrapping button for actions. */
export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "children" | "name"> {
  /** 原始品牌或提取的星芒。Original brand or extracted sparkle. */
  name: IconName;
  /** 默认宽高，可被 width/height 覆盖。Default dimensions, overridable with width/height. */
  size?: number | string;
  /** 非装饰图标的可访问名称。Accessible name for a meaningful icon. */
  title?: string;
}

/**
 * 渲染原始品牌 SVG；未命名时从辅助技术隐藏。Render heritage SVG; unnamed icons are decorative.
 * 每个实例有独立渐变 ID，支持服务端渲染。Each instance has a unique gradient ID, including SSR.
 * @example <Icon name="brand" size={48} title="MoeSegfault" />
 * @example <button><Icon name="sparkle" /> 收藏 / Favorite</button>
 */
export function Icon({ name, size = "1em", title, className, ...props }: IconProps): ReactElement {
  const id = useId();
  const titleId = `${id}-title`;
  const gradientId = `${id}-coral`;
  const hasTitle = Boolean(title?.trim());
  const named = Boolean(
    hasTitle || props["aria-label"]?.trim() || props["aria-labelledby"]?.trim(),
  );
  const hidden = props["aria-hidden"] ?? !named;

  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: 未命名图标隐藏；命名由 title 或 ARIA 提供。Unnamed icons are hidden; title or ARIA names meaningful icons.
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={name === "brand" ? "0 0 64 64" : "43 7 13 13"}
      fill="currentColor"
      {...props}
      className={mergeClassNames("moe-icon", `moe-icon--${name}`, className)}
      aria-hidden={hidden}
      aria-labelledby={props["aria-labelledby"] ?? (hasTitle ? titleId : undefined)}
      role={named ? "img" : undefined}
      focusable="false"
      tabIndex={undefined}
    >
      {hasTitle && <title id={titleId}>{title}</title>}
      {name === "brand" && (
        <>
          <defs>
            <linearGradient
              id={gradientId}
              x1="10"
              y1="8"
              x2="54"
              y2="57"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#ff8569" />
              <stop offset="1" stopColor="#bd4525" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" rx="16" fill={`url(#${gradientId})`} />
          <path
            fill="#fffaf2"
            d="M18 13h9v14.4L40.2 13H51L35.7 30.2 52 51H40.6L28.3 35.3 27 36.7V51h-9V13Z"
          />
        </>
      )}
      <path
        fill={name === "brand" ? "#ffb55e" : "currentColor"}
        d="m49.5 7 1.8 4.7L56 13.5l-4.7 1.8L49.5 20l-1.8-4.7-4.7-1.8 4.7-1.8L49.5 7Z"
      />
    </svg>
  );
}
