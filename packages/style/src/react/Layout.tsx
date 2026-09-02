import type { CSSProperties, HTMLAttributes, ReactElement } from "react";
import { mergeClassNames } from "./utils";

/** @brief 布局间距等级。Layout gap scale. */
export type LayoutGap = "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

/** @brief 容器宽度等级。Container width scale. */
export type ContainerSize = "narrow" | "default" | "wide" | "full";

/** @brief 限宽容器属性。Constrained container props. */
export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  /** @brief 最大宽度等级。Maximum width scale. */
  size?: ContainerSize;
}

/**
 * @brief 渲染居中且具有响应式边距的限宽容器。Render a centered width-constrained container with responsive gutters.
 * @param props 原生 div 属性与宽度等级。Native div attributes and width scale.
 * @return React div 元素。React div element.
 */
export function Container({ className, size = "default", ...props }: ContainerProps): ReactElement {
  return (
    <div {...props} className={mergeClassNames("moe-container", className)} data-size={size} />
  );
}

/** @brief 垂直堆叠属性。Vertical stack props. */
export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  /** @brief 子项间距。Gap between children. */
  gap?: LayoutGap;
}

/**
 * @brief 渲染具有一致垂直节奏的堆叠布局。Render a stack with consistent vertical rhythm.
 * @param props 原生 div 属性与间距。Native div attributes and gap.
 * @return React div 元素。React div element.
 */
export function Stack({ className, gap = "md", ...props }: StackProps): ReactElement {
  const { style, ...elementProps } = props;
  return (
    <div
      {...elementProps}
      className={mergeClassNames("moe-stack", className)}
      style={
        {
          ...style,
          "--moe-stack-space": gap === "none" ? "0px" : `var(--moe-space-${gap})`,
        } as CSSProperties
      }
    />
  );
}

/** @brief 簇布局的交叉轴对齐。Cross-axis alignment for a cluster. */
export type ClusterAlign = "start" | "center" | "end" | "baseline" | "stretch";

/** @brief 簇布局的主轴对齐。Main-axis distribution for a cluster. */
export type ClusterJustify = "start" | "center" | "end" | "between";

/** @brief 将簇布局对齐契约转换为 CSS 值。Map cluster alignment contracts to CSS values. */
const clusterAlignValues: Record<ClusterAlign, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  baseline: "baseline",
  stretch: "stretch",
};

/** @brief 将簇布局分布契约转换为 CSS 值。Map cluster distribution contracts to CSS values. */
const clusterJustifyValues: Record<ClusterJustify, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
};

/** @brief 自动换行的水平簇布局属性。Wrapping horizontal cluster props. */
export interface ClusterProps extends HTMLAttributes<HTMLDivElement> {
  /** @brief 交叉轴对齐。Cross-axis alignment. */
  align?: ClusterAlign;
  /** @brief 子项间距。Gap between children. */
  gap?: LayoutGap;
  /** @brief 主轴分布。Main-axis distribution. */
  justify?: ClusterJustify;
}

/**
 * @brief 渲染可自动换行的水平簇布局。Render a wrapping horizontal cluster layout.
 * @param props 原生 div 属性、间距和对齐方式。Native div attributes, gap, and alignment.
 * @return React div 元素。React div element.
 */
export function Cluster({
  align = "center",
  className,
  gap = "md",
  justify = "start",
  ...props
}: ClusterProps): ReactElement {
  const { style, ...elementProps } = props;
  return (
    <div
      {...elementProps}
      className={mergeClassNames("moe-cluster", className)}
      data-align={align}
      data-justify={justify}
      style={
        {
          ...style,
          "--moe-cluster-space": gap === "none" ? "0px" : `var(--moe-space-${gap})`,
          "--moe-cluster-align": clusterAlignValues[align],
          "--moe-cluster-justify": clusterJustifyValues[justify],
        } as CSSProperties
      }
    />
  );
}
