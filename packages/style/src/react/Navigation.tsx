import {
  type DetailsHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  useId,
  useRef,
  useState,
} from "react";
import { Icon } from "./Icon";
import { mergeClassNames } from "./utils";

/** @brief 标签页条目。Tab entry. */
export interface TabItem {
  /** @brief 唯一值。Unique value. */
  value: string;
  /** @brief 标签。Label. */
  label: ReactNode;
  /** @brief 面板内容。Panel content. */
  content: ReactNode;
  /** @brief 是否禁用。Whether disabled. */
  disabled?: boolean;
}

/** @brief 标签页属性。Tabs props. */
export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onChange"> {
  /** @brief 标签列表名称。Tab list name. */
  label: string;
  /** @brief 有序条目。Ordered entries. */
  items: readonly TabItem[];
  /** @brief 受控值。Controlled value. */
  value?: string;
  /** @brief 非受控初始值，默认第一个可用条目。Initial uncontrolled value; defaults to the first enabled entry. */
  defaultValue?: string;
  /** @brief 值变化回调。Value change callback. */
  onValueChange?: (value: string) => void;
}

/** @brief 方向键到下一个可用索引的映射。Map a key to the next index among enabled tabs. */
function nextIndex(key: string, current: number, count: number): number | undefined {
  switch (key) {
    case "ArrowRight":
      return (current + 1) % count;
    case "ArrowLeft":
      return (current - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return undefined;
  }
}

/**
 * @brief 自动激活的标签页，遵循 APG 漫游焦点。Automatically activated tabs following APG roving focus.
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
 */
export function Tabs({
  className,
  defaultValue,
  items,
  label,
  onValueChange,
  value,
  ...props
}: TabsProps): ReactElement {
  const id = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const enabled = items.filter((item) => !item.disabled);
  const [internal, setInternal] = useState(defaultValue ?? enabled[0]?.value);
  const selected = value ?? internal;

  const select = (next: string): void => {
    setInternal(next);
    if (next !== selected) onValueChange?.(next);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const current = enabled.findIndex((item) => item.value === selected);
    const index = nextIndex(event.key, current, enabled.length);
    const target = index === undefined ? undefined : enabled[index];
    if (!target) return;
    event.preventDefault();
    select(target.value);
    listRef.current
      ?.querySelector<HTMLButtonElement>(`[data-value="${CSS.escape(target.value)}"]`)
      ?.focus();
  };

  return (
    <div {...props} className={mergeClassNames("moe-tabs", className)}>
      <div
        aria-label={label}
        className="moe-tabs__list"
        onKeyDown={handleKeyDown}
        ref={listRef}
        role="tablist"
      >
        {items.map((item) => (
          <button
            aria-controls={`${id}-panel-${item.value}`}
            aria-selected={item.value === selected}
            className="moe-tabs__tab"
            data-value={item.value}
            disabled={item.disabled}
            id={`${id}-tab-${item.value}`}
            key={item.value}
            onClick={() => select(item.value)}
            role="tab"
            tabIndex={item.value === selected ? 0 : -1}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item) => (
        <div
          aria-labelledby={`${id}-tab-${item.value}`}
          className="moe-tabs__panel"
          hidden={item.value !== selected}
          id={`${id}-panel-${item.value}`}
          key={item.value}
          role="tabpanel"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: APG 要求无焦点内容的面板可聚焦。APG makes panels without focusable content focusable.
          tabIndex={0}
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}

/** @brief 面包屑条目；最后一项是当前页。Breadcrumb entry; the last one is the current page. */
export interface BreadcrumbItem {
  /** @brief 文字。Text. */
  label: string;
  /** @brief 链接地址。Link destination. */
  href: string;
}

/** @brief 面包屑属性。Breadcrumbs props. */
export interface BreadcrumbsProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** @brief 有序路径。Ordered trail. */
  items: readonly BreadcrumbItem[];
  /** @brief 导航名称。Navigation name. */
  label?: string;
}

/** @brief 面包屑导航。Breadcrumb navigation. */
export function Breadcrumbs({
  className,
  items,
  label = "Breadcrumb",
  ...props
}: BreadcrumbsProps): ReactElement {
  return (
    <nav {...props} aria-label={label} className={mergeClassNames("moe-breadcrumbs", className)}>
      <ol>
        {items.map((item, index) => (
          <li key={item.href}>
            <a aria-current={index === items.length - 1 ? "page" : undefined} href={item.href}>
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** @brief 折叠面板容器。Accordion container. */
export function Accordion({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactElement {
  return <div {...props} className={mergeClassNames("moe-accordion", className)} />;
}

/** @brief 折叠项属性；同组 name 由平台保证单开。Accordion item props; a shared name makes the platform keep one open. */
export interface AccordionItemProps
  extends Omit<DetailsHTMLAttributes<HTMLDetailsElement>, "title"> {
  /** @brief 标题。Title. */
  title: ReactNode;
}

/** @brief 基于原生 details 的折叠项，无需脚本即可操作。Native details item that works without scripts. */
export function AccordionItem({
  children,
  className,
  title,
  ...props
}: AccordionItemProps): ReactElement {
  return (
    <details {...props} className={mergeClassNames("moe-accordion__item", className)}>
      <summary>
        {title}
        <Icon name="chevron-down" size={16} />
      </summary>
      <div className="moe-accordion__content">{children}</div>
    </details>
  );
}
