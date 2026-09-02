import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import { mergeClassNames } from "./utils";

/** @brief 消息发送方。Message sender role. */
export type MessageBubbleRole = "assistant" | "user" | "system";

/** @brief 消息气泡属性。Message bubble props. */
export interface MessageBubbleProps extends HTMLAttributes<HTMLElement> {
  /** @brief 可选的发送者名称。Optional sender name. */
  author?: ReactNode;
  /** @brief 可选的消息尾部元信息。Optional message footer metadata. */
  footer?: ReactNode;
  /** @brief 是否仍在流式生成。Whether the message is still streaming. */
  streaming?: boolean;
  /** @brief 消息发送方。Message sender role. */
  variant?: MessageBubbleRole;
}

/**
 * @brief 渲染带发送方和流式状态的语义化消息气泡。Render a semantic message bubble with sender and streaming state.
 * @param props 消息内容、发送方、元信息和原生 article 属性。Message content, sender, metadata, and native article attributes.
 * @return React article 元素。React article element.
 */
export function MessageBubble({
  author,
  children,
  className,
  footer,
  streaming = false,
  variant = "assistant",
  ...props
}: MessageBubbleProps): ReactElement {
  return (
    <article
      {...props}
      aria-busy={streaming || undefined}
      className={mergeClassNames("moe-message-bubble", streaming && "is-streaming", className)}
      data-author={variant}
    >
      {author && <header className="moe-message-bubble__meta">{author}</header>}
      <div className="moe-message-bubble__content">{children}</div>
      {footer && <footer className="moe-message-bubble__meta">{footer}</footer>}
    </article>
  );
}
