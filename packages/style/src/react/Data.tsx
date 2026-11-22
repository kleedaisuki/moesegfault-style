import type {
  CSSProperties,
  HTMLAttributes,
  ProgressHTMLAttributes,
  ReactElement,
  ReactNode,
  TableHTMLAttributes,
} from "react";
import { mergeClassNames } from "./utils";

/** @brief 数据展示色调。Tones for data display. */
export type DataTone = "neutral" | "accent" | "success" | "warning" | "danger";

/** @brief 表格属性。Table props. */
export interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  /** @brief 命名可横向滚动的区域。Names the horizontally scrollable region. */
  label: string;
}

/**
 * @brief 原生表格与自滚动外框；单元格用 data-numeric 对齐数字。
 * Native table in a self-scrolling frame; align numbers with data-numeric cells.
 */
export function Table({ className, label, ...props }: TableProps): ReactElement {
  return (
    // biome-ignore lint/a11y/useSemanticElements: 滚动容器需要命名区域语义，section 不可聚焦。The scroll container needs a named region.
    // biome-ignore lint/a11y/noNoninteractiveTabindex: 可滚动区域需要键盘焦点。A scrollable region requires keyboard focus.
    <div aria-label={label} className="moe-table-wrap" role="region" tabIndex={0}>
      <table {...props} className={mergeClassNames("moe-table", className)} />
    </div>
  );
}

/** @brief 指标属性。Stat props. */
export interface StatProps extends HTMLAttributes<HTMLDivElement> {
  /** @brief 指标名称。Metric name. */
  label: ReactNode;
  /** @brief 指标值。Metric value. */
  value: ReactNode;
  /** @brief 变化或补充信息。Change or supporting detail. */
  detail?: ReactNode;
  /** @brief 补充信息色调。Detail tone. */
  tone?: DataTone;
}

/** @brief 单个指标。A single metric. */
export function Stat({
  className,
  detail,
  label,
  tone = "neutral",
  value,
  ...props
}: StatProps): ReactElement {
  return (
    <div {...props} className={mergeClassNames("moe-stat", className)} data-tone={tone}>
      <span className="moe-stat__label">{label}</span>
      <span className="moe-stat__value">{value}</span>
      {detail != null && <span className="moe-stat__detail">{detail}</span>}
    </div>
  );
}

/** @brief 描述列表条目。Description list entry. */
export interface DescriptionItem {
  /** @brief 稳定键。Stable key. */
  key: string;
  /** @brief 术语，默认显示 key。Term; defaults to key. */
  term?: ReactNode;
  /** @brief 描述。Description. */
  description: ReactNode;
}

/** @brief 描述列表属性。Description list props. */
export interface DescriptionListProps extends Omit<HTMLAttributes<HTMLDListElement>, "children"> {
  /** @brief 有序条目。Ordered entries. */
  items: readonly DescriptionItem[];
}

/** @brief 键值规格列表。Key-value specification list. */
export function DescriptionList({
  className,
  items,
  ...props
}: DescriptionListProps): ReactElement {
  return (
    <dl {...props} className={mergeClassNames("moe-description-list", className)}>
      {items.flatMap(({ description, key, term }) => [
        <dt key={`${key}-term`}>{term ?? key}</dt>,
        <dd key={`${key}-description`}>{description}</dd>,
      ])}
    </dl>
  );
}

/** @brief 键盘按键。A keyboard key. */
export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>): ReactElement {
  return <kbd {...props} className={mergeClassNames("moe-kbd", className)} />;
}

/** @brief 头像属性。Avatar props. */
export interface AvatarProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** @brief 人物名称，作为可访问名称与首字母来源。Person name: accessible name and initial source. */
  name: string;
  /** @brief 可选图片地址。Optional image URL. */
  src?: string;
  /** @brief 边长像素，默认 32。Edge length in pixels; defaults to 32. */
  size?: number;
}

/** @brief 图片头像，缺省显示首字母。Image avatar with an initial fallback. */
export function Avatar({
  className,
  name,
  size = 32,
  src,
  style,
  ...props
}: AvatarProps): ReactElement {
  return (
    <span
      {...props}
      aria-label={name}
      className={mergeClassNames("moe-avatar", className)}
      role="img"
      style={{ ...style, "--moe-avatar-size": `${size}px` } as CSSProperties}
    >
      {src ? (
        <img alt="" src={src} />
      ) : (
        <span aria-hidden="true">{[...name.trim()][0]?.toUpperCase()}</span>
      )}
    </span>
  );
}

/** @brief 分隔线属性。Separator props. */
export interface SeparatorProps extends HTMLAttributes<HTMLHRElement> {
  /** @brief 方向，默认水平。Orientation; horizontal by default. */
  orientation?: "horizontal" | "vertical";
}

/** @brief 发丝分隔线。A hairline separator. */
export function Separator({
  className,
  orientation = "horizontal",
  ...props
}: SeparatorProps): ReactElement {
  return (
    <hr
      {...props}
      aria-orientation={orientation}
      className={mergeClassNames("moe-separator", className)}
      data-orientation={orientation}
    />
  );
}

/** @brief 进度属性；省略 value 表示不确定进度。Progress props; omit value for indeterminate progress. */
export interface ProgressProps extends ProgressHTMLAttributes<HTMLProgressElement> {
  /** @brief 可访问名称。Accessible name. */
  label: string;
  /** @brief 进度色调。Progress tone. */
  tone?: DataTone;
}

/** @brief 原生进度条。Native progress bar. */
export function Progress({
  className,
  label,
  max = 100,
  tone = "accent",
  ...props
}: ProgressProps): ReactElement {
  return (
    <progress
      {...props}
      aria-label={label}
      className={mergeClassNames("moe-progress", className)}
      data-tone={tone}
      max={max}
    />
  );
}

/** @brief 加载指示属性。Spinner props. */
export interface SpinnerProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** @brief 宿主已说明状态时对辅助技术隐藏。Hide from assistive technology when the host already conveys status. */
  decorative?: boolean;
  /** @brief 状态文字。Status text. */
  label?: string;
}

/** @brief 加载指示；默认带可读状态。Loading indicator with a readable status by default. */
export function Spinner({
  className,
  decorative = false,
  label = "加载中 / Loading",
  ...props
}: SpinnerProps): ReactElement {
  const semantics = decorative
    ? ({ "aria-hidden": true } as const)
    : ({ "aria-label": label, role: "status" } as const);
  return <span {...props} {...semantics} className={mergeClassNames("moe-spinner", className)} />;
}

/** @brief 装饰性骨架；加载状态由容器的 aria-busy 说明。Decorative skeleton; convey loading with aria-busy on the container. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLSpanElement>): ReactElement {
  return (
    <span {...props} aria-hidden="true" className={mergeClassNames("moe-skeleton", className)} />
  );
}

/** @brief 空状态属性。Empty state props. */
export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** @brief 标题。Title. */
  title: ReactNode;
  /** @brief 下一步说明。What to do next. */
  description?: ReactNode;
  /** @brief 装饰图标。Decorative icon. */
  icon?: ReactNode;
  /** @brief 操作。Actions. */
  actions?: ReactNode;
}

/** @brief 说明下一步的空状态。An empty state that explains the next step. */
export function EmptyState({
  actions,
  className,
  description,
  icon,
  title,
  ...props
}: EmptyStateProps): ReactElement {
  return (
    <div {...props} className={mergeClassNames("moe-empty", className)}>
      {icon != null && (
        <span aria-hidden="true" className="moe-empty__icon">
          {icon}
        </span>
      )}
      <p className="moe-empty__title">{title}</p>
      {description != null && <p className="moe-empty__description">{description}</p>}
      {actions != null && <div className="moe-empty__actions">{actions}</div>}
    </div>
  );
}
