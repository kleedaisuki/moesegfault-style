import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import { mergeClassNames } from "./utils";

/** @brief 徽章的视觉色调。Visual tones for a badge. */
export type BadgeTone = "neutral" | "accent" | "success" | "danger";

/** @brief 徽章属性。Badge props. */
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** @brief 徽章色调。Badge tone. */
  tone?: BadgeTone;
}

/**
 * @brief 渲染短小的分类或状态徽章。Render a compact category or status badge.
 * @param props 原生 span 属性与色调。Native span attributes and tone.
 * @return React span 元素。React span element.
 */
export function Badge({ className, tone = "neutral", ...props }: BadgeProps): ReactElement {
  return <span {...props} className={mergeClassNames("moe-badge", className)} data-tone={tone} />;
}

/** @brief 通知的视觉色调。Visual tones for a notice. */
export type NoticeTone = "info" | "success" | "warning" | "danger";

/** @brief 通知属性。Notice props. */
export interface NoticeProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** @brief 可选通知标题。Optional notice title. */
  title?: ReactNode;
  /** @brief 通知色调；danger 默认使用 alert 语义。Notice tone; danger defaults to alert semantics. */
  tone?: NoticeTone;
}

/**
 * @brief 渲染带恰当 live-region 语义的通知。Render a notice with appropriate live-region semantics.
 * @param props 通知内容、标题、色调和原生 div 属性。Notice content, title, tone, and native div attributes.
 * @return React div 元素。React div element.
 */
export function Notice({
  children,
  className,
  role,
  title,
  tone = "info",
  ...props
}: NoticeProps): ReactElement {
  return (
    <div
      {...props}
      className={mergeClassNames("moe-notice", className)}
      data-tone={tone}
      role={role ?? (tone === "danger" ? "alert" : "status")}
    >
      {title && <strong className="moe-notice__title">{title}</strong>}
      <div className="moe-notice__content">{children}</div>
    </div>
  );
}

/** @brief 状态点的状态值。State values for a status dot. */
export type StatusDotStatus = "online" | "busy" | "error" | "offline";

/** @brief 状态点属性。Status dot props. */
export interface StatusDotProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** @brief 可供辅助技术读取的状态文字。Status text available to assistive technology. */
  label: string;
  /** @brief 当前状态。Current state. */
  status?: StatusDotStatus;
}

/**
 * @brief 渲染不会只靠颜色传达信息的状态点。Render a status dot that does not rely on color alone.
 * @param props 状态、标签、显示选项和原生 span 属性。State, label, display option, and native span attributes.
 * @return React status 元素。React status element.
 */
export function StatusDot({
  className,
  label,
  status = "online",
  ...props
}: StatusDotProps): ReactElement {
  return (
    <span
      {...props}
      aria-label={props["aria-label"] ?? label}
      className={mergeClassNames("moe-status-dot", className)}
      data-status={status}
      role="img"
    />
  );
}
