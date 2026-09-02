import type { HTMLAttributes } from "astro/types";

/** @brief Astro 原生 style 属性支持的值。Values accepted by Astro's native style attribute. */
export type AstroStyle = HTMLAttributes<"div">["style"];

/** @brief 布局组件写入的 CSS 自定义属性集合。CSS custom properties emitted by layout components. */
export type LayoutDeclarations = Record<`--${string}`, string | undefined>;

/**
 * @brief 合并消费者样式与布局自定义属性。Merge consumer styles with layout custom properties.
 * @param style 消费者提供的原生 Astro 样式值。Native Astro style value supplied by the consumer.
 * @param declarations 由布局属性生成的 CSS 自定义属性。CSS custom properties generated from layout props.
 * @return 可由标准 style 属性序列化的合并样式。Merged styles serializable by the standard style attribute.
 * @note 布局属性优先于消费者提供的同名自定义属性。Layout props take precedence over consumer-provided custom properties with the same name.
 */
export function mergeLayoutStyles(style: AstroStyle, declarations: LayoutDeclarations): AstroStyle {
  /** @brief 删除未提供布局属性对应的声明。Remove declarations for omitted layout props. */
  const layoutStyle = Object.fromEntries(
    Object.entries(declarations).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  );

  if (typeof style === "string") {
    /** @brief 将布局声明转换为可与字符串样式拼接的 CSS。Serialize layout declarations for string styles. */
    const serializedLayout = Object.entries(layoutStyle)
      .map(([property, value]) => `${property}: ${value}`)
      .join("; ");

    return [style.trim().replace(/;+$/, ""), serializedLayout].filter(Boolean).join("; ");
  }

  return { ...(style ?? {}), ...layoutStyle };
}
