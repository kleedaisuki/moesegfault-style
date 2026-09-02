import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactElement,
  ReactNode,
  Ref,
} from "react";
import { mergeClassNames } from "./utils";

/** @brief 按钮的视觉变体。Visual variants for a button. */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

/** @brief 按钮的尺寸。Sizes for a button. */
export type ButtonSize = "sm" | "md" | "lg";

/** @brief 按钮和链接按钮共享的属性。Shared properties for button and anchor buttons. */
export interface ButtonCommonProps {
  /** @brief 按钮内容。Button content. */
  children: ReactNode;
  /** @brief 附加 CSS 类名。Additional CSS class name. */
  className?: string;
  /** @brief 控件尺寸。Control size. */
  size?: ButtonSize;
  /** @brief 视觉变体。Visual variant. */
  variant?: ButtonVariant;
}

/** @brief 原生 button 元素形态的属性。Props for the native button form. */
export interface ButtonElementProps
  extends ButtonCommonProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonCommonProps> {
  /** @brief 渲染为原生 button。Render as a native button. */
  as?: "button";
  /** @brief 原生 button 引用。Native button ref. */
  ref?: Ref<HTMLButtonElement>;
  /** @brief button 形态不接受 href。The button form does not accept href. */
  href?: never;
}

/** @brief 原生 a 元素形态的属性。Props for the native anchor form. */
export interface ButtonAnchorProps
  extends ButtonCommonProps,
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonCommonProps | "href"> {
  /** @brief 渲染为原生链接。Render as a native anchor. */
  as: "a";
  /** @brief 必填的链接目标。Required link destination. */
  href: string;
  /** @brief 原生链接引用。Native anchor ref. */
  ref?: Ref<HTMLAnchorElement>;
}

/** @brief 可判别的按钮属性联合。Discriminated union of button props. */
export type ButtonProps = ButtonElementProps | ButtonAnchorProps;

/**
 * @brief 渲染保持原生语义的按钮或链接按钮。Render a button or anchor with native semantics.
 * @param props 可判别的按钮属性。Discriminated button props.
 * @return React 按钮元素。React button element.
 * @note button 形态默认使用 type="button"，避免在表单内意外提交。The button form defaults to type="button" to avoid accidental form submission.
 */
export function Button(props: ButtonProps): ReactElement {
  const { className, size = "md", variant = "primary", ...rest } = props;
  const classes = mergeClassNames("moe-button", className);

  if (rest.as === "a") {
    const { as: _as, ...anchorProps } = rest;
    return <a {...anchorProps} className={classes} data-size={size} data-variant={variant} />;
  }

  const { as: _as, type = "button", ...buttonProps } = rest;
  return (
    <button
      {...buttonProps}
      className={classes}
      data-size={size}
      data-variant={variant}
      type={type}
    />
  );
}
