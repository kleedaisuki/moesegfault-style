import { type HTMLAttributes, type ReactElement, type ReactNode, useId } from "react";
import { mergeClassNames } from "./utils";

/** @brief 卡片表面的视觉变体。Visual variants for a card surface. */
export type CardVariant = "default" | "muted" | "elevated";

/** @brief 卡片容器属性。Card container props. */
export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** @brief 卡片表面变体。Card surface variant. */
  variant?: CardVariant;
  /** @brief 悬停反馈；标题内链接扩展为整卡目标。Hover feedback; a link inside the title covers the whole card. */
  interactive?: boolean;
}

/**
 * @brief 渲染语义化 article 卡片。Render a semantic article card.
 * @param props 原生 article 属性与视觉变体。Native article attributes and visual variant.
 * @return React article 元素。React article element.
 */
export function Card({
  className,
  interactive = false,
  variant = "default",
  ...props
}: CardProps): ReactElement {
  return (
    <article
      {...props}
      className={mergeClassNames("moe-card", className)}
      data-interactive={interactive || undefined}
      data-variant={variant}
    />
  );
}

/** @brief 卡片头部属性。Card header props. */
export type CardHeaderProps = HTMLAttributes<HTMLDivElement>;

/**
 * @brief 组合卡片标题与说明的头部区域。Group a card title and description.
 * @param props 原生 div 属性。Native div attributes.
 * @return React div 元素。React div element.
 */
export function CardHeader({ className, ...props }: CardHeaderProps): ReactElement {
  return <div {...props} className={mergeClassNames("moe-card__header", className)} />;
}

/** @brief 卡片标题属性。Card title props. */
export type CardTitleProps = HTMLAttributes<HTMLHeadingElement>;

/**
 * @brief 渲染三级卡片标题。Render a level-three card heading.
 * @param props 原生 h3 属性。Native h3 attributes.
 * @return React h3 元素。React h3 element.
 */
export function CardTitle({ className, ...props }: CardTitleProps): ReactElement {
  return <h3 {...props} className={mergeClassNames("moe-card__title", className)} />;
}

/** @brief 卡片说明属性。Card description props. */
export type CardDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

/**
 * @brief 渲染卡片的辅助说明。Render supporting card copy.
 * @param props 原生 p 属性。Native paragraph attributes.
 * @return React p 元素。React paragraph element.
 */
export function CardDescription({ className, ...props }: CardDescriptionProps): ReactElement {
  return <p {...props} className={mergeClassNames("moe-card__description", className)} />;
}

/** @brief 卡片内容区域属性。Card content region props. */
export type CardContentProps = HTMLAttributes<HTMLDivElement>;

/**
 * @brief 渲染卡片的主要内容区域。Render a card's primary content region.
 * @param props 原生 div 属性。Native div attributes.
 * @return React div 元素。React div element.
 */
export function CardContent({ className, ...props }: CardContentProps): ReactElement {
  return <div {...props} className={mergeClassNames("moe-card__body", className)} />;
}

/** @brief 卡片底部属性。Card footer props. */
export type CardFooterProps = HTMLAttributes<HTMLDivElement>;

/** @brief 渲染以发丝线分隔的卡片底部。Render a hairline-separated card footer. */
export function CardFooter({ className, ...props }: CardFooterProps): ReactElement {
  return <div {...props} className={mergeClassNames("moe-card__footer", className)} />;
}

/** @brief 面板属性。Panel props. */
export interface PanelProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  /** @brief 标题栏文字，也是区域名称。Header text, also the region's name. */
  title: ReactNode;
  /** @brief 标题栏末端操作。Trailing header actions. */
  actions?: ReactNode;
  /** @brief 去除正文内边距，供表格与代码贴边。Remove body padding for edge-to-edge tables and code. */
  flush?: boolean;
}

/** @brief 带标题栏的工具面板。A tool panel with a header bar. */
export function Panel({
  actions,
  children,
  className,
  flush = false,
  title,
  ...props
}: PanelProps): ReactElement {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      {...props}
      className={mergeClassNames("moe-panel", className)}
      data-flush={flush || undefined}
    >
      <header className="moe-panel__header">
        <span className="moe-panel__title" id={titleId}>
          {title}
        </span>
        {actions != null && <div className="moe-panel__actions">{actions}</div>}
      </header>
      <div className="moe-panel__body">{children}</div>
    </section>
  );
}
