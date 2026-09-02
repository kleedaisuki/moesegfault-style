import { tokens, type ThemePreference } from "@moesegfault/style";
import type { ButtonProps, ClusterProps } from "@moesegfault/style/react";

/** @brief 验证根入口可被 NodeNext 消费。Verify that NodeNext can consume the root entry point. */
const preference: ThemePreference = "auto";

/** @brief 验证 React 入口的公共组件属性可解析。Verify public React component props resolve. */
const button: ButtonProps = { children: "继续", variant: "primary" };

/** @brief 验证 React 布局类型及其依赖声明可解析。Verify React layout types and dependent declarations resolve. */
const cluster: ClusterProps = { align: "center", justify: "between" };

void [preference, button, cluster, tokens["color.ink"]];
