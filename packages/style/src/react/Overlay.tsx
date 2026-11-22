import {
  cloneElement,
  type DialogHTMLAttributes,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { IconButton } from "./Button";
import { Icon } from "./Icon";
import { mergeClassNames } from "./utils";

/** @brief 对话框属性。Dialog props. */
export interface DialogProps
  extends Omit<DialogHTMLAttributes<HTMLDialogElement>, "onClose" | "open" | "title"> {
  /** @brief 是否打开。Whether open. */
  open: boolean;
  /** @brief 请求变更打开状态。Requests an open-state change. */
  onOpenChange: (open: boolean) => void;
  /** @brief 标题。Title. */
  title: ReactNode;
  /** @brief 说明。Description. */
  description?: ReactNode;
  /** @brief 底部操作。Footer actions. */
  footer?: ReactNode;
  /** @brief 关闭按钮名称。Close button name. */
  closeLabel?: string;
}

/**
 * @brief 原生模态对话框；焦点约束、Escape 与顶层由平台提供。
 * Native modal dialog; the platform supplies focus containment, Escape, and the top layer.
 */
export function Dialog({
  children,
  className,
  closeLabel = "关闭 / Close",
  description,
  footer,
  onOpenChange,
  open,
  title,
  ...props
}: DialogProps): ReactElement {
  const id = useId();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || dialog.open === open) return;
    if (open) dialog.showModal();
    else dialog.close();
  }, [open]);
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: 键盘关闭由原生 Escape 提供，此处只处理背景点击。Escape covers the keyboard; this only handles backdrop clicks.
    <dialog
      {...props}
      aria-describedby={description != null ? `${id}-description` : undefined}
      aria-labelledby={`${id}-title`}
      className={mergeClassNames("moe-dialog", className)}
      // 受控状态先行；阻止平台抢先关闭。Controlled state leads; keep the platform from closing first.
      onCancel={(event) => {
        event.preventDefault();
        onOpenChange(false);
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
      onClose={() => {
        if (open) onOpenChange(false);
      }}
      ref={ref}
    >
      <header className="moe-dialog__header">
        <h2 className="moe-dialog__title" id={`${id}-title`}>
          {title}
        </h2>
        <IconButton label={closeLabel} onClick={() => onOpenChange(false)} size="sm">
          <Icon name="x" size={16} />
        </IconButton>
        {description != null && (
          <p className="moe-dialog__description" id={`${id}-description`}>
            {description}
          </p>
        )}
      </header>
      <div className="moe-dialog__body">{children}</div>
      {footer != null && <footer className="moe-dialog__footer">{footer}</footer>}
    </dialog>
  );
}

/** @brief 提示属性。Tooltip props. */
export interface TooltipProps extends Omit<HTMLAttributes<HTMLSpanElement>, "content"> {
  /** @brief 单个可聚焦触发元素。A single focusable trigger. */
  children: ReactElement<{ "aria-describedby"?: string }>;
  /** @brief 提示文字。Tooltip text. */
  content: ReactNode;
  /** @brief 显示侧。Display side. */
  side?: "top" | "bottom";
}

/**
 * @brief 补充说明提示；悬停与聚焦显示，Escape 收起。Supplementary tooltip; shows on hover and focus, Escape dismisses.
 * @note 满足 WCAG 1.4.13 的可关闭与可悬停要求。Meets WCAG 1.4.13's dismissable and hoverable requirements.
 */
export function Tooltip({
  children,
  className,
  content,
  side = "top",
  ...props
}: TooltipProps): ReactElement {
  const id = useId();
  const [dismissed, setDismissed] = useState(false);
  const described = mergeClassNames(children.props["aria-describedby"], id);
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: 仅观察内部触发元素的冒泡事件。Only observes events bubbling from the trigger.
    <span
      {...props}
      className={mergeClassNames("moe-tooltip", className)}
      data-dismissed={dismissed || undefined}
      data-side={side}
      onBlur={() => setDismissed(false)}
      onKeyDown={(event) => {
        if (event.key === "Escape") setDismissed(true);
      }}
      onMouseLeave={() => setDismissed(false)}
    >
      {cloneElement(children, { "aria-describedby": described })}
      <span className="moe-tooltip__bubble" id={id} role="tooltip">
        {content}
      </span>
    </span>
  );
}
