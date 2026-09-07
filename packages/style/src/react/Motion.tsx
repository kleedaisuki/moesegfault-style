import type { CSSProperties, HTMLAttributes, ReactElement } from "react";
import { mergeClassNames } from "./utils";

/** 单次入场动画，不隐藏无 CSS 的内容。One-shot entrances keep unstyled content visible. */
export type MotionPreset = "fade" | "rise" | "scale" | "slide";

/** 入场动效参数。Entrance motion options. */
export interface MotionProps extends HTMLAttributes<HTMLDivElement> {
  /** 入场方式。Entrance preset. */
  preset?: MotionPreset;
  /** 延时毫秒，限制到 0–2000。Delay in milliseconds, clamped to 0–2000. */
  delay?: number;
  /** 时长毫秒，限制到 0–2000；省略时使用主题值。Duration in milliseconds, clamped to 0–2000; defaults to theme. */
  duration?: number;
  /** 显式关闭动画，系统减少动态设置始终优先。Disable motion; OS reduced-motion preference always wins. */
  disabled?: boolean;
}

/** 拒绝非有限值并限制等待时间。Reject nonfinite timings and bound waiting time. */
function timing(value: number): string {
  return `${Number.isFinite(value) ? Math.min(2000, Math.max(0, value)) : 0}ms`;
}

/**
 * CSS 单次入场容器，无计时器、不监听视口；挂载时播放。
 * CSS-only, one-shot entrance on mount; no timers or viewport observers.
 * 减少动态模式保持内容可见；勿用于控制业务状态。Reduced motion stays visible; do not use animation as business state.
 * @example <Motion preset="rise" delay={80}><p>你好 / Hello</p></Motion>
 */
export function Motion({
  className,
  preset = "rise",
  delay = 0,
  duration,
  disabled = false,
  style,
  ...props
}: MotionProps): ReactElement {
  const motionStyle = {
    "--moe-enter-delay": timing(delay),
    ...(duration === undefined ? {} : { "--moe-enter-duration": timing(duration) }),
    ...style,
  } as CSSProperties;
  return (
    <div
      {...props}
      className={mergeClassNames("moe-motion", className)}
      data-motion={preset}
      data-motion-disabled={disabled || undefined}
      style={motionStyle}
    />
  );
}
