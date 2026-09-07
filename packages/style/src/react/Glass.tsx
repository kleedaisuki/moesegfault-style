import type { CSSProperties, HTMLAttributes, ReactElement } from "react";
import { mergeClassNames } from "./utils";

/** 暖色玻璃染色，不改变主题文字色。Warm glass tints preserve theme text colors. */
export type GlassTone = "neutral" | "warm" | "rose";

/** 原生容器属性与渐进增强玻璃外观。Native container props and progressively enhanced glass. */
export interface GlassProps extends HTMLAttributes<HTMLElement> {
  /** 玻璃色调。Glass tint. */
  tone?: GlassTone;
  /** 背景模糊半径（0–40 px），默认 12；不模糊子内容。Backdrop blur radius (0–40 px), default 12; children stay sharp. */
  blur?: number;
  /** 染色不透明度（0–1），默认 0.42；降低可看见更多背景。Tint opacity (0–1), default 0.42; lower reveals more backdrop. */
  tintOpacity?: number;
}

/** 有界可选覆盖，不覆盖调用者已有样式。Bounded optional overrides preserve caller styles. */
function glassStyle(
  style: CSSProperties | undefined,
  blur?: number,
  tintOpacity?: number,
): CSSProperties {
  return {
    ...style,
    ...(blur !== undefined && {
      "--moe-glass-blur": `${Number.isFinite(blur) ? Math.min(40, Math.max(0, blur)) : 12}px`,
    }),
    ...(tintOpacity !== undefined && {
      "--moe-glass-opacity": `${(Number.isFinite(tintOpacity) ? Math.min(1, Math.max(0, tintOpacity)) : 0.42) * 100}%`,
    }),
  } as CSSProperties;
}

/**
 * 通用玻璃面板；不支持模糊时保留实色背景。Glass panel with an opaque blur fallback.
 * @example <GlassPanel tone="warm"><h2>研究笔记 / Research notes</h2></GlassPanel>
 */
export function GlassPanel({
  className,
  tone = "neutral",
  blur,
  tintOpacity,
  style,
  ...props
}: GlassProps): ReactElement {
  return (
    <div
      {...props}
      className={mergeClassNames("moe-glass", "moe-glass-panel", className)}
      data-tone={tone}
      style={glassStyle(style, blur, tintOpacity)}
    />
  );
}

/** 独立内容的语义化玻璃卡片。Semantic glass article for standalone content. */
export function GlassCard({
  className,
  tone = "neutral",
  blur,
  tintOpacity,
  style,
  ...props
}: GlassProps): ReactElement {
  return (
    <article
      {...props}
      className={mergeClassNames("moe-glass", "moe-glass-card", className)}
      data-tone={tone}
      style={glassStyle(style, blur, tintOpacity)}
    />
  );
}

/**
 * 可换行的玻璃操作栏；不注入需要方向键管理的 toolbar 角色。
 * Wrapping glass action strip; does not imply the keyboard-managed ARIA toolbar role.
 * @example <GlassToolbar aria-label="操作 / Actions"><button>保存 / Save</button></GlassToolbar>
 */
export function GlassToolbar({
  className,
  tone = "neutral",
  blur,
  tintOpacity,
  style,
  ...props
}: GlassProps): ReactElement {
  return (
    <div
      {...props}
      className={mergeClassNames("moe-glass", "moe-glass-toolbar", className)}
      data-tone={tone}
      style={glassStyle(style, blur, tintOpacity)}
    />
  );
}
