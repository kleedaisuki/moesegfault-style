import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  FieldsetHTMLAttributes,
  HTMLAttributes,
  ReactElement,
  ReactNode,
} from "react";
import { mergeClassNames } from "./utils";

/** 消息发送方。Message sender role. */
export type MessageBubbleRole = "assistant" | "user" | "system";
/** 消息表面样式；不改变发送方语义。Surface treatment, independent of sender semantics. */
export type MessageBubbleTone = "solid" | "soft" | "outline";

/** 消息气泡属性，保留原生 article 属性。Message bubble props with native article attributes. */
export interface MessageBubbleProps extends HTMLAttributes<HTMLElement> {
  /** 可选发送者名称。Optional sender name. */
  author?: ReactNode;
  /** 可选尾部元信息。Optional footer metadata. */
  footer?: ReactNode;
  /** 正在流式生成；不自动创建播报区域。Streaming state; does not create a live region. */
  streaming?: boolean;
  /** 消息发送方。Message sender role. */
  variant?: MessageBubbleRole;
  /** 头像插槽；图片应提供合适的 alt。Avatar slot; images should supply appropriate alt text. */
  avatar?: ReactNode;
  /** 原生按钮或 MessageActions 操作组。Native buttons or a MessageActions group. */
  actions?: ReactNode;
  /** 已发送、失败等可本地化状态。Localizable delivery or failure status. */
  status?: ReactNode;
  /** 表面表现，默认兼容已有实色风格。Surface treatment, retaining the existing solid default. */
  tone?: MessageBubbleTone;
}

/**
 * 组合消息、头像与操作，保持 article 语义。Compose message, avatar and actions using article semantics.
 * @example <MessageBubble author="Klee" variant="user" status="已发送">你好</MessageBubble>
 */
export function MessageBubble({
  author,
  children,
  className,
  footer,
  streaming = false,
  variant = "assistant",
  avatar,
  actions,
  status,
  tone = "solid",
  ...props
}: MessageBubbleProps): ReactElement {
  return (
    <article
      {...props}
      aria-busy={streaming || props["aria-busy"]}
      className={mergeClassNames("moe-message-bubble", streaming && "is-streaming", className)}
      data-author={variant}
      data-tone={tone}
      data-avatar={avatar != null || undefined}
    >
      {avatar != null && <div className="moe-message-bubble__avatar">{avatar}</div>}
      {author != null && <header className="moe-message-bubble__meta">{author}</header>}
      <div className="moe-message-bubble__content">{children}</div>
      {(footer != null || status != null) && (
        <footer className="moe-message-bubble__meta moe-message-bubble__footer">
          {footer}
          {status != null && <span className="moe-message-bubble__status">{status}</span>}
        </footer>
      )}
      {actions != null && <div className="moe-message-bubble__actions">{actions}</div>}
    </article>
  );
}

/** 输入指示器属性。Typing indicator props. */
export interface MessageTypingProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** 可见且可播报的本地化文本。Visible, announceable localized text. */
  label?: string;
}

/** 单个温和播报区域，圆点仅播放三次且对读屏隐藏；文字常驻。One polite status region; decorative dots stop after three cycles while text persists. */
export function MessageTyping({
  label = "正在输入…",
  className,
  ...props
}: MessageTypingProps): ReactElement {
  return (
    <div role="status" {...props} className={mergeClassNames("moe-message-typing", className)}>
      <span className="moe-message-typing__dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span>{label}</span>
    </div>
  );
}

/** 引用消息属性。Quoted message props. */
export interface MessageQuoteProps extends HTMLAttributes<HTMLQuoteElement> {
  /** 被引用消息作者。Author of the quoted message. */
  author?: ReactNode;
  /** 原生引用来源 URL。Native citation source URL. */
  cite?: string;
}

/** 使用原生 blockquote 保留引用语义。Preserve quotation semantics with a native blockquote. */
export function MessageQuote({
  author,
  children,
  className,
  ...props
}: MessageQuoteProps): ReactElement {
  return (
    <blockquote {...props} className={mergeClassNames("moe-message-quote", className)}>
      {author != null && <div className="moe-message-quote__author">{author}</div>}
      {children}
    </blockquote>
  );
}

/** 附件链接属性；href 和下载策略沿用原生链接。Attachment link props with native navigation/download behavior. */
export interface MessageAttachmentProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children"> {
  /** 描述附件的可访问名称。Accessible descriptive attachment name. */
  name: string;
  /** 大小或文件类型等元信息。File size or type metadata. */
  description?: ReactNode;
  /** 装饰图标，不参与可访问名称。Decorative icon excluded from the accessible name. */
  icon?: ReactNode;
}

/**
 * 渲染键盘可操作的附件链接，不隐式下载或打开新窗口。Render a keyboard-operable link without implicit download or new windows.
 * @example <MessageAttachment href="/notes.pdf" name="研究笔记.pdf" description="PDF · 240 KB" download />
 */
export function MessageAttachment({
  name,
  description,
  icon,
  className,
  ...props
}: MessageAttachmentProps): ReactElement {
  return (
    <a {...props} className={mergeClassNames("moe-message-attachment", className)}>
      {icon != null && (
        <span className="moe-message-attachment__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="moe-message-attachment__body">
        <span className="moe-message-attachment__name">{name}</span>
        {description != null && (
          <span className="moe-message-attachment__description">{description}</span>
        )}
      </span>
    </a>
  );
}

/** 有名称的操作组，沿用正常 Tab 顺序而非复杂工具栏键盘模型。Named action group with normal Tab order, not a toolbar keyboard model. */
export function MessageActions({
  className,
  children,
  "aria-label": label = "消息操作",
  ...props
}: FieldsetHTMLAttributes<HTMLFieldSetElement>): ReactElement {
  return (
    <fieldset
      aria-label={label}
      {...props}
      className={mergeClassNames("moe-message-actions", className)}
    >
      {children}
    </fieldset>
  );
}

/** 原生消息按钮；默认不提交表单，支持 disabled 和 aria-pressed。Native message button; non-submitting by default, with disabled and aria-pressed support. */
export function MessageAction({
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>): ReactElement {
  return (
    <button {...props} type={type} className={mergeClassNames("moe-message-action", className)} />
  );
}
