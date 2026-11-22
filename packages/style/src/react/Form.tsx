import {
  createContext,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useContext,
  useId,
} from "react";
import { Icon } from "./Icon";
import { mergeClassNames } from "./utils";

/** @brief 输入控件尺寸。Input control sizes. */
export type ControlSize = "sm" | "md" | "lg";

/** @brief Field 向控件传递的可访问性连线。Accessibility wiring a Field hands to its control. */
interface FieldWiring {
  id?: string;
  describedBy?: string;
  invalid?: boolean;
  required?: boolean;
}

/** 控件脱离 Field 时上下文为空对象，无需分支。Outside a Field the context is empty, so controls need no branch. */
const FieldContext = createContext<FieldWiring>({});

/** @brief 合并 Field 连线与显式属性，显式值优先。Merge Field wiring with explicit props; explicit values win. */
function useFieldProps(props: {
  id?: string;
  required?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: InputHTMLAttributes<HTMLInputElement>["aria-invalid"];
}) {
  const field = useContext(FieldContext);
  return {
    id: props.id ?? field.id,
    required: props.required ?? field.required,
    "aria-describedby": mergeClassNames(field.describedBy, props["aria-describedby"]) || undefined,
    "aria-invalid": props["aria-invalid"] ?? field.invalid,
  };
}

/** @brief 字段属性。Field props. */
export interface FieldProps extends HTMLAttributes<HTMLDivElement> {
  /** @brief 标签。Label. */
  label: ReactNode;
  /** @brief 辅助说明。Supporting hint. */
  hint?: ReactNode;
  /** @brief 错误文字；存在即标记控件无效。Error text; its presence marks the control invalid. */
  error?: ReactNode;
  /** @brief 是否必填。Whether the control is required. */
  required?: boolean;
}

/**
 * @brief 把标签、说明与错误自动关联到内部控件。Wire label, hint, and error to the control inside.
 * @example <Field label="Name" hint="Visible to your team"><Input /></Field>
 */
export function Field({
  children,
  className,
  error,
  hint,
  label,
  required,
  ...props
}: FieldProps): ReactElement {
  const id = useId();
  const hintId = hint != null ? `${id}-hint` : undefined;
  const errorId = error != null ? `${id}-error` : undefined;
  const wiring: FieldWiring = {
    id,
    required,
    invalid: error != null || undefined,
    describedBy: mergeClassNames(hintId, errorId) || undefined,
  };
  return (
    <div {...props} className={mergeClassNames("moe-field", className)}>
      <label className="moe-field__label" htmlFor={id}>
        {label}
        {required && (
          <span aria-hidden="true" className="moe-field__required">
            {" *"}
          </span>
        )}
      </label>
      <FieldContext value={wiring}>{children}</FieldContext>
      {hint != null && (
        <p className="moe-field__hint" id={hintId}>
          {hint}
        </p>
      )}
      {error != null && (
        <p className="moe-field__error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}

/** @brief 输入框属性。Input props. */
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** @brief 控件尺寸。Control size. */
  size?: ControlSize;
  /** @brief 前置装饰图标。Leading decorative icon. */
  icon?: ReactElement;
  /** @brief 后置快捷键提示。Trailing shortcut hint. */
  shortcut?: ReactNode;
  /** @brief 原生输入引用。Native input ref. */
  ref?: Ref<HTMLInputElement>;
}

/** @brief 单行输入。Single-line input. */
export function Input({
  className,
  icon,
  shortcut,
  size = "md",
  ...props
}: InputProps): ReactElement {
  const input = (
    <input
      {...props}
      {...useFieldProps(props)}
      className={mergeClassNames("moe-input", className)}
      data-size={size}
    />
  );
  if (!icon && shortcut == null) return input;
  return (
    <span className="moe-input-group">
      {icon}
      {input}
      {shortcut != null && (
        <span aria-hidden="true" className="moe-kbd">
          {shortcut}
        </span>
      )}
    </span>
  );
}

/** @brief 多行输入属性。Textarea props. */
export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** @brief 原生文本域引用。Native textarea ref. */
  ref?: Ref<HTMLTextAreaElement>;
}

/** @brief 多行输入。Multi-line input. */
export function Textarea({ className, ...props }: TextareaProps): ReactElement {
  return (
    <textarea
      {...props}
      {...useFieldProps(props)}
      className={mergeClassNames("moe-input", className)}
    />
  );
}

/** @brief 选择框属性。Select props. */
export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  /** @brief 控件尺寸。Control size. */
  size?: ControlSize;
  /** @brief 原生选择框引用。Native select ref. */
  ref?: Ref<HTMLSelectElement>;
}

/** @brief 原生选择框，保留系统选项面板。Native select that keeps the platform's option picker. */
export function Select({ className, size = "md", ...props }: SelectProps): ReactElement {
  return (
    <span className="moe-select">
      <select
        {...props}
        {...useFieldProps(props)}
        className={mergeClassNames("moe-input", className)}
        data-size={size}
      />
      <Icon name="chevron-down" size={16} />
    </span>
  );
}

/** @brief 选择类控件属性。Choice control props. */
export interface ChoiceProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "children" | "size" | "type"> {
  /** @brief 可见标签。Visible label. */
  label: ReactNode;
  /** @brief 补充说明。Supporting description. */
  description?: ReactNode;
  /** @brief 原生输入引用。Native input ref. */
  ref?: Ref<HTMLInputElement>;
}

/** @brief 复选、单选与开关共用的标签布局。Label layout shared by checkbox, radio, and switch. */
function Choice({
  className,
  description,
  label,
  ...input
}: ChoiceProps & { type: "checkbox" | "radio" }): ReactElement {
  const id = useId();
  return (
    <label className={mergeClassNames("moe-choice", className)}>
      <input
        {...input}
        aria-describedby={
          mergeClassNames(input["aria-describedby"], description != null && id) || undefined
        }
        className="moe-choice__input"
      />
      <span>
        {label}
        {description != null && (
          <span aria-hidden="true" className="moe-choice__description" id={id}>
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

/** @brief 复选框。Checkbox. */
export function Checkbox(props: ChoiceProps): ReactElement {
  return <Choice {...props} type="checkbox" />;
}

/** @brief 单选按钮；同组共用 name。Radio button; share a name within a group. */
export function Radio(props: ChoiceProps): ReactElement {
  return <Choice {...props} type="radio" />;
}

/** @brief 立即生效的开关。A switch that takes effect immediately. */
export function Switch(props: ChoiceProps): ReactElement {
  return <Choice {...props} role="switch" type="checkbox" />;
}

/** @brief 分段选项。Segmented option. */
export interface SegmentedOption<Value extends string> {
  /** @brief 选项值。Option value. */
  value: Value;
  /** @brief 可见标签。Visible label. */
  label: ReactNode;
  /** @brief 是否禁用。Whether disabled. */
  disabled?: boolean;
}

/** @brief 分段控件属性。Segmented control props. */
export interface SegmentedControlProps<Value extends string>
  extends Omit<HTMLAttributes<HTMLFieldSetElement>, "children" | "defaultValue" | "onChange"> {
  /** @brief 组的可访问名称。Accessible group name. */
  label: string;
  /** @brief 有序选项。Ordered options. */
  options: readonly SegmentedOption<Value>[];
  /** @brief 受控值。Controlled value. */
  value?: Value;
  /** @brief 非受控初始值。Initial uncontrolled value. */
  defaultValue?: Value;
  /** @brief 值变化回调。Value change callback. */
  onValueChange?: (value: Value) => void;
  /** @brief 表单字段名。Form field name. */
  name?: string;
}

/**
 * @brief 基于原生单选组的分段控件，方向键由平台处理。Segmented control built on native radios; the platform handles arrow keys.
 */
export function SegmentedControl<Value extends string>({
  className,
  defaultValue,
  label,
  name,
  onValueChange,
  options,
  value,
  ...props
}: SegmentedControlProps<Value>): ReactElement {
  const generatedName = useId();
  return (
    <fieldset {...props} aria-label={label} className={mergeClassNames("moe-segmented", className)}>
      {options.map((option) => (
        <label className="moe-segmented__option" key={option.value}>
          <input
            checked={value === undefined ? undefined : value === option.value}
            defaultChecked={value === undefined ? defaultValue === option.value : undefined}
            disabled={option.disabled}
            name={name ?? generatedName}
            onChange={() => onValueChange?.(option.value)}
            type="radio"
            value={option.value}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
