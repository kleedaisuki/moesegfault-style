import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  FieldsetHTMLAttributes,
  ReactElement,
  ReactNode,
  Ref,
} from "react";
import { Spinner } from "./Data";
import { mergeClassNames } from "./utils";

/** @brief 按钮的视觉变体。Visual variants for a button. */
export type ButtonVariant = "primary" | "contrast" | "secondary" | "ghost" | "danger";

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
  /** @brief 图标按钮的正方形外观，名称由 aria-label 提供。Square icon-only shape; name it with aria-label. */
  iconOnly?: boolean;
}

/** @brief 原生 button 元素形态的属性。Props for the native button form. */
export interface ButtonElementProps
  extends ButtonCommonProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonCommonProps> {
  /** @brief 渲染为原生 button。Render as a native button. */
  as?: "button";
  /** @brief 原生 button 引用。Native button ref. */
  ref?: Ref<HTMLButtonElement>;
  /** @brief 处理中：保留尺寸、标记忙碌并阻止重复触发。In progress: keeps size, marks busy, and blocks repeat activation. */
  loading?: boolean;
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
  const { className, iconOnly = false, size = "md", variant = "primary", ...rest } = props;
  const shared = {
    className: mergeClassNames("moe-button", className),
    "data-icon-only": iconOnly || undefined,
    "data-size": size,
    "data-variant": variant,
  };

  if (rest.as === "a") {
    const { as: _as, ...anchorProps } = rest;
    return <a {...anchorProps} {...shared} />;
  }

  const { as: _as, children, disabled, loading = false, type = "button", ...buttonProps } = rest;
  return (
    <button
      {...buttonProps}
      {...shared}
      aria-busy={loading || buttonProps["aria-busy"]}
      data-loading={loading || undefined}
      disabled={disabled || loading}
      type={type}
    >
      {/* 包裹文本节点，让 CSS 能在加载时隐藏它而不改变宽度。Wrap text so CSS can hide it while loading without changing width. */}
      {loading ? <span>{children}</span> : children}
      {loading && <Spinner decorative />}
    </button>
  );
}

/** @brief 图标按钮属性；label 是必填的可访问名称。Icon button props; label is the required accessible name. */
export interface IconButtonProps
  extends Omit<ButtonElementProps, "as" | "href" | "iconOnly" | "aria-label"> {
  /** @brief 可访问名称。Accessible name. */
  label: string;
}

/**
 * @brief 渲染必有名称的正方形图标按钮。Render a square icon button that always has a name.
 * @example <IconButton label="Close"><Icon name="x" /></IconButton>
 */
export function IconButton({ label, variant = "ghost", ...props }: IconButtonProps): ReactElement {
  return <Button {...props} aria-label={label} iconOnly variant={variant} />;
}

/** @brief 按钮组属性；label 命名该组。Button group props; label names the group. */
export interface ButtonGroupProps extends FieldsetHTMLAttributes<HTMLFieldSetElement> {
  /** @brief 组的可访问名称。Accessible group name. */
  label: string;
}

/** @brief 共享边线的相邻按钮组。Adjacent buttons sharing their edges. */
export function ButtonGroup({ className, label, ...props }: ButtonGroupProps): ReactElement {
  return (
    <fieldset
      {...props}
      aria-label={label}
      className={mergeClassNames("moe-button-group", className)}
    />
  );
}
