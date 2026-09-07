import type { HTMLAttributes, ReactElement } from "react";
import { mergeClassNames } from "./utils";

/** 暖色玻璃染色，不改变主题文字色。Warm glass tints preserve theme text colors. */
export type GlassTone = "neutral" | "warm" | "rose";

/** 原生容器属性与渐进增强玻璃外观。Native container props and progressively enhanced glass. */
export interface GlassProps extends HTMLAttributes<HTMLElement> {
  /** 玻璃色调。Glass tint. */
  tone?: GlassTone;
}

/**
 * 通用玻璃面板；不支持模糊时保留实色背景。Glass panel with an opaque blur fallback.
 * @example <GlassPanel tone="warm"><h2>研究笔记 / Research notes</h2></GlassPanel>
 */
export function GlassPanel({ className, tone = "neutral", ...props }: GlassProps): ReactElement {
  return (
    <div
      {...props}
      className={mergeClassNames("moe-glass", "moe-glass-panel", className)}
      data-tone={tone}
    />
  );
}

/** 独立内容的语义化玻璃卡片。Semantic glass article for standalone content. */
export function GlassCard({ className, tone = "neutral", ...props }: GlassProps): ReactElement {
  return (
    <article
      {...props}
      className={mergeClassNames("moe-glass", "moe-glass-card", className)}
      data-tone={tone}
    />
  );
}

/**
 * 可换行的玻璃操作栏；不注入需要方向键管理的 toolbar 角色。
 * Wrapping glass action strip; does not imply the keyboard-managed ARIA toolbar role.
 * @example <GlassToolbar aria-label="操作 / Actions"><button>保存 / Save</button></GlassToolbar>
 */
export function GlassToolbar({ className, tone = "neutral", ...props }: GlassProps): ReactElement {
  return (
    <div
      {...props}
      className={mergeClassNames("moe-glass", "moe-glass-toolbar", className)}
      data-tone={tone}
    />
  );
}
