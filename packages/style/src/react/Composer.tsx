import {
  type ChangeEvent,
  type FormEvent,
  type FormHTMLAttributes,
  type KeyboardEvent,
  type ReactElement,
  type TextareaHTMLAttributes,
  useRef,
  useState,
} from "react";
import { Button } from "./Button";
import { mergeClassNames } from "./utils";

/** @brief Composer 提交回调。Composer submission callback. */
export type ComposerSubmitHandler = (value: string, event: FormEvent<HTMLFormElement>) => void;

/** @brief 消息编辑器属性。Message composer props. */
export interface ComposerProps
  extends Omit<FormHTMLAttributes<HTMLFormElement>, "children" | "onSubmit"> {
  /** @brief 非受控模式的初始文本。Initial text in uncontrolled mode. */
  defaultValue?: string;
  /** @brief 是否禁用输入和提交。Whether input and submission are disabled. */
  disabled?: boolean;
  /** @brief 文本变化回调。Text change callback. */
  onValueChange?: (value: string) => void;
  /** @brief 有效消息提交回调。Valid message submission callback. */
  onSubmitMessage: ComposerSubmitHandler;
  /** @brief 输入占位文本。Input placeholder text. */
  placeholder?: string;
  /** @brief 提交按钮的可见文字。Visible submit button label. */
  submitLabel?: string;
  /** @brief 透传给 textarea 的属性。Attributes forwarded to the textarea. */
  textareaProps?: Omit<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    "defaultValue" | "disabled" | "onChange" | "onKeyDown" | "placeholder" | "value"
  >;
  /** @brief 受控模式的文本。Text in controlled mode. */
  value?: string;
}

/**
 * @brief 渲染支持 Enter 提交和 Shift+Enter 换行的消息编辑器。Render a message composer with Enter-to-submit and Shift+Enter newline behavior.
 * @param props 受控或非受控文本、回调及表单属性。Controlled or uncontrolled text, callbacks, and form attributes.
 * @return React form 元素。React form element.
 * @note 输入法组合（IME composition）期间不会提交。Submission is suppressed during IME composition.
 */
export function Composer({
  className,
  defaultValue = "",
  disabled = false,
  onSubmitMessage,
  onValueChange,
  placeholder = "输入消息…",
  submitLabel = "发送",
  textareaProps,
  value,
  ...formProps
}: ComposerProps): ReactElement {
  const formRef = useRef<HTMLFormElement>(null);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const controlled = value !== undefined;
  const currentValue = controlled ? value : internalValue;

  /** @brief 同步编辑器文本。Synchronize composer text. */
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    const nextValue = event.currentTarget.value;
    if (!controlled) setInternalValue(nextValue);
    onValueChange?.(nextValue);
  };

  /** @brief 处理原生表单提交。Handle native form submission. */
  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (disabled || currentValue.trim().length === 0) return;
    onSubmitMessage(currentValue, event);
    if (!controlled) {
      setInternalValue("");
      onValueChange?.("");
    }
  };

  /** @brief 将未修饰的 Enter 键转换为原生表单提交。Convert unmodified Enter into a native form submission. */
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing ||
      event.nativeEvent.keyCode === 229
    ) {
      return;
    }
    event.preventDefault();
    formRef.current?.requestSubmit();
  };

  return (
    <form
      {...formProps}
      className={mergeClassNames("moe-composer", className)}
      onSubmit={handleSubmit}
      ref={formRef}
    >
      <textarea
        {...textareaProps}
        aria-label={textareaProps?.["aria-label"] ?? "消息"}
        className={mergeClassNames("moe-composer__input", textareaProps?.className)}
        disabled={disabled}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        value={currentValue}
      />
      <Button
        className="moe-composer__action"
        disabled={disabled || currentValue.trim().length === 0}
        type="submit"
      >
        {submitLabel}
      </Button>
    </form>
  );
}
